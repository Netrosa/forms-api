'use strict';

const utils = require("../lib/utils")
const forms = require("../lib/form-storage")
const submissions = require('../lib/submit-storage');
const encryption = require('../lib/encryption')
const Joi = require("joi")

const submissionSchema = Joi.object().keys({
    value: Joi.object().keys({
        signatureSeed: Joi.string().required()
    }).unknown(true).required(),
    proof: Joi.string().required(),
    publicKey: Joi.string().base64().required()
})

module.exports.add = async (event, context) => {

    // authorize (TODO: move to gateway authorizer?)
    let sender;
    try {
        let token = encryption.extractAuthHeader(event);
        sender = await encryption.verifyJwt(token);
    } catch (e) {
        console.error(e);
        console.info({message: "token invalid", error: e.message});
        return utils.error(403, "token is invalid")
    }

    // only open state allowed
    let formId = sender.formId;
    let form = await forms.getFormById(formId);
    if(form.formStatus !== "open") {
        return utils.error(409, {message: `form status is ${form.formStatus}`})
    }

    let params = await utils.validate(event.body, submissionSchema);

    //TODO: check signature

    // encrypt
    let encryptedEntry = await encryption.encrypt(formId, JSON.stringify(params.value));

    let submissionPayload = {
        proof: params.proof,
        value: encryptedEntry,
        publicKey: params.publicKey
    }

    // prepare transaction
    let tokenId = await encryption.anonymize(formId, sender.tokenId);
    let senderId = await encryption.anonymize(formId, sender.subId);

    let payload = {
        company: form.company,
        formId: formId,
        subId: tokenId,
        senderId: senderId,
        payload: submissionPayload
    }

    // add to database
    await submissions.addSubmission(payload);

    // call async lambda for transaction
    await utils.asyncLambda("netrosa-ethereum-prod-form-add-entry", {
        formId: form.formId,
        company: form.company,
        subId: tokenId,
        senderId: senderId,
        payload: submissionPayload
    })

    // return to submitter for status polling
    return utils.success({
        subId: tokenId
    })
}
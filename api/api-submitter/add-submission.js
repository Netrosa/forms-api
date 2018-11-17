'use strict';

const utils = require("../lib/utils")
const forms = require("../lib/form-storage")
const submissions = require('../lib/submit-storage');
const encryption = require('../lib/encryption')
const Joi = require("joi")

const netRosaSchema = Joi.object().keys({
    value: Joi.object().keys({
        signatureSeed: Joi.string().required()
    }).unknown(true).required(),
    proof: Joi.string().required(),
    publicKey: Joi.string().base64().required()
})

const openRosaSchema = Joi.object().keys({
    value: Joi.string(),
    proof: Joi.string(),
    publicKey: Joi.string().base64()
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

    let schema = (form.formType === "openrosa") ? openRosaSchema : netRosaSchema;
    let params = await utils.validate(event.body, schema);

    //TODO: check signature if present

    // encrypt with compression to allow for RSA asymetric encryption (control for size)
    let value = (typeof params.value === "object") ? JSON.stringify(params.value) : params.value;
    let encryptedEntry = await encryption.encrypt(formId, value);

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
'use strict';

const utils = require("../lib/utils")
const forms = require("../lib/form-storage");
const uuid = require("uuid/v4")
const Joi = require('joi');

const addKeysSchema = Joi.object().keys({
    generate: Joi.number().greater(0).less(1000),
    hashedKeys: Joi.array().when('generate', { is: '0', then: Joi.array().min(1).items(Joi.string().base64().required()) })
}).without("generate", "keys")

module.exports.addKeys = async (event, context) => {
    try {
        let params = await utils.validate(event.body, addKeysSchema);
        if (params.generate > 0) {
            return await generateKeys(event, params);
        } else {
            return await storeKeys(event, params);
        }
    } catch (e) {
        console.error(e);
        return utils.error(400, e.message)
    }
}

const storeKeys = async (event, params) => {
    let keys = params.hashedKeys;
    let user = utils.getUser(event);
    let formId = event.pathParameters.id;
    let form = await forms.getForm(user, formId);

    if (form == null) {
        return utils.error(404, "not found")
    }

    if (form.authType !== "key"){
        return utils.error(403, "form does not allow key creation")
    }

    let saves = []
    for (let i = 0; i < keys.length; i++) {
        let item = {
            company: user.company,
            formId: formId,
            hashedKey: keys[i],
            user: user,
            enabled: true
        }

        if(form.ttlTimestamp){
            item.ttlTimestamp = form.ttlTimestamp;
        }
        
        saves.push(forms.addSubmitterKey(item))
    }

    await Promise.all(saves);

    return utils.success({
        count: keys.length
    })
}

const generateKeys = async (event, params) => {
    let count = params.generate;
    let user = utils.getUser(event);
    let formId = event.pathParameters.id;
    let form = await forms.getForm(user, formId);

    if (form == null) {
        return utils.error(404, "not found")
    }

    if (form.authType !== "key"){
        return utils.error(403, "form does not allow key creation")
    }

    let keys = [];

    let saves = []
    for (let i = 0; i < count; i++) {
        let key = uuid();
        keys.push(key);
        let item = {
            company: user.company,
            formId: formId,
            hashedKey: utils.sha256Hash(key),
            user: user,
            enabled: true
        }

        if(form.ttlTimestamp){
            item.ttlTimestamp = form.ttlTimestamp;
        }
        
        saves.push(forms.addSubmitterKey(item))
    }

    await Promise.all(saves);

    return utils.success({
        keys: keys
    })
}
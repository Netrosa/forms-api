const utils = require("../lib/utils")
const forms = require("../lib/form-storage");
const Joi = require("joi")
const validations = require("../lib/validations")

const FORM_SCHEMA = Joi.object().keys({
    name: Joi.string().required(),
    form: validations.FORM_SCHEMA,
    network: Joi.string().only("netvote", "ropsten", "mainnet").required(),
})

module.exports.createForm = async (event, context) => {
    try {
        let params = await utils.validate(event.body, FORM_SCHEMA);
        let user = utils.getUser(event);
        let obj = await forms.putForm(user, params)
        return utils.success(obj);
    } catch(e){ 
        console.log(e);
        return utils.error(400, e.message)
    }
}

module.exports.getForm = async (event, context) => {
    try {
        let user = utils.getUser(event);
        let obj = await forms.getForm(user, event.pathParameters.id)
        return utils.success(obj);
    } catch(e){ 
        console.log(e);
        return utils.error(500, e.message)
    }
}

module.exports.formList = async (event, context) => {
    try {
        let user = utils.getUser(event);
        let obj = await forms.getFormList(user)
        return utils.success(obj);
    } catch(e){ 
        console.log(e);
        return utils.error(500, e.message)
    } 
}
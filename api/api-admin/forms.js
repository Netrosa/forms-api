const utils = require("../lib/utils")
const forms = require("../lib/form-storage");
const Joi = require("joi")
const validations = require("../lib/validations")

const FORM_SCHEMA = Joi.object().keys({
    name: Joi.string().required(),
    formType: Joi.string().only("openrosa", "netrosa", "file").default("netrosa"),
    form: Joi.alternatives()
        .when('formType', { is: 'file', then: Joi.string() })
        .when('formType', { is: 'openrosa', then: Joi.string() })
        .when('formType', { is: 'netrosa', then: validations.FORM_SCHEMA }),
    continuousReveal: Joi.boolean().default(false),
    network: Joi.string().only("netvote", "ropsten").required(),
    authType: Joi.string().only("key", "jwt").default("key"),
    test: Joi.boolean().default(false)
})

module.exports.createForm = async (event, context) => {
    try {
        let params = await utils.validate(event.body, FORM_SCHEMA);

        if (params.network === "mainnet") {
            if (!user.mainnet) {
                return utils.error(403, "user does not have permission to use mainnet")
            }
        }

        let user = utils.getUser(event);
        let obj = await forms.putForm(user, params)

        // async launch lambda
        let payload = {
            formId: obj.formId,
            company: user.company,
            continuousReveal: params.continuousReveal,
            network: params.network,
            authType: params.authType,
            formType: params.formType,
            mode: (params.test) ? "TEST" : "PROD"
        }

        await utils.asyncLambda("netrosa-ethereum-prod-create-form", payload);

        return utils.success(obj);
    } catch (e) {
        console.log(e);
        return utils.error(400, e.message)
    }
}

module.exports.getForm = async (event, context) => {
    try {
        let obj = await forms.getFormById(event.pathParameters.id)
        return utils.success(obj);
    } catch (e) {
        console.log(e);
        return utils.error(500, e.message)
    }
}

module.exports.formList = async (event, context) => {
    try {
        let user = utils.getUser(event);
        let obj = await forms.getFormList(user)
        return utils.success(obj);
    } catch (e) {
        console.log(e);
        return utils.error(500, e.message)
    }
}
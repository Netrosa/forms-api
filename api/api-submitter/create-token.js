'use strict';

const utils = require("../lib/utils")
const forms = require("../lib/form-storage")
const auth = require("./auth")
const encryption = require('../lib/encryption')


module.exports.create = async (event, context) => {

    try {

        let token = encryption.extractAuthHeader(event);
        if (!token) {
            return utils.error(401, "unauthorized");
        }

        let format = event.pathParameters.format;
        if(format !== "jwt" && format !== "qr"){
            return utils.error(400, "format must be jwt or qr");
        }

        let formId = event.pathParameters.id;
        let form = await forms.getFormById(formId);

        if (!form) {
            return utils.error(404, "not found");
        }

        if (form.authType !== "key") {
            return utils.error(400, "Not using key authentication, only signed JWTs")
        }

        if (form.formStatus !== "open") {
            return utils.error(409, "form is not currently in 'open' state, state = "+form.formStatus)
        }

        console.log(`formId=${formId}, token=${token}`)
        let authorized = await auth.authorizeKey(formId, token)
        if (!authorized) {
            return utils.error(401, "unauthorized");
        }

        console.log(`formId=${formId}, token=${token}`)
        let jwt = await encryption.createJwt(formId, token)

        console.log({ formId: formId, message: "authorized voter" });

        let obj = { 
            formId: formId,
            token: jwt,
        }

        if(format === "qr"){
            let qr = await utils.qr(obj);
            obj.qr = qr.qr;
        }

        return utils.success(obj)

    } catch (e) {
        console.error(e);
        return utils.error(400, e.message)
    }

};

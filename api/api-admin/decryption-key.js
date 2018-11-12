
const utils = require("../lib/utils")
const forms = require("../lib/form-storage");
const encryption = require("../lib/encryption")

module.exports.get = async (event, context) => {
    try {
        let user = utils.getUser(event);
        let formId =  event.pathParameters.id;
        let obj = await forms.getForm(user, formId)

        if(!obj) {
            return utils.error(404, "not found");
        }

        let key = await encryption.getDecryptionKey(formId);
        return utils.success({
            key: key
        });
    } catch (e) {
        console.log(e);
        return utils.error(500, e.message)
    }
}
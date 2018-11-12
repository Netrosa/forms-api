const utils = require("../lib/utils")
const forms = require("../lib/form-storage");
const submissions = require("../lib/submit-storage");

module.exports.getById = async (event, context) => {
    try {
        let formId = event.pathParameters.id;
        let user = await utils.getUser(event);
        let obj = await forms.getForm(user, formId)

        if(!obj) {
            return utils.error(404, "not founct")
        }

        let subId = event.pathParameters.subId;
        let sub = await submissions.getSubmission(formId, subId);
        if(!sub) {
            return utils.error(404, "not founct")
        }

        return utils.success(sub);
    } catch (e) {
        console.log(e);
        return utils.error(500, e.message)
    }
}
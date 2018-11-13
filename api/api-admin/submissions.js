const utils = require("../lib/utils")
const submissions = require("../lib/submit-storage");

module.exports.getById = async (event, context) => {
    try {
        let formId = event.pathParameters.id;
        let subId = event.pathParameters.subId;
        let sub = await submissions.getSubmission(formId, subId);
        if(!sub) {
            return utils.error(404, "not found")
        }

        return utils.success(sub);
    } catch (e) {
        console.log(e);
        return utils.error(500, e.message)
    }
}
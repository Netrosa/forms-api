const utils = require("../lib/utils")
const forms = require("../lib/form-storage");
const Joi = require("joi")

const SET_STATUS_LAMBDA = "netrosa-ethereum-prod-form-set-status"
const STATUS_OPEN = "open"
const STATUS_CLOSED = "closed"
const STATUS_STOPPED = "stopped"

const openForm = async (user, form) =>{
    await forms.setStatus(user, form.formId, "opening");
    await utils.asyncLambda(SET_STATUS_LAMBDA,{
        formId: form.formId,
        company: user.company,
        status: "open"
    })
    return "opening"
}

// enforced by contract
const closeForm = async (user, form) =>{
    //TODO: check for pending submissions
    await forms.setStatus(user, form.formId, "closing");
    await utils.asyncLambda(SET_STATUS_LAMBDA,{
        formId: form.formId,
        company: user.company,
        status: "closed"
    })
    return "closing"
}

// not enforced by contract, must be api-side for timeliness
const stopForm = async (user, form) => {
    await forms.setStatus(user, form.formId, "stopped");
    return "stopped"
}

const resumeForm = async (user, form) => {
    await forms.setStatus(user, form.formId, "open");
    return "open"
}

const legalTransitions = {
    "ready": {
        "open": resumeForm
    },
    "open": {
        "stopped": stopForm
    },
    "stopped": {
        "closed": closeForm,
        "open": resumeForm
    }
}

const setStatusSchema = Joi.object().keys({
    status: Joi.string().only(STATUS_OPEN, STATUS_STOPPED, STATUS_CLOSED).required(),
    force: Joi.boolean().default(false)
})

// POST /form/{id}/status
module.exports.setStatus = async (event, context) => {
    let params = await utils.validate(event.body, setStatusSchema);
    let user = utils.getUser(event);
    let form = await forms.getForm(user, event.pathParameters.id)

    if(!form) {
      return utils.error(404, "not found");
    }

    if(!legalTransitions[form.formStatus] || !legalTransitions[form.formStatus][params.status]){
      return utils.error(400, `invalid transition from ${form.formStatus} to ${params.status}`)
    }

    let transition = legalTransitions[form.formStatus][params.status];

    let status = await transition(user, form);
    return utils.success({formStatus: status})
};

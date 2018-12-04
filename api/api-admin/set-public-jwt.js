'use strict';

const utils = require("../lib/utils")
const forms = require("../lib/form-storage");
const encryption = require("../lib/encryption")
const ursa = require('ursa')

module.exports.set = async (event, context) => {

  try {
    let pem = event.body;

    //will throw error if not pem
    ursa.coercePublicKey(pem);

    const user = utils.getUser(event);
    const formId = event.pathParameters.id;

    const form = await forms.getForm(user, formId);

    if(form == null){
      return utils.error(404, "not found");
    }

    if(form.authType !== "jwt"){
      return utils.error(409, `form is using ${form.authType} auth, public key cannot be overridden`);
    }

    await encryption.setJwtPublicKey(formId, pem.toString("base64"), form.ttlTimestamp);

    return utils.success({success: true});

  } catch (e) {
    return utils.error(400, e.message)
  }

};

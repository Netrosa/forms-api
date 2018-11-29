'use strict';

const utils = require("../lib/utils")
const ipfs = require("../lib/ipfs")

module.exports.save = async (event, context) => {
  console.log(JSON.stringify(event));
  try {
    let hash = await ipfs.save(event.body)

    return utils.success({
      hash: hash
    })

  } catch (e) {
    console.error(e);
    return utils.error(400, e.message)
  }

};

module.exports.get = async (event, context) => {
  try {
    let body = await ipfs.get(event.pathParameters.hash);
    return utils.sendObject(body)
  } catch (e) {
    console.error(e);
    return utils.error(400, e.message)
  }

};

'use strict'

const Joi = require('joi');


const defaultHeaders = {
    "Access-Control-Allow-Origin" : "*", 
    "Access-Control-Allow-Credentials" : true,
    "Content-Type": "text/xml"
};

const getUser = (event) => {
    let id = event.requestContext.authorizer;
    if(id.claims){
        id = id.claims;
    }

    let hasMainnet = ('1' === `${id["custom:mainnet"]}`);
    return {
        id: id.sub,
        company: id["custom:company"],
        email: id.email,
        mainnet: hasMainnet,
        phone: id.phone_number
    }
}

const success = (obj) => {
    return {
        statusCode: 200,
        body: JSON.stringify(obj),
        headers: defaultHeaders
    };
}

const error = (code, message) => {
    return {
        statusCode: code,
        body: JSON.stringify({
            message: message
        }),
        headers: defaultHeaders
    };
}

const validate = (params, schema) => {
    return new Promise((resolve, reject)=>{
      Joi.validate(params, schema, (err, res) => {
        if(err){
          reject(err);
        } else {
          resolve(res);
        }
      })
    })
  }

module.exports = {
    success: success,
    error: error,
    getUser: getUser,
    validate: validate
}
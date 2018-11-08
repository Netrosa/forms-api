'use strict'
const AWS = require("aws-sdk");
const Joi = require('joi');
const crypto = require('crypto');
const QRCode = require('qrcode');

const defaultHeaders = {
    "Access-Control-Allow-Origin" : "*", 
    "Access-Control-Allow-Credentials" : true,
    "Content-Type": "text/xml"
};

const asyncLambda = (name, payload) => {
    return new Promise((resolve, reject) => {
        try{
            const lambda = new AWS.Lambda({ region: "us-east-1", apiVersion: '2015-03-31' });
            const lambdaParams = {
                FunctionName: name,
                InvocationType: 'Event',
                LogType: 'None',
                Payload: JSON.stringify(payload)
            };
            lambda.invoke(lambdaParams, function(err, data){
                if(err){
                    reject(err)
                } else{
                    resolve(data);
                }
            });
        }catch(e){
            reject(e);
        }
    })
}

const qr = (obj) => {
    return new Promise(function (resolve, reject) {
        QRCode.toDataURL(JSON.stringify(obj), {
            color: {
                dark: "#0D364B",
                light: "#ffffff"
            }
        }, function (err, url) {
            resolve({
                qr: url
            });
        });
    });
}

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

const sha256Hash = (str) => {
    let hash = crypto.createHash("sha256")
    hash.update(str);
    return hash.digest().toString("base64");
}


module.exports = {
    success: success,
    error: error,
    getUser: getUser,
    validate: validate,
    asyncLambda: asyncLambda,
    sha256Hash: sha256Hash,
    qr: qr
}
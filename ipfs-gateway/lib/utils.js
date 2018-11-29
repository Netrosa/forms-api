'use strict'

const defaultHeaders = {
    "Access-Control-Allow-Origin" : "*", 
    "Access-Control-Allow-Credentials" : true
};

const sendObject = (obj) => {
    if(typeof obj !== "string"){
        throw new Error("obj should be string")
    }
    return {
        statusCode: 200,
        body: obj,
        headers: defaultHeaders,
        isBase64Encoded: true
    };
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

module.exports = {
    success: success,
    sendObject: sendObject,
    error: error
}
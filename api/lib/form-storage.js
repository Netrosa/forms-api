const AWS = require("aws-sdk");
const uuid = require("uuid/v4");
const ipfs = require("./ipfs");
const docClient = new AWS.DynamoDB.DocumentClient();
const utils = require("./utils")

const FORM_TABLE = "forms"
const FORM_KEY_TABLE = "formSubmitterKeys";

const getForm = async (user, id) => {
    let params = {
        TableName: FORM_TABLE,
        Key: {
            "company": user.company,
            "formId": id
        }
    }
    
    let res = await docClient.get(params).promise();
    let formObj = res.Item;
    return formObj;
}

const getFormById = async (id) => {
    let params = {
        TableName: FORM_TABLE,
        IndexName: "formId-createdAt-index",
        KeyConditionExpression: "formId = :fid",
        ExpressionAttributeValues: {
            ":fid": id
        },
    }
    let res = await docClient.query(params).promise();
    if(res.Items.length > 0){
        return res.Items[0]
    }
    return null;
}

const setStatus = async (user, id, status) => {
    let params = {
        TableName: FORM_TABLE,
        Key: {
            "company": user.company,
            "formId": id
        },
        UpdateExpression: "set formStatus = :s",
        ExpressionAttributeValues:{
            ":s": status
        }
    }
    await docClient.update(params).promise();
}

const putForm = async (user, form) => {
    let id = uuid();

    let payload = form.form;
    if(typeof payload === "object") {
        payload = Buffer.from(JSON.stringify(payload)).toString("base64")
    } else {
        payload = Buffer.from(payload).toString("base64")
    }

    let hash = await ipfs.save(payload);
    let mode = form.test ? "TEST" : "PROD";
    let item = {
        "company": user.company,
        "formId": id,
        "name": form.name,
        "ipfsHash": hash,
        "createdAt": new Date().getTime(),
        "network": form.network,
        "createdBy": user.email,
        "formType": form.formType,
        "authType": form.authType,
        "formStatus": "building",
        "txStatus": "pending",
        "mode": mode
    };

    utils.addTtl(mode, item);

    let params = {
        TableName: FORM_TABLE,
        Item: item
    }
    await docClient.put(params).promise();
    return item
}

const getFormList = async (user) => {
    var params = {
        TableName : FORM_TABLE,
        KeyConditionExpression: "company = :company",
        ExpressionAttributeValues: {
            ":company":  user.company
        }
    };

    let results = await docClient.query(params).promise();
    return results.Items;
}

const addSubmitterKey = async (keyObj) => {
    keyObj.createdAt = new Date().getTime();
    let params = {
        TableName: FORM_KEY_TABLE,
        Item: keyObj
    }
    await docClient.put(params).promise();
    return keyObj;
}

module.exports = {
    putForm: putForm,
    getForm: getForm,
    getFormById: getFormById,
    getFormList: getFormList,
    setStatus: setStatus,
    addSubmitterKey: addSubmitterKey
}
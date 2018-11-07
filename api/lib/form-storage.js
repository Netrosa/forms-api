const AWS = require("aws-sdk");
const uuid = require("uuid/v4");
const ipfs = require("./ipfs");
const docClient = new AWS.DynamoDB.DocumentClient();

const FORM_TABLE = "forms"

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
    let hash = await ipfs.save(form.form);
    let mode = form.test ? "TEST" : "PROD";
    let item = {
        "company": user.company,
        "formId": id,
        "name": form.name,
        "ipfsHash": hash,
        "createdAt": new Date().getTime(),
        "network": form.network,
        "createdBy": user.email,
        "authType": form.authType,
        "formStatus": "building",
        "txStatus": "pending",
        "mode": mode
    };
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

module.exports = {
    putForm: putForm,
    getForm: getForm,
    getFormList: getFormList,
    setStatus: setStatus
}
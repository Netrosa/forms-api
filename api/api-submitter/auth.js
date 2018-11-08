const AWS = require("aws-sdk")
const docClient = new AWS.DynamoDB.DocumentClient();
const encryption = require('../lib/encryption')

const TABLE_SUBMITTER_KEYS = "formSubmitterKeys";

const authorizeKey = async (formId, key) => {
    let hashedKey = encryption.sha256Hash(key);
    let params = {
        TableName: TABLE_SUBMITTER_KEYS,
        Key:{
            "formId": formId,
            "hashedKey": hashedKey
        }
    };
    let data = await docClient.get(params).promise();
    if(data.Item && data.Item.enabled){
        return true
    }
    return false;
}

module.exports = {
    authorizeKey: authorizeKey
}
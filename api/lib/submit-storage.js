const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();


/* Example Payload
    {
        company: form.company,
        formId: formId,
        subId: tokenId,
        senderId: senderId,
        payload: submissionPayload
    }
*/
const addSubmission = async (submissionObj) => {
    submissionObj.createdAt = new Date().getTime()
    submissionObj.txStatus = "pending"

    let params = {
        TableName: "formSubmissions",
        Item: submissionObj
    }
    
    await docClient.put(params).promise()
}

const getSubmission = async (formId, subId) => {
    let params = {
        TableName: "formSubmissions",
        Key: {
            "formId": formId,
            "subId": subId
        }
    }
    let data = await docClient.get(params).promise();
    return data.Item;
}

module.exports = {
    addSubmission: addSubmission,
    getSubmission: getSubmission
}
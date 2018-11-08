const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();

const addSubmission = async (submissionObj) => {
    submissionObj.createdAt = new Date().getTime()
    submissionObj.txStatus = "pending"

    let params = {
        TableName: "formSubmissions",
        Item: submissionObj
    }
    
    await docClient.put(params).promise()
}

module.exports = {
    addSubmission: addSubmission
}
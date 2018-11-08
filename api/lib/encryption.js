const AWS = require("aws-sdk")
const crypto = require('crypto');
const nJwt = require('njwt');
const ursa = require('ursa');

const docClient = new AWS.DynamoDB.DocumentClient();
const kmsClient = new AWS.KMS();

const KEY_TABLE = "formKeys";

const KEY_TYPE = {
    ENCRYPTION_PRIVATE: "encryption-private",
    ENCRYPTION_PUBLIC: "encryption-public",
    JWT_PUBLIC: "jwt-public",
    JWT_PRIVATE: "jwt-private",
    ANONYMIZE: "anonymize"
}

const kmsDecrypt = async (ctx, encryptedString) => {
    const cipherText = Buffer.from(encryptedString, "base64");
    const params = { EncryptionContext:ctx, CiphertextBlob: cipherText };
    const result = await kmsClient.decrypt(params).promise();
    return result.Plaintext.toString();
}

const getKey = async (formId, keyType) => {
    var params = {
        TableName: KEY_TABLE,
        Key:{
            "formId": formId,
            "keyType": keyType
        }
    };
    let data = await docClient.get(params).promise();
    let value = data.Item.value;
    if(data.Item.encrypted){
        return await kmsDecrypt({"id": formId,"type": keyType}, value)
    } else{
        return value
    }
}

const sha256Hash = (str) => {
    let hash = crypto.createHash("sha256")
    hash.update(str);
    return hash.digest().toString("base64");
}

const toHmac = (value, key) => {
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(value);
    return hmac.digest('hex');
};

const getJwtPublicKey = async (formId) => {
    return await getKey(formId, KEY_TYPE.JWT_PUBLIC)
}

const anonymize = async (formId, text) => {
    let secret = await getKey(formId, KEY_TYPE.ANONYMIZE);
    return toHmac(text, secret)
}

const verifyJwt = async (token) => {
    const key = token.split(".")[1]
    const formId = JSON.parse(new Buffer(key, "base64").toString("ascii")).scope;
    const secretBase64 = await getJwtPublicKey(formId);
    const secretBuffer = Buffer.from(secretBase64, 'base64'); 

    return new Promise((resolve, reject) => {
        nJwt.verify(token, secretBuffer.toString(), 'RS256', function (err, verified) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    subId: verified.body.sub,
                    formId: verified.body.scope,
                    tokenId: `${verified.body.sub}${verified.body.jti}`
                }) 
            }
        });
    })
}

const extractAuthHeader = (event) => {
    let authorization = event.headers.Authorization;
    if(authorization){
        let token = authorization.replace(/Bearer /, "");
        return token;
    }
    return null;
}

const createJwt = async (formId, token) => {
    let sub = await anonymize(formId, `${formId}:${token}`);
    let claims = {
        iss: "https://netrosa.io/",
        sub: sub,
        scope: formId
    };
    let secretBase64 = await getKey(formId, KEY_TYPE.JWT_PRIVATE)
    var secretBuffer = Buffer.from(secretBase64, 'base64'); 

    let jwt = nJwt.create(claims, secretBuffer.toString() ,'RS256');
    jwt.setExpiration(new Date().getTime() + (60 * 60 * 1000));
    return jwt.compact();
}

const encrypt = async (formId, text) => {
    let encryptionKey = await getKey(formId, KEY_TYPE.ENCRYPTION_PUBLIC);
    let keyBuffer = new Buffer(encryptionKey, "base64");
    let encrypted = crypto.publicEncrypt(keyBuffer, new Buffer(text, "utf8"))
    return encrypted.toString("base64")
}

const checkSignature = async (text, publicKey, signature) => {
    const pub = ursa.createPublicKey(publicKey, 'base64');    
    return pub.hashAndVerify('md5', new Buffer(text), signature, "base64");
}

module.exports =  {
    KEY_TYPE: KEY_TYPE,
    anonymize: anonymize,
    sha256Hash: sha256Hash,
    extractAuthHeader: extractAuthHeader,
    verifyJwt: verifyJwt,
    checkSignature: checkSignature,
    createJwt: createJwt,
    getJwtPublicKey: getJwtPublicKey,
    encrypt: encrypt
}
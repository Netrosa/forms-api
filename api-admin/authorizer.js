const AWS = require("aws-sdk")
const https = require("https")
const jose = require('node-jose');

const region = process.env.region;
const userpool_id = process.env.userPoolId;
const app_client_id = process.env.appClientId;
const keys_url = 'https://cognito-idp.' + region + '.amazonaws.com/' + userpool_id + '/.well-known/jwks.json';

// check cognito username/password
const authToken = async (username, password) => {
    let sp = new AWS.CognitoIdentityServiceProvider({ apiVersion: '2016-04-18' });
    const authParams = {
        USERNAME: username,
        PASSWORD: password
    };

    const params = {
        UserPoolId: userpool_id,
        ClientId: app_client_id,
        AuthFlow: "ADMIN_NO_SRP_AUTH",
        AuthParameters: authParams
    }
    const data = await sp.adminInitiateAuth(params).promise();
    return data.AuthenticationResult.IdToken
}

// adapted from https://github.com/awslabs/aws-support-tools/blob/master/Cognito/decode-verify-jwt/decode-verify-jwt.js
const getClaims = async (token) => {

    return new Promise((resolve, reject) => {
        let sections = token.split('.');
        // get the kid from the headers prior to verification
        let header = jose.util.base64url.decode(sections[0]);
        header = JSON.parse(header);
        let kid = header.kid;
        // download the public keys
        https.get(keys_url, async (response) => {
            if (response.statusCode == 200) {
                response.on('data',  async (body) => {
                    let keys = JSON.parse(body)['keys'];
                    // search for the kid in the downloaded public keys
                    let key_index = -1;
                    for (let i = 0; i < keys.length; i++) {
                        if (kid == keys[i].kid) {
                            key_index = i;
                            break;
                        }
                    }
                    if (key_index == -1) {
                        console.error('Public key not found in jwks.json');
                        reject('Public key not found in jwks.json');
                    }
                    // construct the public key
                    let result = await jose.JWK.asKey(keys[key_index]);
                    let claimsResult = await jose.JWS.createVerify(result).verify(token)
                    let claims = JSON.parse(claimsResult.payload);
                    // additionally we can verify the token expiration
                    current_ts = Math.floor(new Date() / 1000);
                    if (current_ts > claims.exp) {
                        reject('Token is expired');
                    }
                    // and the Audience (use claims.client_id if verifying an access token)
                    if (claims.aud != app_client_id) {
                        reject('Token was not issued for this audience');
                    }
                    let flatClaims = {}

                    // must flatten arrays to single-tier
                    Object.keys(claims).forEach((k) => {
                        if(Array.isArray(claims[k])){
                            if(claims[k].length > 0){
                                claims[k].forEach((c) => {
                                    flatClaims[`${k}:${c}`] = true;
                                })
                            }
                        } else {
                            flatClaims[k] = claims[k];
                        }
                    })
                    resolve(flatClaims);
                });
            }
        });
    })
}

const generateIamPolicy = (principalId, Effect, methodArn, context) => {
    let prefix = methodArn.split("/")[0];
    let policy = {
        principalId: principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [{ 
                Action: 'execute-api:Invoke', 
                Effect: Effect, 
                Resource: [
                    `${prefix}/*/*/form`, 
                    `${prefix}/*/*/form/*`
                ]
            }],
        },
        context
    }
    console.log(methodArn)
    console.log(policy.policyDocument.Statement)
    return policy;
};


exports.authorize = async (event, context, callback) => {
    try{
        let authorizationHeader = event.authorizationToken;

        if (!authorizationHeader) {
            callback(null, generateIamPolicy("unknown", "Deny", event.methodArn, {}));
            return;
        } 

        let token = authorizationHeader.split(' ')[1]
        if (authorizationHeader.indexOf("Basic") > - 1) {
            let plainCreds = (new Buffer(token, 'base64')).toString().split(':')
            let username = plainCreds[0]
            let password = plainCreds[1]
            token = await authToken(username, password);
        }

        let claims = await getClaims(token);
        callback(null, generateIamPolicy(claims.sub, "Allow", event.methodArn, claims));

    } catch(e) {
        console.log("error evaluating jwt: ", e)
        callback(null, generateIamPolicy("unknown", "Deny", event.methodArn,{}));
    }
}
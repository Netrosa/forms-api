Netrosa API
===========

**Version:** 0.0.1

**License:** [GPL 3.0](https://www.gnu.org/licenses/gpl-3.0.en.html)

[Admin SDK](#admin-sdk)

[Public Client SDK](#client-sdk)

## NPM Package

```
npm install netrosa-admin-sdk
```

## Admin SDK

**Note: Admin SDK is meant for server-deployment only.  Do not place ID or Secret in the browser** 

###  Initialize Admin Client
```javascript
const adminSdk = require("netrosa-admin-sdk")

const adminApis = adminSdk.initAdminClient(
    process.env.NETROSA_API_KEY, 
    process.env.NETROSA_API_ID, 
    process.env.NETROSA_API_SECRET, 
)
```

### Create Form
```javascript
let exampleForm = {
    "title": {
        "en": "Test Form"
    },
    "fields": [
        {
            "id": "name",
            "type": "string",
            "text": {
                "en": "name"
            },
            "required": true
        },
        {
            "id": "age",
            "type": "number",
            "text": {
                "en": "age"
            },
            "required": true
        },
        {
            "id": "prop123",
            "type": "selection",
            "text": {
                "en": "Do you support Prop 123?"
            },
            "options": [
                {
                    "id": "yes",
                    "text": {
                        "en": "Yes"
                    }
                },
                {
                    "id": "no",
                    "text": {
                        "en": "No"
                    }
                }
            ],
            "required": true
        }
    ]
};

// create the form on the netvote blockchain
let form = await adminApis.CreateForm({
    form: exampleForm,
    name: "test form",      // any name
    network: "netvote",     // netvote, ropsten, or mainnet (permission required)
    authType: "key",        // key or jwt, (key uses "keys" created via the key creation api)
    test: true              // no charges for test forms, limited use and may be deleted
})

let formId = form.formId;

//wait 60s for this form to become ready
await adminApis.PollForStatus(formId, "ready", 60000);
```
### Get Form
```javascript
// get form
let res = await adminApis.GetForm(formId)
```
### Get List of Forms
```javascript
let res = await adminApis.GetFormList()
```
### Open or Resume Form (start accepting submissions)
```javascript
let res = await adminApis.OpenForm(formId)
await adminApis.PollForStatus(formId, "open", 60000);
```
### Stop Form (stop accepting submissions)
```javascript
let res = await adminApis.StopForm(formId)
```
### Close Form (Permanent)
```javascript
let res = await adminApis.CloseForm(formId)
await adminApis.PollForStatus(formId, "closed", 60000);
```
### Generate Submitter Keys
```javascript
let k = await adminApis.GenerateKeys(form.formId, 3);
// k.keys contains a list of plaintext keys
```
### Upload Submitter Keys
```javascript
// example logic for base64(sha256(key)) 
const sha256Hash = (str) => {
    let hash = crypto.createHash("sha256")
    hash.update(str);
    return hash.digest().toString("base64");
}

// hash key
let plaintextKey = "secretKey"
let hashedKey = sha256Hash(plaintextKey)

let res = await adminApis.AddKeys(formId, {hashedKeys: [hashedKey]});

console.log(res.count) // 1 
```
### Export Submissions
```javascript
await adminApis.ExportSubmissions(formId, function(obj){
    // each submission invokes this callback
    // obj {
    //      "index": 0,     // submission i of total
    //      "total": 57,    // number of submissions on blockchain
    //      "value": {...}  // this is the decrypted submission
    //  }
    // this is where one can write this result to a local file
})
```
## Client SDK

This can be initialized in a browser using a stack like [Browserify](http://browserify.org/) 

###  Initialize Public Client
```javascript
const publicSdk = require("netrosa-public-sdk")

const publicApis = publicSdk.initPublicClient(
    process.env.NETROSA_API_KEY, 
)
```
###  Get Anonymous Submitter Auth Token
```javascript
let res = await publicApis.GetJwtToken(formId, plaintextKey)
// res.token includes the JWT to use
```

###  Get Anonymous Submitter Auth Token QR
```javascript
let res = await publicApis.GetJwtTokenQR(formId, plaintextKey)

// token qr is data URL object with {formId: formId, token: jwtToken}
document.getElementById("yourimage").src = res.qr;
```

### Submit Entry
```javascript
// NOTE: the payload is NOT validated yet beyond the top-level structure
let submissionObject = {
    proof: "...",       //base64 encoded signature
    publicKey: "...",   //RSA Public key, base64 encoded
    value: {
        signatureSeed: "any sufficiently random string, like a uuid"
        choices: [...]  // this is not validated _at all_ right now
    }
}

let res = await publicApis.SubmitForm(formId, submissionObject, anonymousToken);
// returns a res.subId

```
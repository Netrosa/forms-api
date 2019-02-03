const AWS = require("aws-sdk")
const url = require('url');
const reqApi = require('./lib/request')
const networks = require('./lib/eth-networks')
const crypto = require("crypto")
const NodeRSA = require("node-rsa");

AWS.config.update({ region: 'us-east-1' });

let ID;
let SECRET;
let BASE_URL;
let API_KEY;
let IPFS_URL;
let ready=false;

const snooze = ms => new Promise(resolve => setTimeout(resolve, ms)); 

let authBasic = () => {
  let token = new Buffer(`${ID}:${SECRET}`).toString("base64");
  return token;
}

const authentify = async (headers) => {
  let token = await authBasic();
  let reqHeaders = headers || {}
  reqHeaders['Authorization'] = `Basic ${token}`;
  reqHeaders['x-api-key'] = API_KEY;
  return reqHeaders;
}

const get = async (path, headers) => {
  let reqHeaders = await authentify(headers);
  let apiPath = BASE_URL.pathname == "/" ? path : `${BASE_URL.pathname}${path}`
  return reqApi.get(BASE_URL.hostname, apiPath, reqHeaders);
};

const post = async (path, postObj, headers) => {
  let reqHeaders = await authentify(headers);
  let apiPath = BASE_URL.pathname == "/" ? path : `${BASE_URL.pathname}${path}`
  return reqApi.post(BASE_URL.hostname, apiPath, postObj, reqHeaders);
};

const ipfsGet = async (path, headers) => {
  let reqHeaders = await authentify(headers);
  let apiPath = IPFS_URL.pathname == "/" ? path : `${IPFS_URL.pathname}${path}`
  return reqApi.get(IPFS_URL.hostname, apiPath, reqHeaders);
};

const ipfsPost = async (path, postObj, headers) => {
  let reqHeaders = await authentify(headers);
  let apiPath = IPFS_URL.pathname == "/" ? path : `${IPFS_URL.pathname}${path}`
  return reqApi.post(IPFS_URL.hostname, apiPath, postObj, reqHeaders);
};


const checkReady = () =>{
  if(!ready){
    throw new Error("must call Init() first");
  }
}

const required = (name, value) => {
  if(!value){
    throw new Error(`${name} is a required field`);
  }
}

const getDecryptionKey = async (id) => {
  if(!decryptionKeys[id]){
    let resp = await get(`/form/${id}/decryptionkey`)
    if(resp.key) {
      decryptionKeys[id] = resp.key;
    }
  }
  return decryptionKeys[id]
}

function decrypt(encryptedText, password) {
  let decipher = crypto.createDecipher("aes-256-cbc", new Buffer(password));
  let dec = decipher.update(encryptedText, "base64", "utf8");
  dec += decipher.final("utf8");
  return dec;
}

const validateProof = (jsonStr, publicKey, proof) => {
  try{
    const key = new NodeRSA(Buffer.from(publicKey, "base64"));
    key.setOptions({
      signingScheme: "pkcs1-md5"
    })

    return key.verify(Buffer.from(jsonStr), Buffer.from(proof, "base64"));
  }catch(e){
    console.error(e);
    // proof validation failed, logging and squashing
  }
  return false;
}

const exportSubmissions = async (id, callback) => {
  let cb = callback || function(obj) { console.log(obj) }
  let form = await get(`/form/${id}`)

  let decryptionKey = await getDecryptionKey(id);
  let provider = await networks.NetvoteProvider(form.network);
  let SubmissionLog = await provider.SubmissionLog(form.version);
  let hashedFormId = await provider.sha3(id);

  let count = (await SubmissionLog.getEntriesCount(hashedFormId)).toNumber();

  for(let i=0; i<count; i++){
    let entryHash = await SubmissionLog.getEntryAt(hashedFormId, i);
    let entry = await getFromIpfs(entryHash);
    let decrypted = decrypt(entry.value, decryptionKey)

    let obj = decrypted;
    try{
      obj = JSON.parse(decrypted)
    }catch(e){
      //ignore, not everything is JSON
    }

    let validProof = validateProof(decrypted, entry.publicKey, entry.proof);
    
    cb({
      index: i,
      total: count,
      decrypted: obj,
      validProof: validProof,
      publicKey: entry.publicKey,
      proof: entry.proof
    })
  }
  return true;
}

const getFromIpfs = async (hash) =>{ 
  let res = await ipfsGet(`/ipfs/${hash}`)
  try{
    return JSON.parse(res);
  }catch(e){
    return res;
  }
}

const decryptionKeys = {}

module.exports = {
  Init: async(params) => {
    required("id", params.id);
    required("secret", params.secret);
    required("apiKey", params.apiKey);
    required("baseUrl", params.baseUrl);
    ID = params.id;
    SECRET = params.secret;
    API_KEY = params.apiKey;
    BASE_URL = url.parse(params.baseUrl);
    IPFS_URL = url.parse(params.ipfsUrl);
    ready=true;
  },
	CreateForm: async(payload) => {
    checkReady();
    return await post("/form", payload)
  },
  OpenForm: async(id) => {
    checkReady();
    return await post(`/form/${id}/status`, {
      status:"open"
    })
  },
  StopForm: async(id) => {
    checkReady();
    return await post(`/form/${id}/status`, {
      status:"stopped"
    })
  },
  AddKeys: async(id, keys) => {
    checkReady();
    return await post(`/form/${id}/keys`, {
      hashedKeys: keys
    })
  },
  ExportSubmissions: async(id, submissionCallback) => {
    checkReady();
    return await exportSubmissions(id, submissionCallback);
  },
  GenerateKeys: async(id, count) => {
    checkReady();
    return await post(`/form/${id}/keys`, {
      generate: count
    })
  },
  CloseForm: async(id) => {
    checkReady();
    return await post(`/form/${id}/status`, {
      status:"closed"
    })
  },
  GetSubmissionStatus: async(id, subId) => {
    checkReady();
    return await get(`/form/${id}/submission/${subId}`)
  },
  GetFromIPFS: async(hash) => {
    checkReady();
    return await getFromIpfs(hash)
  },
  SaveToIPFS: async(obj) => {
    checkReady();
    return await ipfsPost(`/ipfs`, obj)
  },
  GetDecryptionKey: async(id) => {
    checkReady();
    return await getDecryptionKey(id);
  },
  GetForm: async (id) => {
    checkReady();
    return await get(`/form/${id}`)
  },
  PollForStatus: async(id, status, timeout) => {
    checkReady();
    let now = new Date().getTime();
    let expired = now + timeout;

    while(new Date().getTime() < expired){
      let job = await get(`/form/${id}`)
      if(job.formStatus === status){
        return job;
      }
      //wait 2 seconds
      await snooze(2000);
    }
    throw new Error("timeout occured while polling for job");
  },
  GetFormList: async() => {
    checkReady();
    return await get(`/form`)
  },
  GetForm: async(id) => {
    checkReady();
    return await get(`/form/${id}`)
  }
}

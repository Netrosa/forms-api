const AWS = require("aws-sdk")
const url = require('url');
const reqApi = require('./lib/request')
const networks = require('./lib/eth-networks')
const crypto = require("crypto")

AWS.config.update({ region: 'us-east-1' });

let ID;
let SECRET;
let BASE_URL;
let API_KEY;
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
    let decrypted = crypto.privateDecrypt(new Buffer(decryptionKey, "base64"), new Buffer(entry.value, "base64"))

    let obj = JSON.parse(decrypted.toString("utf8"))
    //TODO: validate proof here
    cb({
      index: i,
      total: count,
      decrypted: obj
    })
  }
  return true;
}

const getFromIpfs = async (hash) =>{ 
  let res = await get(`/ipfs/${hash}`)
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
  PollSubmissionForStatus: async(id, subId, status, timeout) => {
    checkReady();
    let now = new Date().getTime();
    let expired = now + timeout;

    while(new Date().getTime() < expired){
      let job = await get(`/form/${id}/submission/${subId}`)
      if(job.txStatus === status){
        return true;
      }
      if(job.txStatus === "error"){
        throw new Error(job.errorMessage)
      }
      //wait 2 seconds
      await snooze(2000);
    }
    throw new Error("timeout occured while polling for job");
  },
  GetFromIPFS: async(hash) => {
    checkReady();
    return await getFromIpfs(hash)
  },
  SaveToIPFS: async(obj) => {
    checkReady();
    return await post(`/ipfs`, obj)
  },
  GetDecryptionKey: async(id) => {
    checkReady();
    return await getDecryptionKey(id);
  },
  PollForStatus: async(id, status, timeout) => {
    checkReady();
    let now = new Date().getTime();
    let expired = now + timeout;

    while(new Date().getTime() < expired){
      let job = await get(`/form/${id}`)
      if(job.formStatus === status){
        return true;
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

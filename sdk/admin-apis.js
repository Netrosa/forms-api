const AWS = require("aws-sdk")
const url = require('url');
const reqApi = require('./lib/request')

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
  GetDecryptionKey: async(id) => {
    checkReady();
    if(!decryptionKeys[id]){
      let resp = await get(`/form/${id}/decryptionkey`)
      if(resp.key) {
        decryptionKeys[id] = resp.key;
      }
    }
    return decryptionKeys[id]
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

const url = require('url');
const reqApi = require('./lib/request')
const ethApi = require("./lib/ethereum-lib")
const signing = require("./lib/signing")
const uuid = require("uuid/v4");

let BASE_URL;
let API_KEY;
let ready=false;

const apiPath = (path) => {
  return BASE_URL.pathname == "/" ? path : `${BASE_URL.pathname}${path}`;
}

const authentify = (headers) => {
  let reqHeaders = headers || {}
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

const snooze = ms => new Promise(resolve => setTimeout(resolve, ms)); 

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

const getFromIpfs = async (hash) =>{ 
  let res = await get(`/ipfs/${hash}`)
  try{
    return JSON.parse(res);
  }catch(e){
    return res;
  }
}

module.exports = {
  Init: async(params) => {
    required("baseUrl", params.baseUrl);
    required("apiKey", params.apiKey);
    BASE_URL = url.parse(params.baseUrl);
    API_KEY = params.apiKey;
    ready=true;
  },
  GetForm: async(formId) => {
    checkReady();
    let form = await get(`/form/${formId}`)
    let formPayload = await getFromIpfs(form.ipfsHash);
    return {
      form: formPayload,
      metadata: form
    }
  },
  GetFromIPFS: async(hash) => {
    checkReady();
    return await getFromIpfs(hash)
  },
  GetJwtToken: async(formId, token) => {
    checkReady();
    let headers = {
      "Authorization": `Bearer ${token}`
    }
    return await post(`/form/${formId}/auth/jwt`, null, headers)
  },
  GetJwtTokenQR: async(formId, token) => {
    checkReady();
    let headers = {
      "Authorization": `Bearer ${token}`
    }
    return await post(`/form/${formId}/auth/qr`, null, headers)
  },
  SubmitForm: async(formId, submission, token) => {
    checkReady()
    let headers = {
      "Authorization": `Bearer ${token}`
    }
    if(!submission.signatureSeed){
      submission.signatureSeed = uuid();
    }
    let payload = await signing.sign(submission);
    payload.value = submission;
    let resp = await post(`/form/${formId}/submission`, payload, headers)
    return {
      response: resp,
      payload: payload
    }
  },
  ConfirmSubmissionProof: async(formId, subId, proof) => {
    let form = await get(`/form/${formId}`);
    let sub = await get(`/form/${formId}/submission/${subId}`);

    let entryHash = sub.entryHash;
    let txId = sub.txId;
    
    // claimed hash has source proof in it
    let encryptedEntry = await getFromIpfs(entryHash);
    if(encryptedEntry.proof !== proof) {
      throw new Error(`Proof mismatch: expected=${proof}, actual=${encryptedEntry.proof}`)
    }
    // transaction has claimed hash in it
    console.log(`${form.network}, ${form.version}, ${txId}`)
    let transaction = await ethApi.getSubmissionTx(form.network, form.version, txId);
    if(transaction.value !== entryHash) {
      throw new Error(`Proof on transaction does not match:  expected=${entryHash} actual=${transaction.value}`)
    }
  },
  GetSubmission: async(formId, subId) => {
    checkReady()
    return await get(`/form/${formId}/submission/${subId}`)
  },
  PollSubmissionForStatus: async(id, subId, status, timeout) => {
    checkReady();
    let now = new Date().getTime();
    let expired = now + timeout;

    while(new Date().getTime() < expired){
      let sub = await get(`/form/${id}/submission/${subId}`)
      if(sub.txStatus === status){
        return sub;
      }
      if(sub.txStatus === "error"){
        throw new Error(sub.errorMessage)
      }
      //wait 2 seconds
      await snooze(2000);
    }
    throw new Error("timeout occured while polling for sub");
  },
}

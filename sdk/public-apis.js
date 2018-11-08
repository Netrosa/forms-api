const url = require('url');
const reqApi = require('./lib/request')

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

module.exports = {
  Init: async(params) => {
    required("baseUrl", params.baseUrl);
    required("apiKey", params.apiKey);
    BASE_URL = url.parse(params.baseUrl);
    API_KEY = params.apiKey;
    ready=true;
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
  SubmitForm: async(formId, payload, token) => {
    checkReady()
    let headers = {
      "Authorization": `Bearer ${token}`
    }
    return await post(`/form/${formId}/submission`, payload, headers)
  }
}

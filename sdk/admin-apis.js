const AWS = require("aws-sdk")
const url = require('url');
const reqApi = require('./lib/request')

AWS.config.update({ region: 'us-east-1' });

let ID;
let SECRET;
let BASE_URL;
let API_KEY;
let ready=false;

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
  GetFormList: async(id, obj) => {
    checkReady();
    return await get(`/form`, obj)
  },
  GetForm: async(id) => {
    checkReady();
    return await get(`/form/${id}`)
  }
}

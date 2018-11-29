'use strict';
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var ipfsClient = require('ipfs-http-client')

let IPFS_URL_LIST = ["ipfs.netvote.io", "ipfs.infura.io"];

let IPFS_CFG = [{
    host: "ipfs.infura.io",
    protocol: 'https',
    port: '5001'
}, {
    host: "ipfs.netvote.io",
    port: '8443',
    protocol: 'https'
}]

const saveToIPFS = async (data) => {
    let retries = 2;
    for (let i = 0; i < retries; i++) {
        for (let u = 0; u < IPFS_CFG.length; u++) {
            try {
                let ipfs = ipfsClient(IPFS_CFG[u]);
                return await saveToIPFSUnsafe(ipfs, data);
            } catch (e) {
                console.error(e);
                console.warn("warning, cannot save to ipfs...trying again");
            }
        }
    }
    throw new Error("All attempts failed trying to access ipfs for data:"+data)
}

const saveToIPFSUnsafe = async (ipfs, data) => {
    return new Promise(async (resolve, reject) => {
        let completed = false;
        setTimeout(function(){
            if(!completed){
                reject(new Error("IPFS save timeout"));
            }
        }, 10000);
        if(typeof data === "object"){
            data = JSON.stringify(data);
        }   
        let res = await ipfs.add({
            content: Buffer.from(data, "base64"),
            path: "data"
        }, {
            "raw-leaves": true
        });   
        completed = true;
        console.log("put object to IPFS: "+JSON.stringify(res))
        console.log("data length: "+data.length);
        resolve(res[0].hash);
    })
}

const getIpfsClient = (ipfsUrl) => {
    return  ipfsClient({ host: ipfsUrl, port: 443, protocol: 'https' });
}

let getFromIPFS = async (location) => {
    let retries = 2;
    for(let i=0; i<retries; i++){
        for(let u = 0; u<IPFS_URL_LIST.length; u++){
            try{
                let ipfs = getIpfsClient(IPFS_URL_LIST[u])
                return await getFromIPFSUnsafe(ipfs, location);
            } catch (e) {
                //already logged, try again
            }
        }
    }
    throw new Error("Error trying to access ipfs: "+location)
}

const getFromIPFSUnsafe = async (ipfsObj, location) => {
    return new Promise(async (resolve, reject) => {
        let completed = false;
        setTimeout(function(){
            if(!completed){
                reject(new Error("IPFS get timeout"));
            }
        }, 5000);
        let obj = await ipfsObj.cat(location);
        completed = true;
        resolve(obj);
    })
}

const saveToS3 = async(hash, payload) => {
    if(!payload){
        throw new Error("payload is required")
    }

    let body = (payload !== null && typeof payload === 'object') ? JSON.stringify(payload) : payload;
    var params = {
        Bucket : "netvote-ipfs",
        Key : hash,
        Body : Buffer.from(body, "base64")
    }
    await s3.putObject(params).promise();
}

const save = async (payload) => {  
    let hash = await saveToIPFS(payload);
    await saveToS3(hash, payload);
    return hash;
}

const getFromS3 = async(hash) => {
    try {
        let obj = await s3.getObject({Bucket:"netvote-ipfs", Key: hash}).promise()
        return obj.Body.toString('base64');
    }catch(e) {
        return null;
    }
}

const get = async (hash) => {
    let body = await getFromS3(hash);
    if(!body) {
        body = await getFromIPFS(hash);
        await saveToS3(hash, body);
    }
    return body;
}

const getJson = async (hash) => {
    let body = await get(hash);
    if(typeof body !== 'object'){
        return JSON.parse(body);
    }
    return body;
}

module.exports = {
    save: save,
    get: get,
    getJson: getJson
}

const abiDecoder = require('abi-decoder'); // NodeJS
const rp = require('request-promise-native');
const Web3 = require("web3");

const toContractUrl = (name, version) => {
    return `https://s3.amazonaws.com/netrosa-contracts/${version}/${name}.json`
}

const networks = {
    "netvote": "https://eth.netvote.io",
    "ropsten": `https://ropsten.infura.io`,
    "mainnet": `https://mainnet.infura.io`
}

const abiCache = {}

const getAbi = async (name, version) => {
    const url = toContractUrl(name, version);
    if(!abiCache[url]){
        abiCache[url] = (await rp(url, { json: true })).abi
    }
    return abiCache[url];
}

const toMap = async (argList) => {
    let result = {}
    for(let i=0; i<argList.length; i++){
        result[argList[i].name] = argList[i].value;
    }
    return result;
}

const getSubmissionTx = async (network, version, txId) => {
    if(!networks[network]) {
        throw new Error("unsupported network: "+network)
    }
    let abi = await getAbi("SubmissionLog", version);
    abiDecoder.addABI(abi);

    let web3Provider = new Web3.providers.HttpProvider(networks[network]);
    let web3 = new Web3(web3Provider);
    let tx = await web3.eth.getTransaction(txId);
    let decoded = abiDecoder.decodeMethod(tx.input)
    return toMap(decoded.params);
}

module.exports = {
    getSubmissionTx: getSubmissionTx
}
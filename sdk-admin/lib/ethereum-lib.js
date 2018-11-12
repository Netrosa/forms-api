
let NETWORK;

const rp = require('request-promise-native');
const HDWalletProvider = require("truffle-hdwallet-provider");
const contract = require('truffle-contract');
const Web3 = require("web3");

const contractCache = {}

let web3Provider;
let web3;
let web3Defaults;

const networks = {
    "netvote": "https://eth.netvote.io",
    "ropsten": `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,
    "mainnet": `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
}

const initProvider = async () => {
    if(!NETWORK) {
        throw new Error("network not initialized");
    }
    if(NETWORK.id == "ropsten" || NETWORK.id == "mainnet"){
        if(!process.env.INFURA_API_KEY) {
            console.log("For ropsten or mainnet, set the INFURA_API_KEY environment variable")
            throw new Error("INFURA_API_KEY is not set")
        }
    }
    web3Provider = new Web3.providers.HttpProvider(NETWORK.url);
    web3 = new Web3(web3Provider);
}

const toContractUrl = (name, version) => {
    return `https://s3.amazonaws.com/netrosa-contracts/${version}/${name}.json`
}

const getAbi = async (name, version) => {
    const url = toContractUrl(name, version);
    let c = contractCache[url];
    if(!c) {
        c = contract(await rp(url, { json: true }))
        console.log(`loaded ${name}/${version} from S3`)
    }
    //set every time in case config changed in dynamodb (gas price mainly)
    c.setProvider(web3Provider)
    c.defaults(web3Defaults);
    if (typeof c.currentProvider.sendAsync !== "function") {
        c.currentProvider.sendAsync = function() {
            return c.currentProvider.send.apply(
                c.currentProvider, arguments
            );
        };
    }
    contractCache[url] = c;
    return c;
}

module.exports = {
    Init: async (network) => {
        if(!networks[network]){
            throw new Error(`invalid network: ${network}`)
        }
        NETWORK = {
            id: network,
            url: networks[network]
        }
        await initProvider();
    },
    SubmissionLog: async (version) => {
        let abi = await getAbi("SubmissionLog", version)
        return await abi.deployed();
    },
    web3: () => {
        return web3;
    },
    ethUrl: () => {
        return NETWORK.url;
    },
    sha3: (str) => {
        return web3.utils.sha3(str)
    }
}
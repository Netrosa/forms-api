const initPublicClient = (apiKey, version) => {
    let v = version || "v1";
    const publicApi = require("./public-apis");
    publicApi.Init({
        apiKey: apiKey,
        baseUrl: `https://api.netrosa.io/${v}`,
        ipfsUrl: `https://ipfs.citizendata.network/${v}`
    })
    return publicApi;
}

module.exports = {
    initPublicClient: initPublicClient
}
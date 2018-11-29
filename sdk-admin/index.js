const initAdminClient = (apiKey, id, secret, version) => {
    let v = version || "v1";
    const adminApi = require("./admin-apis");
    adminApi.Init({
        apiKey: apiKey,
        id: id,
        secret: secret,
        baseUrl: `https://api.netrosa.io/${v}`,
        ipfsUrl: `https://ipfs.citizendata.network/${v}`
    })
    return adminApi;
}

module.exports = {
    initAdminClient: initAdminClient,
}
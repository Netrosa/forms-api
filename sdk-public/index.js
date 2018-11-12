const initPublicClient = (apiKey, version) => {
    let v = version || "v1";
    const adminApi = require("./public-apis");
    adminApi.Init({
        apiKey: apiKey,
        baseUrl: `https://api.netrosa.io/${v}`
    })
    return adminApi;
}

module.exports = {
    initPublicClient: initPublicClient
}
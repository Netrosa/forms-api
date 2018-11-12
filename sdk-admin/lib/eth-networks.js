const networkMap = {}

module.exports = {
    NetvoteProvider: async (network)=>{
        if(!networkMap[network]) {
            delete require.cache[require.resolve('./ethereum-lib')];
            const provider = require("./ethereum-lib")
            networkMap[network] = provider;
        }
        // refresh with dynamodb data (in case gas price changed)
        await networkMap[network].Init(network);
        return networkMap[network];
    }
}
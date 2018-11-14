const NodeRSA = require("node-rsa");

//for browser compatibility 
function toBase64( bufferText ) {
    if(bufferText.indexOf(",") == -1){
        return bufferText;
    }
    let buffer = bufferText.split(","); 
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}

const sign = async (payload) => {
    let canonicalJson = JSON.stringify(payload);
    const key = new NodeRSA();
    key.setOptions({
        signingScheme: "pkcs1-md5"
    })
    key.generateKeyPair();

    const public = key.exportKey('public');
    let pub = toBase64(new Buffer(public).toString("base64"));

    let sig = key.sign(new Buffer(canonicalJson), null, "base64").toString("base64")
    
    let obj = {
        proof: sig,
        publicKey: pub
    }
    return obj;
}


module.exports = {
    sign: sign
}

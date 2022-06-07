
var NodeRSA = require("node-rsa");
// var fs = require("fs");
/* var key = undefined;



if(!fs.existsSync("./private.key") || !fs.existsSync("./public.key"))
{
    key = new NodeRSA({b:2048});
    if(fs.existsSync("./public.key")) fs.unlinkSync("./public.key");
    if(fs.existsSync("./private.key")) fs.unlinkSync("./private.key");

    fs.writeFileSync("./private.key", key.exportKey("pkcs1-private-pem"));
    fs.writeFileSync("./public.key", key.exportKey("pkcs1-public-pem"));
    console.log("New keypair generated.")
}
else
{
    key = new NodeRSA();
    key.importKey(fs.readFileSync("./private.key", "ascii"), "pkcs1-private-pem");
    key.importKey(fs.readFileSync("./public.key", "ascii"), "pkcs1-public-pem");
    console.log("Keys imported.");
} */

var key = new NodeRSA({b:2048});


exports.getSelfPublicKey = () => {

    return key.exportKey("pkcs1-public-pem");
}

exports.getSelfPrivateKey = () => {

    return key.exportKey("pkcs1-private-pem");
}

exports.decryptData = (privateKey, data) => {

    var decryptionAgent = new NodeRSA();
    decryptionAgent.importKey(privateKey, "pkcs1-private-pem");
    return decryptionAgent.decrypt(data, "ascii");
}

exports.encryptData = (publicKey, data) => {

    var encryptionAgent = new NodeRSA();
    encryptionAgent.importKey(publicKey, "pkcs1-public-pem");
    return encryptionAgent.encrypt(data, "base64");
}

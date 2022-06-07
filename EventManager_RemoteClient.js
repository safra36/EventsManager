
const net = require('net');
const crypto = require("crypto");
const EventsManager = require('./EventManager');
const rand = (length=16) => {return crypto.randomBytes(length).toString("hex")}
var RSAEncryptor = require("./RSA.js");


var heartbeat_service = null;
var ServerKey = -1;


exports.createRPC = (port, ip="127.0.0.1", id, secret) => {

    return new Promise((res, rej) => {

        var client = net.createConnection({port:port, host:ip}, () => {

            client.setEncoding("utf8")
            client.setMaxListeners(2500);
            client.setTimeout(5000)

            console.log(`Connection to RPC server successful, setting up info ...`);


            // Use secret for public key sending
    
            var sendObject = {
                id:id,
                pubKey:RSAEncryptor.getSelfPublicKey()
            }
    
            // client.write(`${JSON.stringify(sendObject)};`);
            client.write(`${JSON.stringify(sendObject)}`);
    
    
        });

        client.once("data", (cResponse) => {

            var ReponseData = cResponse.toString();
            var _ResponseIndex = ReponseData.indexOf(";");
            var ResponseObject = JSON.parse(ReponseData.substr(0, _ResponseIndex))
            if(ResponseObject.status)
            {

                if(ResponseObject.serverKey != undefined)
                {
                    var authObject = {
                        secret:secret
                    }


                    client.write(`${RSAEncryptor.encryptData(ResponseObject.serverKey, JSON.stringify(authObject))}`);

                    client.once("data", (serverAuthObject) => {

                        var ServerAuthReponseData = serverAuthObject.toString();
                        var _ServerAuthReponseData = ServerAuthReponseData.indexOf(";");
                        var AuthObjectResponse = JSON.parse(ServerAuthReponseData.substr(0, _ServerAuthReponseData))

                        if(AuthObjectResponse.status)
                        {
                            console.log(`Connection accepted!`)
                            ServerKey = ResponseObject.serverKey;
                
                            var _chunk = "";
                            var d_index = -1;

                            client.on("data", async (data) => {

                                // console.log(`DATA IN ::::  ${data}`)

                                _chunk += data.toString();
                                d_index = _chunk.indexOf(';');

                                // console.log(`DATA CHUNK: ${_chunk}`)

                                while (d_index > -1) 
                                {         
                                    try 
                                    {
                                        var JSONData = _chunk.substring(0,d_index);
                                        // console.log(JSONData)
                                        // console.log(encryptor.decrypt(encryptor.keyStore, JSONData))
                                        var inData = "";
                                        inData = JSON.parse(RSAEncryptor.decryptData(RSAEncryptor.getSelfPrivateKey(), JSONData));
                                        // console.log(inData)
                                    
                                        // var inData = JSON.parse(data)
                                        if(inData.from != undefined)
                                        {
                                            // we need to call some registered local events
                                            if(inData.rpc)
                                            {
                                                var response = await EventsManager.callAsync(inData.name, ...inData.args);

                                                var res = {};
                                                res.body = response;
                                                res.rid = inData.rid;
                                                res.id = inData.from;

                                                client.write(`${RSAEncryptor.encryptData(ServerKey, JSON.stringify(res))};`)
                                            }
                                            else
                                            {
                                                /* console.log("==========================================")
                                                console.log(inData)
                                                console.log(inData.name)
                                                console.log(inData.args)
                                                console.log("==========================================") */
                                                if(inData.name != undefined && inData.args != undefined) EventsManager.call(inData.name, ...inData.args);
                                                
                                            }
                                        }


                                    }
                                    catch(e)
                                    {
                                        console.log(`Error Proccesing Data ...`);
                                        console.log(e)
                                    }

                                    _chunk = _chunk.substring(d_index+1);
                                    d_index = _chunk.indexOf(';');
                                }  


                            })


                            client.on("error", (error) => {
                                console.log(`Error, Reconnecting ...`)
                                console.log(error)
                                client.end()
                                client.destroy();

                                clearInterval(heartbeat_service);
                                heartbeat_service = null;

                                this.createRPC(port, ip, id);
                                
                                // client.end();

                                
                            })
                        }
                        else
                        {
                            console.log(`Secret Auth Failed.`)
                            client.destroy();
                            process.exit(0);
                        }


                    })

                }
                else
                {
                    console.log(`athentication skip rejection ...`)
                }


            }
            else
            {
                if(ResponseObject.message != undefined) console.log(ResponseObject.message)
                else console.log(`Client validation rejected`)
                client.destroy();
                process.exit(0);
            }


        })


        client.on("connect", () => {

            const callRemote = (target, eventName, ...args) => {

                // Since no data needs to be returned, there is no RID (Request ID).
    
                var requestBody = {
                    beat:false,
                    name:eventName,
                    id:target,
                    args:args,
                    rpc:false
                }
    
                client.write(`${RSAEncryptor.encryptData(ServerKey, JSON.stringify(requestBody))};`, (err) => {
                    console.log(`ERROR CALL REMOTE: ${err}`)
                })
    
            }
    
            const callRemoteAsync = (target, eventName, ...args) => {
    
                return new Promise((res, rej) => {
    
                    var requestID = rand();
    
                    var requestBody = {
                        beat:false,
                        rid:requestID,
                        name:eventName,
                        id:target,
                        args:args,
                        rpc:true
                    }


                    // console.log(requestBody)
                    // console.log(ServerKey)
    
                    client.write(`${RSAEncryptor.encryptData(ServerKey, JSON.stringify(requestBody))};`)

                    var _chunkRPC = "";
                    var d_indexRPC = -1;
    
                    const listener = (data) => {

                        _chunkRPC += data.toString();
                        d_indexRPC = _chunkRPC.indexOf(';');

                        while (d_indexRPC > -1) 
                        {         
                            try 
                            {
                                var ReponseJSONData = _chunkRPC.substring(0,d_indexRPC);
                                var dataRes = "";
                                
                                dataRes = JSON.parse(RSAEncryptor.decryptData(RSAEncryptor.getSelfPrivateKey(), ReponseJSONData)); 
                                // var res = JSON.parse(reponseData)

                                // var dataRes = JSON.parse(data);
                                if(dataRes.response != undefined)
                                {
                                    client.off("data", listener);
                                    if(dataRes.response)
                                    {
                                        if(dataRes.rid == requestID) res(dataRes.data)
                                    }
                                    else
                                    {
                                        rej(`Request failed to execute or retrive data.`)
                                    }
                                }

                            }
                            catch(e)
                            {
                                console.log(`ASYNC ERROR COLLECTING REPONSE ${e}`)
                                rej(`Could not parse received data.`)
                            }
                            
                            _chunkRPC = _chunkRPC.substring(d_indexRPC+1);
                            d_indexRPC = _chunkRPC.indexOf(';');
                        }
                    }
                    
    
                    client.on("data", listener)
    
                })
            }
    
    
    
            var functions = {
                callRemote:callRemote,
                callRemoteAsync:callRemoteAsync
            }

            if(heartbeat_service == null)
            {
                heartbeat_service = setInterval(() => {

                    console.log(`Sending heartbeat ...`)
    
                    var requestBody = {
                        beat:true
                    }
        
                    // console.log(JSON.stringify(requestBody))
                    // console.log(encryptor.encrypt(encryptor.keyStore, JSON.stringify(requestBody)))
                    
                    client.write(`${RSAEncryptor.encryptData(ServerKey, JSON.stringify(requestBody))};`, (err) => {

                        if(err != undefined) console.log(`ERROR CALL REMOTE: ${err}`)
                        else console.log(`Heartbeat response OK.`)
                    })
                    
                }, 10000);
            }
            
    
            var AwaitAuthenticaiotn = setInterval(() => {

                if(ServerKey != -1)
                {
                    res(functions);
                    clearInterval(AwaitAuthenticaiotn);
                }
                
            }, 10);

        })


        client.once("error", (error) => {
            rej(error)
        })


    })


}




const challengeTypes = {
    "SUM":1,
    "SUBSTRACT":2,
    "MUTIPLE":3,
    "DEVIDE":4
}


const solver = (cType, values) => {

    var result = 1;
    if(cType == challengeTypes.SUM)
    {
        for(const num of values) result = parseInt(result) + parseInt(num);
    }
    else if(cType == challengeTypes.SUBSTRACT)
    {
        for(const num of values) result = parseInt(result) - parseInt(num);
    }
    else if(cType == challengeTypes.MUTIPLE)
    {
        for(const num of values) result = parseInt(result) * parseInt(num);
    }
    else if(cType == challengeTypes.DEVIDE)
    {
        for(const num of values) result = (parseFloat(result) / parseFloat(num)).toFixed(6);
    }


    return result;

}



/* client.on('data', (data) => {
  console.log(data.toString());
  client.end();
});
client.on('end', () => {
  console.log('disconnected from server');
}); */
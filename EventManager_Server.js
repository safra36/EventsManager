
const net = require('net');
const crypto = require("crypto");
const rand = (length=16) => {return crypto.randomBytes(length).toString("hex")}

var RSAEncryptor = require('./RSA.js')


var clients = [];
var tasks = [];
var RESPONSE_CODE = {
    "REQUEST_FAILED":-1,
    "REQUEST_SUCCESS":1,
    "REQUEST_ERROR":0
}

exports.init = (port, secret) => {

    const server = net.createServer((client) => {

        client.setEncoding("utf8");

        console.log(`[${getTime()}] new connection from ${client.remoteAddress}`)

        // Creating client object
        client.once("data", (data) => {

            // console.log(`Data after connection?`)

            // var connectData = data.toJSON();

            /* ar PreConnectData = data.toString();
            var ConnectSplitIndex = PreConnectData.indexOf(";");
            var connectData = JSON.parse(PreConnectData.substr(0, ConnectSplitIndex)); */

            var connectData = undefined;

            try
            {
                connectData = JSON.parse(data)
                console.log(connectData)
            }
            catch(e)
            {
                console.log(`Connection Error ${e}\n${client.address().address} is dropped due to error.`)
                client.destroy();
                return;
            }

            // console.log(`[${getTime()}] Conenct Data: ${data} - ${connectData} - ${JSON.stringify(connectData)} - ${connectData.id}`)


            var clientObject = {
                id:connectData.id,
                pubKey:connectData.pubKey,
                socketObject:client,
                beat:new Date().getTime() + 10000
            }

            var isIdInUse = clients.find(clientObject => clientObject.id == connectData.id);
            // console.log(isIdInUse)
            if(isIdInUse)
            {
                
                if(isIdInUse.beat > new Date().getTime())
                {
                    client.write(`${JSON.stringify({status:false})};`)
                    console.log(`[${getTime()}] Client ID in-use!`)
                    // client.destroy("client id in use")
                }
                else
                {
                    clients.splice(clients.indexOf(isIdInUse), 1);
                    console.log(`[${getTime()}] expired client, new connection accepted!`)
                }
            }
            else
            {
                client.write(`${JSON.stringify({status:true, serverKey:RSAEncryptor.getSelfPublicKey()})};`)
            }


            client.once("data", (authObject) => {

                console.log(`AuthObject: ${authObject}`)

                var _obtrainedSecrectObject = JSON.parse(RSAEncryptor.decryptData(RSAEncryptor.getSelfPrivateKey(), authObject));
                var _obtrainedSecrect = _obtrainedSecrectObject.secret;

                console.log(`S: ${secret}`)
                console.log(`C: ${_obtrainedSecrect}`)

                if(_obtrainedSecrect == secret)
                {
                    clients.push(clientObject);
                    client.write(`${JSON.stringify({status:true})};`)

                    console.log(`[${getTime()}] new client registered, id: ${connectData.id}`);
                    

                    
                    client.on("data", async (clData) => {

                        tasks.push({
                            client:client,
                            data:clData,
                            clObject:clientObject
                        })


                    })

                }
                else
                {
                    client.write(`${JSON.stringify({status:false, message:"Authentication failed."})};`)
                    client.end();
                    client.destroy();
                }


            })

            

        })

        client.on("timeout", () => {

            var clientObject = clients.find(clientObject => clientObject.socketObject == client);
            if(clientObject != undefined)
            {
                console.log(`[${getTime()}] ${clientObject.id} has timed out.`)
                clients.splice(clients.indexOf(clientObject), 1);
            }
        })

        client.on("close", (hadError) => {

            var clientObject = clients.find(clientObject => clientObject.socketObject == client);
            if(clientObject != undefined)
            {
                console.log(`[${getTime()}] ${clientObject.id} has closed ${(hadError) ? "with" : "without"} an error.`)
                clients.splice(clients.indexOf(clientObject), 1);
            }
        })

        client.on("error", (error) => {

            var clientObject = clients.find(clientObject => clientObject.socketObject == client);
            if(clientObject != undefined)
            {
                // console.log(clients.length)
                console.log(`[${getTime()}] ${clientObject.id} has dropped due to an error.`)
                console.log(`[${getTime()}] ${error}`)
                clients.splice(clients.indexOf(clientObject), 1);
                // console.log(clients.length)
            }
        })

    });


    server.on('error', (err) => {
        console.log(`[${getTime()}] Error: ${err}`)
    });



    server.listen(port, () => {
        console.log(`[${getTime()}] Event listener server deployed on ${port}`)
    });


    const processQueue = (queObject) => {

        var client = queObject.client;
        var clData = queObject.data;
        var clientObject = queObject.clObject

        var _chunk = "";
        var d_index = -1;

        console.log(`DATA IN ::::  ${clData}`)

        _chunk += clData.toString();
        d_index = _chunk.indexOf(';');

        // console.log(`CHUNK: ${_chunk}`)

        while (d_index > -1) 
        {         
            try 
            {
                var JSONData = _chunk.substring(0,d_index);
                var eventData = ""

                console.log(`Decrypted Data: ${RSAEncryptor.decryptData(RSAEncryptor.getSelfPrivateKey(), JSONData)}`)

                eventData = JSON.parse(RSAEncryptor.decryptData(RSAEncryptor.getSelfPrivateKey(), JSONData));  

                // var eventData = JSON.parse(clData)


                

                var beat = eventData.beat;
                if(beat)
                {
                    console.log(`[${getTime()}] Heartbeat from ${client.localAddress} (${clientObject.id}).`);
                    var ClientObjectForBeat = clients.find(clObject => clObject.id == clientObject.id);
                    if(ClientObjectForBeat != undefined)
                    {
                        ClientObjectForBeat.beat = new Date().getTime() + 10000;
                        ClientObjectForBeat.socketObject.write(`${RSAEncryptor.encryptData(clientObject.pubKey, "{}")};`)
                        client.setNoDelay()
                    }
                }
                else
                {
                    var rid = eventData.rid; // Request ID for response to client if RPC was true
                    var from = clientObject.id;
                    var to = eventData.id;
                    var eventName = eventData.name;
                    var args = eventData.args;
                    var rpc = eventData.rpc;

                    if(eventName != undefined)
                    {
                        if(rpc)
                        {
                            console.log(`[${getTime()}] Requesitng async task from ${from} to ${to} for the event name ${eventName}.`);
                        }
                        else
                        {
                            console.log(`[${getTime()}] Requesitng from ${from} to ${to} for the event name ${eventName}.`);
                        }
                    }
                    else
                    {
                        console.log(`[${getTime()}] Collecting async response from ${from} to ${to}.`);
                    }

                    var eventObject = {
                        from:from,
                        name:eventName,
                        args:args,
                        rpc:rpc,
                        rid:rid
                    }

                    var targetSocketObject = clients.find(clientObject => clientObject.id == to);
                    if(targetSocketObject != undefined)
                    {
                        console.log(`[${getTime()}] Request success.`)
                        var targetSocket = targetSocketObject.socketObject;
                        targetSocket.write(`${RSAEncryptor.encryptData(targetSocketObject.pubKey, JSON.stringify(eventObject))};`);

                        if(rpc)
                        {

                            var _chunkRPC = "";
                            var d_indexRPC = -1;
                            const response =  (reponseData) => {

                                _chunkRPC += reponseData.toString();
                                d_indexRPC = _chunkRPC.indexOf(';');

                                while (d_indexRPC > -1) 
                                {         
                                    try 
                                    {
                                        var ReponseJSONData = _chunkRPC.substring(0,d_indexRPC);
                                        var res = "";

                                        res = JSON.parse(RSAEncryptor.decryptData(RSAEncryptor.getSelfPrivateKey(), ReponseJSONData));  

                                        // var res = JSON.parse(reponseData)

                                        if(res.rid == rid)
                                        {
                                            const respond = {
                                                data:res.body,
                                                type:RESPONSE_CODE.REQUEST_SUCCESS,
                                                rid:res.rid,
                                                response:true
                                            };

                                            client.write(`${RSAEncryptor.encryptData(clientObject.pubKey, JSON.stringify(respond))};`);
                                            
                                            // Close reponse channel from target
                                            targetSocket.off("data", response);
                                        }
                                    }
                                    catch(e)
                                    {
                                        console.log(`ASYNC ERROR COLLECTING REPONSE ${e}`)
                                    }
                                    
                                    _chunkRPC = _chunkRPC.substring(d_indexRPC+1);
                                    d_indexRPC = _chunkRPC.indexOf(';');
                                }

                                

                            };

                            targetSocket.on("data", response)
                        }
                    }
                    else
                    {
                        console.log(`[${getTime()}] Request failed, ${to} is not connected.`)
                        
                        if(rpc)
                        {
                            var responseObject = {
                                type:RESPONSE_CODE.REQUEST_FAILED,
                                rid:rid,
                                response:true
                            }

                            client.write(`${RSAEncryptor.encryptData(clientObject.pubKey, JSON.stringify(responseObject))};`);
                        }
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

    }



    var prPre = () => {


        if(tasks.length > 0)
        {
            var task = tasks[0];

            console.log(`Doing Task: ${task}`);
            processQueue(task)
    
            tasks.splice(0, 1);
        }
        
        setTimeout(prPre, 10);

    }

    setTimeout(prPre, 10);
    
}

const getTime = () => {
    return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
}

this.init(2000, "Password");


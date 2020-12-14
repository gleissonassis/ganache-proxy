# GANACHE PROXY

This is a sample project to test a GANACHE proxy. The main ideia is create a layer above GANACHE to control calls and validate authorized users with an API KEY, almost what INFURA does!

To read the user API call, parse the method name and the proxied response information was necessary to use **node-http-proxy-json** and **body-parser** modules.

```javascript
const bodyParser = require('body-parser');
const modifyResponse = require('node-http-proxy-json');

/// (...)

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
```

The **onProxyReq** handler was configured to check the body and extract the values to create the usage report. 

```javascript
onProxyReq: async (proxyReq, req, res) => {
    /// (...)
}
```

If you do not write again the body the request will not be proxied correctly so pay attention on this lines!

```javascript
let bodyData = JSON.stringify(req.body);
proxyReq.setHeader('Content-Type','application/json');
proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));

proxyReq.write(bodyData);
```

The following lines were necessary just to control the simple report, initializing it when necessary and incrementing each method call:

```javascript
if (!calls[req.body.method]) {
    calls[req.body.method] = {
        calls: 0,
        bodyLength: 0,
        headersLength: 0,
    }
}

calls[req.body.method].calls += 1;
```

Here is a simple report (you can create something more elaborate):

```javascript
{
    "eth_blockNumber": {
        "calls": 4,
        "bodyLength": 164,
        "headersLength": 1004
    },
    "eth_getBalance": {
        "calls": 35,
        "bodyLength": 1942,
        "headersLength": 8533
    },
    "eth_getCode": {
        "calls": 2,
        "bodyLength": 125,
        "headersLength": 502
    },
    "eth_getTransactionCount": {
        "calls": 1,
        "bodyLength": 51,
        "headersLength": 251
    },
    "eth_sendRawTransaction": {
        "calls": 1,
        "bodyLength": 114,
        "headersLength": 251
    },
    "eth_getBlockByNumber": {
        "calls": 1,
        "bodyLength": 1489,
        "headersLength": 251
    },
    "eth_getTransactionReceipt": {
        "calls": 1,
        "bodyLength": 989,
        "headersLength": 251
    }
}
```

The **onProxyRes** handler was configured just to collect the length of headers and response to compute network bandwidth usage, it can be useful to access control and billing. At this point was necessary to use **node-http-proxy-json** module to parse the response, this library abstracts a lof of work, go to the repository and give him a star :). I did it!

```javascript
onProxyRes: (proxyRes, req, res) => {
    modifyResponse(res, proxyRes, function (body) {
        if (body) {
        const headersLength = Buffer.byteLength(JSON.stringify(proxyRes.headers));
        const bodyLength = Buffer.byteLength(JSON.stringify(body));

        console.log({headersLength, bodyLength, total: bodyLength + headersLength});

        // adding information to api information calls
        calls[req.body.method].headersLength += headersLength;
        calls[req.body.method].bodyLength += bodyLength;
        }
        return body;
    }
);
```

Another interesting point was control the websocket access, to keep the same logic and use an API key were necessary handle the upgrade method in another chain:

```javascript
server.on('upgrade', async (req, socket, head) => {
  const isOk = await checkAPIKey(req.url);
  console.log({isOk, url: req.url});

  if (!isOk) {
    socket.end();
  } else {
    wsProxy.upgrade(req, socket, head);
  }
});
```

I used async methods to simulate a database call or something like that!

Run this file to start to proxy,

```
node index.js
```

And this one to test the websocket connection:

```
node ws-test.js
```


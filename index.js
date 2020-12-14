const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const bodyParser = require('body-parser');
const modifyResponse = require('node-http-proxy-json');

const GANACHE_URL = 'http://localhost:7545';
const GANACHE_WS_URL = 'http://localhost:7545';
const PORT = 5050;
const KEY = '02efe2a7-c86e-46f9-8171-bca4fadbb5b5';

// a mock function to check if the provided api key is valid
const checkAPIKeyMiddleware = async (req, res, next) => {
  if (!(await checkAPIKey(req.path))) {
    return res.status(401).json({code: 'INVALID_KEY'});;
  }

  return next();
}

const checkAPIKey = async (url) => {
  return url.startsWith(`/v1/${KEY}`);
}

// in-memory calls information
calls = {};

const options = {
  target: GANACHE_URL,
  changeOrigin: true,
  ws: false,

  onProxyReq: async (proxyReq, req, res) => {
    // parsing the body to manage api calls;
    if(req.body) {
      let bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type','application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));

      proxyReq.write(bodyData);

      if (!calls[req.body.method]) {
        calls[req.body.method] = {
          calls: 0,
          bodyLength: 0,
          headersLength: 0,
        }
      }

      calls[req.body.method].calls += 1;
    }
    
    console.log(req.method, req.path, req.body);
  },

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
    });
  },
};

const wsProxy = createProxyMiddleware(GANACHE_WS_URL, { changeOrigin: true });
const proxy = createProxyMiddleware(options);

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(checkAPIKeyMiddleware);
app.use('/v1/:key/calls', function (req, res) {
  res.status(200).json(calls);
});
app.use('/v1/:key', proxy);

const server = app.listen(PORT);

//checking if a valid API Key was entered
server.on('upgrade', async (req, socket, head) => {
  const isOk = await checkAPIKey(req.url);
  console.log({isOk, url: req.url});

  if (!isOk) {
    socket.end();
  } else {
    wsProxy.upgrade(req, socket, head);
  }
});
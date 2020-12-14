const Web3 = require('web3');

const web3 = new Web3(new Web3.providers.WebsocketProvider('http://127.0.0.1:5050/v1/02efe2a7-c86e-46f9-8171-bca4fadbb5b5'));

const subscription = web3.eth.subscribe('newBlockHeaders', (error, blockHeader) => {
if (error) return console.error(error);

console.log('Successfully subscribed!', blockHeader);
}).on('data', (blockHeader) => {
console.log('data: ', blockHeader);
});

// unsubscribes the subscription
subscription.unsubscribe((error, success) => {
if (error) return console.error(error);

console.log('Successfully unsubscribed!');
});
var fs = require('fs');
var endpoint = '/customer';
module.exports = [
  {
    method: 'get',
    endpoint: endpoint,
    query: fs.readFileSync(__dirname + '/index.sql', 'utf8')
  },
  {
    method: 'post',
    endpoint: endpoint,
    query: fs.readFileSync(__dirname + '/post.sql', 'utf8')
  },
  {
    method: 'get',
    endpoint: endpoint + '/:customerId',
    query: fs.readFileSync(__dirname + '/get.sql', 'utf8')
  },
  {
    method: 'put',
    endpoint: endpoint + '/:customerId',
    query: fs.readFileSync(__dirname + '/put.sql', 'utf8')
  },
  {
    method: 'delete',
    endpoint: endpoint + '/:customerId',
    query: fs.readFileSync(__dirname + '/delete.sql', 'utf8')
  }
];
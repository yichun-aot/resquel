var resquel = require('../index.js');
var express = require('express');
var app = express();

// Load the configuration.
var config = require('./config.json');

// Add the routes to the router.
config.routes = require('./routes/index.js');

// Use the resquel library with the provided configuration.
app.use(resquel(config));

// Listen for requests.
app.listen(config.port);
console.log('Listening to port ' + config.port); // eslint-disable-line no-console

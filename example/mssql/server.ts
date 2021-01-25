// Imports
import Resquel, { ResquelConfig } from '../../src/resquel';
import express from 'express';
import { join } from 'path';

// Create config
const config: ResquelConfig = require('./config.json');
config.routes = require('./routes/index.js');
if (config.db.server === '-- YOUR DATABASE SERVER --') {
  console.log(`Example server configuration issue:`);
  console.log(`Please populate values in ${join(__dirname, 'config.json')}`);
  process.exit();
}

// Build router, and open connections to database
const resquel = new Resquel(config);

// Webserver
const app = express();
app.use(resquel.router);
app.listen(config.port);
console.log(`Listening to port: ${config.port}`);

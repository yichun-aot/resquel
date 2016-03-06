var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var router = express.Router();
var sql = require('mssql');
var _ = require('lodash');
module.exports = function(config) {

  // Add Middleware necessary for REST API's
  router.use(bodyParser.urlencoded({extended: true}));
  router.use(bodyParser.json());
  router.use(methodOverride('X-HTTP-Method-Override'));

  // Add Basic authentication to our API.
  if (config.auth) {
    var basicAuth = require('basic-auth-connect');
    router.use(basicAuth(config.auth.username, config.auth.password));
  }

  var connection = new sql.Connection(config.db);
  connection.connect(function(err) {
    if (err) {
      console.log('Could not connect to database.');
      console.log(err);
      return;
    }

    // Escape a string for SQL injection.
    var escape = function(query) {
      return query.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, function(s) {
        switch(s) {
          case "\0": return "\\0";
          case "\n": return "\\n";
          case "\r": return "\\r";
          case "\b": return "\\b";
          case "\t": return "\\t";
          case "\x1a": return "\\Z";
          default: return "\\"+s;
        }
      });
    };

    // Iterate through each routes.
    _.each(config.routes, function(route) {
      router[route.method.toLowerCase()](route.endpoint, function(req, res) {

        // Get the query to execute.
        var query = route.query.replace(/{{\s+([^}]+)\s+}}/g, function() {
          var value = '';
          var tempData = null;

          // Replace all others with the data from the submission.
          var parts = arguments[1].split('.');
          if (parts[0] === 'data') {
            tempData = _.clone(req.body);
          }
          else if (parts[0] === 'params') {
            tempData = _.clone(req.params);
          }
          else if (parts[0] === 'query') {
            tempData = _.clone(req.query);
          }

          if (!tempData) {
            return '';
          }

          for (var i = 0; i < parts.length; i++) {
            if (tempData.hasOwnProperty(parts[i])) {
              tempData = value = tempData[parts[i]];
            }
          }

          // Make sure we only set the strings or numbers.
          switch (typeof value) {
            case 'string':
              return escape(value);
            case 'number':
              return value;
            default:
              return '';
          }
        }.bind(this));

        // Perform the query.
        (new sql.Request(connection)).query(query).then(function(recordset) {
          if (!recordset) {
            res.status(200).send('OK');
          }
          else {
            if (
              (_.isArray(recordset) && recordset.length === 1) &&
              (
                (route.method === 'post') ||
                (route.method === 'put') ||
                (route.method === 'get' && Object.keys(req.params).length !== 0)
              )
            ) {
              res.status(200).send(recordset[0]);
            }
            else {
              res.status(200).send(recordset);
            }
          }
        }).catch(function(err) {
          res.status(500).send(err.message);
        });
      });
    });
  });

  return router;
};

var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var router = express.Router();
var sql = require('mssql');
var _ = require('lodash');
var Q = require('q');
module.exports = function(config) {
  var deferred = Q.defer();
  router.ready = deferred.promise;

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
      deferred.reject(err);
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

        /**
         * Execute a query.
         *
         * @param query
         */
        var makeRequest = function() {

          // Get the query.
          var query = (typeof route.query === 'function') ? route.query(req, res) : route.query;

          // Get the query to execute.
          query = query.replace(/{{\s+([^}]+)\s+}}/g, function() {
            var value = '';
            var tempData = null;

            // Replace all others with the data from the submission.
            var parts = arguments[1].split('.');
            if (parts[0] === 'params') {
              tempData = _.clone(req.params);
            }
            else if (parts[0] === 'query') {
              tempData = _.clone(req.query);
            }
            else {
              tempData = _.clone(req.body);
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
            res.result = {
              status: 200,
              data: 'OK'
            };

            if (recordset) {
              if (
                (_.isArray(recordset) && recordset.length === 1) &&
                (
                  (route.method === 'post') ||
                  (route.method === 'put') ||
                  (route.method === 'get' && Object.keys(req.params).length !== 0)
                )
              ) {
                res.result.data = recordset[0];
              }
              else {
                res.result.data = recordset;
              }
            }

            // Let the route also define its own handler.
            if (
              route.hasOwnProperty('after') &&
              (typeof route.after === 'function')
            ) {

              // Handle the route.
              route.after(req, res, function(err, result) {
                result = result || res.result;
                if (err) {
                  return res.status(500).send(err.message);
                }

                // Send the result.
                res.status(result.status).send(result.data);
              });
            }
            else {

              // Send the result.
              res.status(res.result.status).send(res.result.data);
            }
          }).catch(function(err) {
            res.status(500).send(err.message);
          });
        };

        // Ensure they can hook into the before handler.
        if (route.hasOwnProperty('before') && (typeof route.before === 'function')) {
          // Handle the route.
          route.before(req, res, function(err) {
            if (err) {
              return res.status(500).send(err.message);
            }

            makeRequest();
          });
        }
        else {
          makeRequest();
        }
      });
    });

    // Say we are ready.
    deferred.resolve();
  });

  return router;
};

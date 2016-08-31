'use strict';

var Q = require('q');
var _ = require('lodash');
var sql = require('mssql');

module.exports = function(util) {
  var connection = null;

  return {
    /**
     *
     * @param config
     *   The database settings, from the config file.
     */
    connect: function(config) {
      var db = sql.Connection(config); // eslint-disable-line new-cap

      return Q.fcall(db.connect)
        .then(function() {
          connection = db;
          return Q();
        })
        .catch(function(err) {
          throw err;
        });
    },

    request: function(query) {
      return Q.fcall((new sql.Request(connection)).query, query);
    },

    /**
     * Perform the query.
     *
     * @param query
     * @param result
     */
    query: function(route, query, res, result) {
      return this.request(query)
        .then(function(recordset) {
          res.result = _.assign({
            status: 200,
            data: 'OK'
          }, result);

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

          return Q(res);
        })
        .catch(function(err) {
          throw err;
        });
    },

    count: function(route, count, query, res) {
      return this.request(count)
        .then(function(recordset) {
          return this.query(route, query, res, {total: recordset[0].total});
        })
        .catch(function(err) {
          throw err;
        });
    },

    before: function(route, req, res) {
      // Ensure they can hook into the before handler.
      if (route.hasOwnProperty('before') && (typeof route.before === 'function')) {
        // Handle the route.
        route.before(req, res, function(err) {
          if (err) {
            throw err;
          }

          return Q();
        });
      }

      return Q();
    },

    after: function(route, req, res) {
      // Let the route also define its own handler.
      if (
        route.hasOwnProperty('after') &&
        (typeof route.after === 'function')
      ) {
        // Handle the route.
        route.after(req, res, function(err, result) {
          result = result || res.result;
          if (err) {
            throw err;
          }

          // Send the result.
          return res.status(result.status).send(result);
        });
      }

      // Send the result.
      return res.status(res.result.status).send(res.result);
    }
  };
};

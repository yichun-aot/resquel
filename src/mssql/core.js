'use strict';

var Q = require('q');
var _ = require('lodash');
var sql = require('mssql');

module.exports = function(util) {
  var connection = null;

  /**
   * Connect to the database.
   *
   * @param config
   *   The database settings, from the config file.
   */
  var connect = function connect(config) {
    var db = sql.Connection(config); // eslint-disable-line new-cap

    return Q.fcall(db.connect)
      .then(function() {
        connection = db;
        return Q();
      })
      .catch(function(err) {
        throw err;
      });
  };

  /**
   * Issue a SQL request to the connection.
   *
   * @param {string} query
   *   The SQL query to execute.
   */
  var request = function request(query) {
    return Q.fcall((new sql.Request(connection)).query, query);
  };

  /**
   * Perform the query.
   *
   * @param route
   * @param {string} query
   *   The SQL query to execute.
   * @param res
   * @param result
   */
  var query = function query(route, query, res, result) {
    return request(query)
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
  };

  /**
   * Perform a count query, followed by a regular query so the total results is included.
   *
   * @param route
   * @param {string} count
   *   The SQL query for counting items.
   * @param {string} query
   *   Te SQL query to execute.
   * @param res
   */
  var count = function count(route, count, query, res) {
    return request(count)
      .then(function(recordset) {
        return query(route, query, res, {total: recordset[0].total});
      })
      .catch(function(err) {
        throw err;
      });
  };

  /**
   * Check if the current route has a before fn defined, if so, execute it and proceed.
   *
   * @param {object} route
   *   The route object.
   * @param {object} req
   *   The express request object.
   * @param {object} res
   *   The express response object.
   *
   * @returns {Promise}
   */
  var before = function before(route, req, res) {
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
  };

  /**
   * Check if the current route has a after fn defined, if so, execute it and proceed.
   *
   * @param {object} route
   *   The route object.
   * @param {object} req
   *   The express request object.
   * @param {object} res
   *   The express response object.
   *
   * @returns {Promise}
   */
  var after = function after(route, req, res) {
    // Let the route also define its own handler.
    if (route.hasOwnProperty('after') && (typeof route.after === 'function')) {
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
  };

  return {
    connect: connect,
    request: request,
    query: query,
    count: count,
    before: before,
    after: after
  };
};

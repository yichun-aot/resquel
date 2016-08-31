'use strict';

var Q = require('q');
var _ = require('lodash');
var sql = require('mysql');
var debug = require('debug')('resquel:mysql');
var OkPacket = require('mysql/lib/protocol/packets/OkPacket');
var RowDataPacket = require('mysql/lib/protocol/packets/RowDataPacket');

module.exports = function(util) {
  var connection = null;

  /**
   *
   * @param config
   *   The database settings, from the config file.
   */
  var connect = function connect(config) {
    var configuration = {};

    if (_.has(config, 'server')) {
      configuration.host = _.get(config, 'server');
    }

    if (_.has(config, 'user')) {
      configuration.user = _.get(config, 'user');
    }

    if (_.has(config, 'password')) {
      configuration.password = _.get(config, 'password');
    }

    if (_.has(config, 'database')) {
      configuration.database = _.get(config, 'database');
    }

    // Enable multiple statement commands.
    configuration.multipleStatements = true;

    debug(configuration);
    var db = sql.createConnection(configuration);
    return Q.fcall(db.connect.bind(db))
      .then(function() {
        connection = db;
        return Q();
      })
      .catch(function(err) {
        throw err;
      });
  };

  var request = function request(query) {
    var q = Q.defer();

    connection.query(query, function(err, rows, fields) {
      if (err) {
        return q.reject(err);
      }

      return q.resolve({
        rows: rows,
        fields: fields
      });
    });

    return q.promise;
  };

  /**
   * Perform the query.
   *
   * @param query
   * @param result
   */
  var query = function query(route, query) {
    debug(query);
    return request(query)
      .then(function(response) {
        debug(response.rows);
        var data = response.rows;
        if (
          response.rows instanceof Array
          && response.rows[0] instanceof OkPacket
          && response.rows[1] instanceof Array
        ) {
          data = _.filter(response.rows[1], function(item) {
            return (item instanceof RowDataPacket);
          });
        }
        else if (typeof response.rows === 'object' && response.rows instanceof OkPacket) {
          data = [];
        }

        debug('data:');
        debug(data);
        var result = _.assign({
          status: 200,
          data: 'OK'
        }, {rows: data});

        return Q(result);
      })
      .catch(function(err) {
        throw err;
      });
  };

  var before = function before(route, req, res) {
    debug('Before:');
    debug(route);

    // Ensure they can hook into the before handler.
    if (route.hasOwnProperty('before') && (typeof route.before === 'function')) {
      // Handle the route.
      return route.before(req, res, function(err) {
        if (err) {
          throw err;
        }

        return Q();
      });
    }

    return Q();
  };

  var after = function after(route, req, res) {
    debug('After:');
    debug(route);

    // Let the route also define its own handler.
    if (
      route.hasOwnProperty('after') &&
      (typeof route.after === 'function')
    ) {
      // Handle the route.
      return route.after(req, res, function(err, result) {
        result = result || res.result;
        if (err) {
          throw err;
        }

        // Send the result.
        debug('Result:');
        debug(result);
        return res.status(result.status).send(result);
      });
    }

    // Send the result.
    debug(res.result);
    return res.status(res.result.status).send(res.result);
  };

  return {
    connect: connect,
    request: request,
    query: query,
    before: before,
    after: after
  };
};

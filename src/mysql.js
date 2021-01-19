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
   * Connect to the Database.
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
    return Q.ninvoke(db, 'connect')
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
   *
   * @returns {*|promise}
   */
  var request = function request(queryString) {
    var q = Q.defer();

    connection.query(queryString, function (err, rows, fields) {
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
   * @param {string} query
   *   The SQL query to execute.
   */
  var query = function query(queryString) {
    debug(queryString);
    return request(queryString)
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

        return result;
      })
      .catch(function(err) {
        throw err;
      });
  };

  return {
    connect: connect,
    request: request,
    query: query
  };
};

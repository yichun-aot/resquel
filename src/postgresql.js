'use strict';

var Q = require('q');
var _ = require('lodash');
var sql = require('pg');
var debug = require('debug')('resquel:postgresql');

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

    if (_.has(config, 'port')) {
      configuration.port = _.get(config, 'port');
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

    debug(configuration);
    var db = new sql.Client(configuration);
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
  var request = function request(query, values) {
    return Q.ninvoke(connection, 'query', query, values);
  };

  /**
   * Perform the query.
   *
   * @param {string} query
   *   The SQL query to execute.
   */
  var query = function query(query, values) {
    debug(query);
    debug(values);
    return request(query, values)
      .then(function(response) {
        debug(response);
        //var data = response.rows;
        //if (
        //  response.rows instanceof Array
        //  && response.rows[0] instanceof OkPacket
        //  && response.rows[1] instanceof Array
        //) {
        //  data = _.filter(response.rows[1], function(item) {
        //    return (item instanceof RowDataPacket);
        //  });
        //}
        //else if (typeof response.rows === 'object' && response.rows instanceof OkPacket) {
        //  data = [];
        //}
        //
        //debug('data:');
        //debug(data);
        //var result = _.assign({
        //  status: 200,
        //  data: 'OK'
        //}, {rows: data});
        //
        //return Q(result);
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

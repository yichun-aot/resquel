'use strict';

var Q = require('q');
var _ = require('lodash');
var sql = require('mssql');
var debug = require('debug')('resquel:mssql');

module.exports = function(util) {
  var connection = null;

  /**
   * Connect to the database.
   *
   * @param config
   *   The database settings, from the config file.
   */
  var connect = function connect(config) {
    // Double the default timeout
    config.requestTimeout = 30000;

    return (new sql.Connection(config)).connect()
      .then(function(con) {
        connection = con;
        return con;
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
  var request = function request(queryString) {
    return Q.ninvoke((new sql.Request(connection)), 'query', queryString);
  };

  /**
   * Perform the query.
   *
   * @param {string} query
   *   The SQL query to execute.
   */
  var query = function query(queryString, count) {
    debug(queryString);
    return request(queryString)
      .then(function (response) {
        debug(response);
        var data;
        if (
          response.length >= 1
        && response[0] instanceof Array // get the results
        ) {
          data = response[0];
        }
        else {
          data = [];
        }

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

  /**
   * Perform a count query, followed by a regular query so the total results is included.
   *
   * @param {string} count
   *   The SQL query for counting items.
   * @param {string} query
   *   Te SQL query to execute.
   */
  var count = function count(count, queryString) {
    return request(count)
      .then(function(recordset) {
        return query(queryString, {
          total: recordset[0].total
        });
      })
      .catch(function(err) {
        throw err;
      });
  };

  return {
    connect: connect,
    request: request,
    query: query,
    count: count
  };
};

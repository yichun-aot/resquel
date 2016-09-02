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
    return (new sql.Connection(config)).connect()
      .then(function(con) {
        connection = con;
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
    return Q.ninvoke((new sql.Request(connection)), 'query', query);
  };

  /**
   * Perform the query.
   *
   * @param {string} query
   *   The SQL query to execute.
   */
  var query = function query(query, count) {
    debug(query);
    return request(query)
      .then(function(recordset) {
        debug(recordset);
        var data = recordset || [];
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

  /**
   * Perform a count query, followed by a regular query so the total results is included.
   *
   * @param {string} count
   *   The SQL query for counting items.
   * @param {string} query
   *   Te SQL query to execute.
   */
  var count = function count(count, query) {
    return request(count)
      .then(function(recordset) {
        return query(query, {total: recordset[0].total});
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

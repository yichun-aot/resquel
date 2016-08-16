'use strict';

var _ = require('lodash');

// Escape a string for SQL injection.
var escape = function(query) {
  return query.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, function(s) { // eslint-disable-line no-control-regex
    switch (s) {
      case '\0':
        return '\\0';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '\b':
        return '\\b';
      case '\t':
        return '\\t';
      case '\x1a':
        return '\\Z';
      default:
        return '\\' + s;
    }
  });
};

var getRequestData = function(req) {
  var data = {};

  // Start building the core data obj to replace string properties with.
  if (_.has(req, 'body')) {
    data = _.assign(data, _.get(req, 'body'));
  }

  // Let the params have priority over request body data.
  if (_.has(req, 'params')) {
    data = _.assign(data, _.get(req, 'params'));
  }

  // Let the query have priority over request body data.
  if (_.has(req, 'query')) {
    data = _.assign(data, _.get(req, 'query'));
  }

  return data;
};

var queryReplace = function(data) {
  return function() {
    var value = '';
    var args = Array.prototype.slice.call(arguments);

    if (!(args instanceof Array) || args.length < 2) {
      return value;
    }

    // Get the token for replacement.
    value = _.get(data, args[1]);

    // Make sure we only set the strings or numbers.
    switch (typeof value) {
      case 'string':
        return escape(value);
      case 'number':
        return value;
      default:
        return '';
    }
  };
};

module.exports = {
  escape: escape,
  getRequestData: getRequestData,
  queryReplace: queryReplace
};

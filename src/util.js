'use strict';

var _ = require('lodash');

module.exports = {
  // Escape a string for SQL injection.
  escape: function(query) {
    return query.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, function(s) { // eslint-disable-line no-control-regex
      switch (s) {
        case '\0': return '\\0';
        case '\n': return '\\n';
        case '\r': return '\\r';
        case '\b': return '\\b';
        case '\t': return '\\t';
        case '\x1a': return '\\Z';
        default: return '\\'+s;
      }
    });
  },

  queryReplace: function(query, req) {
    var value = '';
    var tempData = {};

    // Start building the core data obj to replace string properties with.
    if (_.has(req, 'body.request')) {
      tempData = _.assign(tempData, _.get(req, 'body.request'));
    }

    // Let the params have priority over request body data.
    if (_.has(req, 'params')) {
      tempData = _.assign(tempData, _.get(req, 'params'));
    }

    // Let the query have priority over request body data.
    if (_.has(req, 'query')) {
      tempData = _.assign(tempData, _.get(req, 'query'));
    }

    //// Replace all others with the data from the submission.
    //var parts = arguments[0]; //.split('.');
    //if (parts[0] === 'params') {
    //  tempData = _.clone(req.params);
    //}
    //else if (parts[0] === 'query') {
    //  tempData = _.clone(req.query);
    //}
    //else {
    //  tempData = _.clone(req.body);
    //}

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
        return this.escape(value);
      case 'number':
        return value;
      default:
        return '';
    }
  }
};

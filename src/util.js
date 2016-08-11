'use strict';

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

  queryReplace: function(req) {
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
        return this.escape(value);
      case 'number':
        return value;
      default:
        return '';
    }
  }
};

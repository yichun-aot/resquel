'use strict';

module.exports = function(util) {
  return {
    mysql: require('./mysql/core')(util),
    mssql: require('./mssql/core')(util)
  };
};

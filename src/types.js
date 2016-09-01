'use strict';

module.exports = function(util) {
  return {
    mysql: require('./mysql')(util),
    mssql: require('./mssql')(util),
    postgresql: require('./postgresql')(util)
  };
};

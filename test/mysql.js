'use strict';

var request = require('supertest');
var assert = require('assert');
var express = require('express');
var util = require('../src/util');
var chance = (new require('chance'))();
var config = {
  type: 'mysql',
  db: {
    server: 'localhost',
    user: 'root',
    options: {}
  },
  routes: require('../example/mysql/routes/index.js')
};

var app = express();
var sql = null;

describe('resquel tests', function() {
  describe('bootstrap environment', function() {
    before(function() {
      sql = require('../src/mysql/core')(util);
    });

    after(function() {
      config.db.database = 'test';
      app.use(require('../index')(config));
    });

    it('connect to the db', function(done) {
      sql.connect(config.db)
        .then(function() {
          return done();
        })
        .catch(function(err) {
          return done(err);
        })
        .done();
    });

    it('clear the test db', function(done) {
      sql.request('DROP DATABASE IF EXISTS `test`')
        .then(function() {
          return done();
        })
        .catch(function(err) {
          return done(err);
        })
        .done();
    });

    it('create the test db', function(done) {
      sql.request(
        'CREATE DATABASE IF NOT EXISTS `test`;' +
        'USE `test`;' +
        'CREATE TABLE `customers` (' +
        '`id` int(16) unsigned NOT NULL AUTO_INCREMENT,' +
        '`firstName` varchar(256) COLLATE latin1_general_ci DEFAULT NULL,' +
        '`lastName` varchar(256) COLLATE latin1_general_ci DEFAULT NULL,' +
        '`email` varchar(256) COLLATE latin1_general_ci DEFAULT NULL,' +
        'PRIMARY KEY (`id`)' +
        ') ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;'
      )
        .then(function() {
          return done();
        })
        .catch(function(err) {
          return done(err);
        })
        .done();
    });
  });

  describe('create tests', function() {
    it('create a customer', function(done) {
      request(app)
        .post('/customer')
        .send({
          data: {
            firstName: chance.word(),
            lastName: chance.word(),
            email: chance.email()
          }
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          console.log(res.body);
          done();
        });
    });
  });
});

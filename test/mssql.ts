import request from 'supertest';
import assert from 'assert';
import express from 'express';
import Util from '../src/util';
import { Resquel, ResquelConfig } from '../src/resquel';
import faker from 'faker';
import _ from 'lodash';
import iConnection from '../src/interfaces/iConnection';

let config: ResquelConfig = {
  type: 'mssql',
  db: {
    server: 'localhost',
    user: 'sa',
    password: 'yourStrong(!)Password',
    database: 'test',
    requestTimeout: 30000,
  },
  routes: require('../example/mssql/routes/index.js'),
};

const app = express();

describe('mssql tests', () => {
  let called = {
    POST: [],
    GET: [],
    PUT: [],
    DELETE: [],
    INDEX: [],
  };

  describe('bootstrap routes', () => {
    it('add before/after route functions', done => {
      config.routes.forEach(route => {
        let type = route.method.toString().toUpperCase();
        if (type === 'GET' && route.endpoint.indexOf('/:') === -1) {
          type = 'INDEX';
        }

        route.before = (req, res, next) => {
          called[type].push('before');
          next();
        };
        route.after = (req, res, next) => {
          called[type].push('after');
          next();
        };
      });
      done();
    });
  });

  describe('bootstrap environment', () => {
    let connection: iConnection;
    let resquel: Resquel;
    before(() => {
      resquel = new Resquel(config, false);
    });

    after(() => {
      app.use(resquel.router);
    });

    it('connect to the db', async () => {
      connection = resquel.connection = Util.getConnector('mssql');
      await connection.connect(config);
    });

    it('clear the test db', async () => {
      await connection.request('USE master;' + 'DROP DATABASE IF EXISTS test');
    });

    it('create the test db', async () => {
      await connection.request('CREATE DATABASE test');
    });

    it('create the test table', async () => {
      await connection.request(
        'USE test;' +
          'CREATE TABLE customers (' +
          'id int NOT NULL IDENTITY(1,1) PRIMARY KEY,' +
          'firstName varchar(256) DEFAULT NULL,' +
          'lastName varchar(256) DEFAULT NULL,' +
          'email varchar(256) DEFAULT NULL' +
          ');',
      );
    });
  });

  let customer = null;
  describe('create tests', () => {
    it('create a customer', done => {
      request(app)
        .post('/customer')
        .send({
          data: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            email: faker.internet.email(),
          },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          const response = res.body;
          assert.strictEqual(response.rows.length, 1);
          customer = response.rows[0];
          done();
        });
    });

    it('the before handler was called first for the route', done => {
      assert(called.POST instanceof Array);
      assert(called.POST.length >= 1);
      assert(called.POST[0] === 'before');
      done();
    });

    it('the after handler was called second for the route', done => {
      assert(called.POST instanceof Array);
      assert(called.POST.length >= 2);
      assert(called.POST[1] === 'after');
      done();
    });
  });

  describe('index tests', () => {
    it('read the index of all customers', done => {
      request(app)
        .get('/customer')
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          const response = res.body;
          assert.strictEqual(response.rows.length, 1);
          done();
        });
    });

    it('the before handler was called first for the route', done => {
      assert(called.INDEX instanceof Array);
      assert(called.INDEX.length >= 1);
      assert(called.INDEX[0] === 'before');
      done();
    });

    it('the after handler was called second for the route', done => {
      assert(called.INDEX instanceof Array);
      assert(called.INDEX.length >= 2);
      assert(called.INDEX[1] === 'after');
      done();
    });
  });

  describe('read tests', () => {
    it('read a customer', done => {
      request(app)
        .get('/customer/' + customer.id)
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          const response = res.body;
          assert.strictEqual(response.rows.length, 1);
          assert.deepStrictEqual(response.rows[0], customer);
          done();
        });
    });

    it('the before handler was called first for the route', done => {
      assert(called.GET instanceof Array);
      assert(called.GET.length >= 1);
      assert(called.GET[0] === 'before');
      done();
    });

    it('the after handler was called second for the route', done => {
      assert(called.GET instanceof Array);
      assert(called.GET.length >= 2);
      assert(called.GET[1] === 'after');
      done();
    });
  });

  describe('update tests', () => {
    it('update a customer', done => {
      request(app)
        .put('/customer/' + customer.id)
        .send({
          data: {
            firstName: faker.name.firstName(),
          },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          const response = res.body;
          assert.strictEqual(response.rows.length, 1);
          assert.notStrictEqual(response.rows[0].firstName, customer.firstName);
          customer = response.rows[0];
          done();
        });
    });

    it('the before handler was called first for the route', done => {
      assert(called.PUT instanceof Array);
      assert(called.PUT.length >= 1);
      assert(called.PUT[0] === 'before');
      done();
    });

    it('the after handler was called second for the route', done => {
      assert(called.PUT instanceof Array);
      assert(called.PUT.length >= 2);
      assert(called.PUT[1] === 'after');
      done();
    });
  });

  describe('delete tests', () => {
    it('delete a customer', done => {
      request(app)
        .delete('/customer/' + customer.id)
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          const response = res.body;
          assert.deepStrictEqual(response.rows, []);
          customer = null;
          done();
        });
    });

    it('the before handler was called first for the route', done => {
      assert(called.DELETE instanceof Array);
      assert(called.DELETE.length >= 1);
      assert(called.DELETE[0] === 'before');
      done();
    });

    it('the after handler was called second for the route', done => {
      assert(called.DELETE instanceof Array);
      assert(called.DELETE.length >= 2);
      assert(called.DELETE[1] === 'after');
      done();
    });

    it('no customers exist after deleting them all', done => {
      request(app)
        .get('/customer')
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          const response = res.body;
          assert.strictEqual(response.rows.length, 0);
          done();
        });
    });
  });
});

import debug from 'debug';
import { ConfigRoute, ResquelConfig } from './types/config';
import { Request, Response } from 'express';
import express from 'express';
import methodOverride from 'method-override';
import bodyParser from 'body-parser';
import basicAuth from 'basic-auth-connect';
import _ from 'lodash';
import iConnection from './interfaces/iConnection';
import { Util } from './util';

const log = debug('resquel:core');
type ReturnResponse = Response & { result: any };
export class Resquel {
  public connection: iConnection = null;
  public router = null;
  constructor(private config: ResquelConfig, autoConnect = true) {
    this.router = express.Router();
    this.routerSetup();
    if (autoConnect) {
      this.connectToDb();
    }
    config.routes.forEach((route, idx) => {
      this.registerRoute(route, idx);
    });
  }

  private routerSetup() {
    const { config, router } = this;
    router.use(bodyParser.urlencoded({ extended: true }));
    router.use(bodyParser.json());
    router.use(methodOverride('X-HTTP-Method-Override'));

    if (
      config.auth &&
      config.auth.username !== undefined &&
      config.auth.password !== undefined
    ) {
      router.use(basicAuth(config.auth.username, config.auth.password));
    }
  }

  private async connectToDb() {
    this.connection = Util.getConnector(this.config.type || 'mssql');
    try {
      await this.connection.connect(this.config);
      return this.connection;
    } catch (err) {
      log(`Could not connect to database %O`, err);
      throw err;
    }
  }

  private registerRoute(route: ConfigRoute, idx: number) {
    const method = route.method.toLowerCase();
    log(`${idx} Register Route: ${route.method} ${route.endpoint} : $O`, route);
    this.router[method](
      route.endpoint,
      async (req: Request, res: ReturnResponse) => {
        const queryToken = /{{\s+([^}]+)\s+}}/g;

        // Get the query.
        let query =
          typeof route.query === 'function'
            ? route.query(req, res)
            : route.query;
        let count =
          typeof route.count === 'function'
            ? route.count(req, res)
            : route.count;

        const data = Util.getRequestData(req);

        // Include any extra information for specific storage methods.
        const extra = {
          query: {
            original: _.clone(query),
          },
        };

        // Get the query to execute.
        query = query.replace(queryToken, Util.queryReplace(data));

        // If there is no query then respond with no change.
        if (!query) {
          return res.status(204).json({});
        }
        log(`${idx} ${query}`);

        // Allow each sql type to customize the before/after handlers if they need to.
        const before = this.connection.before || Util.before;
        const after = this.connection.after || Util.after;
        try {
          await before(route, req, res);

          // Perform a count query.
          let result = null;
          if (count) {
            count = count.replace(queryToken, Util.queryReplace(data));
            log(`${idx} ${count}`);
            result = await this.connection.count(count, query, extra);
          } else {
            result = await this.connection.query(query, extra);
          }
          res.result = result;
          return after(route, req, res);
        } catch (err) {
          log(`${idx} Failure in route handler %O`, err);
          return res.status(500).send(err.message || err);
        }
      },
    );
  }
}

import debug from 'debug';
import { Request, Response } from 'express';
import express from 'express';
import methodOverride from 'method-override';
import bodyParser from 'body-parser';
import basicAuth from 'basic-auth-connect';
import knex from 'knex';
import _, { AnyKindOfDictionary } from 'lodash';
import { v4 as uuid } from 'uuid';

const log = debug('resquel:core');

export declare type ConnectionType = 'mssql' | 'mysql' | 'postgresql';
export declare type ConfigRouteMethods =
  | 'get'
  | 'post'
  | 'put'
  | 'delete'
  | 'index';
type PreparedQuery = [string, ...(string | QueryParamLookup)[]];
type ConfigRouteQuery = string | PreparedQuery | PreparedQuery[];
export declare type QueryParamLookup = ({
  knex: knex,
  resquel: Resquel,
  req: Request,
  res: Response,
}) => Promise<string>;
export declare type ConfigRoute = {
  method: ConfigRouteMethods;
  endpoint: string;
  query: ConfigRouteQuery;
  before?: (req: Request, res: Response, next: () => Promise<void>) => unknown;
  after?: (req: Request, res: Response, next: () => Promise<void>) => unknown;
};
enum ErrorCodes {
  paramLookupFailed = 1001,
}
export interface ErrorResponse {
  status: number;
  rows: void[];
  errorCode: ErrorCodes;
  requestId: string;
}

export declare type ResquelConfig = {
  port?: number;
  db: knex.Config<unknown>;
  routes: ConfigRoute[];
  auth?: {
    username?: string;
    password?: string;
  };
};
export class Resquel {
  public router = null;
  public knexClient: knex;

  constructor(private config: ResquelConfig) {
    this.knexClient = knex(config.db);
    this.routerSetup();
    this.loadRoutes();
  }

  private routerSetup() {
    const router = (this.router = express.Router());
    router.use(bodyParser.urlencoded({ extended: true }));
    router.use(bodyParser.json());
    router.use(methodOverride('X-HTTP-Method-Override'));

    const config = this.config;
    if (config.auth) {
      router.use(basicAuth(config.auth.username, config.auth.password));
    }
  }

  protected resultProcess(result: AnyKindOfDictionary): AnyKindOfDictionary[] {
    switch (this.config.db.client as ConnectionType) {
      case 'postgresql':
        return (result as { rows: AnyKindOfDictionary[] }).rows;
      case 'mysql':
        if ((result as AnyKindOfDictionary[]).length === 1) {
          return result as AnyKindOfDictionary[];
        }
        if (result[0].affectedRows !== undefined) {
          return [];
        }
        return result[0] as AnyKindOfDictionary[];
      default:
        return result as AnyKindOfDictionary[];
    }
  }

  protected async processRouteQuery(
    routeQuery: ConfigRouteQuery,
    req: Request,
  ): Promise<ErrorResponse | knex.Raw<unknown>> {
    // Resolve route query into an array of prepared statements.
    // Example:
    //   ["SELECT * FROM customers WHERE id=?", "params.customerId"]
    //
    // Where params are passed as strings, use them as object paths on the req object
    // Where params are passed as functions (enterprise), call those and use the return results as params for this query
    //
    // If more than 1 query is passed, then this function will return the results from the final statement
    // Example:
    // [
    //   ["INSERT INTO customers (firstName, lastName, email) VALUES (?, ?, ?);", "body.firstName", "body.lastName", "body.email"],
    //   "SELECT * FROM customers WHERE id=SCOPE_IDENTITY();"
    // ]
    //

    if (typeof routeQuery === 'string') {
      // "SELECT * FROM `customers`"
      routeQuery = [[routeQuery]];
    }
    if (typeof routeQuery[0] === 'string') {
      // ["SELECT * FROM customers WHERE id=?", "params.customerId"]
      routeQuery = [routeQuery as PreparedQuery];
    }
    const isValid = (routeQuery as PreparedQuery[]).every(
      (i, idx) => idx === 0 || typeof i !== 'string',
    );
    if (!isValid) {
      // Probably a mix of prepared queries, and strings like this:
      // [
      //   ["Query 1","param","param"],
      //   "Query 2"
      // ]
      //
      // Should resolve by changing "Query 2" line to ["Query 2"]
      // Keep the types consistent
      //
      throw new Error(`Resquel is unable to resolve route query`);
    }
    const res = req.res;
    const queries = (res.locals.queries = res.locals.queries || []);

    let result: AnyKindOfDictionary[] = null;
    for (let i = 0; i < routeQuery.length; i++) {
      const query = routeQuery[i] as PreparedQuery;
      const queryString = query.shift() as string;
      const params: string[] = [];

      // params builder
      for (let j = 0; j < query.length; j++) {
        if (typeof query[j] === 'string') {
          const val = _.get(req, query[j] as string);
          if (val === undefined) {
            log(
              `${res.locals.requestId}]: lookup failed for param "${query[j]}"`,
            );
            return {
              status: 500,
              rows: [],
              requestId: res.locals.requestId,
              errorCode: ErrorCodes.paramLookupFailed,
            } as ErrorResponse;
          }
          params.push(val);
        } else {
          params.push(
            await (query[j] as QueryParamLookup)({
              resquel: this,
              knex: this.knexClient,
              req,
              res,
            }),
          );
        }
      } // /params builder
      try {
        result = this.resultProcess(
          await this.knexClient.raw(queryString, params),
        );
      } catch (err) {
        console.error('QUERY FAILED');
        console.error(
          JSON.stringify(
            {
              queryString,
              params,
              result,
            },
            null,
            '  ',
          ),
        );
        console.error(err);
        continue;
      }
      // Example result:
      // [
      //   {
      //     id: 1,
      //     firstName: 'John',
      //     lastName: 'Doe',
      //     email: 'example@example.com',
      //   },
      // ];
      //
      // Example prepared query that utilizes result:
      // ["SELECT * FROM customer WHERE id=?", "res.locals.queries[0].id"]
      //
      // This works because `req.res` is a thing:
      // express: After middleware.init executed, Request will contain res and next properties See: express/lib/middleware/init.js
      //
      queries.push({
        queryString,
        params,
        result,
      });
    }
    return {
      rows: result,
    };
  }

  public sendResponse(res: Response) {
    res.status(res.locals.status || 200).send(res.locals.result);
  }

  protected loadRoutes() {
    this.config.routes.forEach((route, idx) => {
      const method = route.method.toLowerCase();
      log(
        `${idx}) Register Route: ${route.method} ${route.endpoint} : $O`,
        route,
      );
      this.router[method](
        route.endpoint,
        async (
          req: Request,
          res: Response<unknown, Record<string, unknown>>,
        ) => {
          // For aiding tracing in logs, all logs related to the request should contain this id
          res.locals.requestId = req.query.requestId || uuid();
          res.locals.route = route;
          log(
            `${idx}) ${route.method} ${route.endpoint} :: ${res.locals.requestId}`,
          );
          if (route.before) {
            await new Promise((done) => {
              route.before(req, res, async () => {
                done(null);
              });
            });
          }
          const result = await this.processRouteQuery(route.query, req);
          if (route.after) {
            res.locals = {
              result,
            };
            if (route.after) {
              await new Promise((done) => {
                route.after(req, res, async () => {
                  done(null);
                });
              });
            }
            if (res.writableEnded) {
              log(`${res.locals.requestId}] Response sent by route.after`);
              return;
            }
          }
          log(`${res.locals.requestId}] Sending result`);
          this.sendResponse(res);
        },
      );
    });
  }
}
export default Resquel;

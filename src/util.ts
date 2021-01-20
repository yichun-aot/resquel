import { Request, Response } from 'express';
import _, { AnyKindOfDictionary } from 'lodash';
import { MsSqlConnector } from './connectors/mssql';
import { MysqlConnector } from './connectors/mysql';
import { PostgresSqlConnector } from './connectors/postgresql';
import iConnection from './interfaces/iConnection';
import { ConfigRoute, ConnectionType } from './types/config';

type ReturnResponse = Response & { result: { status: number } };
export class Util {
  public static getConnector(connector: ConnectionType): iConnection {
    switch (connector) {
      case 'mysql':
        return new MysqlConnector();
      case 'mssql':
        return new MsSqlConnector();
      case 'postgresql':
        return new PostgresSqlConnector();
    }
  }
  /**
   * Escape a string for SQL Injection
   */
  public static escape(query: string) {
    return query.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, function(match) {
      switch (match) {
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
          return '\\' + match;
      }
    });
  }

  /**
   * Get the input data from the given request.
   */
  public static getRequestData(req: Request): AnyKindOfDictionary {
    const data = {};
    if (req.body) {
      _.assign(data, _.get(req, 'body'));
      _.assign(data, {
        data: _.get(req, 'body'),
      });
    }
    if (req.params) {
      _.assign(data, { params: _.get(req, 'params') });
    }
    if (req.query) {
      _.assign(data, { query: _.get(req, 'query') });
    }
    return data;
  }

  /**
   * Create anonymous function to sanitize user input for sql query injection.
   */
  public static queryReplace(
    data: AnyKindOfDictionary,
  ): (...args: string[]) => string | number {
    return (...args: string[]) => {
      if (args.length < 2) {
        return '';
      }

      // Get the token for replacement.
      const value = _.get(data, args[1]);

      // Make sure we only set the strings or numbers.
      switch (typeof value) {
        case 'string':
          return this.escape(value);
        case 'number':
          return value;
        default:
          return '';
      }
    };
  }

  /**
   * Check if the current route has a before fn defined, if so, execute it and proceed.
   */
  public static async before(
    route: ConfigRoute,
    req: Request,
    res: Response,
  ): Promise<void> {
    if (!route.hasOwnProperty('before') || typeof route.before !== 'function') {
      return;
    }
    route.before(req, res, (err, result) => {
      if (err) {
        throw err;
      }
      return result;
    });
  }

  /**
   * Check if the current route has a after fn defined, if so, execute it and proceed.
   */
  public static async after(
    route: ConfigRoute,
    req: Request,
    res: ReturnResponse,
  ): Promise<void> {
    if (!route.hasOwnProperty('after') || typeof route.after !== 'function') {
      return;
    }
    route.after(req, res, () => {
      const result = res.result;
      res.status(result.status as number).send(result);
      return result;
    });
  }
}
export default Util;

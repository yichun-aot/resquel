import { Request, Response } from 'express';

export type ConnectionType = 'mssql' | 'mysql' | 'postgresql';
export type ConfigRouteMethods = 'get' | 'post' | 'put' | 'delete';
export type BeforeAfter = (
  req: Request,
  res: Response,
  cb: Function,
) => unknown;

export type ConfigRoute = {
  method: ConfigRouteMethods;
  endpoint: string;
  query: string | Function;
  count?: Function;
  before?: BeforeAfter;
  after?: BeforeAfter;
};

export type ResquelConfig = {
  type: ConnectionType;
  db: {
    user: string;
    password: string;
    server: string;
    database?: string;
    options?: {
      instanceName?: string;
    };
    [key: string]: any;
  };
  routes: ConfigRoute[];
  requestTimeout?: number;
  auth?: {
    username?: string;
    password?: string;
  };
};

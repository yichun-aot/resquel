import iConnection from 'interfaces/iConnection';
import mssql from 'mssql';
import debug from 'debug';
import { AnyKindOfDictionary } from 'lodash';
import { ResquelConfig } from 'resquel';

const log = debug('resquel:mssql');

export class MsSqlConnector implements iConnection {
  private connection: mssql.ConnectionPool = null;

  public async connect(config: ResquelConfig) {
    if (this.connection) {
      log(`Reconnect requested`);
      this.connection.close();
    }
    try {
      this.connection = new mssql.ConnectionPool({
        ...config.db,
        requestTimeout: 30000,
        options: {
          // silence warning
          enableArithAbort: true,
        },
      });
      await this.connection.connect();
    } catch (err) {
      throw err;
    }
  }

  public async request(query: string) {
    const response = await this.connection.request().query(query);
    return response;
  }

  public async query(query: string) {
    log(query);
    const response = await this.request(query);
    log(response);

    return {
      status: 200,
      data: 'OK',
      rows: response.recordset || response.recordsets,
    };
  }
}

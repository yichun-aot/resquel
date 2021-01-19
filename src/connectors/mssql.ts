import iConnection from 'src/interfaces/iConnection';
import sql from 'mssql';
import debug from 'debug';
import { ResquelConfig } from 'src/types/config';
import { AnyKindOfDictionary } from 'lodash';

const log = debug('resquel:mssql');

// Ignores for where @types/mssql conflicts with documentation
// @ts-ignore
sql.on('error', err => {
  debug(err);
});

export class MsSqlConnector implements iConnection {
  private connection: sql.ConnectionPool = null;

  public async connect(config: ResquelConfig) {
    config.requestTimeout = 30000;
    try {
      // @ts-ignore
      return (this.connection = await sql.connect(config.db));
    } catch (err) {
      throw err;
    }
  }
  public async request(query: string) {
    return this.connection.request().query(query);
  }

  public async query(query: string) {
    log(query);
    const response = await this.request(query);
    log(response);

    const recordset = response.recordset;
    if (recordset instanceof Array && recordset.length >= 1) {
      return {
        status: 200,
        data: 'OK',
        rows: (recordset[0] as unknown) as AnyKindOfDictionary[],
      };
    }
    return {
      status: 200,
      data: 'OK',
      rows: [],
    };
  }
}

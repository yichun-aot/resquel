import iConnection from 'src/interfaces/iConnection';
import pg from 'pg';
import debug from 'debug';
import { ResquelConfig } from 'src/types/config';
import { AnyKindOfDictionary } from 'lodash';

const log = debug('resquel:postgresql');

export class PostgresSqlConnector implements iConnection {
  private connection: pg.Pool = null;

  public async connect(config: ResquelConfig) {
    if (this.connection) {
      log(`Reconnect requested`);
      this.connection.end();
    }
    try {
      this.connection = new pg.Pool({
        ...config.db,
      });
      await this.connection.connect();
    } catch (err) {
      throw err;
    }
  }

  public async request(query: string) {
    const response = await this.connection.query(query);
    return response;
  }

  public async query(query: string) {
    log(query);
    const response = await this.request(query);
    log(response);
    return {
      status: 200,
      data: 'OK',
      rows: response.rows,
    };
  }
}

import debug from 'debug';
import iConnection from 'src/interfaces/iConnection';
import { ResquelConfig } from 'src/types/config';
import { FieldInfo, MysqlError } from 'mysql';
import mysql from 'mysql';
import _, { AnyKindOfDictionary } from 'lodash';

const log = debug('resquel:mysql');
type RequestResult = {
  rows: [mysql.OkPacket, AnyKindOfDictionary[]] | AnyKindOfDictionary[];
  fields: FieldInfo[];
};

export class MysqlConnector implements iConnection {
  private connection: mysql.Pool = null;

  public async connect(config: ResquelConfig) {
    if (this.connection) {
      log(`Reconnect requested`);
      this.connection.end();
    }
    const connectionConfig: mysql.ConnectionConfig = {
      ...config.db,
      multipleStatements: true,
    };
    log(connectionConfig);

    this.connection = mysql.createPool(connectionConfig);
  }

  public async request(query): Promise<RequestResult> {
    return new Promise(async (accept, reject) => {
      this.connection.query(
        query,
        (
          err: MysqlError | null,
          rows?:
            | [mysql.OkPacket, AnyKindOfDictionary[]]
            | AnyKindOfDictionary[],
          fields?: FieldInfo[],
        ) => {
          if (err) {
            reject(err);
            return;
          }
          accept({
            rows,
            fields,
          });
        },
      );
    });
  }

  public async query(query) {
    log(query);
    const response = await this.request(query);
    let rows = [];
    if (response.rows.length === 1) {
      rows = response.rows;
    }
    if (response.rows.length === 2) {
      // @ts-ignore
      rows = response.rows[1];
    }
    return {
      status: 200,
      data: 'OK',
      rows,
    };
  }
}

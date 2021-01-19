import debug from 'debug';
import iConnection from 'src/interfaces/iConnection';
import { ResquelConfig } from 'src/types/config';
import sql, { FieldInfo, MysqlError } from 'mysql';
import _ from 'lodash';

const log = debug('resquel:mysql');

export class MysqlConnector implements iConnection {
  private connection: sql.Connection = null;

  public async connect(config: ResquelConfig) {
    const connectionConfig: sql.ConnectionConfig = {
      host: config.db.server,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      multipleStatements: true,
    };
    log(connectionConfig);

    this.connection = sql.createConnection(connectionConfig);
    await this.connection.connect();
  }

  public async request(query): Promise<{ rows: any; fields: FieldInfo[] }> {
    return new Promise(async (accept, reject) => {
      this.connection.query(
        query,
        (err: MysqlError | null, rows?: any, fields?: FieldInfo[]) => {
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
    log(response.rows);

    let data = [];
    if (
      response.rows instanceof Array &&
      response.rows[0] instanceof OkPacket &&
      response.rows[1] instanceof Array
    ) {
      data = _.filter(response.rows[1], function(item) {
        return item instanceof RowDataPacket;
      });
    } else if (
      typeof response.rows === 'object' &&
      response.rows instanceof OkPacket
    ) {
      data = [];
    }

    debug('data:');
    debug(data);
    var result = _.assign(
      {
        status: 200,
        data: 'OK',
      },
      { rows: data },
    );

    return result;

    return null;
  }
}

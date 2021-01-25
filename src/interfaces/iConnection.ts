import { AnyKindOfDictionary } from 'lodash';
import { Request, Response } from 'express';
import { ConfigRoute, ResquelConfig } from 'resquel';

export default interface iConnection {
  /**
   * Initialize connection to db server
   */
  connect(config: ResquelConfig): Promise<void>;

  /**
   * Issue a SQL request to the connection.
   */
  request(query: string): Promise<unknown>;

  /**
   * Perform the query.
   */
  query(
    query: string,
    extra?: AnyKindOfDictionary,
  ): Promise<{
    status: number;
    data: 'OK' | string;
    rows: AnyKindOfDictionary[];
  }>;

  count?: (
    countQuery: string,
    queryString: string,
    extra?: AnyKindOfDictionary,
  ) => unknown;

  // Optional handlers
  before?: (route: ConfigRoute, req: Request, res: Response) => unknown;
  after?: (route: ConfigRoute, req: Request, res: Response) => unknown;
}

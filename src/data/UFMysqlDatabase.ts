// region imports

import {Connection, RowDataPacket, OkPacket, Pool, createPool} from 'mysql2/promise';
import {IUFDatabase} from "@ultraforce/ts-general-lib/dist/data/IUFDatabase.js";
import {UFDatabase} from "@ultraforce/ts-general-lib/dist/data/UFDatabase.js";
import {IUFDynamicObject} from "@ultraforce/ts-general-lib/dist/types/IUFDynamicObject.js";
import {IUFLog} from "@ultraforce/ts-nodejs-lib/dist/log/IUFLog.js";

// endregion

// region private constants

const LOG_PREFIX: string = 'DATABASE';

// endregion

// region class

/**
 * {@link UFMysqlDatabase} implements `UFDatabase` for use with mysql using the promise version of the
 * mysql2 library. The class uses the pooling functionality to share connections.
 */
class UFMysqlDatabase extends UFDatabase<RowDataPacket> {
  // region private variables

  /**
   * The active connection.
   *
   * @private
   */
  private m_connection: (Connection | null) = null;

  /**
   * The active pool
   *
   * @private
   */
  private m_pool: (Pool | null) = null;

  /**
   * The server
   *
   * @private
   */
  private m_host: string = '';

  /**
   * The database
   *
   * @private
   */
  private m_database: string = '';

  /**
   * The user
   *
   * @private
   */
  private m_user: string = '';

  /**
   * Password for user
   *
   * @private
   */
  private m_password: string = '';

  /**
   * Log to use
   *
   * @private
   */
  private readonly m_log: IUFLog;

  // endregion

  // region constructor

  /**
   * Constructs an instance of {@link UFMysqlDatabase}.
   *
   * @param {IUFLog} aLog
   *   Log to use
   */
  constructor(aLog: IUFLog) {
    super();
    this.m_log = aLog;
  }

  // endregion

  // region public methods

  /**
   * Initializes the database.
   *
   * @param {string} aHost
   *   Server address
   * @param {string} aDatabase
   *   Name of database
   * @param {string} anUser
   *   Name of user to log in with
   * @param {string} aPassword
   *   Password to use with login
   */
  async init(aHost: string, aDatabase: string, anUser: string, aPassword: string) {
    this.m_host = aHost;
    this.m_database = aDatabase;
    this.m_user = anUser;
    this.m_password = aPassword;
    this.m_pool = createPool({
      host: aHost,
      database: aDatabase,
      user: anUser,
      password: aPassword,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    this.m_log.info(LOG_PREFIX, 'created pool', `host:${aHost}`, `database:${aDatabase}`, `user:${anUser}`);
  }

  // endregion

  // region UFDatabase

  /**
   * @inheritDoc
   */
  async insert(aSql: string, aParameterValues: IUFDynamicObject): Promise<number> {
    const result = await this.execute('insert', aSql, aParameterValues) as OkPacket;
    return result.insertId;
  }

  /**
   * @inheritDoc
   */
  async update(aSql: string, aParameterValues?: IUFDynamicObject): Promise<number> {
    const result = await this.execute('update', aSql, aParameterValues) as OkPacket;
    return result.changedRows;
  }

  /**
   * @inheritDoc
   */
  async transaction(aCallback: (aDatabase: IUFDatabase) => Promise<void>): Promise<void> {
    // if connection is set, the instance is already one created with a transaction; just execute the callback
    // (no nested transactions)
    if (this.m_connection != null) {
      await aCallback(this);
      return;
    }
    if (this.m_pool == null) {
      throw new Error('There is no connection to the database.')
    }
    const connection = await this.m_pool.getConnection();
    try {
      const database = new UFMysqlDatabase(this.m_log);
      database.useConnection(connection);
      await connection.beginTransaction();
      await aCallback(database);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * @inheritDoc
   */
  protected async rows(aSql: string, aParameterValues?: IUFDynamicObject): Promise<RowDataPacket[]> {
    const rows = await this.execute('rows', aSql, aParameterValues);
    return rows as RowDataPacket[];
  }

  /**
   * @inheritDoc
   */
  protected async row(aSql: string, aParameterValues?: IUFDynamicObject): Promise<RowDataPacket | undefined> {
    const rows = await this.execute('row', aSql, aParameterValues) as RowDataPacket[];
    return rows.length ? rows[0] : undefined;
  }

  /**
   * @inheritDoc
   */
  protected async field(aSql: string, aParameterValues?: IUFDynamicObject, aDefault: any = undefined): Promise<any> {
    const rows = await this.execute('field', aSql, aParameterValues) as RowDataPacket[];
    if (rows.length) {
      const row = rows[0];
      const keys = Object.keys(row as object);
      if (keys.length) {
        return row[keys[0]];
      }
    }
    return aDefault;
  }

  // endregion

  // region private methods

  /**
   * This method is called instead of init to use a connection instead of a pool.
   *
   * @param {Connection} aConnection
   */
  private useConnection(aConnection: Connection) {
    this.m_connection = aConnection;
  }

  /**
   * Execute a sql.
   *
   * @param {string }aDescription
   *   Description (used when an error occurs)
   * @param {string} aSql
   *   Sql statement to perform
   * @param {*[]} aParameterValues
   *   Values to use in case the statement contains parameters
   *
   * @return {RowDataPacket[]|OkPacket} result from sql statement
   *
   * @throws error
   */
  private async execute(aDescription: string, aSql: string, aParameterValues?: IUFDynamicObject) {
    if ((this.m_connection == null) && (this.m_pool == null)) {
      throw new Error('There is no connection to the database.')
    }
    // convert sql to mysql using ? and array of values
    const values: any[] = [];
    const sql = aParameterValues
      ? this.processSqlParameters(
        aSql,
        aParameterValues,
        (name, value) => {
          values.push(value);
          return '?';
        }
      )
      : aSql;
    // try to execute sql
    try {
      // if m_pool is null, m_connection is not null (because of the if statement at the start)
      const [result, fields] = this.m_pool != null
        ? await this.m_pool.execute(sql, values)
        : await this.m_connection!.execute(sql, values);
      return result;
    } catch (error: any) {
      this.m_log.error(LOG_PREFIX, error, error.code, aDescription, sql, values);
    }
  }

  // endregion
}

// endregion

// region exports

export {UFMysqlDatabase};

// endregion
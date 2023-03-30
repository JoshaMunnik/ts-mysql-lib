// region imports

import {Connection, createConnection, RowDataPacket, OkPacket} from 'mysql2/promise';
import {UFLog} from "@ultraforce/ts-nodejs-lib/dist";
import {UFDatabase, IUFDatabase} from "@ultraforce/ts-general-lib/dist";
import {IUFDynamicObject} from "@ultraforce/ts-general-lib/dist";

// endregion

// region private constants

const LOG_PREFIX: string = 'DATABASE';

// endregion

// region class

/**
 * {@link UFMysqlDatabase} implements {@link UFDatabase} for use with mysql using the mysql2 library.
 */
export class UFMysqlDatabase extends UFDatabase<RowDataPacket> {
  // region private variables

  /**
   * The active connection.
   *
   * @private
   */
  private m_connection: (Connection | null) = null;

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
  private m_log: UFLog;

  // endregion

  // region constructor

  /**
   * Constructs an instance of {@link UFMysqlDatabase}.
   *
   * @param {UFLog} aLog
   *   Log to use
   */
  constructor(aLog: UFLog) {
    super();
    this.m_log = aLog;
  }

  // endregion

  // region public methods

  /**
   * Initializes the database and create a connection.
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
    this.m_connection = await createConnection({
      host: aHost,
      database: aDatabase,
      user: anUser,
      password: aPassword
    });
    this.m_log.info(LOG_PREFIX, 'connected to database', `host:${aHost}`, `database:${aDatabase}`, `user:${anUser}`);
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
    if (this.m_connection == null) {
      throw new Error('There is no connection to the database.')
    }
    await this.m_connection.beginTransaction();
    try {
      await aCallback(this);
      await this.m_connection.commit();
    } catch (error) {
      await this.m_connection.rollback();
      throw error;
    } finally {
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
    if (this.m_connection == null) {
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
      const [result, fields] = await this.m_connection.execute(sql, values);
      return result;
    } catch (error: any) {
      this.m_log.error(LOG_PREFIX, error, error.code, aDescription, sql, values);
    }
    // on failure try to reconnect to the database
    await this.reconnect();
    // execute query again
    try {
      const [result, fields] = await this.m_connection.execute(sql, values);
      return result;
    } catch (error: any) {
      this.m_log.error(LOG_PREFIX, error, error.code, aDescription, sql, values);
      throw error;
    }
  }

  /**
   * Tries to reconnect to the database.
   *
   * @throws * When connection failed.
   */
  private async reconnect() {
    if (this.m_connection != null) {
      try {
        await this.m_connection.end();
      } catch (error: any) {
        this.m_log.error(LOG_PREFIX, error, error.code, 'ending connection');
      }
    }
    try {
      this.m_connection = await createConnection({
        host: this.m_host,
        database: this.m_database,
        user: this.m_user,
        password: this.m_password
      });
      this.m_log.info(LOG_PREFIX, 'reconnected to database');
    } catch (error: any) {
      this.m_log.error(LOG_PREFIX, error, 'reconnecting', error.code);
      throw error;
    }
  }

  // endregion
}

// endregion

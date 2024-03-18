import { RowDataPacket } from 'mysql2/promise';
import { UFLog } from "@ultraforce/ts-nodejs-lib/dist/log/UFLog";
import { UFDatabase, IUFDatabase } from "@ultraforce/ts-general-lib/dist";
import { IUFDynamicObject } from "@ultraforce/ts-general-lib/dist";
/**
 * {@link UFMysqlDatabase} implements `UFDatabase` for use with mysql using the promise version of the
 * mysql2 library. The class uses the pooling functionality to share connections.
 */
export declare class UFMysqlDatabase extends UFDatabase<RowDataPacket> {
    /**
     * The active connection.
     *
     * @private
     */
    private m_connection;
    /**
     * The active pool
     *
     * @private
     */
    private m_pool;
    /**
     * The server
     *
     * @private
     */
    private m_host;
    /**
     * The database
     *
     * @private
     */
    private m_database;
    /**
     * The user
     *
     * @private
     */
    private m_user;
    /**
     * Password for user
     *
     * @private
     */
    private m_password;
    /**
     * Log to use
     *
     * @private
     */
    private readonly m_log;
    /**
     * Constructs an instance of {@link UFMysqlDatabase}.
     *
     * @param {UFLog} aLog
     *   Log to use
     */
    constructor(aLog: UFLog);
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
    init(aHost: string, aDatabase: string, anUser: string, aPassword: string): Promise<void>;
    /**
     * @inheritDoc
     */
    insert(aSql: string, aParameterValues: IUFDynamicObject): Promise<number>;
    /**
     * @inheritDoc
     */
    update(aSql: string, aParameterValues?: IUFDynamicObject): Promise<number>;
    /**
     * @inheritDoc
     */
    transaction(aCallback: (aDatabase: IUFDatabase) => Promise<void>): Promise<void>;
    /**
     * @inheritDoc
     */
    protected rows(aSql: string, aParameterValues?: IUFDynamicObject): Promise<RowDataPacket[]>;
    /**
     * @inheritDoc
     */
    protected row(aSql: string, aParameterValues?: IUFDynamicObject): Promise<RowDataPacket | undefined>;
    /**
     * @inheritDoc
     */
    protected field(aSql: string, aParameterValues?: IUFDynamicObject, aDefault?: any): Promise<any>;
    /**
     * This method is called instead of init to use a connection instead of a pool.
     *
     * @param {Connection} aConnection
     */
    private useConnection;
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
    private execute;
}

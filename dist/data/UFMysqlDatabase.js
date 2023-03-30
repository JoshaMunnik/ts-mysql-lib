// region imports
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { createConnection } from 'mysql2/promise';
import { UFDatabase } from "@ultraforce/ts-general-lib/dist";
// endregion
// region private constants
const LOG_PREFIX = 'DATABASE';
// endregion
// region class
/**
 * {@link UFMysqlDatabase} implements {@link UFDatabase} for use with mysql using the mysql2 library.
 */
export class UFMysqlDatabase extends UFDatabase {
    // endregion
    // region constructor
    /**
     * Constructs an instance of {@link UFMysqlDatabase}.
     *
     * @param {UFLog} aLog
     *   Log to use
     */
    constructor(aLog) {
        super();
        // region private variables
        /**
         * The active connection.
         *
         * @private
         */
        this.m_connection = null;
        /**
         * The server
         *
         * @private
         */
        this.m_host = '';
        /**
         * The database
         *
         * @private
         */
        this.m_database = '';
        /**
         * The user
         *
         * @private
         */
        this.m_user = '';
        /**
         * Password for user
         *
         * @private
         */
        this.m_password = '';
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
    init(aHost, aDatabase, anUser, aPassword) {
        return __awaiter(this, void 0, void 0, function* () {
            this.m_host = aHost;
            this.m_database = aDatabase;
            this.m_user = anUser;
            this.m_password = aPassword;
            this.m_connection = yield createConnection({
                host: aHost,
                database: aDatabase,
                user: anUser,
                password: aPassword
            });
            this.m_log.info(LOG_PREFIX, 'connected to database', `host:${aHost}`, `database:${aDatabase}`, `user:${anUser}`);
        });
    }
    // endregion
    // region UFDatabase
    /**
     * @inheritDoc
     */
    insert(aSql, aParameterValues) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.execute('insert', aSql, aParameterValues);
            return result.insertId;
        });
    }
    /**
     * @inheritDoc
     */
    update(aSql, aParameterValues) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.execute('update', aSql, aParameterValues);
            return result.changedRows;
        });
    }
    /**
     * @inheritDoc
     */
    transaction(aCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.m_connection == null) {
                throw new Error('There is no connection to the database.');
            }
            yield this.m_connection.beginTransaction();
            try {
                yield aCallback(this);
                yield this.m_connection.commit();
            }
            catch (error) {
                yield this.m_connection.rollback();
                throw error;
            }
            finally {
            }
        });
    }
    /**
     * @inheritDoc
     */
    rows(aSql, aParameterValues) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.execute('rows', aSql, aParameterValues);
            return rows;
        });
    }
    /**
     * @inheritDoc
     */
    row(aSql, aParameterValues) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.execute('row', aSql, aParameterValues);
            return rows.length ? rows[0] : undefined;
        });
    }
    /**
     * @inheritDoc
     */
    field(aSql, aParameterValues, aDefault = undefined) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.execute('field', aSql, aParameterValues);
            if (rows.length) {
                const row = rows[0];
                const keys = Object.keys(row);
                if (keys.length) {
                    return row[keys[0]];
                }
            }
            return aDefault;
        });
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
    execute(aDescription, aSql, aParameterValues) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.m_connection == null) {
                throw new Error('There is no connection to the database.');
            }
            // convert sql to mysql using ? and array of values
            const values = [];
            const sql = aParameterValues
                ? this.processSqlParameters(aSql, aParameterValues, (name, value) => {
                    values.push(value);
                    return '?';
                })
                : aSql;
            // try to execute sql
            try {
                const [result, fields] = yield this.m_connection.execute(sql, values);
                return result;
            }
            catch (error) {
                this.m_log.error(LOG_PREFIX, error, error.code, aDescription, sql, values);
            }
            // on failure try to reconnect to the database
            yield this.reconnect();
            // execute query again
            try {
                const [result, fields] = yield this.m_connection.execute(sql, values);
                return result;
            }
            catch (error) {
                this.m_log.error(LOG_PREFIX, error, error.code, aDescription, sql, values);
                throw error;
            }
        });
    }
    /**
     * Tries to reconnect to the database.
     *
     * @throws * When connection failed.
     */
    reconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.m_connection != null) {
                try {
                    yield this.m_connection.end();
                }
                catch (error) {
                    this.m_log.error(LOG_PREFIX, error, error.code, 'ending connection');
                }
            }
            try {
                this.m_connection = yield createConnection({
                    host: this.m_host,
                    database: this.m_database,
                    user: this.m_user,
                    password: this.m_password
                });
                this.m_log.info(LOG_PREFIX, 'reconnected to database');
            }
            catch (error) {
                this.m_log.error(LOG_PREFIX, error, 'reconnecting', error.code);
                throw error;
            }
        });
    }
}
// endregion
//# sourceMappingURL=UFMysqlDatabase.js.map
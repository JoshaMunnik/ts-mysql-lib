/**
 * @version 1
 * @author Josha Munnik
 * @copyright Copyright (c) 2022 Ultra Force Development
 * @license
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * <ul>
 * <li>Redistributions of source code must retain the above copyright notice, this list of conditions and
 *     the following disclaimer.</li>
 * <li>The authors and companies name may not be used to endorse or promote products derived from this
 *     software without specific prior written permission.</li>
 * </ul>
 * <br/>
 * THIS SOFTWARE IS PROVIDED BY THE REGENTS AND CONTRIBUTORS ``AS IS´´ AND ANY EXPRESS OR IMPLIED WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE REGENTS OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// region imports
import { createPool } from 'mysql2/promise';
import { UFDatabase } from "@ultraforce/ts-general-lib/dist/data/UFDatabase.js";
// endregion
// region private constants
const LOG_PREFIX = 'DATABASE';
// endregion
// region class
/**
 * {@link UFMysqlDatabase} implements `UFDatabase` for use with mysql using the promise version of the
 * mysql2 library. The class uses the pooling functionality to share connections.
 */
class UFMysqlDatabase extends UFDatabase {
    // endregion
    // region constructor
    /**
     * Constructs an instance of {@link UFMysqlDatabase}.
     *
     * @param {IUFLog} aLog
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
         * The active pool
         *
         * @private
         */
        this.m_pool = null;
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
    init(aHost, aDatabase, anUser, aPassword) {
        return __awaiter(this, void 0, void 0, function* () {
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
            return result.affectedRows;
        });
    }
    /**
     * @inheritDoc
     */
    transaction(aCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            // if connection is set, the instance is already one created with a transaction; just execute the callback
            // (no nested transactions)
            if (this.m_connection != null) {
                yield aCallback(this);
                return;
            }
            if (this.m_pool == null) {
                throw new Error('There is no connection to the database.');
            }
            const connection = yield this.m_pool.getConnection();
            try {
                const database = new UFMysqlDatabase(this.m_log);
                database.useConnection(connection);
                yield connection.beginTransaction();
                yield aCallback(database);
                yield connection.commit();
            }
            catch (error) {
                yield connection.rollback();
                throw error;
            }
            finally {
                connection.release();
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
     * This method is called instead of init to use a connection instead of a pool.
     *
     * @param {Connection} aConnection
     */
    useConnection(aConnection) {
        this.m_connection = aConnection;
    }
    /**
     * Execute a sql.
     *
     * @param aDescription
     *   Description (used when an error occurs)
     * @param aSql
     *   Sql statement to perform
     * @param aParameterValues
     *   Values to use in case the statement contains parameters
     *
     * @return result from sql statement
     *
     * @throws error
     */
    execute(aDescription, aSql, aParameterValues) {
        return __awaiter(this, void 0, void 0, function* () {
            if ((this.m_connection == null) && (this.m_pool == null)) {
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
                // if m_pool is null, m_connection is not null (because of the if statement at the start)
                const [result, fields] = this.m_pool != null
                    ? yield this.m_pool.execute(sql, values)
                    : yield this.m_connection.execute(sql, values);
                return result;
            }
            catch (error) {
                this.m_log.error(LOG_PREFIX, error, error.code, aDescription, sql, values);
            }
        });
    }
}
// endregion
// region exports
export { UFMysqlDatabase };
// endregion
//# sourceMappingURL=UFMysqlDatabase.js.map
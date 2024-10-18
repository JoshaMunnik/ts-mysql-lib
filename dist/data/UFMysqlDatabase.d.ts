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
import { RowDataPacket } from 'mysql2/promise';
import { IUFDatabase } from "@ultraforce/ts-general-lib/dist/data/IUFDatabase.js";
import { UFDatabase } from "@ultraforce/ts-general-lib/dist/data/UFDatabase.js";
import { IUFDynamicObject } from "@ultraforce/ts-general-lib/dist/types/IUFDynamicObject.js";
import { IUFLog } from "@ultraforce/ts-nodejs-lib/dist/log/IUFLog.js";
/**
 * {@link UFMysqlDatabase} implements `UFDatabase` for use with mysql using the promise version of the
 * mysql2 library. The class uses the pooling functionality to share connections.
 */
declare class UFMysqlDatabase extends UFDatabase<RowDataPacket> {
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
     * @param {IUFLog} aLog
     *   Log to use
     */
    constructor(aLog: IUFLog);
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
    private execute;
}
export { UFMysqlDatabase };

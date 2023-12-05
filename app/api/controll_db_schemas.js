const { dbPrefix, db } = require("../.env")
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const tabelaSchemas = 'schemas_control'
    const crypto = require("crypto");
    const mysql = require('mysql');

    const dbConfig = {
        host: db.host,
        user: db.user,
        password: db.password,
        database: db.database,
    };

    const creatClientSchema = async (req, res) => {
        let user = req.user
        const uParams = await app.db('users').where({ id: user.id }).first();
        try {
            isMatchOrError(uParams && uParams.admin >= 2, `${noAccessMsg} "Inclusão de Schema de cliente"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const body = { ...req.body }
        
        try {
            existsOrError(body.schema_description, 'Descrição do esquema não informada')
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(400).send(error)
        }

        // Conecta ao banco de dados
        const connection = mysql.createConnection(dbConfig);
        connection.connect();

        const schemaName = crypto.randomBytes(3).toString('hex');
        const schemaNameAndUser = body.schema_name || dbPrefix + '_' + schemaName
        dbConfig.host = body.host || dbConfig.host;
        dbConfig.host = body.host || dbConfig.host;
        dbConfig.user = body.user || dbConfig.user;

        app.db.raw(`CREATE DATABASE ${schemaNameAndUser};`)
            .then(() => {
                app.db.raw(`GRANT ALTER, ALTER ROUTINE, CREATE, CREATE ROUTINE, CREATE TEMPORARY TABLES, CREATE VIEW, DELETE, DROP, EVENT, EXECUTE, INDEX, ` +
                    `INSERT, LOCK TABLES, REFERENCES, SELECT, SHOW VIEW, TRIGGER, UPDATE ON ${schemaNameAndUser}.* TO '${dbConfig.user}'@'${dbConfig.host}';`)
                    .then(() => {
                        app.db.raw(`FLUSH PRIVILEGES;`)
                            .then(() => {
                                req.body = {
                                    'schema_name': schemaName,
                                    'schema_version': '1.0.0',
                                    'schema_description': body.schema_description,
                                    'schema_author': 'suporte@vivazul.com.br',
                                    'schema_author_email': 'suporte@vivazul.com.br'
                                }
                                const setNewDb = setNewSchemaOnDB(req, res)
                                if (!setNewDb) throw setNewDb
                                return res.send(`Schema and user created with name ${schemaNameAndUser}`);
                            })
                            .catch((error) => {
                                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
                                return res.status(500).send(error)
                            })
                    })
                    .catch((error) => {
                        app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
                        return res.status(500).send(error)
                    })
            })
    }

    const setNewSchemaOnDB = async (req, res) => {
        try {
            return await app.db(tabelaSchemas).insert(req.body)
        } catch (error) {            
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return error
        }
    }

    return { creatClientSchema }
}
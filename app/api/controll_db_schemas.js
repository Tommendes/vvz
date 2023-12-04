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

        // Conecta ao banco de dados
        const connection = mysql.createConnection(dbConfig);
        connection.connect();

        const schemaNameAndUser = body.schema_name || dbPrefix + '_' + crypto.randomBytes(3).toString('hex');
        dbConfig.publicIp = req.socket.remoteAddress || req.connection.remoteAddress || req.headers['x-forwarded-for'] || req.connection.socket.remoteAddress;
        dbConfig.publicIp = body.userHost || dbConfig.publicIp;

        try {
            // Crie um banco de dados
            await queryAsync(connection, `CREATE DATABASE ${schemaNameAndUser};`);
            // Conecte-se ao novo banco de dados
            await queryAsync(connection, `USE ${schemaNameAndUser};`);
            // Conceda privilégios CRUD ao usuário no banco de dados
            await queryAsync(connection, `GRANT SELECT, INSERT, UPDATE, DELETE ON ${dbConfig.user}.* TO '${schemaNameAndUser}'@'${dbConfig.publicIp}';`);
            await queryAsync(connection, `FLUSH PRIVILEGES;`);

            return res.send(`Schema and user created with name ${schemaNameAndUser}`);
        } catch (error) {
            app.api.logger.logError({ log: { line: `Erro ao criar esquema: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        } finally {
            // Fecha a conexão
            connection.end();
        }


        // app.db.raw(`CREATE DATABASE ${schemaUserName};`)
        //     .then(() => {
        //         app.db.raw(`CREATE USER '${schemaUserName}'@'${dbConfig.publicIp}';`)
        //             .then(() => {
        //                 app.db.raw(`GRANT ALTER, CREATE, CREATE TEMPORARY TABLES, DELETE, EXECUTE, INSERT, LOCK TABLES, REFERENCES, SELECT, SHOW VIEW, UPDATE ON \`${schemaUserName}\`.* TO '${schemaUserName}'@'${dbConfig.publicIp}';`)
        //             })
        //             .catch((error) => {
        //                 return res.status(500).send(error)
        //             })
        //         return res.send(`Schema and user created with name ${schemaUserName}`);
        //     })
        //     .catch((error) => {
        //         app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
        //         return res.status(500).send(error)
        //     })
    }

    function queryAsync(connection, sql) {
        return new Promise((resolve, reject) => {
          connection.query(sql, (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          });
        });
      }

    // const setNewSchemaOnDB = async (req, res) => {
    //     const schemaName = req.params.schemaName;

    //     try {

    //     } catch (error) {

    //     }

    //     const body = {

    //         'schema_name':
    //             'schema_version'                :
    //         'schema_description':
    //             'schema_author'                 :
    //         'schema_author_email': 

    //     }

    //     app.db()
    // }

    return { creatClientSchema }
}
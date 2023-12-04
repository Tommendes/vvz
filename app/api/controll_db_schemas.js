const { dbPrefix } = require("../.env")
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const tabelaSchemas = 'schemas_control'    
    const crypto = require("crypto");
    
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

        const schemaName = body.schema_name || 'vivazul_' + crypto.randomBytes(3).toString('hex');
        const userName = schemaName;
        const publicIp = req.socket.remoteAddress || req.connection.remoteAddress || req.headers['x-forwarded-for'] || req.connection.socket.remoteAddress;
        const userHost = body.userHost || publicIp || '162.214.208.90';
        console.log('userHost: ', userHost);

        try {
            await app.db.raw(`CREATE DATABASE ${schemaName};`)
            await app.db.raw(`CREATE USER '${userName}'@'${userHost}';`)
            await app.db.raw(`GRANT ALTER, CREATE, CREATE TEMPORARY TABLES, DELETE, EXECUTE, INSERT, LOCK TABLES, REFERENCES, SELECT, SHOW VIEW, UPDATE ON \`${schemaName}\`.* TO '${userName}'@'${userHost}';`)
            return res.send(`Schema and user created with name ${schemaName}`);
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        }
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
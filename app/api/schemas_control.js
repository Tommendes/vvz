
const randomstring = require("randomstring")

const crypto = require("crypto");
const { emailAdmin, appName } = require("../config/params.js")
const { dbPrefix, speedchat, jasperServerU, jasperServerK } = require("../.env")

module.exports = app => {
    const { existsOrError, notExistsOrError, equalsOrError, emailOrError, isBooleanOrError } = app.api.validation
    const { titleCase, encryptPassword, comparePassword } = app.api.facilities
    const { transporter } = app.api.mailer
    const tabelaSchemas = `${dbPrefix}_api.schemas_control`
    const tabelaUser = `${dbPrefix}_api.users`
    const tabelaEmpresa = `empresa`
    const tabelaAlias = 'Controle de Schemas de Clientes'
    const tabelaLocalParams = 'local_params'
    const tabelaLongParams = 'long_params'

    // const Método assíncrono para a criação de um novo SCHEMA, tabelas e conteúdos para o cliente
    const setNewClient = async (req, res) => {
        const body = { ...req.body }
        // if (req.method === 'POST') return 'Em desenvolvimento';
        try {
            existsOrError(body.email, 'E-mail não informado')
            emailOrError(body.email, 'E-mail inválido')
            const userExists = await app.db(tabelaUser).where({ email: body.email }).first()
            existsOrError(userExists, 'Usuário não encontrado com este e-mail')
            existsOrError(body.fantasia, 'Nome fantasia não informado')
        } catch (error) {
            return res.status(400).send({ msg: error })
        }
        try {
            const newSchema = await setNewClientSchema(body).catch(error => res.status(500).send({ msg: error }))
            if (newSchema) {
                const tableOrder = [
                    'local_params',
                    'pipeline_ftp',
                    'pipeline_params',
                    'cadastros',
                    'empresa',
                    'cad_contatos',
                    'cad_enderecos',
                    'cad_documentos',
                    'pipeline',
                    'pipeline_ftp',
                    'pipeline_status',
                    'protocolos',
                    'com_produtos',
                    'fin_bancos',
                    'fin_contas',
                    'fin_lancamentos',
                    'comis_agentes',
                    'pv',
                    'pv_tecnicos',
                    'com_propostas',
                ]
                for (let i = 0; i < tableOrder.length; i++) {
                    const tableToCreate = tableOrder[i]
                    try {
                        const createTableSql = await getCreateTable(`${dbPrefix}_root`, newSchema, tableToCreate)
                        if (createTableSql)
                            try {
                                await app.db.raw(createTableSql)
                            } catch (error) {
                                app.api.logger.logError({ log: { line: `Error in create table ${tableToCreate}. Error: ${error}`, sConsole: true } })
                                return res.status(500).send({ msg: error })
                            }
                    } catch (error) {
                        app.api.logger.logError({ log: { line: `Error in getCreateTable ${tableToCreate}). Error: ${error}`, sConsole: true } })
                        return res.status(500).send({ msg: error })
                    }
                }
                const rootTables = await getTableNames(`${dbPrefix}_root`, tableOrder).catch(error => res.status(500).send({ msg: error }))
                if (rootTables) {
                    for (let i = 0; i < rootTables.length; i++) {
                        const tableToCreate = rootTables[i].table_name
                        if (!tableOrder.includes(tableToCreate)) {
                            try {
                                const createTableSql = await getCreateTable(`${dbPrefix}_root`, newSchema, tableToCreate)
                                if (createTableSql)
                                    try {
                                        await app.db.raw(createTableSql)
                                    } catch (error) {
                                        app.api.logger.logError({ log: { line: `Error in create table ${tableToCreate}. Error: ${error}`, sConsole: true } })
                                        return res.status(500).send({ msg: error })
                                    }
                            } catch (error) {
                                app.api.logger.logError({ log: { line: `Error in getCreateTable ${tableToCreate}). Error: ${error}`, sConsole: true } })
                                return res.status(500).send({ msg: error })
                            }
                        }
                    }
                    const tablsToMirror = [
                        'local_params',
                        'long_params'
                    ]
                    for (let i = 0; i < tablsToMirror.length; i++) {
                        await copyTableData(`${dbPrefix}_root`, newSchema, tablsToMirror[i])
                    }
                }
                await createEmpresaField(newSchema, body, req)
                const success = await createSchemaControlField(newSchema, body, req)
                return res.json(success)
            }
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(500).send({ msg: error })
        }
    }

    // Função para a criação de um novo SCHEMA para o cliente
    const setNewClientSchema = async (newUser) => {
        try {
            app.api.logger.logInfo({ log: { line: `Iniciada a criação de novo SCHEMA para o cliente ${newUser.email}`, sConsole: true } })
            let schemaName = createHashSchemaName();//'vivazul_root';//
            // Criar um loop recursivo para garantir que se já existir então deve ser alterado
            let existsSchema = await app.db.raw(`SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '${schemaName}'`)
            existsSchema = existsSchema[0]
            while (existsSchema.length > 0) {
                schemaName = createHashSchemaName()
                existsSchema = await app.db.raw(`SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '${schemaName}'`)
                existsSchema = existsSchema[0]
            }
            // Criar o novo schema
            const createnewSchema = await app.db.raw(`CREATE DATABASE IF NOT EXISTS \`${schemaName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
            if (createnewSchema) {
                app.api.logger.logInfo({ log: { line: `Novo SCHEMA ${schemaName} criado com sucesso para o cliente ${newUser.email}`, sConsole: true } })
                return schemaName
            }
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return error
        }
    }

    // Retornar os nomes das tabelas de um schema
    const getTableNames = async (orignSchema, tablesToNotGet) => {
        try {
            const tables = await app.db.raw(`SELECT table_name FROM information_schema.tables WHERE table_schema = '${orignSchema}' and table_name not in (${tablesToNotGet.map(table => `'${table}'`).join(',')})`)
            return tables[0]
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return error
        }
    }

    // Função para obter o CREATE TABLE de uma tabela específica
    const getCreateTable = async (orignSchema, newSchema, tableName) => {
        console.log('orignSchema:', orignSchema, 'newSchema:', newSchema, 'tableName:', tableName);
        try {
            const createTable = await app.db.raw(`SHOW CREATE TABLE ${orignSchema}.${tableName}`)
            let createTableSql = createTable[0][0]['Create Table'];
            createTableSql = createTableSql
                .replace('CREATE TABLE', `CREATE TABLE IF NOT EXISTS \`${newSchema}\`.`)
                .replace(/\n/g, ' ')
                .replaceAll(orignSchema, newSchema) // Substitui o schema de origem pelo novo schema, incluindo nas chaves estrangeiras
                .replace(/AUTO_INCREMENT=\d+/g, 'AUTO_INCREMENT=1'); // Altere AUTO_INCREMENT=XXX para AUTO_INCREMENT=1
            return createTableSql
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return error
        }
    }

    /**
     Função responsável por capturar os dados da tabela de origem e inserir na tabela de destino
     Na tabela de destino, os valores dos campos a seguir deve seguir o seguinte padrão
        - id deve ser nulo pois é um campo auto incremento
        - evento deve ser 1 pois esse é o valor que indica que o dado foi importado
        - created_at deve ser a data e hora atual
        - updated_at deve ser nulo pois é a primeira vez que o dado é inserido
        - status deve ser 10 pois esse é o valor que indica que o dado está ativo
    */
    const copyTableData = async (orignSchema, newSchema, tableName) => {
        try {
            const tableData = await app.db.raw(`SELECT * FROM ${orignSchema}.${tableName}`)
            const tableFields = tableData[0]
            for (let i = 0; i < tableFields.length; i++) {
                const fields = tableFields[i]
                if (fields.id) {
                    fields.id = null
                }
                fields.evento = 1
                fields.created_at = new Date()
                fields.updated_at = null
                fields.status = 10
                await app.db(`${newSchema}.${tableName}`).insert(fields)
            }
            app.api.logger.logInfo({ log: { line: `Dados da tabela ${tableName} copiados para o novo schema ${newSchema}`, sConsole: true } })
            return true
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return error
        }
    }

    // Função responsável por criar um registro na tabela de controle de schemas
    const createSchemaControlField = async (schemaName, newUser, req) => {
        try {
            const nextEventID = await app.db(`${dbPrefix}_api.sis_events`).select(app.db.raw('max(id) as count')).first()
            const schemaControl = {
                'created_at': new Date(),
                'status': 10,
                'evento': nextEventID.count + 1,
                'schema_name': schemaName.replace(`${dbPrefix}_`, ''),
                'schema_version': '1.0.0',
                'schema_description': newUser.fantasia.toLowerCase().replace(/ /g, '_'),
                'schema_author': 'suporte@vivazul.com.br',
                'schema_author_email': 'suporte@vivazul.com.br'
            }
            // registrar o evento na tabela de eventos
            const { createEventIns } = app.api.sisEvents
            createEventIns({
                "notTo": ['created_at', 'evento'],
                "next": schemaControl,
                "request": req,
                "evento": {
                    "evento": `Novo schema de BD criado`,
                    "tabela_bd": tabelaSchemas,
                }
            })
            const schema = await app.db(tabelaSchemas).insert(schemaControl)
            if (schema) {
                // Setar o schema_id de api.user do newUser.email com o schema.id
                await app.db(tabelaUser).where({ email: newUser.email }).update({ schema_id: schema[0] })
                app.api.logger.logInfo({ log: { line: `Registro inserido na tabela ${tabelaSchemas} com sucesso`, sConsole: true } })
                return `Tudo pronto para você ${newUser.fantasia}, 🫡!`;
            }
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${newUser.email}. Error: ${error}`, sConsole: true } })
            return error
        }
    }

    /**
     * Função responsável por criar um registro na tabela empresa do schema novo
     *  Na tabela de destino, os valores dos campos a seguir deve seguir o seguinte padrão
     *  - id deve ser nulo pois é um campo auto incremento
     *  - evento deve ser 1 pois esse é o valor que indica que o dado foi importado
     *  - created_at deve ser a data e hora atual
     *  - updated_at deve ser nulo pois é a primeira vez que o dado é inserido
     *  - status deve ser 10 pois esse é o valor que indica que o dado está ativo
     *  - ordem_financeiro deve ser 1 pois é a primeira empresa criada
     *  - razaosocial deve ser o mesmo valor de fantasia
     *  - fantasia deve ser o mesmo valor de fantasia
     *  - cpf_cnpj_empresa 14 (0) zeros para forçar a correção na primeira alteração
     *  - ie deve ser nulo
     *  - ie_st deve ser nulo
     *  - im deve ser nulo
     *  - cnae deve ser nulo
     *  - cep deve ser nulo
     *  - logradouro deve ser nulo
     *  - nr deve ser nulo
     *  - complnr deve ser nulo
     *  - bairro deve ser nulo
     *  - cidade deve ser nulo
     *  - uf deve ser nulo
     *  - ibge deve ser nulo
     *  - geo_ltd deve ser nulo
     *  - geo_lng deve ser nulo
     *  - contato deve ser o nome do usuário
     *  - tel1 deve ser o telefone do usuário
     *  - tel2 deve ser nulo
     *  - email deve ser o email do usuário
     *  - email_at deve ser nulo
     *  - email_comercial deve ser o email do usuário
     *  - email_financeiro deve ser o email do usuário
     *  - email_rh deve ser nulo
     *  - id_cadas_resplegal deve ser nulo
     *  - id_uploads_logo deve ser nulo
     * @param {String} schemaName Objeto com os dados do novo cliente
     * @param {Object} newUser Objeto com os dados do novo cliente
     * @param {Object} req Objeto com os dados do novo cliente
     * @returns {String} Mensagem de sucesso
     * @returns {String} Mensagem de erro
     */

    const createEmpresaField = async (schemaName, newUser, req) => {
        console.log('schemaName:', schemaName, 'newUser:', newUser);
        const tabelaEmpresaDomain = `${schemaName}.${tabelaEmpresa}`
        try {
            const empresaControl = {
                'evento': 1,
                'created_at': new Date(),
                'status': 10,
                'ordem_financeiro': 1,
                'razaosocial': 'Sua Razão Social',
                'fantasia': newUser.fantasia,
                'cpf_cnpj_empresa': '00000000000000',
                'ie': null,
                'ie_st': null,
                'im': null,
                'cnae': null,
                'cep': null,
                'logradouro': null,
                'nr': null,
                'complnr': null,
                'bairro': null,
                'cidade': null,
                'uf': null,
                'ibge': null,
                'geo_ltd': null,
                'geo_lng': null,
                'contato': newUser.fantasia,
                'tel1': newUser.telefone,
                'tel2': null,
                'email': newUser.email,
                'email_at': null,
                'email_comercial': newUser.email,
                'email_financeiro': newUser.email,
                'email_rh': null,
                'id_cadas_resplegal': null,
                'id_uploads_logo': null
            }
            app.db(tabelaEmpresaDomain).insert(empresaControl)
                .then(async (empresa) => {
                    app.api.logger.logInfo({ log: { line: `Registro inserido na tabela ${tabelaEmpresaDomain} com sucesso`, sConsole: true } })
                    return `Registro inserido na tabela ${tabelaEmpresaDomain} com sucesso`
                })
                .catch((error) => {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${newUser.email}. Error: ${error}`, sConsole: true } })
                    return error
                })
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${newUser.email}. Error: ${error}`, sConsole: true } })
            return error
        }
    }

    function createHashSchemaName() {
        // O schemaName deve ser curto, único e com no máximo 16 caracteres seguindo o padrão de nomenclatura. Acrescente ao final do schemaName um hash de 8 caracteres
        const hash = crypto.randomBytes(4).toString('hex');

        // Concatenar para formar o schemaName
        let schemaName = `${dbPrefix}_${hash}`;
        console.log('schemaName:', schemaName);
        return schemaName;
    }

    return {
        setNewClient
    }
}
const { dbPrefix, speedchat } = require("../.env")
const schedule = require('node-schedule');
const moment = require('moment')
const axios = require('axios')
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const { convertHtmlToWhatsappFormat } = app.api.facilities
    const tabela = 'whats_groups'
    const tabelaProfiles = 'whats_profiles'
    const tabelaAliasPL = 'Grupos'
    const tabelaAlias = 'Grupo'
    const STATUS_ACTIVE = 10
    const STATUS_DONE = 20
    const STATUS_DELETE = 99
    const MAX_BODY_LENGTH = 1000

    const save = async (req, res) => {
        let user = req.user
        const tabelaSchemas = `${dbPrefix}_api.schemas_control`;
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: tabelaSchemas }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        let body = { ...req.body }
        delete body.id;
        if (req.params.id) body.id = req.params.id
        try {
            // Alçada do usuário
            if (body.id) isMatchOrError(uParams && uParams.whats_groups >= 3, `${noAccessMsg} "Edição de ${tabelaAlias}"`)
            else isMatchOrError(uParams && uParams.whats_groups >= 2, `${noAccessMsg} "Inclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        try {
            existsOrError(body.group_name, 'Nome do grupo não informado')
            const unique = await app.db(tabelaDomain).where({ group_name: body.group_name }).first()            
            if (unique && unique.id != body.id) throw 'Nome do grupo já cadastrado'
            existsOrError(body.contact_ids, 'Contatos do grupo não informados')
        } catch (error) {
            console.log('error', error);
            
            return res.status(400).send(error)
        }
        
        if (body.id) {
            // Variáveis da edição de um registro
            // registrar o evento na tabela de eventos
            const { createEventUpd } = app.api.sisEvents
            const evento = await createEventUpd({
                "notTo": ['created_at', 'updated_at', 'evento',],
                "last": await app.db(tabelaDomain).where({ id: body.id }).first(),
                "next": body,
                "request": req,
                "evento": {
                    "evento": `Alteração de ${tabela}`,
                    "tabela_bd": tabela,
                }
            })

            body.evento = evento
            body.updated_at = new Date()
            let rowsUpdated = app.db(tabelaDomain)
                .update(body)
                .where({ id: body.id })
            rowsUpdated.then((ret) => {
                if (ret > 0) res.status(200).send(body)
                else res.status(200).send('Grupo não foi encontrado')
            })
                .catch(error => {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                    return res.status(500).send(error)
                })
        } else {
            // Criação de um novo registro
            const nextEventID = await app.db(`${dbPrefix}_api.sis_events`).select(app.db.raw('max(id) as count')).first()

            body.evento = nextEventID.count + 1
            // Variáveis da criação de um novo registro
            body.status = STATUS_ACTIVE
            body.created_at = new Date()
            delete body.old_id;
            app.db(tabelaDomain)
                .insert(body)
                .then(ret => {
                    body.id = ret[0]
                    // registrar o evento na tabela de eventos
                    const { createEventIns } = app.api.sisEvents
                    createEventIns({
                        "notTo": ['created_at', 'evento'],
                        "next": body,
                        "request": req,
                        "evento": {
                            "evento": `Novo registro`,
                            "tabela_bd": tabela,
                        }
                    })
                    return res.json(body)
                })
                .catch(error => {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                    return res.status(500).send(error)
                })
        }
    }

    const get = async (req, res) => {
        let user = req.user
        const tabelaSchemas = `${dbPrefix}_api.schemas_control`;
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: tabelaSchemas }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.whats_groups >= 1), `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const ret = app.db({ tbl1: tabelaDomain })
            .where({ 'tbl1.status': STATUS_ACTIVE })

        ret.then(body => {
            const quantidade = body.length
            return res.json({ data: body, count: quantidade })
        })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            })
    }

    const getById = async (req, res) => {
        let user = req.user
        const tabelaSchemas = `${dbPrefix}_api.schemas_control`;
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: tabelaSchemas }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.whats_groups >= 1, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const ret = app.db({ tbl1: tabelaDomain })
            .where({ 'tbl1.id': req.params.id, 'tbl1.status': STATUS_ACTIVE }).first()
            .then(body => {
                if (!body) return res.status(404).send('Registro não encontrado')
                return res.json(body)
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                return res.status(500).send(error)
            })
    }

    const remove = async (req, res) => {
        let user = req.user
        const tabelaSchemas = `${dbPrefix}_api.schemas_control`;
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: tabelaSchemas }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.whats_groups >= 4, `${noAccessMsg} "Exclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const registro = { status: STATUS_DELETE }
        try {
            // registrar o evento na tabela de eventos
            const last = await app.db(tabelaDomain).where({ id: req.params.id }).first()
            const { createEventUpd } = app.api.sisEvents
            const evento = await createEventUpd({
                "notTo": ['created_at', 'updated_at', 'evento'],
                "last": last,
                "next": registro,
                "request": req,
                "evento": {
                    "classevento": "Remove",
                    "evento": `Exclusão de ${tabela}`,
                    "tabela_bd": tabela,
                }
            })
            const rowsUpdated = await app.db(tabelaDomain)
                .update({
                    status: registro.status,
                    updated_at: new Date(),
                    evento: evento
                })
                .where({ id: req.params.id })
            existsOrError(rowsUpdated, 'Registro não foi encontrado')

            res.status(204).send()
        } catch (error) {
            res.status(400).send(error)
        }
    }
    

    // retorna os contatos presentes no banco de dados local
    const getLocalGroupContacts = async (req, res) => {
        let user = req.user
        const tabelaSchemas = `${dbPrefix}_api.schemas_control`;
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: tabelaSchemas }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            existsOrError(uParams && uParams.chat_account_tkn, `${noAccessMsg} "Exibição de contatos de WhatsApp"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const pageSize = req.query.pageSize || 99999
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaProfiles}`

        // Consulta principal
        const ret = app.db({ tbl1: tabelaDomain })
            .select('tbl1.id AS id_profile', 'tbl1.name', 'tbl1.phone', 'tbl1.image')
            .where('tbl1.status', STATUS_ACTIVE)
            .groupBy('tbl1.id')
            .orderBy('tbl1.name', 'asc')
            .limit(pageSize)
            .offset(((req.query.page || 1) - 1) * pageSize);

        ret.then(body => {
            body.forEach(element => {
                if (element.name) {
                    element.composedName = `${element.name} +55${element.phone}`;
                } else {
                    element.composedName = `+55${element.phone}`;
                }
            });
            const quantidade = body.length
            return res.json({ data: body, count: quantidade })
        })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            })
    }

    const getByFunction = async (req, res) => {
        const func = req.params.func
        switch (func) {
            case 'glg':
                getLocalGroupContacts(req, res)
                break;
            default:
                res.status(404).send('Função inexistente')
                break;
        }
    }

    return { save, get, getById, remove, getByFunction }
}
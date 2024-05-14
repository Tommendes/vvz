const { dbPrefix } = require("../.env")
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const tabela = 'comis_status'
    const tabelaAlias = 'Status de Comissão'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99
    // Andamento do registro        
    const STATUS_ABERTO = 10
    const STATUS_LIQUIDADO = 20
    const STATUS_ENCERRADO = 30
    const STATUS_FATURADO = 40

    const get = async (req, res) => {
        let user = req.user
        const id_comis = req.params.id_comis
        // Enviar apenas o último registro de cada comis
        const last = req.query.last || false

        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.comercial >= 1 || uParams.comissoes >= 1), `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaUsers = `${dbPrefix}_api.users`
        const tabelaEvents = `${dbPrefix}_api.sis_events`
        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`u.name, tbl1.*`))
            .leftJoin({ se: tabelaEvents }, 'se.id', 'tbl1.evento')
            .leftJoin({ u: tabelaUsers }, 'u.id', 'se.id_user')
            .where({ id_comissoes: id_comis })
            .groupBy('tbl1.id')
        if (last) ret.orderBy('tbl1.created_at', 'desc').orderBy('tbl1.status_comis', 'desc').first()
        else ret.orderBy('created_at').orderBy('status_comis')

        ret.then(body => {
            const quantidade = body.length
            body.forEach(element => {
                if (element.evento == 1) element.name = 'Vivazul'
            });
            return res.json({ data: body, count: quantidade })
        })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            })
    }

    const getByFunction = async (req, res) => {
        const func = req.params.func
        switch (func) {
            case 'glf':
                getListByField(req, res)
                break;
            case 'set':
                setStatus(req, res)
                break;
            case 'get':
                getStatus(req, res)
                break;
            default:
                res.status(404).send('Função inexitente')
                break;
        }
    }

    // Lista de registros por campo
    const getListByField = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const fieldName = req.query.fld
        const value = req.query.vl
        const select = req.query.slct

        const limit = req.query.limit && req.query.limit > 0 ? req.query.limit : 0
        const order = 'created_at:desc,' + (req.query.order || 'status_comis:desc')
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const ret = app.db(tabelaDomain)

        if (select) {
            // separar os campos e retirar os espaços
            const selectArr = select.split(',').map(s => s.trim())
            ret.select(selectArr)
        }

        ret.where(app.db.raw(`${fieldName} = ${value}`))

        if (order) {
            // separar os campos e retirar os espaços
            const orderArr = order.split(',').map(s => s.trim())
            orderArr.forEach(element => {
                ret.orderBy(element.split(':')[0], element.split(':')[1])
            });
        }

        if (limit) {
            ret.limit(limit)
        }
        ret.then(body => {
            const count = body.length
            return res.json({ data: body, count })
        }).catch(error => {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        })
    }

    const setStatus = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.comissoes >= 3, `${noAccessMsg} "Alteração de status de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const body = { ...req.body }

        try {
            existsOrError(body.id_comissoes, 'Comissão não informada')
            existsOrError(body.status_comis, 'Status não informado')
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(400).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const nextEventID = await app.db(`${dbPrefix}_api.sis_events`).select(app.db.raw('max(id) as count')).first()
        body.evento = nextEventID.count + 1
        body.created_at = new Date()
        if (body.remove_status) {
            const bodyRemove = { id_comissoes: body.id_comissoes, status_comis: body.status_comis }
            app.db(tabelaDomain)
                .where(bodyRemove)
                .del()
                .then(ret => {
                    body.id = ret[0]
                    // registrar o evento na tabela de eventos
                    const { createEventIns } = app.api.sisEvents
                    createEventIns({
                        "notTo": ['created_at', 'evento'],
                        "next": body,
                        "request": req,
                        "evento": {
                            "evento": `Exclusão de status: ${JSON.stringify(bodyRemove)}`,
                            "tabela_bd": tabela,
                        }
                    })
                    return res.json(body)
                })
                .catch(error => {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                    return res.status(500).send(error)
                })
        } else {
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
                            "evento": `Novo status: ${JSON.stringify(body)}`,
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

    const getStatus = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.comercial >= 1 || uParams.comissoes >= 1), `${noAccessMsg} "Consultar status de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        try {
            existsOrError(req.query.id_comis, 'Comissão não informada')
        } catch (error) {
            return res.status(400).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        try {
            const body = await app.db(tabelaDomain)
                .select(`status_comis`)
                .where({ id_comissoes: req.query.id_comis })
                .orderBy('created_at', 'desc')
                .first()
            return res.json(body)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        }
    }

    return {
        get, getByFunction,
        STATUS_ABERTO,
        STATUS_LIQUIDADO,
        STATUS_ENCERRADO,
        STATUS_FATURADO
    }
}
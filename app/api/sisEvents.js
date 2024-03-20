const axios = require('axios')

module.exports = app => {
    const { isMatchOrError, noAccessMsg } = app.api.validation
    const STATUS_ACTIVE = 10
    const STATUS_TRASH = 20
    const { envLocalhost, dbPrefix } = require("../.env")
    const tabelaSisEvents = `${dbPrefix}_api.sis_events`
    const tabelaAlias = 'Eventos do Sistema'

    const get = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.gestor >= 1, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        const tabelaDomain = `${dbPrefix}_api.sis_events`
        const tabelaUserDomain = `${dbPrefix}_api.users`

        let queryes = undefined
        let query = undefined
        let page = 0
        let rows = 10
        let sortField = app.db.raw('tbl1.created_at')
        let sortOrder = 'desc'
        if (req.query) {
            queryes = req.query
            query = ''
            for (const key in queryes) {
                let operator = queryes[key].split(':')[0]
                let value = queryes[key].split(':')[1]
                if (key.split(':')[0] == 'field') {
                    if (['cpf_cnpj'].includes(key.split(':')[1])) value = value.replace(/([^\d])+/gim, "")

                    switch (operator) {
                        case 'startsWith': operator = `like '${value}%'`
                            break;
                        case 'contains': operator = `regexp("${value.toString().replace(' ', '.+')}")`
                            break;
                        case 'notContains': operator = `not regexp("${value.toString().replace(' ', '.+')}")`
                            break;
                        case 'endsWith': operator = `like '%${value}'`
                            break;
                        case 'notEquals': operator = `!= '${value}'`
                            break;
                        default: operator = `= '${value}'`
                            break;
                    }
                    let queryField = key.split(':')[1]
                    if (queryField == 'evento') queryField = 'tbl1.evento'
                    else if (queryField == 'user') queryField = 'us.name'
                    query += `${queryField} ${operator} AND `
                } else if (key.split(':')[0] == 'params') {
                    switch (key.split(':')[1]) {
                        case 'page': page = Number(queryes[key]);
                            break;
                        case 'rows': rows = Number(queryes[key]);
                            break;
                    }
                } else if (key.split(':')[0] == 'sort') {
                    sortField = key.split(':')[1].split('=')[0]
                    sortOrder = queryes[key]
                } else if (typeof key === 'string' && key !== null) {
                    const objectQueryes = Object.keys(queryes)
                    objectQueryes.forEach(element => {
                        query += `${element} = '${queryes[element]}' AND `
                    });
                }
            }
            query = query.slice(0, -5).trim()
        }
        let filterCnpj = undefined
        let filter = req.query.filter
        if (filter) {
            filter = filter.trim()
            filterCnpj = (filter.replace(/([^\d])+/gim, "").length <= 14) ? filter.replace(/([^\d])+/gim, "") : undefined
        }

        const totalRecords = await app.db({ tbl1: tabelaDomain })
            .countDistinct('tbl1.id as count')
            .join({ us: tabelaUserDomain }, 'tbl1.id_user', '=', 'us.id')
            .join({ sc: 'schemas_control' }, 'sc.id', 'us.schema_id')
            .where({ 'sc.schema_description': user.schema_description })
            .whereRaw(query ? query : '1=1')
            .first()

        const ret = app.db({ tbl1: tabelaDomain })
            .select({ id: 'tbl1.id' }, { evento: 'tbl1.evento' }, { created_at: 'tbl1.created_at' }, { classevento: 'tbl1.classevento' }, { tabela_bd: 'tbl1.tabela_bd' }, { id_registro: 'tbl1.id_registro' }, { user: 'us.name' },)
            .join({ us: tabelaUserDomain }, 'tbl1.id_user', '=', 'us.id')
            .join({ sc: 'schemas_control' }, 'sc.id', 'us.schema_id')
            .where({ 'sc.schema_description': user.schema_description })
            .whereRaw(query ? query : '1=1')
            .groupBy('tbl1.id')
            .orderBy(sortField, sortOrder)
            .limit(rows).offset((page + 1) * rows - rows)
        ret.then(body => {
            return res.json({ data: body, totalRecords: totalRecords.count })
        })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            })
    }

    const getById = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.gestor >= 1, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        app.db(tabelaSisEvents)
            .where({ id: req.params.id })
            .first()
            .then(sis_events => {
                return res.json(sis_events)
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                return res.status(500).send(error)
            })
    }

    const getByField = async (req, res) => {
        const field = req.params.field
        const ret = app.db({ se: tabelaSisEvents })
            .select(app.db.raw(`${field} as field`))
            .where(app.db.raw(`length(${field}) > 0`))
            .groupBy(app.db.raw(`${field}`))
            .orderBy(app.db.raw(`${field}`), "desc")
            .then(fields => res.json({ data: fields }))
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                return res.status(500).send(error)
            })
    }

    const createEventUpd = async (req, res) => {
        const evento = req.evento
        const force = req.force
        const last = req.last
        const next = req.next
        const request = req.request
        const notTo = req.notTo
        let eventoDescr = '(Antes => Depois) '
        let fields = ''
        for (older in last) {
            for (newest in next) {
                if (newest === older && next[newest] != last[older] && notTo.indexOf(newest) < 0)
                    if (newest == 'password')
                        fields += `${newest}, `;
                    else
                        fields += `${newest}: ${last[older]} => ${next[newest]}, `;
            }
        }
        // se campos foram alterados então registra
        if (force || (fields.length >= 2 && fields.substr(0, fields.length - 2).length > 0)) {
            // remove a virgula e espaço inseridos ao final da string
            evento.evento = force ? `${evento.evento}` : `${evento.evento} ${eventoDescr}: ${fields.substr(0, fields.length - 2)}`

            evento.id_user = !(request && request.user && request.user.id) ? last.id : request.user.id
            evento.classevento = evento.classevento || "Update"
            evento.ip = request.ip
            evento.id_registro = last.id
            if (envLocalhost) {
                evento.geo_lt = null
                evento.geo_ln = null
            } else {
                const url = `http://api.ipstack.com/${request.ip}?access_key=73ec9b93dcb973e011c965b8a25f08e4`
                const ipstack = await axios.get(url).catch(error => {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                    return res.status(500).send(error)
                })
                evento.geo_lt = ipstack.data.latitude
                evento.geo_ln = ipstack.data.longitude
            }
            evento.created_at = new Date()

            try {
                const trx = req.trx
                let dba = undefined
                if (trx) dba = await trx(tabelaSisEvents).insert(evento)
                else dba = await app.db(tabelaSisEvents).insert(evento)
                return dba[0]
            } catch (error) {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
                res.status(500).send(error)
            }
        }
    }

    const createEventIns = async (req, res) => {
        const evento = req.evento
        const next = req.next
        const request = req.request
        const notTo = req.notTo
        let eventoDescr = ''
        let fields = ''
        for (newest in next) {
            if (notTo.indexOf(newest) < 0)
                fields += `${newest}: ${next[newest]}, `;
        }
        if (fields.length >= 2 && fields.substr(0, fields.length - 2).length > 0) {
            // remove a virgula e espaço inseridos ao final da string
            eventoDescr += fields.substr(0, fields.length - 2)

            evento.id_user = !(request && request.user && request.user.id) ? next.id : request.user.id
            evento.evento = `${evento.evento}: ${eventoDescr}`
            evento.classevento = "Insert"
            evento.ip = request.ip
            evento.id_registro = next.id

            if (envLocalhost) {
                evento.geo_lt = null
                evento.geo_ln = null
            } else {
                const url = `http://api.ipstack.com/${request.ip}?access_key=73ec9b93dcb973e011c965b8a25f08e4`
                const ipstack = await axios.get(url).catch(error => {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                    return res.status(500).send(error)
                })
                evento.geo_lt = ipstack.data.latitude
                evento.geo_ln = ipstack.data.longitude
            }
            evento.created_at = new Date()

            try {
                const trx = req.trx
                let dba = undefined
                if (trx) dba = await trx(tabelaSisEvents).insert(evento)
                else dba = await app.db(tabelaSisEvents).insert(evento)
                return dba[0]
            } catch (error) {
                res.status(500).send(error)
            }
        }
    }

    const createEventRemove = async (req, res) => {
        const evento = req.evento
        const last = req.last
        const request = req.request
        let eventoDescr = '(dados antes da exclusão)'
        let fields = ''
        for (older in last) {
            fields += `${older}: ${last[older]}, `;
        }
        // se campos foram alterados então registra
        if ((fields.length >= 2 && fields.substr(0, fields.length - 2).length > 0)) {
            // remove a virgula e espaço inseridos ao final da string
            evento.evento = `${evento.evento} ${eventoDescr}: ${fields.substr(0, fields.length - 2)}`

            evento.id_user = !(request && request.user && request.user.id) ? last.id : request.user.id
            evento.classevento = "Remove"
            evento.ip = request.ip
            evento.id_registro = last.id
            if (envLocalhost) {
                evento.geo_lt = null
                evento.geo_ln = null
            } else {
                const url = `http://api.ipstack.com/${request.ip}?access_key=73ec9b93dcb973e011c965b8a25f08e4`
                const ipstack = await axios.get(url).catch(error => {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                    return res.status(500).send(error)
                })
                evento.geo_lt = ipstack.data.latitude
                evento.geo_ln = ipstack.data.longitude
            }
            evento.created_at = new Date()

            try {
                const trx = req.trx
                let dba = undefined
                if (trx) dba = await trx(tabelaSisEvents).insert(evento)
                else dba = await app.db(tabelaSisEvents).insert(evento)
                return dba[0]
            } catch (error) {
                res.status(500).send(error)
            }
        }
    }

    const createEventPrint = async (req, res) => {
        const evento = req.evento
        const next = req.next
        const request = req.request
        const notTo = req.notTo
        let eventoDescr = ''
        let fields = ''
        for (newest in next) {
            if (notTo.indexOf(newest) < 0)
                fields += `${newest}: ${next[newest]}, `;
        }
        if (fields.length >= 2 && fields.substr(0, fields.length - 2).length > 0) {
            // remove a virgula e espaço inseridos ao final da string
            eventoDescr += fields.substr(0, fields.length - 2)

            evento.id_user = !(request && request.user && request.user.id) ? next.id : request.user.id
            evento.evento = evento.evento || `${evento.evento}: ${eventoDescr}`
            evento.classevento = evento.classevento || "Printing"
            evento.ip = request.ip
            evento.id_registro = next.id

            if (envLocalhost) {
                evento.geo_lt = null
                evento.geo_ln = null
            } else {
                const url = `http://api.ipstack.com/${request.ip}?access_key=73ec9b93dcb973e011c965b8a25f08e4`
                const ipstack = await axios.get(url).catch(error => {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                    return res.status(500).send(error)
                })
                evento.geo_lt = ipstack.data.latitude
                evento.geo_ln = ipstack.data.longitude
            }
            evento.created_at = new Date()

            try {
                const trx = req.trx
                let dba = undefined
                if (trx) dba = await trx(tabelaSisEvents).insert(evento)
                else dba = await app.db(tabelaSisEvents).insert(evento)
                return dba[0]
            } catch (error) {
                res.status(500).send(error)
            }
        }
    }

    const createEvent = async (req, res) => {
        const request = req.request
        const evento = req.evento
        if (envLocalhost) {
            evento.geo_lt = null
            evento.geo_ln = null
        } else {
            const url = `http://api.ipstack.com/${request.ip}?access_key=379f7af2dcb3b36d1f4c8b9e8d421dfb`
            const ipstack = await axios.get(url).catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
                return res.status(500).send(error)
            })
            evento.geo_lt = ipstack.data.latitude
            evento.geo_ln = ipstack.data.longitude
        }
        evento.created_at = new Date()        

        try {
            const trx = req.trx
            let dba = undefined
            if (trx) dba = await trx(tabelaSisEvents).insert(evento)
            else dba = await app.db(tabelaSisEvents).insert(evento)
            return dba[0]
        } catch (error) {
            res.status(500).send(error)
        }
    }

    const getEventosDoRegistro = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const limit = req.query.limit || 10
        const orderBy = req.query.orderBy || 'created_at'

        app.db({ tbl1: tabelaSisEvents })
            .select({ id: 'tbl1.id' }, { evento: 'tbl1.evento' }, { created_at: 'tbl1.created_at' }, { classevento: 'tbl1.classevento' }, { tabela_bd: 'tbl1.tabela_bd' }, { id_registro: 'tbl1.id_registro' }, { user: 'us.name' },)
            .join({ us: 'users' }, 'tbl1.id_user', '=', 'us.id')
            .where({ 'tbl1.id_registro': req.params.id, 'tbl1.tabela_bd': req.params.tabela_bd })
            .orderBy(orderBy, 'desc')
            .limit(limit)
            .then(sis_events => {
                return res.json(sis_events)
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                return res.status(500).send(error)
            })
    }

    return { createEventUpd, createEventIns, createEventRemove, createEventPrint, createEvent, get, getById, getByField, getEventosDoRegistro }
}
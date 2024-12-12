const { dbPrefix } = require("../.env")
const moment = require('moment')
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const tabela = 'com_prospeccoes'
    const tabelaAlias = 'Prospeccoes'
    const tabelaCadEnderecos = 'cad_enderecos'
    const tabelaCadastros = 'cadastros'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99

    const save = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        let body = { ...req.body }
        delete body.id;
        if (req.params.id) body.id = req.params.id
        try {
            // Alçada do usuário
            if (body.id) isMatchOrError(uParams && (uParams.agente_v >= 1 || uParams.prospeccoes >= 3), `${noAccessMsg} "Edição de ${tabelaAlias}"`)
            else isMatchOrError(uParams && (uParams.agente_v >= 1 || uParams.prospeccoes >= 2), `${noAccessMsg} "Inclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`

        try {
            existsOrError(body.id_cadastros, 'Cadastro não informado')
            existsOrError(body.id_agente, 'Agente não selecionado')
            existsOrError(body.id_cad_end, 'Endereço não selecionado')
            existsOrError(body.data_visita, 'Data da visita não informada')

            const momentDate = moment(body.data_visita);
            if (!momentDate.isValid()) throw 'Data da visita inválida'

            if (!body.id) {
                const unique = await app.db(tabelaDomain).where({ id_cadastros: body.id_cadastros, id_cad_end: body.id_cad_end, data_visita: body.data_visita, periodo: body.periodo, status: STATUS_ACTIVE }).first()
                if (unique) {
                    return res.status(400).send('Prospecção já cadastrada')
                }
            }
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: Erro ao enviar arquivo: ${error}`, sConsole: true } })
            return res.status(400).send(error)
        }

         
        delete body.name; delete body.nome; delete body.cpf_cnpj; delete body.logradouro; delete body.nr; delete body.bairro; delete body.cidade; delete body.uf;
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
                    "evento": `Alteração de cadastro de ${tabela}`,
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
                else res.status(200).send('Registro não encontrado')
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
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.agente_v >= 1 || uParams.prospeccoes >= 1), `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaUsers = `${dbPrefix}_api.users`
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaCadastrosDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaCadastros}`
        const tabelaCadEnderecosDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaCadEnderecos}`
        let queryes = undefined
        let query = undefined
        let page = 0
        let rows = 10
        let sortField = app.db.raw('date(data_visita)')
        let sortOrder = 'DESC'
        let tipoParams = '1=1'
        if (req.query) {
            queryes = req.query
            query = ''
            for (const key in queryes) {
                let operator = queryes[key].split(':')[0]
                let value = queryes[key].split(':')[1]
                key.split(':').forEach(element => {
                    if (element == 'field') {
                        if (['data_visita'].includes(key.split(':')[1])) {
                            sortField = 'data_visita'
                            value = queryes[key].split(':')
                            let valueI = moment(value[1], 'ddd MMM DD YYYY HH').format('YYYY-MM-DD');
                            let valueF = moment(value[3].split(',')[1], 'ddd MMM DD YYYY HH').format('YYYY-MM-DD');
                            if (!moment(valueF, 'YYYY-MM-DD', true).isValid()) {
                                valueF = moment(valueI).add(1, 'day').format('YYYY-MM-DD');
                            }
                            switch (operator) {
                                case 'dateIsNot': operator = `not between "${valueI}" and "${valueF}"`
                                    break;
                                case 'dateBefore': operator = `< "${valueI}"`
                                    break;
                                case 'dateAfter': operator = `> "${valueF}"`
                                    break;
                                default: operator = `between "${valueI}" and "${valueF}"`
                                    break;
                            }
                            query += `date(tbl1.data_visita) ${operator} AND `
                        } else {
                            switch (operator) {
                                case 'startsWith': operator = `like "${value}"`
                                    break;
                                case 'contains': operator = `regexp("${value.toString().trim().replaceAll(' ', '.+')}")`
                                    break;
                                case 'notContains': operator = `not regexp("${value.toString().trim().replaceAll(' ', '.+')}")`
                                    break;
                                case 'endsWith': operator = `like "%${value}"`
                                    break;
                                case 'notEquals': operator = `!= "${value}"`
                                    break;
                                default: operator = `= "${value}"`
                                    break;
                            }
                            let queryField = key.split(':')[1]
                            if (queryField == 'nome') {
                                query += `(c.nome ${operator} or c.cpf_cnpj ${operator}) AND `
                            } else {
                                if (queryField == 'agente') queryField = 'u.name'
                                else if (queryField == 'descricao') queryField = 'tbl1.descricao'
                                else if (queryField == 'tipo_doc') queryField = 'pp.descricao'
                                query += `${queryField} ${operator} AND `
                            }
                        }
                    }
                    if (element == 'params') {
                        switch (key.split(':')[1]) {
                            case 'page': page = Number(queryes[key]);
                                break;
                            case 'rows': rows = Number(queryes[key]);
                                break;
                        }
                    }
                    if (element == 'sort') {
                        sortField = key.split(':')[1] ? key.split(':')[1].split('=')[0] : 'data_visita'
                        if (sortField == 'data_visita') sortField = 'date(tbl1.data_visita)'
                        sortOrder = queryes[key]
                    }

                });
            }
            query = query.slice(0, -5).trim()
        }
        let filterCnpj = undefined
        let filter = req.query.filter
        if (filter) {
            filter = filter.trim()
            filterCnpj = (filter.replace(/([^\d])+/gim, "").length <= 14) ? filter.replace(/([^\d])+/gim, "") : undefined
        }

        let totalRecords = app.db({ tbl1: tabelaDomain })
            .countDistinct('tbl1.id as count').first()
            .join({ u: tabelaUsers }, 'u.id', '=', 'tbl1.id_agente')
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'tbl1.id_cadastros')
            .join({ ce: tabelaCadEnderecosDomain }, 'ce.id', '=', 'tbl1.id_cad_end')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')
            // .groupBy('tbl1.id')
        if (uParams.agente_v >= 1 && !(uParams.gestor + uParams.admin + uParams.prospeccoes >= 1)) totalRecords.where({ 'tbl1.id_agente': uParams.id })
        totalRecords = await totalRecords

        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.id, u.name, c.nome, c.cpf_cnpj, ce.logradouro, ce.nr, ce.bairro, ce.cidade, ce.uf, tbl1.periodo, tbl1.pessoa, tbl1.contato, tbl1.data_visita`))
            .join({ u: tabelaUsers }, 'u.id', '=', 'tbl1.id_agente')
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'tbl1.id_cadastros')
            .join({ ce: tabelaCadEnderecosDomain }, 'ce.id', '=', 'tbl1.id_cad_end')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')
            .orderBy(app.db.raw(sortField), sortOrder)
            .limit(rows).offset((page + 1) * rows - rows)
        if (uParams.agente_v >= 1 && !(uParams.gestor + uParams.admin + uParams.prospeccoes >= 1)) ret.where({ 'tbl1.id_agente': uParams.id })
        ret.then(body => {
            const total = totalRecords && totalRecords.count ? totalRecords.count : 0
            return res.json({ data: body, totalRecords: total })
        }).catch(error => {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
        })
    }

    const getById = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.agente_v >= 1 || uParams.prospeccoes >= 1), `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaUsers = `${dbPrefix}_api.users`
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaCadastrosDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaCadastros}`
        const tabelaCadEnderecosDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaCadEnderecos}`
        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*, u.name, c.nome, c.cpf_cnpj, ce.logradouro, ce.nr, ce.bairro, ce.cidade, ce.uf, tbl1.periodo, tbl1.pessoa, tbl1.contato, tbl1.data_visita`))
            .join({ u: tabelaUsers }, 'u.id', '=', 'tbl1.id_agente')
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'tbl1.id_cadastros')
            .join({ ce: tabelaCadEnderecosDomain }, 'ce.id', '=', 'tbl1.id_cad_end')
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
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.agente_v >= 1 || uParams.prospeccoes >= 4), `${noAccessMsg} "Exclusão de ${tabelaAlias}"`)
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
                .where({ id: req.params.id, status: STATUS_ACTIVE })
            existsOrError(rowsUpdated, 'Registro não foi encontrado')

            res.status(204).send()
        } catch (error) {
            res.status(400).send(error)
        }
    }


    const getByFunction = async (req, res) => {
        const func = req.params.func
        switch (func) {
            case 'gbi':
                getBIData(req, res)
                break;
            default:
                res.status(404).send('Função inexitente')
                break;
        }
    }

    // Recupera dados para index da plataforma BI
    const getBIData = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        const biPeriodDi = req.query.periodDi
        const biPeriodDf = req.query.periodDf
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        try {
            const total = await app.db(tabelaDomain).count('id as count').where({ status: STATUS_ACTIVE }).first()
            let noPeriodo = { count: 0 }
            if (biPeriodDi && biPeriodDf)
                noPeriodo = await app.db(tabelaDomain).count('id as count').whereRaw(`date(data_visita) between "${biPeriodDi}" and "${biPeriodDf}"`).first()
            const novos = await app.db(tabelaDomain).count('id as count')
                .whereRaw(`EXTRACT(YEAR FROM date(data_visita)) = EXTRACT(YEAR FROM NOW())`)
                .whereRaw(`EXTRACT(MONTH FROM date(data_visita)) = EXTRACT(MONTH FROM NOW())`)
                .first()
            return res.send({ total: total.count, novos: novos.count, noPeriodo: noPeriodo.count })
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        }
    }

    return { save, get, getById, remove, getByFunction }
}
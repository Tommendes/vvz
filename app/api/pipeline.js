const { dbPrefix } = require("../.env")
const moment = require('moment')
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const tabela = 'pipeline'
    const tabelaStatus = 'pipeline_status'
    const tabelaParams = 'pipeline_params'
    const tabelaLocalParams = 'local_params'
    const tabelaCadastros = 'cadastros'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99

    const save = async (req, res) => {
        let user = req.user
        const uParams = await app.db('users').where({ id: user.id }).first();
        let body = { ...req.body }
        if (req.params.id) body.id = req.params.id
        try {
            // Alçada para edição
            if (body.id)
                isMatchOrError(uParams, `${noAccessMsg} "Edição de ${tabela}"`)
            // Alçada para inclusão
            else isMatchOrError(uParams, `${noAccessMsg} "Inclusão de ${tabela}"`)
        } catch (error) {
            return res.status(401).send(error)
        }
        const tabelaDomain = `${dbPrefix}_${user.cliente}_${user.dominio}.${tabela}`

        try {

            existsOrError(body.id_cadastros, 'Cadastro não encontrado ')
            if (body.id_cadastros < 0 && body.id_cadastros.length > 10) throw "Id_cadastros inválido"
            existsOrError(body.id_pipeline_params, 'Parâmetro não encontrado')
            if (body.id_pipeline_params < 0 && body.id_pipeline_params.length > 10) throw 'Parâmetro inválido'

        } catch (error) {
            return res.status(400).send(error)
        }

        delete body.hash; delete body.tblName
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
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
                    return res.status(500).send(error)
                })
        } else {
            // Criação de um novo registro
            const nextEventID = await app.db('sis_events').select(app.db.raw('count(*) as count')).first()

            body.evento = nextEventID.count + 1
            // Variáveis da criação de um novo registro
            body.status = STATUS_ACTIVE
            body.created_at = new Date()

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
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
                    return res.status(500).send(error)
                })
        }
    }

    const limit = 20 // usado para paginação
    const get = async (req, res) => {
        let user = req.user
        const uParams = await app.db('users').where({ id: user.id }).first();
        try {
            // Alçada para exibição
            isMatchOrError(uParams, `${noAccessMsg} "Exibição de cadastro de ${tabela}"`)
        } catch (error) {
            return res.status(401).send(error)
        }

        const tabelaUsers = `${dbPrefix}_api.users`
        const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
        const tabelaPipelineParamsDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabelaParams}`
        const tabelaPipelineStatusDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabelaStatus}`
        const tabelaCadastrosDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabelaCadastros}`
        const tabelaLocalParamsDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabelaLocalParams}`

        let queryes = undefined
        let query = undefined
        let page = 0
        let rows = 10
        let sortField = app.db.raw('tbl1.id')
        let sortOrder = 'DESC'
        let tipoParams = '1=1'
        if (req.query) {
            queryes = req.query
            console.log(queryes);
            query = ''
            for (const key in queryes) {
                let operator = queryes[key].split(':')[0]
                let value = queryes[key].split(':')[1]
                if (key.split(':')[0] == 'field') {
                    sortField = key.split(':')[1].split('=')[0]
                    sortOrder = 'ASC'
                    if (['status_params'].includes(key.split(':')[1])) {
                        query += `EXTRACT(MONTH FROM ${key.split(':')[1]}) = '${value}' AND `
                    } else if (['created_at'].includes(key.split(':')[1])) {
                        sortField = 'CAST(tbl1.created_at AS DATE)'
                        sortOrder = 'DESC'
                        value = queryes[key].split(':')
                        let valueI = moment(value[1], 'ddd MMM DD YYYY HH').format('YYYY-MM-DD');
                        let valueF = moment(value[3].split(',')[1], 'ddd MMM DD YYYY HH').format('YYYY-MM-DD');
                        // console.log(operator, valueI, valueF);
                        // value = moment(value, 'ddd MMM DD YYYY HH').format('YYYY-MM-DD');
                        switch (operator) {
                            case 'dateIsNot': operator = `not between '${valueI}' and '${valueF}'`
                                break;
                            case 'dateBefore': operator = `< '${valueI}'`
                                break;
                            case 'dateAfter': operator = `> '${valueF}'`
                                break;
                            default: operator = `between '${valueI}' and '${valueF}'`
                                break;
                        }
                        query += `date(tbl1.created_at) ${operator} AND `
                    } else {
                        if (['cpf_cnpj'].includes(key.split(':')[1])) value = value.replace(/([^\d])+/gim, "")

                        switch (operator) {
                            case 'startsWith': operator = `like '${value}%'`
                                break;
                            case 'contains': operator = `like '%${value}%'`
                                break;
                            case 'notContains': operator = `not like '%${value}%'`
                                break;
                            case 'endsWith': operator = `like '%${value}'`
                                break;
                            case 'notEquals': operator = `!= '${value}'`
                                break;
                            default: operator = `= '${value}'`
                                break;
                        }
                        let queryField = key.split(':')[1]
                        if (queryField == 'agente') queryField = 'u.name'
                        else if (queryField == 'descricao') queryField = 'tbl1.descricao'
                        query += `${queryField} ${operator} AND `
                    }
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
            .count('tbl1.id as count').first()
            .leftJoin({ u: tabelaUsers }, 'u.id', '=', 'tbl1.id_com_agentes')
            .join({ pp: tabelaPipelineParamsDomain }, 'pp.id', '=', 'tbl1.id_pipeline_params')
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'tbl1.id_cadastros')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')

        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.id, pp.descricao AS tipo_doc, c.nome, u.name agente, tbl1.documento, tbl1.versao, tbl1.descricao, tbl1.valor_bruto, tbl1.descricao,
            date_format(SUBSTRING_INDEX(tbl1.created_at,' ',1),'%d/%m/%Y')created_at, 
            SUBSTRING(SHA(CONCAT(tbl1.id,'${tabela}')),8,6) AS hash`))
            .leftJoin({ u: tabelaUsers }, 'u.id', '=', 'tbl1.id_com_agentes')
            .join({ pp: tabelaPipelineParamsDomain }, 'pp.id', '=', 'tbl1.id_pipeline_params')
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'tbl1.id_cadastros')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')
            // .groupBy('tbl1.id')
            .orderBy(app.db.raw(sortField), sortOrder)
            .limit(rows).offset((page + 1) * rows - rows)
        console.log(ret.toString());
        ret.then(body => {
            return res.json({ data: body, totalRecords: totalRecords.count })
        })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            })
    }


    const getById = async (req, res) => {
        let user = req.user
        const uParams = await app.db('users').where({ id: user.id }).first();
        try {
            // Alçada para exibição
            isMatchOrError(uParams, `${noAccessMsg} "Exibição de Endereços de ${tabela}"`)
        } catch (error) {
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*, TO_BASE64('${tabela}') tblName, SUBSTRING(SHA(CONCAT(tbl1.id,'${tabela}')),8,6) as hash`))
            .where({ 'tbl1.id': req.params.id, 'tbl1.status': STATUS_ACTIVE }).first()
            .then(body => {
                return res.json(body)
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
                return res.status(500).send(error)
            })
    }

    const remove = async (req, res) => {
        let user = req.user
        const uParams = await app.db('users').where({ id: user.id }).first();
        try {
            // Alçada para exibição
            isMatchOrError((uParams && uParams.admin >= 1), `${noAccessMsg} "Exclusão de Endereço de ${tabela}"`)
        } catch (error) {
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
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
                    "evento": `Exclusão de Endereço de ${tabela}`,
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


    return { save, get, getById, remove }
}
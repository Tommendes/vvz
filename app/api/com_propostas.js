const { dbPrefix } = require("../.env")
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const { removeAccents, titleCase } = app.api.facilities
    const tabela = 'com_propostas'
    const tabelaAlias = 'Propostas'
    const tabelaCadastros = 'cadastros'
    const tabelaPipeline = 'pipeline'
    const tabelaParams = 'pipeline_params'
    const tabelaStatus = 'pipeline_status'
    const tabelaPv = 'pv'
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
            if (body.id) isMatchOrError(uParams && (uParams.at >= 3 || uParams.comercial >= 3), `${noAccessMsg} "Edição de ${tabelaAlias}"`)
            else isMatchOrError(uParams && (uParams.at >= 2 || uParams.comercial >= 2), `${noAccessMsg} "Inclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaCadastrosDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaCadastros}`
        const tabelaPipelineDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaPipeline}`

        try {
            existsOrError(body.id_pipeline, 'Registro no Pipeline não informado')
            // cast body.id_pipeline para inteiro
            const cadastro = await app.db({ c: tabelaCadastrosDomain })
                .join({ p: tabelaPipelineDomain }, function () {
                    this.on('p.id_cadastros', '=', 'c.id')
                })
                .where({ 'p.id': body.id_pipeline }).first()
            body.pessoa_contato = body.pessoa_contato || cadastro.nome
            body.telefone_contato = body.telefone_contato || cadastro.telefone
            body.email_contato = body.email_contato || cadastro.email
            existsOrError(body.pessoa_contato, 'Pessoa de contato não informada')
            existsOrError(body.telefone_contato, 'Telefone de contato não informado')
            existsOrError(body.email_contato, 'E-mail de contato não informado')
            existsOrError(body.saudacao_inicial, 'Saudação inicial não informada')
            existsOrError(body.conclusao, 'Conclusão não informada')
            existsOrError(body.garantia, 'Garantia não informada')
            existsOrError(String(body.desconto_ativo), 'Desconto ativo não informado')
            existsOrError(body.observacoes_finais, 'Observações finais não informadas')
            existsOrError(body.assinatura, 'Assinatura não informada')
            if (body.id) {
                existsOrError(body.prz_entrega, 'Prazo de entrega não informado')
                existsOrError(body.forma_pagto, 'Forma de pagamento não informada')
                existsOrError(body.validade_prop, 'Validade da proposta não informada')
            }
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: Erro ao enviar arquivo: ${error}`, sConsole: true } })
            return res.status(400).send(error)
        }
         
        // body.nascimento = moment(body.nascimento).format("DD/MM/YYYY")
        const { changeUpperCase, removeAccentsObj } = app.api.facilities
        body = (JSON.parse(JSON.stringify(body), removeAccentsObj));
        // body = (JSON.parse(JSON.stringify(body), changeUpperCase));

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
                else res.status(200).send('Proposta não foi encontrada')
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
            isMatchOrError(uParams && (uParams.at >= 1 || uParams.comercial >= 1), `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaPipelineParamsDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaParams}`
        const tabelaCadastrosDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaCadastros}`
        const tabelaPipelineDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaPipeline}`
        const tabelaPvDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaPv}`

        let queryes = undefined
        let query = undefined
        let page = 0
        let rows = 10
        let sortField = app.db.raw('cast(p.documento as unsigned)')
        let sortOrder = 'desc'
        if (req.query) {
            queryes = req.query
            query = ''
            for (const key in queryes) {
                let operator = queryes[key].split(':')[0]
                let value = queryes[key].split(':')[1]
                if (key.split(':')[0] == 'field') {

                    if (['cpf_cnpj'].includes(key.split(':')[1])) value = value.replace(/([^\d])+/gim, "")
                    // Se o campo for documento, fazer cast do valor desejado para inteiro removendo zeros a esquerda
                    if (['documento'].includes(key.split(':')[1])) {
                        value = Number(value.replace(/([^\d])+/gim, ""))
                        operator = null
                    }
                    switch (operator) {
                        case 'startsWith': operator = `like '${value}%'`
                            break;
                        case 'contains': operator = `regexp("${value.toString().replaceAll(' ', '.+')}")`
                            break;
                        case 'notContains': operator = `not regexp("${value.toString().replaceAll(' ', '.+')}")`
                            break;
                        case 'endsWith': operator = `like '%${value}'`
                            break;
                        case 'notEquals': operator = `!= '${value}'`
                            break;
                        default: operator = `= '${value}'`
                            break;
                    }
                    let queryField = key.split(':')[1]

                    if (queryField == 'descricao') queryField = 'pp.descricao'
                    // Se o campo for documento fazer cast para inteiro removendo zeros a esquerda
                    if (queryField == 'documento') queryField = 'cast(p.documento as unsigned)'
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
            .countDistinct('tbl1.id as count').first()
            .join({ p: tabelaPipelineDomain }, 'p.id', '=', 'tbl1.id_pipeline')
            .join({ pp: tabelaPipelineParamsDomain }, 'pp.id', '=', 'p.id_pipeline_params')
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'p.id_cadastros')
            .leftJoin({ pv: tabelaPvDomain }, 'pv.id', '=', 'tbl1.id_pv')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')
            // .groupBy('tbl1.id')

        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.id,pp.descricao,p.documento,p.versao,pv.pv_nr,c.nome,c.cpf_cnpj,tbl1.pessoa_contato,tbl1.telefone_contato,tbl1.email_contato`))
            .join({ p: tabelaPipelineDomain }, 'p.id', '=', 'tbl1.id_pipeline')
            .join({ pp: tabelaPipelineParamsDomain }, 'pp.id', '=', 'p.id_pipeline_params')
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'p.id_cadastros')
            .leftJoin({ pv: tabelaPvDomain }, 'pv.id', '=', 'tbl1.id_pv')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')
            .groupBy('tbl1.id')
            .orderBy(sortField, sortOrder)
            .limit(rows).offset((page + 1) * rows - rows)
            .then(body => {
                const total = totalRecords && totalRecords.count ? totalRecords.count : 0
                return res.json({ data: body, totalRecords: total })
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            })
    }

    const getById = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.at >= 1 || uParams.comercial >= 1), `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*`))
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
            isMatchOrError(uParams && (uParams.at >= 4 || uParams.comercial >= 4), `${noAccessMsg} "Exclusão de ${tabelaAlias}"`)
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

    const getByFunction = async (req, res) => {
        const func = req.params.func
        switch (func) {
            case 'gbf':
                getByField(req, res)
                break;
            case 'glf':
                getListByField(req, res)
                break;
            case 'gbi':
                getBIData(req, res)
                break;
            default:
                res.status(404).send('Função inexitente')
                break;
        }
    }

    // Busca por campo
    const getByField = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
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

        const first = req.query.first && req.query.first == true
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const ret = app.db(tabelaDomain)

        if (select) {
            // separar os campos e retirar os espaços
            const selectArr = select.split(',').map(s => s.trim())
            ret.select(selectArr)
        }

        ret.where(app.db.raw(`${fieldName} = '${value}'`))
            .where({ status: STATUS_ACTIVE })

        if (first) {
            ret.first()
        }
        ret.then(body => {
            const count = body.length
            return res.json({ data: body, count })
        }).catch(error => {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        })
    }

    // Lista de registros por campo
    const getListByField = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
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

        const first = req.query.first && req.query.first == true
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const ret = app.db(tabelaDomain)

        if (select) {
            // separar os campos e retirar os espaços
            const selectArr = select.split(',').map(s => s.trim())
            ret.select(selectArr)
        }

        ret.where(app.db.raw(`${fieldName} regexp("${value.toString().replaceAll(' ', '.+')}")`))
            .where({ status: STATUS_ACTIVE })

        if (first) {
            ret.first()
        }
        ret.then(body => {
            const count = body.length
            return res.json({ data: body, count })
        }).catch(error => {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        })
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
        const tabelaPipelineDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaPipeline}`
        try {
            const total = await app.db({ tbl1: tabelaDomain }).count('tbl1.id as count')
                .join({ p: tabelaPipelineDomain }, 'p.id', '=', 'tbl1.id_pipeline')
                .where({ 'tbl1.status': STATUS_ACTIVE })
                .first()
            let noPeriodo = { count: 0 }
            if (biPeriodDi && biPeriodDf)
                noPeriodo = await app.db({ tbl1: tabelaDomain }).count('tbl1.id as count')
                    .join({ p: tabelaPipelineDomain }, 'p.id', '=', 'tbl1.id_pipeline')
                    .where({ 'tbl1.status': STATUS_ACTIVE })
                    .whereRaw(`p.created_at between "${biPeriodDi}" and "${biPeriodDf}"`)
                    .first()
            const novos = await app.db({ tbl1: tabelaDomain }).count('tbl1.id as count')
                .join({ p: tabelaPipelineDomain }, 'p.id', '=', 'tbl1.id_pipeline')
                .where({ 'tbl1.status': STATUS_ACTIVE })
                .whereRaw(`EXTRACT(YEAR FROM date(p.created_at)) = EXTRACT(YEAR FROM NOW())`)
                .whereRaw(`EXTRACT(MONTH FROM date(p.created_at)) = EXTRACT(MONTH FROM NOW())`)
                .first()
            return res.send({ total: total.count, novos: novos.count, noPeriodo: noPeriodo.count })
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        }
    }

    return { save, get, getById, remove, getByFunction }
}
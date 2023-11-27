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
        const uParams = await app.db('users').where({ id: user.id }).first();
        let body = { ...req.body }
        if (req.params.id) body.id = req.params.id
        try {
            // Alçada para edição
            if (body.id)
                isMatchOrError(uParams && uParams.cadastros >= 3, `${noAccessMsg} "Edição de ${tabelaAlias.charAt(0).toUpperCase() + tabelaAlias.slice(1).replaceAll('_', ' ')}"`)
            // Alçada para inclusão
            else isMatchOrError(uParams && uParams.cadastros >= 2, `${noAccessMsg} "Inclusão de ${tabelaAlias.charAt(0).toUpperCase() + tabelaAlias.slice(1).replaceAll('_', ' ')}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }
        const tabelaDomain = `${dbPrefix}_${user.cliente}_${user.dominio}.${tabela}`

        try {
            existsOrError(body.id_pipeline, 'Registro no Pipeline não informado')
            existsOrError(body.pessoa_contato, 'Pessoa de contato não informada')
            existsOrError(body.telefone_contato, 'Telefone de contato não informado')
            existsOrError(body.email_contato, 'E-mail de contato não informado')
            existsOrError(body.saudacao_inicial, 'Saudação inicial não informada')
            existsOrError(body.conclusao, 'Conclusão não informada')
            existsOrError(body.garantia, 'Garantia não informada')
            if (body.desconto_total > 0) existsOrError(body.desconto_ativo, 'Desconto ativo não informado')
            existsOrError(body.observacoes_finais, 'Observações finais não informadas')
            existsOrError(body.prz_entrega, 'Prazo de entrega não informado')
            existsOrError(body.forma_pagto, 'Forma de pagamento não informada')
            existsOrError(body.validade_prop, 'Validade da proposta não informada')
            existsOrError(body.assinatura, 'Assinatura não informada')
        } catch (error) {
            console.log(error);
            return res.status(400).send(error)
        }
        delete body.hash; delete body.tblName
        // body.nascimento = moment(body.nascimento).format("DD/MM/YYYY")
        const { changeUpperCase, removeAccentsObj } = app.api.facilities
        body = (JSON.parse(JSON.stringify(body), removeAccentsObj));
        body = (JSON.parse(JSON.stringify(body), changeUpperCase));

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

    const get = async (req, res) => {
        let user = req.user
        const uParams = await app.db('users').where({ id: user.id }).first();
        try {
            // Alçada para exibição
            isMatchOrError(uParams && uParams.cadastros >= 1, `${noAccessMsg} "Exibição de ${tabela}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }
        const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
        const tabelaUsers = `${dbPrefix}_api.users`
        const tabelaPipelineParamsDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabelaParams}`
        const tabelaPipelineStatusDomain = `${dbPrefix}_${user.cliente}_${user.dominio}.${tabelaStatus}`
        const tabelaCadastrosDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabelaCadastros}`
        const tabelaPipelineDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabelaPipeline}`
        const tabelaPvDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabelaPv}`

        let queryes = undefined
        let query = undefined
        let page = 0
        let rows = 10
        let sortField = app.db.raw('p.documento')
        let sortOrder = 'asc'
        if (req.query) {
            queryes = req.query
            query = ''
            for (const key in queryes) {
                let operator = queryes[key].split(':')[0]
                let value = queryes[key].split(':')[1]
                if (key.split(':')[0] == 'field') {
                    if (['aniversario'].includes(key.split(':')[1])) {
                        query += `EXTRACT(MONTH FROM ${key.split(':')[1]}) = '${value}' AND `
                    } else {
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
                        if (queryField == 'atuacao') queryField = 'lp.label'
                        else if (queryField == 'tipo_cadas') queryField = 'lpTp.label'
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
            .countDistinct('tbl1.id as count').first()
            .join({ p: tabelaPipelineDomain }, 'p.id', '=', 'tbl1.id_pipeline')
            .join({ pp: tabelaPipelineParamsDomain }, 'pp.id', '=', 'p.id_pipeline_params')
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'p.id_cadastros')
            .leftJoin({ u: tabelaUsers }, 'u.id', '=', 'p.id_com_agentes')
            .leftJoin({ pv: tabelaPvDomain }, 'pv.id', '=', 'tbl1.id_pv')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')

        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.id, pp.descricao AS tipo_doc, pp.doc_venda, c.nome, c.cpf_cnpj, u.name agente, p.documento, p.versao, tbl1.descricao, tbl1.valor_bruto, tbl1.descricao,
            (SELECT DATE_FORMAT(SUBSTRING_INDEX(MAX(ps.created_at),' ',1),'%d/%m/%Y') FROM ${tabelaPipelineStatusDomain} ps WHERE ps.id_pipeline = tbl1.id)status_created_at, 
            SUBSTRING(SHA(CONCAT(tbl1.id,'${tabela}')),8,6) AS hash`))
            .join({ p: tabelaPipelineDomain }, 'p.id', '=', 'tbl1.id_pipeline')
            .join({ pp: tabelaPipelineParamsDomain }, 'pp.id', '=', 'p.id_pipeline_params')
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'p.id_cadastros')
            .leftJoin({ u: tabelaUsers }, 'u.id', '=', 'p.id_com_agentes')
            .leftJoin({ pv: tabelaPvDomain }, 'pv.id', '=', 'tbl1.id_pv')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')
            .groupBy('tbl1.id')
            .orderBy(sortField, sortOrder)
            .limit(rows).offset((page + 1) * rows - rows)
            .then(body => {
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
            isMatchOrError(uParams && uParams.cadastros >= 1, `${noAccessMsg} "Exibição de ${tabela}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
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
            isMatchOrError(uParams && uParams.cadastros >= 4, `${noAccessMsg} "Exclusão de ${tabela}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
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
        const uParams = await app.db('users').where({ id: user.id }).first();
        try {
            // Alçada para exibição
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }

        const fieldName = req.query.fld
        const value = req.query.vl
        const select = req.query.slct

        const first = req.query.first && req.params.first == true
        const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
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
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        })
    }

    // Lista de registros por campo
    const getListByField = async (req, res) => {
        let user = req.user
        const uParams = await app.db('users').where({ id: user.id }).first();
        try {
            // Alçada para exibição
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }

        const fieldName = req.query.fld
        const value = req.query.vl
        const select = req.query.slct

        const first = req.query.first && req.params.first == true
        const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
        const ret = app.db(tabelaDomain)

        if (select) {
            // separar os campos e retirar os espaços
            const selectArr = select.split(',').map(s => s.trim())
            ret.select(selectArr)
        }

        ret.where(app.db.raw(`${fieldName} regexp("${value.toString().replace(' ', '.+')}")`))
            .where({ status: STATUS_ACTIVE })

        if (first) {
            ret.first()
        }
        ret.then(body => {
            const count = body.length
            return res.json({ data: body, count })
        }).catch(error => {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        })
    }

    // Recupera dados para index da plataforma BI
    const getBIData = async (req, res) => {
        let user = req.user
        const uParams = await app.db('users').where({ id: user.id }).first();
        try {
            // Alçada para exibição
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }
        const biPeriodDi = req.query.periodDi
        const biPeriodDf = req.query.periodDf
        const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
        try {
            const ret = app.db(tabelaDomain)
            const total = await ret.count('id as count').where({ status: STATUS_ACTIVE }).first()
            let noPeriodo = { count: 0 }
            if (biPeriodDi && biPeriodDf)
                noPeriodo = await app.db(tabelaDomain).count('id as count').whereRaw(`created_at between "${biPeriodDi}" and "${biPeriodDf}"`).first()
            const novos = await ret.count('id as count')
                .whereRaw(`EXTRACT(YEAR FROM date(created_at)) = EXTRACT(YEAR FROM NOW())`)
                .whereRaw(`EXTRACT(MONTH FROM date(created_at)) = EXTRACT(MONTH FROM NOW())`)
            return res.send({ total: total.count, novos: novos.count, noPeriodo: noPeriodo.count })
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        }
    }

    return { save, get, getById, remove, getByFunction }
}


//     const save = async (req, res) => {
//         let user = req.user
//         const uParams = await app.db('users').where({ id: user.id }).first();
//         let body = { ...req.body }
//         if (req.params.id) body.id = req.params.id
//         try {
//             // Alçada para edição
//             if (body.id)
//                 isMatchOrError(uParams, `${noAccessMsg} "Edição de ${tabelaAlias.charAt(0).toUpperCase() + tabelaAlias.slice(1).replaceAll('_', ' ')}"`)
//             // Alçada para inclusão
//             else isMatchOrError(uParams, `${noAccessMsg} "Inclusão de ${tabelaAlias.charAt(0).toUpperCase() + tabelaAlias.slice(1).replaceAll('_', ' ')}"`)
//         } catch (error) {
//             app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
//         }
//         const tabelaDomain = `${dbPrefix}_${user.cliente}_${user.dominio}.${tabela}`

//         try {
//             existsOrError(body.pessoa_contato, 'Pessoa de contato não informada')
//             existsOrError(body.telefone_contato, 'Telefone de contato não informado')
//             existsOrError(body.email_contato, 'E-mail de contato não informado')
//             existsOrError(body.saudacao_inicial, 'Saudação inicial não informada')
//             existsOrError(body.conclusao, 'Conclusão não informada')
//             existsOrError(body.garantia, 'Garantia não informada')
//             if (body.desconto_total > 0) existsOrError(body.desconto_ativo, 'Desconto ativo não informado')
//             existsOrError(body.observacoes_finais, 'Observações finais não informadas')
//             existsOrError(body.prz_entrega, 'Prazo de entrega não informado')
//             existsOrError(body.forma_pagto, 'Forma de pagamento não informada')
//             existsOrError(body.validade_prop, 'Validade da proposta não informada')
//             existsOrError(body.assinatura, 'Assinatura não informada')
//         } catch (error) {
//             return res.status(400).send(error)
//         }
//         delete body.hash; delete body.tblName; delete body.endereco; delete body.url_logo; delete body.url_rodape;
//         if (body.id) {
//             // Variáveis da edição de um registro
//             // registrar o evento na tabela de eventos
//             const { createEventUpd } = app.api.sisEvents
//             const evento = await createEventUpd({
//                 "notTo": ['created_at', 'updated_at', 'evento',],
//                 "last": await app.db(tabelaDomain).where({ id: body.id }).first(),
//                 "next": body,
//                 "request": req,
//                 "evento": {
//                     "evento": `Alteração de cadastro de ${tabela}`,
//                     "tabela_bd": tabela,
//                 }
//             })

//             body.evento = evento
//             body.updated_at = new Date()
//             //body = JSON.parse(JSON.stringify(body).toUpperCase())
//             // Colocar cada campo em maiúsculo e remover acentos
//             Object.keys(body).forEach(function (key) {
//                 if (typeof body[key] == 'string' && key != 'uf') {
//                     body[key] = removeAccents(titleCase(body[key]))
//                 } else if (typeof body[key] == 'string' && key == 'uf') {
//                     body[key] = body[key].toUpperCase()
//                 }
//             });

//             let rowsUpdated = app.db(tabelaDomain)
//                 .update(body)
//                 .where({ id: body.id })
//             rowsUpdated.then((ret) => {
//                 if (ret > 0) res.status(200).send(body)
//                 else res.status(200).send('Endereço não encontrado')
//             })
//                 .catch(error => {
//                     app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
//                     return res.status(500).send(error)
//                 })
//         } else {

//             try {
//                 const unique = await app.db(tabelaDomain).where({ nome_comum: body.nome_comum, produto: body.produto, descricao: body.descricao }).first()
//                 notExistsOrError(unique, 'Este produto já foi registrado')
//             } catch (error) {
//                 console.log(error);
//                 return res.status(400).send(error)
//             }
//             // Criação de um novo registro
//             const nextEventID = await app.db('sis_events').select(app.db.raw('count(*) as count')).first()

//             body.evento = nextEventID.count + 1
//             // Variáveis da criação de um novo registro
//             body.status = STATUS_ACTIVE
//             body.created_at = new Date()

//             app.db(tabelaDomain)
//                 .insert(body)
//                 .then(ret => {
//                     body.id = ret[0]
//                     // registrar o evento na tabela de eventos
//                     const { createEventIns } = app.api.sisEvents
//                     createEventIns({
//                         "notTo": ['created_at', 'evento'],
//                         "next": body,
//                         "request": req,
//                         "evento": {
//                             "evento": `Novo registro`,
//                             "tabela_bd": tabela,
//                         }
//                     })
//                     return res.json(body)
//                 })
//                 .catch(error => {
//                     app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
//                     return res.status(500).send(error)
//                 })
//         }
//     }

//     const get = async (req, res) => {
//         let user = req.user
//         let key = req.query.key
//         if (key) {
//             key = key.trim()
//         }
//         const uParams = await app.db('users').where({ id: user.id }).first();
//         try {
//             // Alçada para exibição
//             isMatchOrError(uParams, `${noAccessMsg} "Exibição de cadastro de ${tabela}"`)
//         } catch (error) {
//             app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
//         }

//         const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
//         const tabelaUploadsDomain = `${dbPrefix}_api.uploads`
//         const ret = app.db({ tbl1: tabelaDomain })
//             .select(app.db.raw(`tbl1.*, u.url url_logo, ur.url url_rodape, SUBSTRING(SHA(CONCAT(tbl1.id,'${tabela}')),8,6) as hash`))
//             .leftJoin({ u: tabelaUploadsDomain }, function () {
//                 this.on('tbl1.id_uploads_logo', '=', 'u.id')
//                     .andOn('u.status', '=', STATUS_ACTIVE)
//             })
//             .leftJoin({ ur: tabelaUploadsDomain }, function () {
//                 this.on('tbl1.id_uploads_rodape', '=', 'u.id')
//                     .andOn('u.status', '=', STATUS_ACTIVE)
//             })
//             .where({ 'tbl1.status': STATUS_ACTIVE })
//             .groupBy('tbl1.id')
//         ret.then(body => {
//             const count = body.length
//             return res.json({ data: body, count: count })
//         })
//             .catch(error => {
//                 app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
//             })
//     }

//     const getById = async (req, res) => {
//         let user = req.user
//         const uParams = await app.db('users').where({ id: user.id }).first();
//         try {
//             // Alçada para exibição
//             isMatchOrError(uParams, `${noAccessMsg} "Exibição de Endereços de ${tabela}"`)
//         } catch (error) {
//             app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
//         }

//         const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
//         const tabelaUploadsDomain = `${dbPrefix}_api.uploads`
//         const ret = app.db({ tbl1: tabelaDomain })
//             .select(app.db.raw(`tbl1.*, u.url url_logo, TO_BASE64('${tabela}') tblName, SUBSTRING(SHA(CONCAT(tbl1.id,'${tabela}')),8,6) as hash`))
//             .leftJoin({ u: tabelaUploadsDomain }, function () {
//                 this.on('tbl1.id_uploads_logo', '=', 'u.id')
//                     .andOn('u.status', '=', STATUS_ACTIVE)
//             })
//             .where({ 'tbl1.id': req.params.id, 'tbl1.status': STATUS_ACTIVE }).first()
//             .then(body => {
//                 return res.json(body)
//             })
//             .catch(error => {
//                 app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
//                 return res.status(500).send(error)
//             })
//     }

//     const remove = async (req, res) => {
//         let user = req.user
//         const uParams = await app.db('users').where({ id: user.id }).first();
//         try {
//             // Alçada para exibição
//             isMatchOrError((uParams && uParams.admin >= 1), `${noAccessMsg} "Exclusão de Endereço de ${tabela}"`)
//         } catch (error) {
//             app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
//         }

//         const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
//         const registro = { status: STATUS_DELETE }
//         try {
//             // registrar o evento na tabela de eventos
//             const last = await app.db(tabelaDomain).where({ id: req.params.id }).first()
//             const { createEventUpd } = app.api.sisEvents
//             const evento = await createEventUpd({
//                 "notTo": ['created_at', 'updated_at', 'evento'],
//                 "last": last,
//                 "next": registro,
//                 "request": req,
//                 "evento": {
//                     "classevento": "Remove",
//                     "evento": `Exclusão de Endereço de ${tabela}`,
//                     "tabela_bd": tabela,
//                 }
//             })
//             const rowsUpdated = await app.db(tabelaDomain)
//                 .update({
//                     status: registro.status,
//                     updated_at: new Date(),
//                     evento: evento
//                 })
//                 .where({ id: req.params.id })
//             existsOrError(rowsUpdated, 'Registro não foi encontrado')

//             res.status(204).send()
//         } catch (error) {
//             res.status(400).send(error)
//         }
//     }

//     const getByFunction = async (req, res) => {
//         const func = req.params.func
//         switch (func) {
//             case 'gbf':
//                 getByField(req, res)
//                 break;
//             case 'glf':
//                 getListByField(req, res)
//                 break;
//             default:
//                 res.status(404).send('Função inexitente')
//                 break;
//         }
//     }

//     const getByField = async (req, res) => {
//         let user = req.user
//         const uParams = await app.db('users').where({ id: user.id }).first();
//         try {
//             // Alçada para exibição
//             if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
//         } catch (error) {
//             app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
//         }

//         const fieldName = req.query.fld
//         const value = req.query.vl
//         const select = req.query.slct

//         const first = req.query.first && req.params.first == true
//         const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
//         const ret = app.db(tabelaDomain)

//         if (select) {
//             // separar os campos e retirar os espaços
//             const selectArr = select.split(',').map(s => s.trim())
//             ret.select(selectArr)
//         }

//         ret.where(app.db.raw(`${fieldName} = '${value}'`))
//             .where({ status: STATUS_ACTIVE })

//         if (first) {
//             ret.first()
//         }
//         ret.then(body => {
//             const count = body.length
//             return res.json({ data: body, count })
//         }).catch(error => {
//             app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
//             return res.status(500).send(error)
//         })
//     }

//     const getListByField = async (req, res) => {
//         let user = req.user
//         const uParams = await app.db('users').where({ id: user.id }).first();
//         try {
//             // Alçada para exibição
//             if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
//         } catch (error) {
//             app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
//         }

//         const fieldName = req.query.fld
//         const value = req.query.vl
//         const select = req.query.slct

//         const first = req.query.first && req.params.first == true
//         const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
//         const ret = app.db(tabelaDomain)

//         if (select) {
//             // separar os campos e retirar os espaços
//             const selectArr = select.split(',').map(s => s.trim())
//             ret.select(selectArr)
//         }

//         ret.where(app.db.raw(`${fieldName} regexp("${value.toString().replace(' ', '.+')}")`))
//             .where({ status: STATUS_ACTIVE })

//         if (first) {
//             ret.first()
//         }
//         ret.then(body => {
//             const count = body.length
//             return res.json({ data: body, count })
//         }).catch(error => {
//             app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
//             return res.status(500).send(error)
//         })
//     }

//     return { save, get, getById, remove, getByFunction }
// }
const { dbPrefix } = require("../.env")
const moment = require('moment')
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const { STATUS_COMISSIONADO } = require('./pipeline_status.js')(app)
    const tabela = 'comissoes'
    const tabelaStatusComiss = 'comis_status'
    const tabelaStatusPipeline = 'pipeline_status'
    const tabelaAlias = 'Comissão'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99
    const STATUS_NAO_PROGRAMADO = 10
    const STATUS_EM_PROGRAMACAO_LIQUIDACAO = 20
    const STATUS_LIQUIDADO = 30
    const { ceilTwoDecimals, formatCurrency } = app.api.facilities

    const save = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        let body = { ...req.body }
        delete body.id;
        if (req.params.id) body.id = req.params.id
        try {
            // Alçada do usuário
            if (body.id) isMatchOrError(uParams && (uParams.comercial >= 3 || uParams.comissoes >= 3), `${noAccessMsg} "Edição de ${tabelaAlias}"`)
            else isMatchOrError(uParams && (uParams.comercial >= 2 || uParams.comissoes >= 2), `${noAccessMsg} "Inclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaPipeline = `${dbPrefix}_${uParams.schema_name}.pipeline`
        const tabelaComisPipeline = `${dbPrefix}_${uParams.schema_name}.comis_pipeline`
        const tabelaComisAgentes = `${dbPrefix}_${uParams.schema_name}.comis_agentes`
        const tabelaComissaoStatusDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaStatusComiss}`
        const tabelaPipelineStatusDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaStatusPipeline}`

        body.desconto = body.desconto || 0
        body.agente_representante = body.agente_representante || 0

        delete body.isInvalid;

        let comisRepres = {}
        let comisAgentes = { total: 0 }
        let comissPipeline = { valor_agente: 0 }
        let pipeline = {}
        let last = {}
        if (body.id) last = await app.db(tabelaDomain).where({ id: body.id }).first()
        const valorAnterior = last.valor || 0 // Valor anterior do registro
        if (body.valor) body.valor = body.valor.replace(",", ".");
        try {
            existsOrError(body.id_comis_pipeline, 'Origem do comissionamento não informado')
            // Verificar se o comis_pipeline existe
            comissPipeline = await app.db({ tbl1: tabelaComisPipeline })
                .join(tabelaPipeline, 'tbl1.id_pipeline', 'pipeline.id')
                .where({ 'tbl1.id': body.id_comis_pipeline, 'tbl1.status': STATUS_ACTIVE }).first()

            existsOrError(comissPipeline, 'Origem do comissionamento não encontrado')
            // Verificar se o pipeline existe
            pipeline = await app.db(tabelaPipeline).where({ id: comissPipeline.id_pipeline, status: STATUS_ACTIVE }).first()
            existsOrError(pipeline, 'Registro de Pipeline não encontrado')
            if (![0, 1].includes(body.agente_representante)) throw 'Se é a representação não informado'
            // Recupera o registro da comissão do representante em comis_pipeline caso exista
            comisRepres = await app.db(tabelaDomain).where({ id_comis_pipeline: body.id_comis_pipeline, agente_representante: '1', status: STATUS_ACTIVE }).first()
            // Recupera os registros das comissões dos não representantes do pedido em comis_pipeline
            comisAgentes = await app.db(tabelaDomain)
                .sum('valor as total')
                .where({ id_comis_pipeline: body.id_comis_pipeline, agente_representante: body.agente_representante, status: STATUS_ACTIVE }).first()
            comisAgentes = { total: comisAgentes.total || 0 }
            // Se não existir comissão de representante, não pode ser cadastrado comissão de não representante
            if (!comisRepres && body.agente_representante === 0) throw 'Informe primeiro o agente representante ou marque a opção para que essa seja a comissão da representação'
            // Se existir comissão de representante, não pode ser cadastrado comissão de representante exceto se for uma edição
            // if (comisRepres && body.agente_representante === 1 && body.id != comisRepres.id && !body.alterar_agente_representante) throw 'Já existe um agente representante cadastrado. Deseja alterar?'
            existsOrError(body.id_comis_agentes, 'Agente não informado')
            // Verificar se o comis_agentes existe
            const existsComissAgentes = await app.db(tabelaComisAgentes).where({ id: body.id_comis_agentes, status: STATUS_ACTIVE }).first()
            existsOrError(existsComissAgentes, 'Agente não encontrado')
            // Validações do valor da comissão
            existsOrError(body.valor, 'Valor da comissão não informado')
            if (Number(body.valor) <= 0) throw 'Valor da comissão deve ser maior que zero'
            // Verificar se o valor da comissão é maior que o valor base de comissPipeline
            if (body.agente_representante == 1 && Number(body.valor) > pipeline.valor_representacao) throw `O valor não pode ser maior que o valor da comissão de representante (${formatCurrency(pipeline.valor_representacao)}) informada no registro do Pipeline`
            else if (body.agente_representante == 0 && (Number(body.valor) + (comisAgentes.total - Number(valorAnterior))) > pipeline.valor_agente) {
                let answer = `A soma do comissionamento dos agentes (${formatCurrency(comisAgentes.total)}) já registrado para este Pipeline mais `
                if (comisAgentes.total > 0) answer += `o `
                else answer = `O `
                let sumError = `valor informado agora ultrapassa o máximo permitido de ${formatCurrency(ceilTwoDecimals(pipeline.valor_agente).toFixed(2))}`
                throw `${answer} ${sumError}. Corrija o valor desta comissão antes de prosseguir`
            }
            else if (body.agente_representante == 1 && (Number(body.valor) + (comisAgentes.total - Number(valorAnterior))) > pipeline.valor_representacao) {
                let answer = `A soma do comissionamento dos representantes (${formatCurrency(comisAgentes.total)}) já registrado para este Pipeline mais `
                if (comisAgentes.total > 0) answer += `o `
                else answer = `O `
                let sumError = `valor informado agora ultrapassa o máximo permitido de ${formatCurrency(ceilTwoDecimals(pipeline.valor_representacao).toFixed(2))}`
                throw `${answer} ${sumError}. Corrija o valor desta comissão antes de prosseguir`
            }
            // Se body.liquidar_em for declarado, deve ser validado com moment e não pode ser inferior à data atual pois é data de previsão de liquidação
            if (body.liquidar_em) {
                const date = moment().format('YYYY-MM-DD')
                const dtLiquidacao = moment(body.liquidar_em);
                if (!dtLiquidacao.isValid()) throw 'Data de liquidação inválida. Favor verificar'
                if (dtLiquidacao.format('YYYY-MM-DD') < date) throw 'Data de liquidação não pode ser menor que a data atual'
            }
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            return res.status(400).send(error)
        }


        if (body.id) {
            try {
                existsOrError(last, `${tabelaAlias} (${body.id}) não encontrada`)
            } catch (error) {
                return res.status(400).send(error)
            }
            // Verificar se o registro é de representante e se está sendo alterado para não representante. Se sim, parar tudo pois primeiro precisa ser alterado o registro de representante
            try {
                if (last.agente_representante === 1 && body.agente_representante === 0) throw `Este atualmente é o registro de comissão do representante. Mas parece que essa informação está sendo alterada. Antes de prosseguir, acesse o registro desejado e informe que aquele é o novo registro de comissão da representação, ou marque a opção para que essa seja o registro.`
            } catch (error) {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
                return res.status(400).send(error)
            }

            const { createEventUpd } = app.api.sisEvents
            const evento = await createEventUpd({
                "notTo": ['created_at', 'updated_at', 'evento',],
                "last": last,
                "next": body,
                "request": req,
                "evento": {
                    "evento": `Alteração de cadastro de ${tabela}`,
                    "tabela_bd": tabela,
                }
            })

            app.db.transaction(async (trx) => {
                if (body.alterar_agente_representante) {
                    delete body.alterar_agente_representante;
                    await trx(tabelaDomain)
                        .update({ agente_representante: 0 })
                        .where({ id_comis_pipeline: body.id_comis_pipeline, status: STATUS_ACTIVE })
                }

                body.evento = evento
                body.updated_at = new Date()
                await trx(tabelaDomain)
                    .update(body)
                    .where({ id: body.id })
                    .then(async (ret) => {
                        if (ret > 0) {
                            req.uParams = uParams
                            const errorInValidation = await validateComissPipeline(req)
                            body = { ...body, isInvalid: errorInValidation }
                            return res.status(200).send(body)
                        }
                        else res.status(200).send(`${tabelaAlias} não encontrado`)
                    })
                    .catch(error => {
                        app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                        return res.status(500).send(error)
                    })

                if (last.liquidar_em != body.liquidar_em) {
                    // Inserir na tabela de status de pipeline a informação de comissionamento            
                    await trx(tabelaComissaoStatusDomain).insert({
                        evento: evento || 1,
                        created_at: new Date(),
                        id_comissoes: body.id,
                        status_comis: body.liquidar_em ? STATUS_EM_PROGRAMACAO_LIQUIDACAO : STATUS_NAO_PROGRAMADO,
                    });
                }
            }).catch((error) => {
                // Se ocorrer um erro, faça rollback da transação
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
                return res.status(500).send(error);
            });
        } else {
            const unique = await app.db(tabelaDomain).where({ id_comis_pipeline: body.id_comis_pipeline, id_comis_agentes: body.id_comis_agentes, status: STATUS_ACTIVE }).first()
            try {
                notExistsOrError(unique, `Comissão já registrada para este agente`)
            } catch (error) {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
                return res.status(400).send(error)
            }

            app.db.transaction(async (trx) => {
                if (body.alterar_agente_representante) {
                    delete body.alterar_agente_representante;
                    await trx(tabelaDomain)
                        .update({ agente_representante: 0 })
                        .where({ id_comis_pipeline: body.id_comis_pipeline, status: STATUS_ACTIVE })
                }
                // Criação de um novo registro
                const nextEventID = await trx(`${dbPrefix}_api.sis_events`).select(app.db.raw('max(id) as count')).first()
                body.evento = nextEventID.count + 1
                // Variáveis da criação de um novo registro
                body.status = STATUS_ACTIVE
                body.created_at = new Date()

                // Evento de conversão do registro em pedido

                // Evento de comissionamento do registro de pipeline
                const { createEvent } = app.api.sisEvents
                const evento = await createEvent({
                    "request": req,
                    "evento": {
                        id_user: user.id,
                        evento: `Commissionamento de Pipeline`,
                        classevento: `commissioning`,
                        id_registro: comissPipeline.id_pipeline,
                        tabela_bd: 'pipeline'
                    }
                })

                trx(tabelaDomain)
                    .insert(body)
                    .then(async (ret) => {
                        body.id = ret[0]
                        req.uParams = uParams
                        const errorInValidation = await validateComissPipeline(req)
                        body = { ...body, isInvalid: errorInValidation }
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

                // Inserir na tabela de status de pipeline a informação de comissionamento            
                await trx(tabelaComissaoStatusDomain).insert({
                    evento: evento || 1,
                    created_at: new Date(),
                    id_comissoes: body.id,
                    status_comis: STATUS_NAO_PROGRAMADO,
                });

                // Inserir na tabela de status de pipeline a informação de comissionamento
                await trx(tabelaPipelineStatusDomain).insert({
                    evento: evento || 1,
                    status: STATUS_ACTIVE,
                    created_at: new Date(),
                    id_pipeline: comissPipeline.id_pipeline,
                    status_params: STATUS_COMISSIONADO,
                });

            }).catch((error) => {
                // Se ocorrer um erro, faça rollback da transação
                app.api.logger.logError({
                    log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true },
                });
                return res.status(500).send(error);
            });
        }
    }

    const get = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.comercial >= 1 || uParams.comissoes >= 1), `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaPipelineDomain = `${dbPrefix}_${uParams.schema_name}.pipeline`
        const tabelaComissPipelineDomain = `${dbPrefix}_${uParams.schema_name}.comis_pipeline`
        const tabelaComissAgentesDomain = `${dbPrefix}_${uParams.schema_name}.comis_agentes`
        const tabelaComissStatussDomain = `${dbPrefix}_${uParams.schema_name}.comis_status`
        const tabelaPipelineParams = `${dbPrefix}_${uParams.schema_name}.pipeline_params`
        const tabelaCadastros = `${dbPrefix}_${uParams.schema_name}.cadastros`

        let queryes = undefined
        let query = undefined
        let page = 0
        let rows = 10
        let sortField = app.db.raw('tbl1.created_at')
        let sortOrder = 'desc'
        let sortByAnivFundacao = undefined
        if (req.query) {
            queryes = req.query
            query = ''
            for (const key in queryes) {
                let operator = queryes[key].split(':')[0]
                let value = queryes[key].split(':')[1]
                if (key.split(':')[0] == 'field') {
                    let queryField = key.split(':')[1]
                    if (['liquidar_aprox'].includes(queryField)) {
                        value = typeof queryes[key] === 'object' ? queryes[key][0].split(':')[1].split(',') : queryes[key].split(':')[1].split(',')
                        let valueI = moment(value[0]);
                        let valueF = moment(value[1]);

                        if (valueI.isValid()) valueI = valueI.format('YYYY-MM-DD')
                        if (valueF.isValid()) valueF = valueF.format('YYYY-MM-DD')
                        else valueF = valueI

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
                        query += `date(tbl1.liquidar_em) ${operator} AND `
                    } else if (['unidade'].includes(queryField)) {
                        queryField = 'tbl5.descricao'
                        operator = `regexp("${value.toString().replace(' ', '.+')}")`
                        query += `${queryField} ${operator} AND `
                    } else if (['documento', 'unidade'].includes(queryField)) {
                        // remover todos os caracteres não numéricos e converter para número
                        const valor = value.replaceAll(/([^\d])+/gim, "")
                        // Receber caracteres não numéricos	
                        const texto = value.toString().replaceAll(valor, '').trim().replace(' ', '.+').replaceAll(/([\d])+/gim, "")
                        if (texto.length > 0) query += `tbl5.descricao regexp("${texto.toString().replace(' ', '.+')}") AND `
                        if (valor.length > 0) query += `(cast(tbl3.documento as unsigned) like "%${Number(valor)}%" or cast(tbl3.documento as unsigned) like "%${Number(valor)}%" or cast(tbl3.documento as unsigned) like "%${Number(valor)}%") AND `
                    } else {
                        if (queryField == 'valor') value = value.replace('.', '').replace(',', '.')
                        switch (queryField) {
                            case 'agente_representante': queryField = 'tbl1.nome'
                                break;
                            case 'agente': queryField = 'tbl6.nome'
                                break;
                            case 'valor': queryField = 'tbl1.valor'
                                break;
                        }
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
                    if (['liquidar_aprox'].includes(key.split(':')[1])) {
                        sortField = app.db.raw('tbl1.liquidar_em')
                    } else if (['documento'].includes(key.split(':')[1])) {
                        sortField = app.db.raw('tbl5.descricao, tbl3.documento')
                    }
                    else sortField = key.split(':')[1].split('=')[0]
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
            .join({ tbl2: tabelaComissPipelineDomain }, 'tbl1.id_comis_pipeline', 'tbl2.id')
            .join({ tbl3: tabelaPipelineDomain }, 'tbl2.id_pipeline', 'tbl3.id')
            .join({ tbl4: tabelaComissAgentesDomain }, 'tbl1.id_comis_agentes', 'tbl4.id')
            .join({ tbl5: tabelaPipelineParams }, 'tbl5.id', 'tbl3.id_pipeline_params')
            .join({ tbl6: tabelaCadastros }, 'tbl6.id', 'tbl4.id_cadastros')
            .whereRaw(query ? query : '1=1')

        const ret = app.db({ tbl1: tabelaDomain })
            .join({ tbl2: tabelaComissPipelineDomain }, 'tbl1.id_comis_pipeline', 'tbl2.id')
            .join({ tbl3: tabelaPipelineDomain }, 'tbl2.id_pipeline', 'tbl3.id')
            .join({ tbl4: tabelaComissAgentesDomain }, 'tbl1.id_comis_agentes', 'tbl4.id')
            .join({ tbl5: tabelaPipelineParams }, 'tbl5.id', 'tbl3.id_pipeline_params')
            .join({ tbl6: tabelaCadastros }, 'tbl6.id', 'tbl4.id_cadastros')
            .select('tbl1.id', 'tbl1.id_comis_agentes', 'tbl1.id_comis_pipeline', 'tbl1.desconto', 'tbl1.observacao', 'tbl1.liquidar_em',
                { id_pipeline: 'tbl3.id' }, 'tbl6.nome as agente', 'tbl5.descricao as unidade', 'tbl3.documento',
                app.db.raw('format(tbl1.valor, 2, "pt_BR")valor'), 'tbl1.agente_representante', app.db.raw(`DATE_FORMAT(SUBSTRING_INDEX(tbl1.liquidar_em,' ',1),'%d/%m/%Y') AS liquidar_aprox`),
                app.db.raw(`(SELECT ps.status_comis FROM ${tabelaComissStatussDomain} ps WHERE ps.id_comissoes = tbl1.id ORDER BY ps.created_at DESC, ps.status_comis DESC LIMIT 1) last_status_comiss`))
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')
            .groupBy('tbl1.id')
            .orderBy(sortField, sortOrder)
        if (sortByAnivFundacao) ret.orderBy(sortByAnivFundacao, sortOrder)
        ret.limit(rows).offset((page + 1) * rows - rows)

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
            isMatchOrError(uParams && (uParams.comercial >= 1 || uParams.comissoes >= 1), `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*`))
            .where({ 'tbl1.id': req.params.id, 'tbl1.status': STATUS_ACTIVE }).first()
            .then(async (body) => {
                if (!body) return res.status(404).send('Registro não encontrado')
                req.uParams = uParams
                req.body = body
                body.valor = parseFloat(body.valor).toFixed(2).replace('.', ',')
                const errorInValidation = await validateComissPipeline(req)
                body = { ...body, isInvalid: errorInValidation }

                return res.json(body)
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                return res.status(500).send(error)
            })
    }

    const remove = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.comercial >= 4 || uParams.comissoes >= 4), `${noAccessMsg} "Exclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const registro = { status: STATUS_DELETE }
        try {
            // registrar o evento na tabela de eventos
            const last = await app.db(tabelaDomain).where({ id: req.params.id }).first()
            req.uParams = uParams
            req.body = last
            const errorInValidation = await validateComissPipeline(req)
            const { createEventUpd } = app.api.sisEvents
            const evento = await createEventUpd({
                "notTo": ['created_at', 'updated_at', 'evento'],
                "last": last,
                "next": registro,
                "request": req,
                "evento": {
                    "classevento": "Remove",
                    "evento": `Exclusão de registro de ${tabela}`,
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

            if (errorInValidation) res.status(200).send({ success: true, isInvalid: errorInValidation })
            else res.status(204).send()
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            res.status(400).send(error)
        }
    }

    const validateComissPipeline = async (req) => {
        let body = { ...req.body }
        const uParams = { ...req.uParams }
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaPipeline = `${dbPrefix}_${uParams.schema_name}.pipeline`
        const tabelaComisPipeline = `${dbPrefix}_${uParams.schema_name}.comis_pipeline`
        const errorInValidation = {}

        const agenteRepresentante = body.agente_representante || 0
        let comisAgentes = { total: 0 }
        let comissPipeline = { valor_agente: 0 }
        try {
            existsOrError(body.id_comis_pipeline, 'Comissionamento não informado')
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            return res.status(400).send(error)
        }
        // Verificar se o comis_pipeline existe
        comissPipeline = await app.db({ tbl1: tabelaComisPipeline })
            .join(tabelaPipeline, 'tbl1.id_pipeline', 'pipeline.id')
            .where({ 'tbl1.id': body.id_comis_pipeline, 'tbl1.status': STATUS_ACTIVE }).first()
        comisAgentes = await app.db({ tbl1: tabelaDomain }).sum('valor as total')
            .where({ 'tbl1.id': body.id_comis_pipeline, 'tbl1.status': STATUS_ACTIVE, 'tbl1.agente_representante': agenteRepresentante, 'tbl1.status': STATUS_ACTIVE }).first() || { total: 0 }

        if (comisAgentes.total > comissPipeline.valor_agente) {
            errorInValidation.sumError = `Existe um erro no somatório do comissionamento ${agenteRepresentante ? 'da representação' : 'dos agentes'}. A soma (${formatCurrency(comisAgentes.total)}) ultrapassa o valor (${formatCurrency(comissPipeline.valor_agente)}) para comissionamento ${agenteRepresentante ? 'da representação' : 'dos agentes'} informada no registro do Pipeline`
        }

        return errorInValidation;
    }


    const liquidateInGroup = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        let data = { ...req.body }
        // return res.status(201)
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.comissoes >= 3), `${noAccessMsg} "Liquidação em grupo de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaComissaoStatusDomain = `${dbPrefix}_${uParams.schema_name}.comis_status`

        const { createEventUpd } = app.api.sisEvents
        Object.values(data).forEach(async (element) => {
            try {
                existsOrError(element.id, 'Registro não informado')
                existsOrError(element.liquidar_em, 'Data da liquidação não informada')
                if (!moment(element.liquidar_em, 'YYYY-MM-DD', true).isValid()) throw 'Data de liquidação inválida'
            } catch (error) {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
                return res.status(400).send(error)
            }
            const last = await app.db(tabelaDomain).where({ id: element.id }).first()
            const evento = await createEventUpd({
                "notTo": ['created_at', 'updated_at', 'evento',],
                "last": last,
                "next": element,
                "request": req,
                "evento": {
                    "evento": `Alteração de cadastro de ${tabela}`,
                    "tabela_bd": tabela,
                }
            })
            element.evento = evento
            element.updated_at = new Date()
            app.db.transaction(async (trx) => {
                await trx(tabelaDomain)
                    .update(element)
                    .where({ id: element.id })
                    .then(async (ret) => {
                        if (ret > 0) {
                            return true
                        }
                        else res.status(200).send(`${tabelaAlias} não encontrado`)
                    })
                    .catch(error => {
                        app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                        return res.status(500).send(error)
                    })

                // Inserir na tabela de status um registro de programação de liquidação                    
                await trx(tabelaComissaoStatusDomain).insert({
                    evento: evento || 1,
                    created_at: new Date(),
                    id_comissoes: element.id,
                    status_comis: STATUS_EM_PROGRAMACAO_LIQUIDACAO,
                });
            }).catch((error) => {
                // Se ocorrer um erro, faça rollback da transação
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
                return res.status(500).send(error);
            });
        })

        return res.status(200).send('Programação de liquidação bem sucedida')
    }

    return { save, get, getById, remove, liquidateInGroup }
}
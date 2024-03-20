const { dbPrefix } = require("../.env")
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const { STATUS_COMISSIONADO } = require('./pipeline_status.js')(app)
    const tabela = 'comissoes'
    const tabelaAlias = 'Comissão'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99
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
        const tabelaComisPipeline = `${dbPrefix}_${uParams.schema_name}.comis_pipeline`
        const tabelaComisAgentes = `${dbPrefix}_${uParams.schema_name}.comis_agentes`

        body.desconto = body.desconto || 0
        body.agente_representante = body.agente_representante || 0

        delete body.isInvalid;

        let comisAgentes = { total: 0 }
        let comissPipeline = { base_agentes: 0 }
        try {
            existsOrError(body.id_comis_pipeline, 'Origem do comissionamento não informado')
            // Verificar se o comis_pipeline existe
            comissPipeline = await app.db(tabelaComisPipeline).where({ id: body.id_comis_pipeline, status: STATUS_ACTIVE }).first()
            existsOrError(comissPipeline, 'Origem do comissionamento não encontrado')
            if (![0, 1].includes(body.agente_representante)) throw 'Se é a representação não informado'
            // Recupera o registro da comissão do representante em comis_pipeline caso exista
            const comisRepres = await app.db(tabelaDomain).where({ id_comis_pipeline: body.id_comis_pipeline, agente_representante: '1', status: STATUS_ACTIVE }).first()
            // Recupera os registros das comissões dos não representantes do pedido em comis_pipeline
            comisAgentes = await app.db(tabelaDomain)
                .sum('valor as total')
                .where({ id_comis_pipeline: body.id_comis_pipeline, agente_representante: '0', status: STATUS_ACTIVE }).first() || { total: 0 }
            // Se não existir comissão de representante, não pode ser cadastrado comissão de não representante
            if (!comisRepres && body.agente_representante === 0) throw 'Informe primeiro o agente representante ou marque a opção para que essa seja a comissão da representação'
            // Se existir comissão de representante, não pode ser cadastrado comissão de representante exceto se for uma edição
            if (comisRepres && body.agente_representante === 1 && body.id != comisRepres.id && !body.alterar_agente_representante) throw 'Já existe um agente representante cadastrado. Deseja alterar?'
            existsOrError(body.id_comis_agentes, 'Agente não informado')
            // Verificar se o comis_agentes existe
            const existsComissAgentes = await app.db(tabelaComisAgentes).where({ id: body.id_comis_agentes, status: STATUS_ACTIVE }).first()
            existsOrError(existsComissAgentes, 'Agente não encontrado')
            // Validações do valor da comissão
            existsOrError(body.valor, 'Valor da comissão não informado')
            if (body.valor <= 0) throw 'Valor da comissão deve ser maior que zero'
            // Verificar se o valor da comissão é maior que o valor base de comissPipeline
            if (body.agente_representante === 1 && body.valor > comissPipeline.base_representacao) throw `O valor não pode ser maior que o valor da comissão de representante (${formatCurrency(comissPipeline.base_representacao)}) informada no registro do Pipeline`
            else if (body.agente_representante === 0 && (body.valor + comisAgentes.total) > comissPipeline.base_agentes) {
                let answer = `A soma do comissionamento de agentes já registrado para este Pipeline (${formatCurrency(comisAgentes.total)}) mais `
                if (comisAgentes.total > 0) answer += `o `
                else answer = `O `
                let sumError = `valor informado para neste comissionamento (${formatCurrency(ceilTwoDecimals(body.valor).toFixed(2))}) ultrapassa o valor (${formatCurrency(comissPipeline.base_agentes)}) para comissionamento dos agentes informada no registro do Pipeline`
                throw `${answer} ${sumError}`
            }
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            return res.status(400).send(error)
        }

        if (body.id) {
            // Variáveis da edição de um registro
            // registrar o evento na tabela de eventos
            const last = await app.db(tabelaDomain).where({ id: body.id }).first()
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
                            body = { ...body, isInvalid: errorInValidation}
                            return res.status(200).send(body)
                        }
                        else res.status(200).send(`${tabelaAlias} não encontrado`)
                    })
                    .catch(error => {
                        app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                        return res.status(500).send(error)
                    })
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

                const tabelaStatus = 'pipeline_status'
                const tabelaPipelineStatusDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaStatus}`
                // Inserir na tabela de status de pipeline a informação de comissionamento
                await trx(tabelaPipelineStatusDomain).insert({
                    evento: evento || 1,
                    status: STATUS_ACTIVE,
                    created_at: new Date(),
                    id_pipeline: comissPipeline.id_pipeline,
                    status_params: STATUS_COMISSIONADO,
                });

                trx(tabelaDomain)
                    .insert(body)
                    .then(async (ret) => {
                        body.id = ret[0]
                        req.uParams = uParams
                        const errorInValidation = await validateComissPipeline(req)
                        body = { ...body, isInvalid: errorInValidation}
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
            }).catch((error) => {
                // Se ocorrer um erro, faça rollback da transação
                app.api.logger.logError({
                    log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true },
                });
                return res.status(500).send(error);
            });
        }
    }

    const limit = 20 // usado para paginação
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
        const page = req.query.page || 1
        let count = app.db({ tbl1: tabelaDomain }).count('* as count')
            .where({ status: STATUS_ACTIVE })
        count = await app.db.raw(count.toString())
        count = count[0][0].count

        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*`))

        ret.where({ status: STATUS_ACTIVE })
            .groupBy('tbl1.id')
            .limit(limit).offset(page * limit - limit)
            .then(body => {
                return res.json({ data: body, count: count, limit })
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
                const errorInValidation = await validateComissPipeline(req)
                body = { ...body, isInvalid: errorInValidation}

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

            if (errorInValidation) res.status(200).send({ success: true ,isInvalid: errorInValidation })
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
        const tabelaComisPipeline = `${dbPrefix}_${uParams.schema_name}.comis_pipeline`
        const errorInValidation = {}

        let comisAgentes = { total: 0 }
        let comissPipeline = { base_agentes: 0 }
        try {
            existsOrError(body.id_comis_pipeline, 'Comissionamento não informado')
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            return res.status(400).send(error)
        }
        // Verificar se o comis_pipeline existe
        comissPipeline = await app.db(tabelaComisPipeline).where({ id: body.id_comis_pipeline, status: STATUS_ACTIVE }).first()
        comisAgentes = await app.db(tabelaDomain).sum('valor as total')
            .where({ id_comis_pipeline: body.id_comis_pipeline, agente_representante: '0', status: STATUS_ACTIVE }).first() || { total: 0 }

        if (comisAgentes.total > comissPipeline.base_agentes) {
            errorInValidation.sumError = `Existe um erro no somatório do comissionamento dos agentes. A soma (${formatCurrency(comisAgentes.total)}) ultrapassa o valor (${formatCurrency(comissPipeline.base_agentes)}) para comissionamento dos agentes informada no registro do Pipeline`
        }

        return errorInValidation;
    }

    return { save, get, getById, remove }
}
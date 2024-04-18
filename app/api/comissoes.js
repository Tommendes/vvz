const { dbPrefix } = require("../.env")
const moment = require('moment')
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    // const { STATUS_COMISSIONADO } = require('./pipeline_status.js')(app)
    const tabela = 'comissoes'
    const tabelaStatusComiss = 'comis_status'
    const tabelaStatusPipeline = 'pipeline_status'
    const tabelaAlias = 'Comissão'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99
    const STATUS_ABERTO = 10
    const STATUS_LIQUIDADO = 20
    const STATUS_ENCERRADO = 30
    const { ceilTwoDecimals, formatCurrency } = app.api.facilities

    const save = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        let body = { ...req.body }
        delete body.id;
        if (req.params.id) body.id = req.params.id
        try {
            // Alçada do usuário
            if (body.id) isMatchOrError(uParams && (uParams.comissoes >= 3 || uParams.financeiro >= 3), `${noAccessMsg} "Edição de ${tabelaAlias}"`)
            else isMatchOrError(uParams && uParams.comissoes >= 2, `${noAccessMsg} "Inclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaPipeline = `${dbPrefix}_${uParams.schema_name}.pipeline`
        const tabelaComisAgentes = `${dbPrefix}_${uParams.schema_name}.comis_agentes`
        const tabelaComissaoStatusDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaStatusComiss}`
        // const tabelaPipelineStatusDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaStatusPipeline}`

        body.agente_representante = body.agente_representante || 0

        let pipeline = {}
        let last = {}
        if (body.id) last = await app.db(tabelaDomain).where({ id: body.id }).first()
        const valorAnterior = last.valor || 0 // Valor anterior do registro
        if (body.valor_base) body.valor_base = body.valor_base.replace(",", ".");
        if (body.percentual) body.percentual = body.percentual.replace(",", ".");
        if (body.valor) body.valor = body.valor.replace(",", ".");
        try {
            existsOrError(body.id_pipeline, 'Pipeline não informado')
            // Verificar se o pipeline existe
            pipeline = await app.db(tabelaPipeline).where({ id: body.id_pipeline, status: STATUS_ACTIVE }).first()
            existsOrError(pipeline, 'Registro de Pipeline não encontrado')
            if (![0, 1].includes(body.agente_representante)) throw 'Se é a representação não informado'
            existsOrError(body.id_comis_agentes, 'Agente não informado')
            // Verificar se o comis_agentes existe
            const existsComissAgentes = await app.db(tabelaComisAgentes).where({ id: body.id_comis_agentes, status: STATUS_ACTIVE }).first()
            existsOrError(existsComissAgentes, 'Agente não encontrado')
            // Validações do valor da comissão
            existsOrError(body.valor_base, 'Valor base de cálculo da comissão não informado')
            existsOrError(body.percentual, 'Percentual sobre a base não informado')
            existsOrError(body.valor, 'Valor da comissão não informado')
            existsOrError(body.parcela, 'Parcela (Unica ou outra) não informado')
            if (Number(body.valor_base) <= 0) throw 'Valor base de cálculo da comissão deve ser maior que zero'
            if (Number(body.percentual) <= 0) throw 'Percentual sobre a base deve ser maior que zero'
            if (Number(body.valor) <= 0) throw 'Valor da comissão deve ser maior que zero'
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

        delete body.status_comis;

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

            const bodyStatus = body.bodyStatus || undefined
            const bodyMultiplicate = body.bodyMultiplicate || undefined
            delete body.bodyStatus
            delete body.bodyMultiplicate

            // console.log('bodyMultiplicate', bodyMultiplicate);
            // console.log('body', body);

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
                body.evento = evento
                body.updated_at = new Date()
                /*
                    Se for uma multiplicação de registros, faça:
                    1: Edite o valor_base para receber o bodyMultiplicate.valor_base_um e atualize o valor de acordo com o calculo entre o bodyMultiplicate.valor_base_um e o percentual e
                    2: O número da parcela será 1 
                    3: Crie N registros (bodyMultiplicate.parcelas) com os mesmos dados exceto que a parcela será 2, 3 e assim por diante e o valor da parcela será o valor do bodyMultiplicate.valor_base_demais
                */
                if (bodyMultiplicate) {
                    const valorBaseDemais = bodyMultiplicate.valor_base_demais.replace(",", ".")
                    const valorBaseUm = bodyMultiplicate.valor_base_um.replace(",", ".")
                    body.valor_base = valorBaseUm
                    body.valor = ceilTwoDecimals(valorBaseUm * body.percentual / 100)
                    body.parcela = 1
                    const novasParcelas = {
                        ...body,
                        valor_base: valorBaseDemais,
                        percentual: body.percentual,
                        valor: ceilTwoDecimals(valorBaseDemais * body.percentual / 100)
                    }

                    for (let i = 2; i <= bodyMultiplicate.parcelas; i++) {
                        novasParcelas.parcela = i
                        novasParcelas.status = STATUS_ACTIVE
                        delete novasParcelas.id
                        delete novasParcelas.evento
                        delete novasParcelas.updated_at
                        novasParcelas.created_at = new Date()

                        const nextEventID = await trx(`${dbPrefix}_api.sis_events`).select(app.db.raw('max(id) as count')).first()
                        novasParcelas.evento = nextEventID.count + 1
                        const newCommissioning = await trx(tabelaDomain).insert(novasParcelas)
                        const idComissoes = newCommissioning[0]

                        // Inserir na tabela de status a informação de comissionamento
                        await trx(tabelaComissaoStatusDomain).insert({
                            evento: novasParcelas.evento || 1,
                            created_at: new Date(),
                            id_comissoes: idComissoes,
                            status_comis: STATUS_ABERTO,
                        });

                        console.log('newCommissioning', newCommissioning);
                        // Evento de comissionamento do registro de pipeline
                        const { createEvent } = app.api.sisEvents
                        const evento = await createEvent({
                            "request": req,
                            "evento": {
                                id_user: user.id,
                                evento: `Parcelamento de comissão de Pipeline`,
                                classevento: `Commissioning`,
                                id_registro: idComissoes,
                                tabela_bd: 'comissoes'
                            }
                        })
                    }
                }
                await trx(tabelaDomain)
                    .update(body)
                    .where({ id: body.id })
                    .then(async (ret) => {
                        if (ret > 0) {
                            req.uParams = uParams
                            return res.status(200).send(body)
                        }
                        else res.status(200).send(`${tabelaAlias} não encontrado`)
                    })
                    .catch(error => {
                        app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                        return res.status(500).send(error)
                    })

                const lastStatusComiss = await app.db(tabelaComissaoStatusDomain)
                    .select(`status_comis`, 'id')
                    .where({ id_comissoes: body.id })
                    .orderBy('created_at', 'desc')
                    .first()
                    
                // Se não havia status de comissionamento então insere um novo
                if (!lastStatusComiss) {
                    // console.log(1);
                    await trx(tabelaComissaoStatusDomain).insert({
                        evento: evento || 1,
                        created_at: new Date(),
                        id_comissoes: body.id,
                        status_comis: STATUS_ABERTO,
                    });
                    if (bodyStatus && bodyStatus.status_comis == STATUS_LIQUIDADO || body.liquidar_em) {
                        await trx(tabelaComissaoStatusDomain).insert({
                            evento: evento || 1,
                            created_at: new Date(),
                            id_comissoes: body.id,
                            status_comis: STATUS_LIQUIDADO,
                        });
                    }
                }
                // Se havia um status e era == 10 e body.liquidar_em foi informado então insere um novo status
                if (lastStatusComiss && lastStatusComiss.status_comis == STATUS_ABERTO && body.liquidar_em) {
                    // console.log(2);
                    // Inserir na tabela de status de pipeline a informação de comissionamento            
                    await trx(tabelaComissaoStatusDomain).insert({
                        evento: evento || 1,
                        created_at: new Date(),
                        id_comissoes: body.id,
                        status_comis: STATUS_LIQUIDADO
                    });
                }
                // Se havia um status e era == 10 e body.liquidar_em foi informado então insere um novo status
                if (lastStatusComiss && (bodyStatus && bodyStatus.status_comis == STATUS_ENCERRADO) && (lastStatusComiss.status_comis == STATUS_ABERTO || body.liquidar_em)) {
                    // console.log(3);
                    if (lastStatusComiss.status_comis == STATUS_ABERTO)
                        await trx(tabelaComissaoStatusDomain).insert({
                            evento: evento || 1,
                            created_at: new Date(),
                            id_comissoes: body.id,
                            status_comis: STATUS_LIQUIDADO
                        });
                    // Inserir na tabela de status de pipeline a informação de comissionamento            
                    await trx(tabelaComissaoStatusDomain).insert({
                        evento: evento || 1,
                        created_at: new Date(),
                        id_comissoes: body.id,
                        status_comis: STATUS_ENCERRADO
                    });
                }
                // Se havia um status e era 20 e bodyStatus.status_comis == 10 então exclui o status 20                
                if (lastStatusComiss && lastStatusComiss.status_comis == STATUS_LIQUIDADO && (bodyStatus && bodyStatus.status_comis == STATUS_ABERTO || !body.liquidar_em)) {
                    // console.log(4);
                    await trx(tabelaComissaoStatusDomain).del().where({ id: lastStatusComiss.id });
                }
                // Se havia um status e era 20 e bodyStatus.status_comis == 20 então exclui o status 20 anterior e lança outro para corresponder ao novo status
                if (lastStatusComiss && lastStatusComiss.status_comis == STATUS_LIQUIDADO && (lastStatusComiss && lastStatusComiss.status_comis == STATUS_ABERTO && body.liquidar_em)) {
                    // console.log(5);
                    await trx(tabelaComissaoStatusDomain).del().where({ id: lastStatusComiss.id });
                    await trx(tabelaComissaoStatusDomain).insert({
                        evento: evento || 1,
                        created_at: new Date(),
                        id_comissoes: body.id,
                        status_comis: STATUS_LIQUIDADO
                    });
                }

            }).catch((error) => {
                // Se ocorrer um erro, faça rollback da transação
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
                return res.status(500).send(error);
            });
        } else {
            // const unique = await app.db(tabelaDomain).where({ id_pipeline: body.id_pipeline, id_comis_agentes: body.id_comis_agentes, parcela: body.parcela, status: STATUS_ACTIVE }).first()
            // try {
            //     notExistsOrError(unique, `Comissão já registrada para este agente`)
            // } catch (error) {
            //     app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            //     return res.status(400).send(error)
            // }

            app.db.transaction(async (trx) => {
                // Criação de um novo registro
                const nextEventID = await trx(`${dbPrefix}_api.sis_events`).select(app.db.raw('max(id) as count')).first()
                body.evento = nextEventID.count + 1
                // Variáveis da criação de um novo registro
                body.status = STATUS_ACTIVE
                body.created_at = new Date()

                // Evento de comissionamento do registro de pipeline
                const { createEvent } = app.api.sisEvents
                const evento = await createEvent({
                    "request": req,
                    "evento": {
                        id_user: user.id,
                        evento: `Commissionamento de Pipeline`,
                        classevento: `Insert`,
                        id_registro: body.id_pipeline,
                        tabela_bd: 'pipeline'
                    }
                })

                await trx(tabelaDomain)
                    .insert(body)
                    .then(async (ret) => {
                        body.id = ret[0]
                        req.uParams = uParams
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
                    status_comis: STATUS_ABERTO
                });
                // Inserir na tabela de status de pipeline a informação de programação de pagamento
                if (body.liquidar_em)
                    await trx(tabelaComissaoStatusDomain).insert({
                        evento: evento || 1,
                        created_at: new Date(),
                        id_comissoes: body.id,
                        status_comis: STATUS_LIQUIDADO
                    });

                // Inserir na tabela de status de pipeline a informação de comissionamento
                // const hasCommisioningStatus = await app.db(tabelaPipelineStatusDomain).where({ id_pipeline: body.id_pipeline, status: STATUS_ACTIVE, status_params: STATUS_COMISSIONADO }).first()
                // if (!hasCommisioningStatus)
                //     await trx(tabelaPipelineStatusDomain).insert({
                //         evento: evento || 1,
                //         status: STATUS_ACTIVE,
                //         created_at: new Date(),
                //         id_pipeline: body.id_pipeline,
                //         status_params: STATUS_COMISSIONADO,
                //     });

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
            isMatchOrError(uParams && uParams.comissoes >= 1, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        try {
            existsOrError(req.query.id_pipeline, 'Pipeline não informado')
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(400).send(error)
        }

        const idPipeline = req.query.id_pipeline

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaPipelineDomain = `${dbPrefix}_${uParams.schema_name}.pipeline`
        const tabelaComissAgentesDomain = `${dbPrefix}_${uParams.schema_name}.comis_agentes`
        const tabelaComissStatussDomain = `${dbPrefix}_${uParams.schema_name}.comis_status`
        const tabelaPipelineParams = `${dbPrefix}_${uParams.schema_name}.pipeline_params`
        const tabelaCadastros = `${dbPrefix}_${uParams.schema_name}.cadastros`
        const totalRecords = await app.db({ tbl1: tabelaDomain })
            .countDistinct('tbl1.id as count').first()
            .join({ tbl3: tabelaPipelineDomain }, 'tbl1.id_pipeline', 'tbl3.id')
            .join({ tbl4: tabelaComissAgentesDomain }, 'tbl1.id_comis_agentes', 'tbl4.id')
            .join({ tbl5: tabelaPipelineParams }, 'tbl5.id', 'tbl3.id_pipeline_params')
            .join({ tbl6: tabelaCadastros }, 'tbl6.id', 'tbl4.id_cadastros')
            .where({ 'tbl1.status': STATUS_ACTIVE })

        const ret = app.db({ tbl1: tabelaDomain })
            .join({ tbl3: tabelaPipelineDomain }, 'tbl1.id_pipeline', 'tbl3.id')
            .join({ tbl4: tabelaComissAgentesDomain }, 'tbl1.id_comis_agentes', 'tbl4.id')
            .join({ tbl5: tabelaPipelineParams }, 'tbl5.id', 'tbl3.id_pipeline_params')
            .leftJoin({ tbl6: tabelaCadastros }, 'tbl6.id', 'tbl4.id_cadastros')
            .select('tbl1.id', 'tbl1.parcela', 'tbl1.id_comis_agentes', 'tbl1.id_pipeline', 'tbl1.liquidar_em',
                { id_pipeline: 'tbl3.id' }, 'tbl6.nome as agente', 'tbl5.descricao as unidade', 'tbl3.documento',
                app.db.raw('format(tbl1.valor, 2, "pt_BR")valor'), app.db.raw('format(tbl1.valor_base, 2, "pt_BR")valor_base'), app.db.raw('format(tbl1.percentual, 2, "pt_BR")percentual'),
                'tbl4.agente_representante', app.db.raw(`DATE_FORMAT(SUBSTRING_INDEX(tbl1.liquidar_em,' ',1),'%d/%m/%Y') AS liquidar_aprox`),
                app.db.raw(`(select status_comis from ${tabelaComissStatussDomain} where id_comissoes = tbl1.id order by created_at desc, status_comis desc limit 1) last_status_comiss`))
            .where({ 'tbl1.status': STATUS_ACTIVE, 'tbl1.id_pipeline': idPipeline })
            .groupBy('tbl1.id')
            .orderBy(app.db.raw('cast(tbl4.agente_representante as unsigned)'))
            .orderBy('tbl1.parcela')
            .orderBy('tbl1.liquidar_em')
            .orderBy('tbl1.id', 'desc')

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
            isMatchOrError(uParams && uParams.comissoes >= 1, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
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
                body.valor_base = parseFloat(body.valor_base).toFixed(2).replace('.', ',')
                body.percentual = parseFloat(body.percentual).toFixed(2).replace('.', ',')
                body.valor = parseFloat(body.valor).toFixed(2).replace('.', ',')

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
            isMatchOrError(uParams && uParams.comissoes >= 4, `${noAccessMsg} "Exclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaComissaoStatusDomain = `${dbPrefix}_${uParams.schema_name}.comis_status`
        // const tabelaPipelineStatusDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaStatusPipeline}`
        const registro = { status: STATUS_DELETE }
        try {
            // registrar o evento na tabela de eventos
            const last = await app.db(tabelaDomain).where({ id: req.params.id }).first()
            req.uParams = uParams
            req.body = last
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

            // const countComiss = await app.db(tabelaDomain)
            //     .count('id as count')
            //     .where({ id_pipeline: last.id_pipeline, status: STATUS_ACTIVE })
            //     .first()
            // if (!countComiss || countComiss.count == 0) {
            //     await app.db(tabelaPipelineStatusDomain).update({ status: STATUS_DELETE }).where({ id_pipeline: last.id_pipeline, status_params: STATUS_COMISSIONADO })
            // }
            existsOrError(rowsUpdated, 'Registro não foi encontrado')

            res.status(204).send()
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            res.status(400).send(error)
        }
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
            if (element.last_status_comiss < STATUS_ENCERRADO) {
                delete element.last_status_comiss;
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
                        status_comis: STATUS_LIQUIDADO,
                    });
                }).catch((error) => {
                    // Se ocorrer um erro, faça rollback da transação
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
                    return res.status(500).send(error);
                });
            }
        })

        return res.status(200).send('Programação de liquidação bem sucedida')
    }

    const getByFunction = async (req, res) => {
        const func = req.params.func
        switch (func) {
            default:
                res.status(404).send('Função inexitente')
                break;
        }
    }

    return { save, get, getById, remove, liquidateInGroup, getByFunction }
}
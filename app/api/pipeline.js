const { dbPrefix } = require("../.env")
const moment = require('moment')
const ftp = require('basic-ftp');
const path = require('path')

module.exports = app => {
    const { STATUS_PENDENTE, STATUS_CONVERTIDO, STATUS_PEDIDO, STATUS_REATIVADO, STATUS_LIQUIDADO, STATUS_CANCELADO } = require('./pipeline_status.js')(app)
    const { existsOrError, booleanOrError, isMatchOrError, noAccessMsg } = require('./validation.js')(app)
    const tabela = 'pipeline'
    const tabelaAlias = 'Pipeline'
    const tabelaStatus = 'pipeline_status'
    const tabelaParams = 'pipeline_params'
    const tabelaFtp = 'pipeline_ftp'
    const tabelaCadastros = 'cadastros'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99

    const save = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        let body = { ...req.body }
        delete body.id;
        if (req.params.id) body.id = req.params.id
        try {
            // Alçada do usuário
            if (body.id) isMatchOrError(uParams && uParams.pipeline >= 3, `${noAccessMsg} "Edição de ${tabelaAlias}"`)
            else isMatchOrError(uParams && uParams.pipeline >= 2, `${noAccessMsg} "Inclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaPipelineStatusDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaStatus}`

        const pipeline_params_force = body.pipeline_params_force

        if (body.valor_agente) body.valor_agente = body.valor_agente.replace(",", ".");
        if (body.valor_representacao) body.valor_representacao = body.valor_representacao.replace(",", ".");
        if (body.valor_bruto) body.valor_bruto = body.valor_bruto.replace(",", ".");
        if (body.perc_represent) body.perc_represent = body.perc_represent.replace(",", ".");
        if (body.valor_liq) body.valor_liq = body.valor_liq.replace(",", ".");


        try {
            existsOrError(body.id_cadastros, 'Cadastro não informado')
            existsOrError(body.id_pipeline_params, 'Tipo de documento não informado')
            if (pipeline_params_force.reg_agente == 1) existsOrError(body.id_com_agentes, 'Agente não informado')
            if (pipeline_params_force.autom_nr == 0) {
                existsOrError(body.documento, 'Número de documento não informado')
                if (!(parseInt(body.documento) > 0)) throw 'Número de documento não informado'
            }
            if (body.id_com_agentes && pipeline_params_force.doc_venda >= 2) {
                existsOrError(body.valor_representacao, 'Valor base da comissão da representação não informado')
                if (body.valor_representacao < 0.01) throw 'Valor base da comissão da representação inválido'
                existsOrError(body.valor_agente, 'Valor base da comissão do agente não informado')
                if (body.valor_agente < 0.01) throw 'Valor base da comissão do agente inválido'
            }
            if (pipeline_params_force.obrig_valor == 1) {
                existsOrError(body.valor_bruto, 'Valor bruto não informado')
                if (body.valor_bruto < 0.01) throw 'Valor bruto inválido'
                existsOrError(body.valor_liq, 'Valor líquido não informado')
                if (body.valor_liq < 0.01) throw 'Valor líquido inválido'
            }
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(400).send(error)
        }
        const status_params_force = body.status_params_force; // Status forçado para edição
        const status_params = body.status_params; // Último status do registro
        delete body.status_params; delete body.pipeline_params_force; delete body.status_params_force; delete body.hash; delete body.tblName;
        if (body.id) {
            // Variáveis da edição de um registro            
            let updateRecord = {
                updated_at: new Date(),
                ...body, // Incluindo outros dados do corpo da solicitação
            };

            app.db.transaction(async (trx) => {
                // Iniciar a transação e editar na tabela principal
                const nextEventID = await app.db(`${dbPrefix}_api.sis_events`, trx).select(app.db.raw('count(*) as count')).first()
                updateRecord = { ...updateRecord, evento: nextEventID.count + 1 }
                // Registrar o evento na tabela de eventos
                const eventPayload = {
                    notTo: ['created_at', 'updated_at', 'evento',],
                    last: await app.db(tabelaDomain).where({ id: body.id }).first(),
                    next: updateRecord,
                    request: req,
                    evento: {
                        "evento": `Alteração de cadastro de ${tabela}`,
                        "tabela_bd": tabela,
                    },
                    trx: trx
                };
                const { createEventUpd } = app.api.sisEvents
                const evento = await createEventUpd(eventPayload)
                updateRecord.updated_at = new Date();
                await trx(tabelaDomain).update(updateRecord).where({ id: body.id });
                if (status_params_force != status_params) {
                    // Inserir na tabela de status apenas se o status for diferente
                    await trx(tabelaPipelineStatusDomain).insert({
                        evento: evento || 1,
                        status: STATUS_ACTIVE,
                        status_params: status_params_force,
                        created_at: new Date(),
                        id_pipeline: body.id,
                    });
                }

                // Se a mudança for para convertido, deve criar um novo registro com base no pipeline_params_force.tipo_secundario com o status pedido
                if (status_params_force == STATUS_CONVERTIDO) {

                    // Gerar um número de documento baseado no pipeline_params_force.tipo_secundario
                    let nextDocumentNr = await app.db(tabelaDomain, trx).select(app.db.raw('MAX(documento) + 1 AS documento'))
                        .where({ id_pipeline_params: pipeline_params_force.tipo_secundario, status: STATUS_ACTIVE }).first()
                    body.documento = nextDocumentNr.documento || '1'
                    body.documento = body.documento.toString().padStart(8, '0')
                    // Informa o id do registro pai
                    const idPai = body.id
                    // Limpa os dados do corpo da solicitação
                    delete body.id; delete body.id_filho;; delete body.versao; delete body.updated_at;

                    // Variáveis da criação de um registro
                    const newRecord = {
                        ...body, // Incluir os dados do corpo da solicitação
                        status: STATUS_ACTIVE,
                        created_at: new Date(),
                        id_pai: idPai,
                        id_pipeline_params: pipeline_params_force.tipo_secundario,
                    };

                    // Iniciar a transação e inserir na tabela principal
                    const nextEventID = await app.db(`${dbPrefix}_api.sis_events`, trx).select(app.db.raw('count(*) as count')).first()
                    const newRecordWithEvent = { ...newRecord, evento: nextEventID.count + 1 }
                    const [recordId] = await trx(tabelaDomain).insert(newRecordWithEvent);
                    // Informa o id do filho no registro pai
                    await trx(tabelaDomain).update({ id_filho: recordId }).where({ id: idPai });
                    const newRecordWithID = { ...newRecordWithEvent, id: recordId }

                    // Registrar o evento na tabela de eventos
                    const eventPayload = {
                        notTo: ['created_at', 'evento'],
                        next: newRecord,
                        request: req,
                        evento: {
                            evento: 'Novo registro',
                            tabela_bd: tabelaDomain,
                        },
                        trx: trx
                    };
                    const { createEventIns } = app.api.sisEvents
                    const evento = await createEventIns(eventPayload);

                    // Inserir na tabela de status um registro de criação
                    await trx(tabelaPipelineStatusDomain).insert({
                        evento: evento || 1,
                        status: STATUS_ACTIVE,
                        created_at: new Date(),
                        id_pipeline: recordId,
                        status_params: STATUS_PENDENTE,
                    });
                    // Inserir na tabela de status um registro de pedido                    
                    await trx(tabelaPipelineStatusDomain).insert({
                        evento: evento || 1,
                        status: STATUS_ACTIVE,
                        created_at: new Date(),
                        id_pipeline: recordId,
                        status_params: STATUS_PEDIDO,
                    });

                    return res.json(newRecordWithID);
                }
                return res.json(updateRecord);
            }).catch((error) => {
                // Se ocorrer um erro, faça rollback da transação
                app.api.logger.logError({
                    log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true },
                });
                return res.status(500).send(error);
            });
        } else {
            // Criação de um novo registro
            app.db.transaction(async (trx) => {
                // Se autom_nr = 1, gerar um novo número de documento
                if (pipeline_params_force.autom_nr == 1) {
                    let nextDocumentNr = await app.db(tabelaDomain, trx).select(app.db.raw('MAX(CAST(documento AS UNSIGNED)) AS documento'))
                        .where({ id_pipeline_params: body.id_pipeline_params, status: STATUS_ACTIVE }).first()
                    if (nextDocumentNr.documento == null) body.documento = 1
                    else body.documento = nextDocumentNr.documento + 1
                    body.documento = body.documento.toString().padStart(8, '0')
                }

                // Variáveis da criação de um registro
                const newRecord = {
                    status: STATUS_ACTIVE,
                    created_at: new Date(),
                    ...body, // Incluindo outros dados do corpo da solicitação
                };

                // Iniciar a transação e inserir na tabela principal
                const nextEventID = await app.db(`${dbPrefix}_api.sis_events`, trx).select(app.db.raw('count(*) as count')).first()
                const [recordId] = await trx(tabelaDomain).insert({ ...newRecord, evento: nextEventID.count + 1 });

                // Registrar o evento na tabela de eventos
                const eventPayload = {
                    notTo: ['created_at', 'evento'],
                    next: newRecord,
                    request: req,
                    evento: {
                        evento: 'Novo registro',
                        tabela_bd: tabelaDomain,
                    },
                    trx: trx
                };
                const { createEventIns } = app.api.sisEvents
                const evento = await createEventIns(eventPayload);

                // Inserir na tabela de status um registro de criação
                await trx(tabelaPipelineStatusDomain).insert({
                    evento: evento || 1,
                    status: STATUS_ACTIVE,
                    created_at: new Date(),
                    id_pipeline: recordId,
                    status_params: STATUS_PENDENTE,
                });
                /**
                 * Não pareceu bom liquidar, por exemplo, um projeto, carta ou memorando já na criação
                 */
                // // Se gera_baixa = 0, liquidar o registro na criação
                // if (pipeline_params_force.gera_baixa == 0) {
                //     const bodyStatus = {
                //         status: STATUS_ACTIVE,
                //         created_at: new Date(),
                //         id_pipeline: recordId,
                //         status_params: STATUS_LIQUIDADO,
                //     };
                //     await trx(tabelaPipelineStatusDomain).insert(bodyStatus);
                // }
                const newRecordWithID = { ...newRecord, id: recordId }
                return res.json(newRecordWithID);
            }).catch((error) => {
                // Se ocorrer um erro, faça rollback da transação
                app.api.logger.logError({
                    log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true },
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
            isMatchOrError(uParams && uParams.pipeline >= 1, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaUsers = `${dbPrefix}_api.users`
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaPipelineParamsDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaParams}`
        const tabelaCadastrosDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaCadastros}`

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
                key.split(':').forEach(element => {
                    if (element == 'field') {
                        if (['unidade'].includes(key.split(':')[1])) {
                            query += `SUBSTRING_INDEX(pp.descricao, '_', 1) = '${value}' AND `
                            sortField = 'tbl1.created_at'
                            sortOrder = 'DESC'
                        } else if (['descricaoUnidade'].includes(key.split(':')[1])) {
                            query += `pp.descricao = '${value}' AND `
                            sortField = 'tbl1.created_at'
                            sortOrder = 'DESC'
                        } else if (['status_created_at'].includes(key.split(':')[1])) {
                            sortField = 'tbl1.created_at'
                            value = queryes[key].split(':')
                            let valueI = moment(value[1], 'ddd MMM DD YYYY HH');
                            let valueF = moment(value[3].split(',')[1], 'ddd MMM DD YYYY HH');

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
                            query += `tbl1.created_at ${operator} AND `
                        } else {
                            if (['valor_bruto'].includes(key.split(':')[1])) value = value.replace(",", ".")
                            let queryField = key.split(':')[1]
                            switch (operator) {
                                case 'startsWith': operator = `like "${value}%"`
                                    break;
                                case 'contains': operator = `regexp("${value.toString().replace(' ', '.+')}")`
                                    break;
                                case 'notContains': operator = `not regexp("${value.toString().replace(' ', '.+')}")`
                                    break;
                                case 'endsWith': operator = `like "%${value}"`
                                    break;
                                case 'notEquals': operator = queryField == 'documento' ? `!= cast('${value}' as unsigned)` : `!= "${value}"`
                                    break;
                                default: operator = queryField == 'documento' ? `= cast('${value}' as unsigned)` : `= "${value}"`
                                    break;
                            }
                            if (queryField == 'nome') {
                                query += `(c.nome ${operator} or c.cpf_cnpj ${operator}) AND `
                            } else if (queryField == 'documento') {
                                query += `cast(tbl1.documento as unsigned) ${operator} AND `
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
                        sortField = key.split(':')[1].split('=')[0]
                        if (sortField == 'status_created_at') sortField = 'tbl1.created_at'
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

        let totalRecords = await app.db({ tbl1: tabelaDomain })
            .countDistinct('tbl1.id as count').first()
            .leftJoin({ u: tabelaUsers }, 'u.id', '=', 'tbl1.id_com_agentes')
            .join({ pp: tabelaPipelineParamsDomain }, 'pp.id', '=', 'tbl1.id_pipeline_params')
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'tbl1.id_cadastros')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')

        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.id, pp.descricao AS tipo_doc, pp.doc_venda, c.nome, c.cpf_cnpj, u.name agente, lpad(tbl1.documento,8,'0') documento, tbl1.versao, tbl1.descricao, tbl1.valor_bruto, tbl1.descricao,
            DATE_FORMAT(SUBSTRING_INDEX(tbl1.created_at,' ',1),'%d/%m/%Y') AS status_created_at, 
            SUBSTRING(SHA(CONCAT(tbl1.id,'${tabela}')),8,6) AS hash`))
            .leftJoin({ u: tabelaUsers }, 'u.id', '=', 'tbl1.id_com_agentes')
            .join({ pp: tabelaPipelineParamsDomain }, 'pp.id', '=', 'tbl1.id_pipeline_params')
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'tbl1.id_cadastros')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')
            .orderBy(app.db.raw(sortField), sortOrder)
            .orderBy('tbl1.id', 'desc') // além de ordenar por data, ordena por id para evitar que registros com a mesma data sejam exibidos em ordem aleatória
            .limit(rows).offset((page + 1) * rows - rows)
        console.log(ret.toString());
        ret.then(body => {
            const length = body.length
            return res.json({ data: body, totalRecords: totalRecords.count || length })
        }).catch(error => {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        })
    }

    const getById = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.pipeline >= 1, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*, TO_BASE64('${tabela}') tblName, SUBSTRING(SHA(CONCAT(tbl1.id,'${tabela}')),8,6) as hash`))
            .where({ 'tbl1.id': req.params.id })
            .whereNot({ 'tbl1.status': STATUS_DELETE })
            .first()
            .then(body => {
                if (!body) return res.status(404).send('Registro não encontrado')
                body.documento = body.documento.toString().padStart(8, '0')
                return res.json(body)
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
                return res.status(500).send(error)
            })
    }

    const remove = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.pipeline >= 4, `${noAccessMsg} "Exclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaPipelineStatusDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaStatus}`
        const registro = { status: req.query.st || STATUS_DELETE }
        try {
            // Variáveis da edição de um registro            
            let updateRecord = {
                updated_at: new Date(),
                status: registro.status,
                id: req.params.id
            };
            const last = await app.db(tabelaDomain).where({ id: req.params.id }).first()
            // if (registro.status == STATUS_REATIVADO && last.id_filho) registro.status = STATUS_CONVERTIDO
            // if (registro.status == STATUS_REATIVADO && last.id_pai) registro.status = STATUS_PEDIDO
            app.db.transaction(async (trx) => {
                // Iniciar a transação e editar na tabela principal
                const { createEventUpd } = app.api.sisEvents
                // Registrar o evento na tabela de eventos
                // Dados originais do registro
                const eventPayload = {
                    notTo: ['created_at', 'updated_at', 'evento',],
                    last: last,
                    next: updateRecord,
                    request: req,
                    evento: {
                        "classevento": "Remove",
                        "evento": `Exclusão de registro de ${tabela}`,
                        "tabela_bd": tabela
                    },
                    trx: trx,
                };
                const evento = await createEventUpd(eventPayload);
                updateRecord = { ...updateRecord, evento: evento }
                await trx(tabelaPipelineStatusDomain).insert({
                    evento: evento || 1,
                    status: STATUS_ACTIVE,
                    status_params: registro.status,
                    created_at: new Date(),
                    id_pipeline: req.params.id,
                });
                // Se o registro tiver um filho, e a mudança for para cancelado, reativado ou convertido(no caso do registro filho), também muda o status do filho
                if (last.id_filho && [STATUS_CANCELADO, STATUS_REATIVADO, /*STATUS_CONVERTIDO*/].includes(Number(registro.status))) {
                    await trx(tabelaPipelineStatusDomain).insert({
                        evento: evento || 1,
                        status: STATUS_ACTIVE,
                        status_params: registro.status,
                        created_at: new Date(),
                        id_pipeline: last.id_filho,
                    });
                }
                if (registro.status == STATUS_DELETE) {
                    await trx(tabelaDomain).update(updateRecord).where({ id: req.params.id });
                    // Se o registro tiver um filho, ele também é excluído
                    await trx(tabelaDomain).update({ status: registro.status, evento: evento }).where({ id: last.id_filho });
                    return res.status(204).send()
                } else {
                    return res.status(200).send(updateRecord);
                }
            }).catch((error) => {
                // Se ocorrer um erro, faça rollback da transação
                app.api.logger.logError({
                    log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true },
                });
                return res.status(500).send(error);
            });
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            res.status(400).send(error)
        }
    }

    const getByFunction = async (req, res) => {
        const func = req.params.func
        switch (func) {
            case 'glf':
                getListByField(req, res)
                break;
            case 'gbi':
                getBIData(req, res)
                break;
            case 'grs':
                getRecentSales(req, res)
                break;
            case 'gts':
                getTopSelling(req, res)
                break;
            case 'gtss':
                getTopSellers(req, res)
                break;
            case 'gtp':
                getTopProposals(req, res)
                break;
            case 'gso':
                getSalesOverview(req, res)
                break;
            case 'mfd':
                mkFolder(req, res)
                break;
            case 'lfd':
                lstFolder(req, res)
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
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            res.status(401).send(error)
        }
        const fieldName = req.query.fld
        const value = req.query.vl
        const select = req.query.slct
        const doc_venda = req.query.doc_venda

        const first = req.query.first && req.query.first == true
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaPipelineParamsDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaParams}`
        const ret = app.db({ tbl1: tabelaDomain })
            .join({ pp: tabelaPipelineParamsDomain }, 'pp.id', '=', 'tbl1.id_pipeline_params')

        if (select) {
            // separar os campos e retirar os espaços
            const selectArr = select.split(',').map(s => s.trim())
            selectArr.forEach(element => {
                if (element.split(' ') > 0) element = `${element.split(' ')[0]} as ${element.split(' ')[1]}`;
            });
            ret.select(app.db.raw(selectArr))
        }
        if (fieldName.includes('id') && !fieldName.includes('_')) ret.where({ 'tbl1.id': value })
        else ret.where(app.db.raw(`${fieldName} regexp("${value.toString().replace(' ', '.+')}")`))

        if (doc_venda) ret.where({ 'pp.doc_venda': doc_venda })

        ret.where({ 'tbl1.status': STATUS_ACTIVE });//, 'tbl1.id_cadastros': idCadastro

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
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }
        const biPeriodDi = req.query.periodDi
        const biPeriodDf = req.query.periodDf
        const biPeriodDv = req.query.periodDv || 2
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaParamsDomain = `${dbPrefix}_${uParams.schema_name}.pipeline_params`
        try {
            const total = await app.db({ tbl1: tabelaDomain }).count('tbl1.id as count')
                .join({ pp: tabelaParamsDomain }, function () {
                    this.on('pp.id', '=', 'tbl1.id_pipeline_params')
                }).where({ 'tbl1.status': STATUS_ACTIVE, 'pp.doc_venda': `${biPeriodDv}` }).first()
            let noPeriodo = { count: 0 }
            if (biPeriodDi && biPeriodDf)
                noPeriodo = await app.db({ tbl1: tabelaDomain }).count('tbl1.id as count')
                    .join({ pp: tabelaParamsDomain }, function () {
                        this.on('pp.id', '=', 'tbl1.id_pipeline_params')
                    })
                    .whereRaw(`date(tbl1.created_at) between "${biPeriodDi}" and "${biPeriodDf}"`)
                    .andWhere({ 'pp.doc_venda': `${biPeriodDv}` }).first()
            const novos = await app.db({ tbl1: tabelaDomain }).count('tbl1.id as count')
                .join({ pp: tabelaParamsDomain }, function () {
                    this.on('pp.id', '=', 'tbl1.id_pipeline_params')
                })
                .whereRaw(`EXTRACT(YEAR FROM date(tbl1.created_at)) = EXTRACT(YEAR FROM NOW())`)
                .whereRaw(`EXTRACT(MONTH FROM date(tbl1.created_at)) = EXTRACT(MONTH FROM NOW())`)
                .andWhere({ 'pp.doc_venda': `${biPeriodDv}` }).first()
            return res.send({ total: total.count, novos: novos.count, noPeriodo: noPeriodo.count })
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        }
    }

    // Recupera dados para index da plataforma BI
    const getRecentSales = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }
        const rows = req.query.rows || 5
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaParamsDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaParams}`
        const tabelaPipelineStatusDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaStatus}`
        const tabelaUploadsDomain = `${dbPrefix}_api.uploads`
        const tabelaUsers = `${dbPrefix}_api.users`
        try {
            const biRows = await app.db({ tbl1: tabelaDomain })
                .select(app.db.raw(`tbl1.id,upl.url url_logo,replace(pp.descricao,'_',' ') representacao,lpad(tbl1.documento,8,'0'),ps.created_at data_status,tbl1.valor_bruto,u.name agente`))
                .join({ pp: tabelaParamsDomain }, function () {
                    this.on('pp.id', '=', 'tbl1.id_pipeline_params')
                })
                .join({ ps: tabelaPipelineStatusDomain }, function () {
                    this.on('ps.id_pipeline', '=', 'tbl1.id')
                })
                .join({ u: tabelaUsers }, function () {
                    this.on('u.id', '=', 'tbl1.id_com_agentes')
                })
                .leftJoin({ upl: tabelaUploadsDomain }, function () {
                    this.on('upl.id', '=', 'pp.id_uploads_logo')
                })
                .where({ 'tbl1.status': STATUS_ACTIVE, 'ps.status_params': STATUS_PEDIDO })
                .groupBy('ps.id_pipeline')
                .orderBy('ps.created_at', 'desc')
                .limit(rows)
            return res.send(biRows)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        }
    }

    // Recupera dados para index da plataforma BI
    const getTopSelling = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }
        const biPeriodDi = req.query.periodDi
        const biPeriodDf = req.query.periodDf
        const rows = req.query.rows
        try {
            existsOrError(biPeriodDi, 'Período inicial não informado')
            existsOrError(biPeriodDf, 'Período final não informado')
            existsOrError(rows, 'Quantidade de registros não informada')
            if (rows < 1) throw 'Quantidade de registros não informada'
            if (!moment(biPeriodDi, 'YYYY-MM-DD', true).isValid()) throw 'Período inicial inválido'
            if (!moment(biPeriodDf, 'YYYY-MM-DD', true).isValid()) throw 'Período final inválido'
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(400).send(error)
        }
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaParamsDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaParams}`
        const tabelaPipelineStatusDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaStatus}`
        try {
            const biTopSelling = await app.db({ tbl1: tabelaDomain })
                .select(app.db.raw(`pp.id,REPLACE(pp.descricao,'_',' ') representacao,SUM(tbl1.valor_bruto)valor_bruto,COUNT(tbl1.id)quantidade`))
                .join({ pp: tabelaParamsDomain }, function () {
                    this.on('pp.id', '=', 'tbl1.id_pipeline_params')
                })
                .join({ ps: tabelaPipelineStatusDomain }, function () {
                    this.on('ps.id_pipeline', '=', 'tbl1.id')
                })
                .where({ 'tbl1.status': STATUS_ACTIVE, 'ps.status_params': STATUS_PEDIDO })
                .whereRaw(`date(ps.created_at) between "${biPeriodDi}" and "${biPeriodDf}"`)
                .groupBy('pp.id')
                .orderBy('valor_bruto', 'desc')
                .limit(rows)
            let totalSell = 0;
            let totalSellQuantity = 0;
            // Calcular o total geral para depois calcular o percentual de cada item
            biTopSelling.forEach(element => {
                totalSell = totalSell + element.valor_bruto
                totalSellQuantity = totalSellQuantity + element.quantidade
            });
            // Agora calcule o total para cada item e adicione o percentual em cada item
            biTopSelling.forEach(element => {
                element.percentual = Math.round((element.valor_bruto / totalSell) * 100)
                element.percentualQuantity = Math.round((element.quantidade / totalSellQuantity) * 100)
            });
            totalSell = Math.round(totalSell * 100) / 100
            // Ordene biTopSelling por percentual
            biTopSelling.sort((a, b) => (a.percentual < b.percentual) ? 1 : -1)

            return res.send({ data: biTopSelling, totalSell, totalSellQuantity })
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        }
    }

    // Recupera dados para index da plataforma BI
    const getTopSellers = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }
        const biPeriodDi = req.query.periodDi
        const biPeriodDf = req.query.periodDf
        const rows = req.query.rows
        try {
            existsOrError(biPeriodDi, 'Período inicial não informado')
            existsOrError(biPeriodDf, 'Período final não informado')
            existsOrError(rows, 'Quantidade de registros não informada')
            if (rows < 1) throw 'Quantidade de registros não informada'
            if (!moment(biPeriodDi, 'YYYY-MM-DD', true).isValid()) throw 'Período inicial inválido'
            if (!moment(biPeriodDf, 'YYYY-MM-DD', true).isValid()) throw 'Período final inválido'
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(400).send(error)
        }
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaParamsDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaParams}`
        const tabelaPipelineStatusDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaStatus}`
        const tabelaUsers = `${dbPrefix}_api.users`
        try {
            const biTopSelling = await app.db({ tbl1: tabelaDomain })
                .select(app.db.raw(`pp.id,u.name agente,SUM(tbl1.valor_bruto)valor_bruto,COUNT(tbl1.id)quantidade `))
                .join({ pp: tabelaParamsDomain }, function () {
                    this.on('pp.id', '=', 'tbl1.id_pipeline_params')
                })
                .join({ ps: tabelaPipelineStatusDomain }, function () {
                    this.on('ps.id_pipeline', '=', 'tbl1.id')
                })
                .join({ u: tabelaUsers }, function () {
                    this.on('u.id', '=', 'tbl1.id_com_agentes')
                })
                .where({ 'tbl1.status': STATUS_ACTIVE, 'ps.status_params': STATUS_PEDIDO })
                .whereRaw(`date(ps.created_at) between "${biPeriodDi}" and "${biPeriodDf}"`)
                .groupBy('tbl1.id_com_agentes')
                .orderBy('valor_bruto', 'desc')
                .limit(rows)
            let totalSell = 0;
            let totalSellQuantity = 0;
            // Calcular o total geral para depois calcular o percentual de cada item
            biTopSelling.forEach(element => {
                totalSell = totalSell + element.valor_bruto
                totalSellQuantity = totalSellQuantity + element.quantidade
            });
            // Agora calcule o total para cada item e adicione o percentual em cada item
            biTopSelling.forEach(element => {
                element.percentual = Math.round((element.valor_bruto / totalSell) * 100)
                element.percentualQuantity = Math.round((element.quantidade / totalSellQuantity) * 100)
            });
            totalSell = Math.round(totalSell * 100) / 100
            // Ordene biTopSelling por percentual
            biTopSelling.sort((a, b) => (a.percentual < b.percentual) ? 1 : -1)

            return res.send({ data: biTopSelling, totalSell, totalSellQuantity })
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        }
    }

    // Recupera dados para index da plataforma BI
    const getTopProposals = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }
        const biPeriodDi = req.query.periodDi
        const biPeriodDf = req.query.periodDf
        const rows = req.query.rows
        try {
            existsOrError(biPeriodDi, 'Período inicial não informado')
            existsOrError(biPeriodDf, 'Período final não informado')
            existsOrError(rows, 'Quantidade de registros não informada')
            if (rows < 1) throw 'Quantidade de registros não informada'
            if (!moment(biPeriodDi, 'YYYY-MM-DD', true).isValid()) throw 'Período inicial inválido'
            if (!moment(biPeriodDf, 'YYYY-MM-DD', true).isValid()) throw 'Período final inválido'
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(400).send(error)
        }
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaParamsDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaParams}`
        const tabelaPipelineStatusDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaStatus}`
        try {
            const biTopSelling = await app.db({ tbl1: tabelaDomain })
                .select(app.db.raw(`pp.id,REPLACE(pp.descricao,'_',' ') representacao,SUM(tbl1.valor_bruto)valor_bruto,COUNT(tbl1.id)quantidade`))
                .join({ pp: tabelaParamsDomain }, function () {
                    this.on('pp.id', '=', 'tbl1.id_pipeline_params')
                })
                .join({ ps: tabelaPipelineStatusDomain }, function () {
                    this.on('ps.id_pipeline', '=', 'tbl1.id')
                })
                .where({ 'tbl1.status': STATUS_ACTIVE, 'ps.status_params': STATUS_PENDENTE })
                .whereRaw(`date(ps.created_at) between "${biPeriodDi}" and "${biPeriodDf}"`)
                .groupBy('pp.id')
                .orderBy('valor_bruto', 'desc')
                .limit(rows)
            let totalProposed = 0;
            let totalProposedQuantity = 0;
            // Calcular o total geral para depois calcular o percentual de cada item
            biTopSelling.forEach(element => {
                totalProposed = totalProposed + element.valor_bruto
                totalProposedQuantity = totalProposedQuantity + element.quantidade
            });
            // Agora calcule o total para cada item e adicione o percentual em cada item
            biTopSelling.forEach(element => {
                element.percentual = Math.round((element.valor_bruto / totalProposed) * 100)
                element.percentualQuantity = Math.round((element.quantidade / totalProposedQuantity) * 100)
            });
            totalProposed = Math.round(totalProposed * 100) / 100
            // Ordene biTopSelling por percentual
            biTopSelling.sort((a, b) => (a.percentual < b.percentual) ? 1 : -1)

            return res.send({ data: biTopSelling, totalProposed, totalProposedQuantity })
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        }
    }

    // Recupera dados para index da plataforma BI
    const getSalesOverview = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }
        const biPeriodDi = req.query.periodDi
        const biPeriodDf = req.query.periodDf
        const rows = req.query.rows || undefined
        try {
            existsOrError(biPeriodDi, 'Período inicial não informado')
            existsOrError(biPeriodDf, 'Período final não informado')
            if (!moment(biPeriodDi, 'YYYY-MM-DD', true).isValid()) throw 'Período inicial inválido'
            if (!moment(biPeriodDf, 'YYYY-MM-DD', true).isValid()) throw 'Período final inválido'
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(400).send(error)
        }
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaParamsDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaParams}`
        const tabelaPipelineStatusDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaStatus}`
        try {
            const biSalesOverview = await app.db({ tbl1: tabelaDomain })
                .select(app.db.raw(`DATE_FORMAT(ps.created_at, '%m/%y') AS mes,pp.descricao AS representacao,SUM(tbl1.valor_bruto) AS valor_bruto`))
                .join({ pp: tabelaParamsDomain }, function () {
                    this.on('pp.id', '=', 'tbl1.id_pipeline_params')
                })
                .join({ ps: tabelaPipelineStatusDomain }, function () {
                    this.on('ps.id_pipeline', '=', 'tbl1.id')
                })
                .where({ 'tbl1.status': STATUS_ACTIVE, 'ps.status_params': STATUS_PEDIDO })
                .whereRaw(`date(ps.created_at) between "${biPeriodDi}" and "${biPeriodDf}"`)
                .whereRaw(rows ? `pp.id in (${rows})` : `1=1`)
                .groupBy(app.db.raw('mes, representacao'))
                .orderBy(app.db.raw('representacao, mes'))
            const formatData = await formatDataForChart(biSalesOverview)
            return res.send(formatData)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        }
    }

    // Cria pasta no servidor ftp
    const mkFolder = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.pipeline >= 2, `${noAccessMsg} "Inclusão de pastas de documentos"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const client = new ftp.Client();
        let body = { ...req.body }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaParamsDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaParams}`
        const tabelaFtpDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaFtp}`

        const pipeline = await app.db({ pp: tabelaDomain }).where({ id: body.id_pipeline }).first()
        const pipelineParam = await app.db({ pp: tabelaParamsDomain }).where({ id: pipeline.id_pipeline_params }).first()
        const ftpParam = await app.db({ ftp: tabelaFtpDomain })
            .select('host', 'port', 'user', 'pass', 'ssl')
            .where({ id: pipelineParam.id_ftp }).first()
        const pathDoc = path.join(pipelineParam.descricao, pipeline.documento)
        body.ftp = ftpParam
        body.ftp.path = pathDoc

        body.ssl = body.ssl == 1 ? true : false

        try {
            existsOrError(body.ftp, 'Dados de FTP não informados')
            body = body.ftp
            existsOrError(body.host, 'Host não informado')
            existsOrError(body.port, 'Porta não informada')
            existsOrError(body.user, 'Usuário não informado')
            existsOrError(body.pass, 'Senha não informada')
            booleanOrError(body.ssl, 'SSL não informado')
            existsOrError(body.path, 'Caminho não informado')
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(400).send(error)
        }

        try {
            await client.access({
                host: body.host,
                port: body.port,
                user: body.user,
                password: body.pass,
                secure: body.ssl == 1 ? true : false
            });

            await client.ensureDir(body.path);
            return res.send(`Pasta criada com sucesso no caminho: ${body.path}`);
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            if (error.code == 'EHOSTUNREACH') return res.status(500).send(`Servidor de arquivos temporariamente indisponível. Tente novamente ou tente mais tarde`);
            else return res.status(500).send(error)
        } finally {
            client.close();
        }
    }

    // Lista arquivos da pasta no servidor ftp
    const lstFolder = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.pipeline >= 1, `${noAccessMsg} "Listagem de pastas de documentos"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const client = new ftp.Client();
        let body = { ...req.body }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaParamsDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaParams}`
        const tabelaFtpDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaFtp}`

        const pipeline = await app.db({ pp: tabelaDomain }).where({ id: body.id_pipeline }).first()
        const pipelineParam = await app.db({ pp: tabelaParamsDomain }).where({ id: pipeline.id_pipeline_params }).first()
        const ftpParam = await app.db({ ftp: tabelaFtpDomain })
            .select('host', 'port', 'user', 'pass', 'ssl')
            .where({ id: pipelineParam.id_ftp }).first()
        const pathDoc = path.join(pipelineParam.descricao, pipeline.documento)
        body.ftp = ftpParam
        body.ftp.path = pathDoc

        body.ssl = body.ssl == 1 ? true : false

        try {
            existsOrError(body.ftp, 'Dados de FTP não informados')
            body = body.ftp
            existsOrError(body.host, 'Host não informado')
            existsOrError(body.port, 'Porta não informada')
            existsOrError(body.user, 'Usuário não informado')
            existsOrError(body.pass, 'Senha não informada')
            booleanOrError(body.ssl, 'SSL não informado')
            existsOrError(body.path, 'Caminho não informado')
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(400).send(error)
        }

        try {
            await client.access({
                host: body.host,
                port: body.port,
                user: body.user,
                password: body.pass,
                secure: body.ssl == 1 ? true : false
            });

            const list = await client.list('/' + body.path);
            if (list.length == 0) return res.status(200).send(`Pasta de arquivos não encontrado. Você pode criar uma clicando no botão "Criar pasta"`);
            else return res.send(list);
        } catch (error) {
            console.log(error.code);
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            if (error.code == 'EHOSTUNREACH') return res.status(200).send(`Servidor de arquivos temporariamente indisponível`);
            else if (error.code == 550) return res.status(200).send(`Pasta de arquivos não encontrado. Você pode criar uma clicando no botão "Criar pasta"`);
            else return res.status(200).send(error)
        } finally {
            client.close();
        }
    }

    const formatDataForChart = async (result) => {
        const datasets = [];
        const distinctRepresentacoes = [...new Set(result.map((item) => item.representacao))];
        distinctRepresentacoes.forEach((representacao, index) => {
            const dataPoints = result.filter((item) => item.representacao === representacao).map((item) => item.valor_bruto);
            const backgroundColor = generateColors();
            // Setar em representacaoNome removendo a última posição de representação
            let representacaoNome = representacao.split('_');
            if (representacaoNome.length > 1) representacaoNome.pop();
            // .slice(0, -1).join(' ');
            datasets.push({
                label: representacaoNome,
                data: dataPoints,
                fill: false,
                backgroundColor: backgroundColor,
                borderColor: backgroundColor,
                tension: 0.4
            });
        });
        const labels = [...new Set(result.map((item) => item.mes))];
        return {
            labels: labels,
            datasets: datasets
        };
    };

    function generateColors() {
        let color = '';
        let red = Math.floor((Math.random() * 256));
        let green = Math.floor((Math.random() * 256));
        let blue = Math.floor((Math.random() * 256));
        color = `rgb(${red},${green},${blue})`;
        return color;
    }

    return { save, get, getById, remove, getByFunction }
}
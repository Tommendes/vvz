const { dbPrefix } = require("../.env")
const moment = require('moment')
module.exports = app => {
    const { STATUS_PENDENTE, STATUS_CONVERTIDO, STATUS_PEDIDO, STATUS_PEDIDO_REATIVADO, STATUS_LIQUIDADO, STATUS_CANCELADO } = require('./pipeline_status.js')(app)
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = require('./validation.js')(app)
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
                isMatchOrError(uParams && uParams.pipeline >= 3, `${noAccessMsg} "Edição de ${tabela.charAt(0).toUpperCase() + tabela.slice(1).replaceAll('_', ' ')}"`)
            // Alçada para inclusão
            else isMatchOrError(uParams && uParams.pipeline >= 2, `${noAccessMsg} "Inclusão de ${tabela.charAt(0).toUpperCase() + tabela.slice(1).replaceAll('_', ' ')}"`)
        } catch (error) {
            console.log(error);
            return res.status(401).send(error)
        }
        const tabelaDomain = `${dbPrefix}_${user.cliente}_${user.dominio}.${tabela}`
        const tabelaPipelineStatusDomain = `${dbPrefix}_${user.cliente}_${user.dominio}.${tabelaStatus}`

        const pipeline_params_force = body.pipeline_params_force

        try {
            if (pipeline_params_force.obrig_valor == 1) {
                existsOrError(body.valor_bruto, 'Valor bruto não informado')
                if (body.valor_bruto < 0.01) throw 'Valor bruto inválido'
                existsOrError(body.valor_liq, 'Valor líquido não informado')
                if (body.valor_liq < 0.01) throw 'Valor líquido inválido'
            }
            existsOrError(body.id_cadastros, 'Cadastro não informado')
            existsOrError(body.id_pipeline_params, 'Tipo de documento não informado')

        } catch (error) {
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
                const nextEventID = await app.db('sis_events', trx).select(app.db.raw('count(*) as count')).first()
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
                    }
                };                
                const { createEventUpd } = app.api.sisEvents
                await createEventUpd(eventPayload, trx);
                await trx(tabelaDomain).update(updateRecord).where({ id: body.id });
                if (status_params_force != status_params) {
                    // Inserir na tabela de status apenas se o status for diferente
                    await trx(tabelaPipelineStatusDomain).insert({
                        status: STATUS_ACTIVE,
                        status_params: status_params_force,
                        created_at: new Date(),
                        id_pipeline: body.id,
                    });
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
                    let nextDocumentNr = await app.db(tabelaDomain, trx).select(app.db.raw('max(documento) + 1 as documento')).where({ id_pipeline_params: body.id_pipeline_params, status: STATUS_ACTIVE }).first()
                    body.documento = nextDocumentNr.documento
                }

                // Variáveis da criação de um registro
                const newRecord = {
                    status: STATUS_ACTIVE,
                    created_at: new Date(),
                    ...body, // Incluindo outros dados do corpo da solicitação
                };

                // Iniciar a transação e inserir na tabela principal
                const nextEventID = await app.db('sis_events', trx).select(app.db.raw('count(*) as count')).first()
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
                };
                const { createEventIns } = app.api.sisEvents
                await createEventIns(eventPayload, trx);

                // Inserir na tabela de status um registro de criação
                await trx(tabelaPipelineStatusDomain).insert({
                    status: STATUS_ACTIVE,
                    created_at: new Date(),
                    id_pipeline: recordId,
                    status_params: STATUS_PENDENTE,
                });
                // Se gera_baixa = 0, liquidar o registro na criação
                if (pipeline_params_force.gera_baixa == 0) {
                    const bodyStatus = {
                        status: STATUS_ACTIVE,
                        created_at: new Date(),
                        id_pipeline: recordId,
                        status_params: STATUS_LIQUIDADO,
                    };
                    await trx(tabelaPipelineStatusDomain).insert(bodyStatus);
                }
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
        const uParams = await app.db('users').where({ id: user.id }).first();
        try {
            // Alçada para exibição
            isMatchOrError(uParams && uParams.pipeline >= 1, `${noAccessMsg} "Exibição de pipeline"`)
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
        let sortOrder = 'desc'
        let tipoParams = '1=1'
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
                            sortField = 'status_created_at'
                            sortOrder = 'DESC'
                        } else if (['descricaoUnidade'].includes(key.split(':')[1])) {
                            query += `pp.descricao = '${value}' AND `
                            sortField = 'status_created_at'
                            sortOrder = 'DESC'
                        } else if (['status_created_at'].includes(key.split(':')[1])) {
                            sortField = 'status_created_at'
                            value = queryes[key].split(':')
                            let valueI = moment(value[1], 'ddd MMM DD YYYY HH').format('YYYY-MM-DD');
                            let valueF = moment(value[3].split(',')[1], 'ddd MMM DD YYYY HH').format('YYYY-MM-DD');
                            if (typeof valueF != 'Date') valueF = valueI;
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
                            query += `date(ps.created_at) ${operator} AND `
                        } else {
                            if (['valor_bruto'].includes(key.split(':')[1])) value = value.replace(",", ".")

                            switch (operator) {
                                case 'startsWith': operator = `like "${value}"`
                                    break;
                                case 'contains': operator = `regexp("${value.toString().replace(' ', '.+')}")`
                                    break;
                                case 'notContains': operator = `not like "%${value}%"`
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
                        sortField = key.split(':')[1].split('=')[0]
                        if (sortField == 'status_created_at') sortField = 'str_to_date(status_created_at,"%d/%m/%Y")'
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

        const totalRecords = await app.db({ tbl1: tabelaDomain })
            .countDistinct('tbl1.id as count').first()
            .leftJoin({ u: tabelaUsers }, 'u.id', '=', 'tbl1.id_com_agentes')
            .join({ pp: tabelaPipelineParamsDomain }, 'pp.id', '=', 'tbl1.id_pipeline_params')
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'tbl1.id_cadastros')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')

        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.id, pp.descricao AS tipo_doc, pp.doc_venda, c.nome, c.cpf_cnpj, u.name agente, tbl1.documento, tbl1.versao, tbl1.descricao, tbl1.valor_bruto, tbl1.descricao,
            (SELECT DATE_FORMAT(SUBSTRING_INDEX(MAX(ps.created_at),' ',1),'%d/%m/%Y') FROM ${tabelaPipelineStatusDomain} ps WHERE ps.id_pipeline = tbl1.id)status_created_at, 
            SUBSTRING(SHA(CONCAT(tbl1.id,'${tabela}')),8,6) AS hash`))
            .leftJoin({ u: tabelaUsers }, 'u.id', '=', 'tbl1.id_com_agentes')
            .join({ pp: tabelaPipelineParamsDomain }, 'pp.id', '=', 'tbl1.id_pipeline_params')
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'tbl1.id_cadastros')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')
            .orderBy(app.db.raw(sortField), sortOrder)
            .limit(rows).offset((page + 1) * rows - rows)
        ret.then(body => {
            return res.json({ data: body, totalRecords: totalRecords.count })
        }).catch(error => {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        })
    }


    const getById = async (req, res) => {
        let user = req.user
        const uParams = await app.db('users').where({ id: user.id }).first();
        try {
            // Alçada para exibição
            isMatchOrError(uParams && uParams.pipeline >= 1, `${noAccessMsg} "Exibição de Pipeline"`)
        } catch (error) {
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*, TO_BASE64('${tabela}') tblName, SUBSTRING(SHA(CONCAT(tbl1.id,'${tabela}')),8,6) as hash`))
            .where({ 'tbl1.id': req.params.id })
            .whereNot({ 'tbl1.status': STATUS_DELETE })            
            .first()
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
            isMatchOrError((uParams && uParams.pipeline >= 4), `${noAccessMsg} "Exclusão de Pipeline"`)
        } catch (error) {
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
        const tabelaPipelineStatusDomain = `${dbPrefix}_${user.cliente}_${user.dominio}.${tabelaStatus}`
        const registro = { status: req.query.st || STATUS_DELETE }
        try {
            // Variáveis da edição de um registro            
            let updateRecord = {
                updated_at: new Date(),
                status: registro.status,
                id: req.params.id
            };

            app.db.transaction(async (trx) => {
                // Iniciar a transação e editar na tabela principal
                const { createEventUpd } = app.api.sisEvents
                // Registrar o evento na tabela de eventos
                const eventPayload = {
                    notTo: ['created_at', 'updated_at', 'evento',],
                    last: await app.db(tabelaDomain).where({ id: req.params.id }).first(),
                    next: updateRecord,
                    request: req,
                    evento: {
                        "classevento": "Remove",
                        "evento": `Exclusão de Endereço de ${tabela}`,
                        "tabela_bd": tabela,
                    }
                };
                const evento = await createEventUpd(eventPayload, trx);
                updateRecord = { ...updateRecord, evento: evento }
                await trx(tabelaPipelineStatusDomain).insert({
                    status: STATUS_ACTIVE,
                    status_params: registro.status,
                    created_at: new Date(),
                    id_pipeline: req.params.id,
                });

                if (registro.status == STATUS_DELETE) {
                    await trx(tabelaDomain).update(updateRecord).where({ id: req.params.id });
                    return res.status(204).send()
                } else return res.status(200).send(updateRecord);
            }).catch((error) => {
                // Se ocorrer um erro, faça rollback da transação
                app.api.logger.logError({
                    log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true },
                });
                return res.status(500).send(error);
            });
        } catch (error) {
            console.log(error);
            res.status(400).send(error)
        }
    }


    return { save, get, getById, remove }
}
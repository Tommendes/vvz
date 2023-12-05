const { dbPrefix } = require("../.env")
module.exports = app => {
    const { existsOrError, isMatchOrError, noAccessMsg } = require('./validation.js')(app)
    const tabela = 'pv_oat'
    const tabelaAlias = 'OAT'
    const tabelaStatus = 'pv_oat_status'
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
            if (body.id) isMatchOrError(uParams && (uParams.pv >= 3 || uParams.at >= 3), `${noAccessMsg} "Edição de ${tabelaAlias}"`)
            else isMatchOrError(uParams && (uParams.pv >= 2 || uParams.at >= 2), `${noAccessMsg} "Inclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaPvOatStatusDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaStatus}`

        const pipeline_params_force = body.pipeline_params_force

        try {
            existsOrError(body.id_pv, 'Pós-venda não encontrado')
            existsOrError(body.id_cadastro_endereco, 'Endereço não informado')
            existsOrError(body.int_ext, 'Se interno ou externo não informado')
            existsOrError(body.garantia, 'Se garantia não informado')
            if (body.garantia == 1 && !(!!body.nf_garantia.trim())) throw "Favor informar a nota fiscal"
            existsOrError(body.pessoa_contato, 'Contato no cliente não encontrado')
            existsOrError(body.telefone_contato, 'Telefone do contato não encontrado')
        } catch (error) {
            return res.status(400).send(error)
        }

        const status_pv_oat_force = body.status_pv_oat_force; // Status forçado para edição
        const status_pv_oat = body.status_pv_oat; // Último status do registro
        delete body.status_pv_oat; delete body.pipeline_params_force; delete body.status_pv_oat_force; delete body.hash; delete body.tblName;
        if (body.pv_nr) body.pv_nr = body.pv_nr.toString().padStart(6, '0')
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
                    },
                    trx: trx
                };
                const { createEventUpd } = app.api.sisEvents
                await createEventUpd(eventPayload);
                await trx(tabelaDomain).update(updateRecord).where({ id: body.id });
                if (status_pv_oat_force && status_pv_oat && status_pv_oat_force != status_pv_oat) {
                    // Inserir na tabela de status apenas se o status for diferente
                    await trx(tabelaPvOatStatusDomain).insert({
                        status: STATUS_ACTIVE,
                        status_pv_oat: status_pv_oat_force,
                        created_at: new Date(),
                        id_pv: body.id,
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
                let nextDocumentNr = await app.db(tabelaDomain, trx).select(app.db.raw('MAX(CAST(pv_nr AS INT)) + 1 AS pv_nr'))
                    .where({ status: STATUS_ACTIVE }).first()
                body.pv_nr = nextDocumentNr.pv_nr || '1'
                body.pv_nr = body.pv_nr.toString().padStart(6, '0')

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
                    trx: trx
                };
                const { createEventIns } = app.api.sisEvents
                await createEventIns(eventPayload);

                // Inserir na tabela de status um registro de criação
                await trx(tabelaPvOatStatusDomain).insert({
                    status: STATUS_ACTIVE,
                    created_at: new Date(),
                    id_pv: recordId,
                    status_pv_oat: STATUS_PENDENTE,
                });
                // Inserir na tabela de status um registro de criação
                await trx(tabelaPvOatStatusDomain).insert({
                    status: STATUS_ACTIVE,
                    created_at: new Date(),
                    id_pv: recordId,
                    status_pv_oat: STATUS_EM_ANDAMENTO,
                });
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
            isMatchOrError(uParams && (uParams.pv >= 1 || uParams.at >= 1), `${noAccessMsg} "Inclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        
        const id_pv = req.params.id_pv
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`

        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*, SUBSTRING(SHA(CONCAT(id,'${tabela}')),8,6) as hash`))

        ret.where({ 'tbl1.status': STATUS_ACTIVE, 'tbl1.id_pv': id_pv })
            .groupBy('tbl1.id')
            .then(body => {
                const count = body.length
                return res.json({ data: body, count: count })
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            })
    }

    const getById = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.pv >= 1 || uParams.at >= 1), `${noAccessMsg} "Inclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const id_pv = req.params.id_pv
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*, TO_BASE64('${tabela}') tblName, SUBSTRING(SHA(CONCAT(tbl1.id,'${tabela}')),8,6) as hash`))
            .where({ 'tbl1.id': req.params.id, 'tbl1.status': STATUS_ACTIVE, 'tbl1.id_pv': id_pv }).first()
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
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.pv >= 4 || uParams.at >= 4), `${noAccessMsg} "Exclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const registro = { status: req.query.st || STATUS_DELETE }
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaPvOatStatusDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaStatus}`
        try {
            // Variáveis da edição de um registro            
            let updateRecord = {
                updated_at: new Date(),
                status: registro.status,
                id: req.params.id
            };
            const last = await app.db(tabelaDomain).where({ id: req.params.id }).first()
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
                await trx(tabelaPvOatStatusDomain).insert({
                    status: STATUS_ACTIVE,
                    status_pv_oat: registro.status,
                    created_at: new Date(),
                    id_pv_oat: req.params.id,
                });
                if (registro.status == STATUS_DELETE) {
                    await trx(tabelaDomain).update(updateRecord).where({ id: req.params.id });
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
            console.log(error);
            res.status(400).send(error)
        }
    }

    return { save, get, getById, remove }
}
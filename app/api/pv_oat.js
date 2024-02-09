const { dbPrefix } = require("../.env")
module.exports = app => {
    const { existsOrError, booleanOrError, isMatchOrError, noAccessMsg } = require('./validation.js')(app)
    const tabela = 'pv_oat'
    const tabelaAlias = 'OAT'
    const tabelaStatus = 'pv_oat_status'
    const STATUS_PENDENTE = 10
    const STATUS_EM_ANDAMENTO = 60
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99

    const save = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        let body = { ...req.body }
        delete body.id;
        if (req.params.id) body.id = req.params.id
        if (req.params.id_pv) body.id_pv = req.params.id_pv
        try {
            // Alçada do usuário
            if (body.id) isMatchOrError(uParams && (uParams.pv >= 3 || uParams.at >= 3), `${noAccessMsg} "Edição de ${tabelaAlias}"`)
            else isMatchOrError(uParams && (uParams.pv >= 2 || uParams.at >= 2), `${noAccessMsg} "Inclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaCadastrosDomain = `${dbPrefix}_${uParams.schema_name}.cadastros`
        const tabelaCadEnderecosDomain = `${dbPrefix}_${uParams.schema_name}.cad_enderecos`
        const tabelaPvOatStatusDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaStatus}`

        const idCadastro = body.id_cadastros
        delete body.id_cadastros;

        // Usado para identificar se houve um acionamento do botão Criar OAT de montagem em PipelineForm.vue
        const autoPvFromPipeline = body.auto_pv_from_pipeline
        delete body.auto_pv_from_pipeline;

        try {
            existsOrError(idCadastro, 'Cadastro não informado')
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            return res.status(400).send(error)
        }
        const cadastro = await app.db({ c: tabelaCadastrosDomain }).where({ id: idCadastro }).first()
        const cadastroEndereco = await app.db({ ce: tabelaCadEnderecosDomain }).where({ id_cadastros: idCadastro }).first()

        try {
            existsOrError((cadastro.cep && cadastro.cep.trim().length && cadastro.logradouro && cadastro.nr && cadastro.bairro && cadastro.cidade && cadastro.uf)
                || cadastroEndereco, 'Dados do endereço básico do cadastro ausentes ou incompletos e não há endereço adicional cadastrado. Não é possível prosseguir com a inclusão da OAT')
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            return res.status(400).send(error)
        }
        try {
            existsOrError(idCadastro, 'Cadastro não informado')
            if (!autoPvFromPipeline) existsOrError(body.id_cadastro_endereco, 'Endereço não informado')
            existsOrError(body.id_pv, 'Pós-venda não encontrado')
            existsOrError(String(body.int_ext), 'Se interno ou externo não informado')
            existsOrError(String(body.garantia), 'Se garantia não informado')
            if (body.garantia == 1 && !(!!body.nf_garantia.trim())) throw "Favor informar a nota fiscal"
            if (!autoPvFromPipeline) {
                existsOrError(body.pessoa_contato, 'Contato no cliente não encontrado')
                existsOrError(body.telefone_contato, 'Telefone do contato não encontrado')
            }
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            return res.status(400).send(error)
        }

        const status_pv_oat_force = body.status_pv_oat_force; // Status forçado para edição
        const status_pv_oat = body.status_pv_oat; // Último status do registro
        delete body.status_pv_oat; delete body.pipeline_params_force; delete body.status_pv_oat_force; delete body.hash; delete body.tblName;
        if (body.nr_oat) body.nr_oat = body.nr_oat.toString().padStart(6, '0')
        if (body.id) {
            // Variáveis da edição de um registro            
            let updateRecord = {
                updated_at: new Date(),
                ...body, // Incluindo outros dados do corpo da solicitação
            };

            app.db.transaction(async (trx) => {
                // Iniciar a transação e editar na tabela principal

                // Caso seja um autoPvFromPipeline ou um registro sem endereço, desabilitar a verificação de chave estrangeira pois o endereço pode ser o básico do cadastro
                if (autoPvFromPipeline || body.id_cadastro_endereco == 0) await trx.raw('SET FOREIGN_KEY_CHECKS=0')

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
                const evento = await createEventUpd(eventPayload);
                await trx(tabelaDomain).update(updateRecord).where({ id: body.id });
                if (status_pv_oat_force && status_pv_oat && status_pv_oat_force != status_pv_oat) {
                    // Inserir na tabela de status apenas se o status for diferente
                    await trx(tabelaPvOatStatusDomain).insert({
                        evento: evento,
                        status: STATUS_ACTIVE,
                        status_pv_oat: status_pv_oat_force,
                        created_at: new Date(),
                        id_pv_oat: body.id,
                    });
                }

                // Reativar a verificação de chave estrangeira
                if (autoPvFromPipeline || body.id_cadastro_endereco == 0) await trx.raw('SET FOREIGN_KEY_CHECKS=1')
                return res.json(updateRecord);
            }).catch((error) => {
                // Se ocorrer um erro, faça rollback da transação
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
                return res.status(500).send(error);
            });
        } else {
            // Criação de um novo registro
            app.db.transaction(async (trx) => {
                // Iniciar a transação e inserir na tabela principal

                // Caso seja um autoPvFromPipeline ou um registro sem endereço, desabilitar a verificação de chave estrangeira pois o endereço pode ser o básico do cadastro
                if (autoPvFromPipeline || body.id_cadastro_endereco == 0) await trx.raw('SET FOREIGN_KEY_CHECKS=0')

                let nextDocumentNr = await app.db(tabelaDomain, trx).select(app.db.raw('MAX(CAST(nr_oat AS INT)) + 1 AS nr_oat'))
                    .where({ id_pv: body.id_pv, status: STATUS_ACTIVE }).first()
                body.nr_oat = nextDocumentNr.nr_oat || '1'
                body.nr_oat = body.nr_oat.toString().padStart(6, '0')

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
                        tabela_bd: tabela,
                    },
                    trx: trx
                };
                const { createEventIns } = app.api.sisEvents
                const evento = await createEventIns(eventPayload);

                // Inserir na tabela de status um registro de criação
                await trx(tabelaPvOatStatusDomain).insert({
                    evento: evento,
                    status: STATUS_ACTIVE,
                    created_at: new Date(),
                    id_pv_oat: recordId,
                    status_pv_oat: STATUS_PENDENTE,
                });
                // Inserir na tabela de status um registro de criação
                await trx(tabelaPvOatStatusDomain).insert({
                    evento: evento,
                    status: STATUS_ACTIVE,
                    created_at: new Date(),
                    id_pv_oat: recordId,
                    status_pv_oat: STATUS_EM_ANDAMENTO,
                });
                let newRecordWithID = { ...newRecord, id: recordId }

                if (autoPvFromPipeline) {
                    newRecordWithID = { ...newRecordWithID, email: cadastro.email, telefone: cadastro.telefone }
                }

                // Reativar a verificação de chave estrangeira
                if (autoPvFromPipeline || body.id_cadastro_endereco == 0) await trx.raw('SET FOREIGN_KEY_CHECKS=1')
                return res.json(newRecordWithID);
            }).catch((error) => {
                // Se ocorrer um erro, faça rollback da transação
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
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
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const id_pv = req.params.id_pv
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`

        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*, SUBSTRING(SHA(CONCAT(id,'${tabela}')),8,6) as hash`))

        ret.where({ 'tbl1.status': STATUS_ACTIVE, 'tbl1.id_pv': id_pv })
            .groupBy('tbl1.id')
            .orderBy('tbl1.id', 'desc')
            .then(body => {
                const count = body.length
                return res.json({ data: body, count: count })
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
            isMatchOrError(uParams && (uParams.pv >= 1 || uParams.at >= 1), `${noAccessMsg} "Inclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const id_pv = req.params.id_pv
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*, TO_BASE64('${tabela}') tblName, SUBSTRING(SHA(CONCAT(tbl1.id,'${tabela}')),8,6) as hash`))
            .where({ 'tbl1.id': req.params.id, 'tbl1.status': STATUS_ACTIVE, 'tbl1.id_pv': id_pv }).first()
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
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.pv >= 4 || uParams.at >= 4), `${noAccessMsg} "Exclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
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
                    evento: evento,
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
                    log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true },
                });
                return res.status(500).send(error);
            });
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: Erro ao enviar arquivo: ${error}`, sConsole: true } })
            res.status(400).send(error)
        }
    }

    return { save, get, getById, remove }
}
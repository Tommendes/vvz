const { dbPrefix } = require("../.env")
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = require('./validation.js')(app)
    const tabela = 'uploads'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99

    const save = async (req, res) => {
        let user = req.user
        const uParams = await app.db('users').where({ id: user.id }).first();
        try {
            isMatchOrError(uParams && uParams.uploads >= 1, `${noAccessMsg} "Upload de arquivos"`)
        } catch (error) {
            console.log(error);
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }
        const tabelaDomain = `${dbPrefix}_${user.cliente}_${user.dominio}.${tabela}`

        let body = { ...req.body }
        try {
            existsOrError(body.file_permission, 'Permissão do arquivo não informado')
            existsOrError(body.file_name, 'Nome do arquivo não informado')
            existsOrError(body.file_caption, 'Identificador do arquivo não informado')
            existsOrError(body.file_wd, 'Local de armazenamento do arquivo não informado')
        } catch (error) {
            return res.status(400).send(error)
        }

        body.file_size = body.file_size || 0
        body.file_ext = body.file_ext || ''

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
        let key = req.query.key
        if (key) {
            key = key.trim()
        }
        const uParams = await app.db('users').where({ id: user.id }).first();
        try {
            // Alçada para exibição
            isMatchOrError(uParams, `${noAccessMsg} "Exibição de cadastro de ${tabela}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }
        const id_pv = req.params.id_pv
        const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`

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
        const uParams = await app.db('users').where({ id: user.id }).first();
        try {
            // Alçada para exibição
            isMatchOrError(uParams, `${noAccessMsg} "Exibição de Endereços de ${tabela}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }

        const id_pv = req.params.id_pv
        const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
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
        const uParams = await app.db('users').where({ id: user.id }).first();
        const registro = { status: req.query.st || STATUS_DELETE }
        try {
            // Alçada para exibição
            isMatchOrError(uParams && !((registro.status == STATUS_DELETE && uParams.pv < 4) || uParams.pv < 3), `${noAccessMsg} "Exclusão/liquidação de Pós-venda"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }

        const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
        const tabelaPvOatStatusDomain = `${dbPrefix}_${user.cliente}_${user.dominio}.${tabelaStatus}`
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

    const getByFunction = async (req, res) => {
        const func = req.params.func
        switch (func) {
            case 'hfl':
                hostFile(req, res)
                break;
            default:
                res.status(404).send('Função inexitente')
                break;
        }
    }

    const hostFile = async (req, res) => {
        const multer = require('multer');
        const path = require('path');
        const fs = require('fs');
        // Configurando o multer para lidar com o upload de arquivos
        const storage = multer.diskStorage({
            destination: function (req, file, cb) {
                const destinationPath = path.join(__dirname, '../../dashboard/public/assets/files');
                if (!fs.existsSync(destinationPath)) {
                    fs.mkdirSync(destinationPath);
                }
                cb(null, destinationPath);
            },
            filename: function (req, file, cb) {
                let nomeArquivo = file.originalname;
                let ultimaPosicaoPonto = nomeArquivo.lastIndexOf(".");
                let nomeSemExtensao = ultimaPosicaoPonto !== -1 ? nomeArquivo.substring(0, ultimaPosicaoPonto) : nomeArquivo;

                cb(null, nomeSemExtensao + '-' + Date.now() + path.extname(file.originalname));
            },
        });

        const upload = multer({ storage: storage }).array('arquivos');
        upload(req, res, async (err) => {

            // let user = req.user
            // const uParams = await app.db('users').where({ id: user.id }).first();
            // try {
            //     isMatchOrError(uParams && uParams.uploads >= 1, `${noAccessMsg} "Upload de arquivos"`)
            // } catch (error) {
            //     app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            //     return res.status(401).send(error)
            // }
            // const tabelaDomain = `${dbPrefix}_${user.cliente}_${user.dominio}.${tabela}`

            const files = req.files;
            // files.forEach(async (file) => {
            //     const newRecord = {
            //         status: STATUS_ACTIVE,
            //         created_at: new Date(),
            //         file_name: file.filename,
            //         file_caption: body.file_caption,
            //         file_permission: body.file_permission,
            //         file_wd: body.file_wd,
            //         file_size: file.size,
            //         file_ext: path.extname(file.originalname),
            //         file_type: file.mimetype,
            //         file_hash: file.filename,
            //         file_path: file.path,
            //         file_url: `/assets/files/${file.filename}`,
            //         id_pv: body.id_pv,
            //         id_pv_oat: body.id_pv_oat,
            //         id_pv_oat_status: body.id_pv_oat_status,
            //     };
            //     const nextEventID = await app.db('sis_events').select(app.db.raw('count(*) as count')).first()
            //     const [recordId] = await app.db(tabelaDomain).insert({ ...newRecord, evento: nextEventID.count + 1 });
            //     const newRecordWithID = { ...newRecord, id: recordId }
            //     return newRecordWithID;
            // });
            
            // body.file_size = body.file_size || 0
            // body.file_ext = body.file_ext || ''
            if (err) {
                console.log(err);
                return res.status(500).send({ message: 'Erro ao enviar arquivos', err });
            }
            return res.status(200).send({ message: 'Arquivos enviados com sucesso', files });
        });
    }


    return { save, get, getById, remove, getByFunction }
}
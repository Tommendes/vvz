const { dbPrefix } = require("../.env")
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = require('./validation.js')(app)
    const { baseFrontendUrl, uploadsRoot } = require("../config/params")
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
        const tabelaDomain = `${dbPrefix}_api.${tabela}`

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

    const saveNewFile = async (req, res) => {
        const tabelaDomain = `${dbPrefix}_api.${tabela}`

        let body = { ...req.body }

        // Criação de um novo registro
        app.db.transaction(async (trx) => {
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
            const newRecordWithID = { ...newRecord, id: recordId }
            return newRecordWithID;
        }).catch((error) => {
            // Se ocorrer um erro, faça rollback da transação
            app.api.logger.logError({
                log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true },
            });
            return res.status(500).send(error);
        });
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
        const tabelaDomain = `${dbPrefix}_api.${tabela}`

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
        const tabelaDomain = `${dbPrefix}_api.${tabela}`
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

        const tabelaDomain = `${dbPrefix}_api.${tabela}`
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
        let tknQueryId = undefined
        let tknQueryTime = undefined
        let timeExpired = false
        if (req.query.tkn && req.query.tkn.split('_').length > 1) {
            tknQueryId = { id: req.query.tkn.split('_')[0] }
            tknQueryTime = req.query.tkn.split('_')[1]
            const now = Math.floor(Date.now() / 1000)
            timeExpired = tknQueryTime < now
        }
        if (!(req.user || (tknQueryId && tknQueryTime))) {
            return res.status(401).send('Usuário não autenticado')
        }
        let user = req.user || tknQueryId
        // return res.send(user);
        const uParams = await app.db('users').where({ id: user.id }).first();
        // return res.send({tknQueryTime, now})
        try {
            if (timeExpired) throw 'Token expirado'
            isMatchOrError(uParams && uParams.uploads >= 1, `${noAccessMsg} "Upload de arquivos"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        // Configurando o multer para lidar com o upload de arquivos
        const destinationPath = path.join(__dirname, uploadsRoot);
        const storage = multer.diskStorage({
            destination: function (req, file, cb) {
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
            const uParams = await app.db('users').where({ id: user.id }).first();
            // Verifica se tem alçada para upload
            const files = req.files;
            try {
                isMatchOrError(uParams && uParams.uploads >= 1, `${noAccessMsg} "Upload de arquivos"`)
            } catch (error) {
                // Se Não tiver permissão, faça rollback da transação
                app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
                // Deletar os arquivos enviados
                files.forEach(file => {
                    const filePath = path.join(destinationPath, file.filename);
                    fs.unlinkSync(filePath);
                });
                return res.status(401).send(error)
            }
            if (err) {
                console.log(err);
                return res.status(500).send({ message: 'Erro ao enviar arquivos', err });
            }
            files.forEach(async (file) => {
                file.url = `${baseFrontendUrl}/assets/files/${file.filename}`;
                // Adicione a propriedade file.label contendo o file.originalname sem a extensão
                let nomeArquivo = file.originalname;
                let ultimaPosicaoPonto = nomeArquivo.lastIndexOf(".");
                let nomeSemExtensao = ultimaPosicaoPonto !== -1 ? nomeArquivo.substring(0, ultimaPosicaoPonto) : nomeArquivo;
                file.label = nomeSemExtensao;
                file.uid = file.filename.split('-')[1].split('.')[0];
                req.body = file
                await saveNewFile(req, res)
            });
            return res.status(200).send({ message: 'Arquivos enviados com sucesso', files });
        });
    }


    return { save, get, getById, remove, getByFunction }
}
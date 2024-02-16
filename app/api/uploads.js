const { dbPrefix, tempFiles, baseFilesUrl } = require("../.env")
const sharp = require('sharp');
const ftp = require("ftp");
const path = require("path");
module.exports = app => {
    const { existsOrError, isMatchOrError, noAccessMsg } = require('./validation.js')(app)
    const tabela = 'uploads'
    const tabelaAlias = 'Uploads'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99
    const clienteFTP = new ftp();

    const save = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        let body = { ...req.body }
        delete body.id;
        if (req.params.id) body.id = req.params.id
        try {
            // Alçada do usuário
            if (body.id) isMatchOrError(uParams && uParams.uploads >= 3, `${noAccessMsg} "Edição de ${tabelaAlias}"`)
            else isMatchOrError(uParams && uParams.uploads >= 2, `${noAccessMsg} "Inclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_api.${tabela}`

        if (body.id && body.id > 0) {
            try {
                existsOrError(body.uid, 'Identificador único não informado');
                const unique = await app.db(tabelaDomain).where({ uid: body.uid }).first();
                if (unique && unique.id != body.id) {
                    return res.status(400).send('Identificador único já cadastrado')
                }
                existsOrError(body.fieldname, 'Nome do campo não informado');
                existsOrError(body.originalname, 'Nome original do arquivo não informado');
                existsOrError(body.encoding, 'Encoding do arquivo não informado');
                existsOrError(body.mimetype, 'Mimetype do arquivo não informado');
                existsOrError(body.destination, 'Destino do arquivo não informado');
                existsOrError(body.filename, 'Nome do arquivo do arquivo não informado');
                existsOrError(body.path, 'Caminho do arquivo no servidor não informado');
                existsOrError(body.size, 'Tamanho do arquivo no servidor não informado');
                existsOrError(body.url, 'URL de acesso ao arquivo não informado');
                existsOrError(body.label, 'Label não informado');
            } catch (error) {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: Erro ao enviar arquivo: ${error}`, sConsole: true } })
                return res.status(400).send(error)
            }
        }
         

        body.filename = body.filename.replace(/ /g, '_');

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
                .then((ret) => {
                    if (ret > 0) res.status(200).send(body)
                    else res.status(200).send('Registro não foi encontrado')
                })
                .catch(error => {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                    return res.status(500).send(error)
                })
        } else {
            // Criação de um novo registro
            const nextEventID = await app.db(`${dbPrefix}_api.sis_events`).select(app.db.raw('max(id) as count')).first()

            body.evento = nextEventID.count + 1
            // Variáveis da criação de um novo registro
            body.status = STATUS_ACTIVE
            body.created_at = new Date()
            body.uid = Math.floor(Date.now())
            delete body.old_id;
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
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                    return res.status(500).send(error)
                })
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
            await createEventIns(eventPayload);
            const newRecordWithID = { ...newRecord, id: recordId }
            return newRecordWithID;
        }).catch((error) => {
            // Se ocorrer um erro, faça rollback da transação
            app.api.logger.logError({
                log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true },
            });
            return res.status(500).send(error);
        });
    }

    const get = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.uploads >= 1, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_api.${tabela}`

        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*`))

        ret.where({ 'tbl1.status': STATUS_ACTIVE })
            .groupBy('tbl1.id')
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
            isMatchOrError(uParams && uParams.uploads >= 1, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_api.${tabela}`
        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*`))
            .where({ 'tbl1.id': req.params.id, 'tbl1.status': STATUS_ACTIVE }).first()
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
            isMatchOrError(uParams && uParams.uploads >= 4, `${noAccessMsg} "Exclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const body = { ...req.body }

        const tabelaDomain = `${dbPrefix}_api.${tabela}`
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
            let rowsUpdated = await app.db(tabelaDomain).where({ id: req.params.id, status: STATUS_ACTIVE }).first()
            try {
                existsOrError(rowsUpdated, 'Arquivo não existe no servidor')
            } catch (error) {
                return res.status(400).send(error)
            }
            // Excluir o arquivo do servidor com o endereço contido em rowsUpdated.path
            try {
                const fileRemoved = await removeFileFromServer(req, res)
                if (fileRemoved != true) throw 'Erro ao excluir arquivo do servidor. Erro: ' + fileRemoved
            } catch (error) {
                return res.status(500).send(error)
            }
            app.db(tabelaDomain)
                .update({
                    status: registro.status,
                    updated_at: new Date(),
                    evento: evento
                })
                .where({ id: req.params.id || body.uid })
                .then((ret) => {
                    if (ret > 0) res.status(204).send()
                    else res.status(200).send('Registro não foi encontrado')
                })
        } catch (error) {
            return res.status(400).send(error)
        }
    }

    const removeFileFromServer = async (req, res) => {
        try {
            let user = req.user
            const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
            const tabelaFtp = `${dbPrefix}_api.ftp_control`
            const ftpParam = await app.db({ ftp: tabelaFtp })
                .select('host', 'port', 'user', 'pass', 'ssl')
                .where({ schema_id: uParams.schema_id }).first()
            clienteFTP.connect({
                host: ftpParam.host,
                port: ftpParam.port,
                user: ftpParam.user,
                password: ftpParam.pass,
            });
            const tabelaDomain = `${dbPrefix}_api.${tabela}`
            clienteFTP.on("ready", async () => {
                const filesToDelete = await app.db(tabelaDomain).where({ status: STATUS_DELETE })
                filesToDelete.forEach(async (file) => {
                    // Excluir o arquivo no servidor FTP
                    const fileToDelete = path.join(file.url_path, file.uid + '_' + file.filename)
                    clienteFTP.delete(fileToDelete, async (error) => {
                        if (error) {
                            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Erro ao excluir arquivo no servidor FTP: ${error}`, sConsole: true } });
                        } else {
                            app.api.logger.logInfo({ log: { line: `Arquivo ${fileToDelete} excluído com sucesso!`, sConsole: true } })
                        }
                        // Excluir o registro da tabela de uploads no banco de dados após excluir o arquivo no servidor FTP alterando o status para 999
                        await app.db(tabelaDomain)
                            .update({ status: 999, updated_at: new Date() })
                            .where({ id: file.id })
                    });

                    // Fechar a conexão após as operações
                    clienteFTP.end();
                });
            });

            return true;
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            return res.send(error);
        }
    }

    const getByFunction = async (req, res) => {
        const func = req.params.func
        switch (func) {
            case 'hfl':
                hostFile(req, res)
                break;
            case 'sown':
                setFileOwnerInSchemaData(req, res)
                break;
            default:
                res.status(404).send('Função inexitente')
                break;
        }
    }

    // Função para hospedar arquivos
    const hostFile = async (req, res) => {
        const multer = require('multer');
        const fs = require('fs');
        const path = require('path');
        const { promisify } = require('util');
        const rename = promisify(fs.rename);
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
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            if (timeExpired) throw 'Token expirado'
            isMatchOrError(uParams && uParams.uploads >= 2, `${noAccessMsg} "Upload de arquivos"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }


        const tabelaFtp = `${dbPrefix}_api.ftp_control`
        const ftpParam = await app.db({ ftp: tabelaFtp })
            .select('host', 'port', 'user', 'pass', 'ssl')
            .where({ schema_id: uParams.schema_id }).first()
        req.ftpParam = ftpParam
        const tabelaSchema = `${dbPrefix}_api.schemas_control`
        const schemaParam = await app.db({ sc: tabelaSchema }).where({ id: uParams.schema_id }).first()
        req.schemaParam = schemaParam

        // ftpParam contém os dados de conexão com o servidor FTP. 
        // Primeiro verifique se a conexão com o servidor FTP está funcionando
        // Depois verifique se a pasta do cliente existe no servidor FTP. O nome da pasta é o schema_description
        // O arquivo recebido deverá ser enviado para o servidor FTP utilizando o multer     

        try {
            // Verificar se a conexão com o servidor FTP está funcionando
            clienteFTP.connect({
                host: ftpParam.host,
                port: ftpParam.port,
                user: ftpParam.user,
                password: ftpParam.pass,
            });
            req.clienteFTP = clienteFTP

            // Configurando o multer para lidar com o upload de arquivos
            const destinationPath = path.join(__dirname, tempFiles, schemaParam.schema_description);
            const storage = multer.diskStorage({
                destination: function (req, file, cb) {
                    if (!fs.existsSync(destinationPath)) {
                        fs.mkdirSync(destinationPath, { recursive: true });
                    }
                    cb(null, destinationPath);
                },
                filename: function (req, file, cb) {
                    cb(null, file.originalname.replace(/ /g, '_'));
                }
            });

            const upload = multer({ storage: storage }).array('arquivos');
            upload(req, res, async (error) => {
                const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
                // Verifica se tem alçada para upload
                let files = req.files;
                req.user = uParams;
                const schemaParam = req.schemaParam
                try {
                    isMatchOrError(uParams && uParams.uploads >= 2, `${noAccessMsg} "Upload de arquivos"`)
                } catch (error) {
                    // Se Não tiver permissão, faça rollback da transação
                    app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                    // Deletar os arquivos enviados
                    files.forEach(file => {
                        const filePath = path.join(__dirname, tempFiles, schemaParam.schema_description, file.originalname);
                        fs.unlinkSync(filePath);
                    });
                    return res.status(401).send(error)
                }
                if (error) {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: Erro ao enviar arquivo: ${error}`, sConsole: true } })
                    return res.status(500).send({ message: 'Erro ao enviar arquivos', error });
                }
                files.forEach(async (file) => {
                    file.uid = Math.floor(Date.now());
                    file.url_destination = `${baseFilesUrl}`;
                    file.url_path = schemaParam.schema_description;
                    file.extension = file.originalname.split('.').pop();
                    const inputPath = path.join(file.destination, file.originalname);

                    clienteFTP.on("ready", () => {
                        // Agora que o cliente está pronto, podemos realizar operações FTP
                        // Garante a pasta do cliente no servidor FTP. O nome da pasta é o schema_description
                        criarDiretorioRecursivo(schemaParam.schema_description, async () => {
                            const ftpPath = path.join(schemaParam.schema_description, file.uid + '_' + file.filename);
                            // Enviar o arquivo após a criação do diretório
                            clienteFTP.put(inputPath, ftpPath, (error) => {
                                if (error) {
                                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: Erro ao enviar arquivo: ${error}`, sConsole: true } })
                                    return res.status(500).send('Erro ao enviar arquivo:' + error)
                                }
                                // setTimeout(() => {
                                //     if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);                                    
                                // }, 3000);
                            });
                        });
                        // Fechar a conexão após as operações     
                        clienteFTP.end();
                    })
                });
                req.body = files
                files = await registerFileInDb(req)
                setTimeout(() => {
                    return res.status(200).send({ message: 'Arquivo(s) enviado(s) com sucesso', files: files });
                }, 2000);
            });
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            if (error.code == 'EHOSTUNREACH') return res.status(500).send(`Servidor de arquivos temporariamente indisponível. Tente novamente ou tente mais tarde`);
            else return res.status(500).send(error)
        }
    }

    function criarDiretorioRecursivo(caminho, callback) {
        const partes = caminho.split("/");
        criarProximoDiretorio(0);
        function criarProximoDiretorio(indice) {
            if (indice >= partes.length) {
                // Todos os diretórios criados
                callback();
                return;
            }
            const diretorioAtual = partes.slice(0, indice + 1).join("/");
            clienteFTP.mkdir(diretorioAtual, true, (erro) => {
                if (erro && erro.code !== 550) {
                    // Código 550 significa que o diretório já existe, outros códigos indicam erros
                    console.error("Erro ao criar diretório:", diretorioAtual, erro);
                    callback(erro);
                    return;
                }
                criarProximoDiretorio(indice + 1);
            });
        }
    }

    const registerFileInDb = async (req) => {
        const tabelaDomain = `${dbPrefix}_api.${tabela}`
        let body = req.body
        const nextEventID = await app.db(`${dbPrefix}_api.sis_events`).select(app.db.raw('max(id) as count')).first()
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
        await body.forEach(async (element) => {
            delete element.destination;
            delete element.path;
            delete element.fieldname;
            element.evento = nextEventID.count + 1
            element.status = STATUS_ACTIVE
            element.created_at = new Date()
            const id = await app.db(tabelaDomain).insert(element)
            element.id = id[0]
        });
        return body
    }

    /**
     * Seta o id do arquivo em um registro de uma tabela de um schema
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    const setFileOwnerInSchemaData = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.uploads >= 2, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const body = { ...req.body }
        // itemData é um objeto que contém os dados do registro que receberá o id do arquivo
        const itemData = body.itemData
        delete body.itemData
        // tabelaDomain contém o nome da tabela de uploads
        const tabelaDomain = `${dbPrefix}_api.${tabela}`
        // tabelaOwnerDomain contém o nome da tabela que receberá o id do arquivo
        const tabelaOwnerDomain = `${dbPrefix}_${itemData.schema}.${itemData.tabela}`
        // uploadBody contém os dados do arquivo que será setado no registro
        const uploadBody = await app.db(tabelaDomain).where({ uid: body.uid }).first()
        try {
            existsOrError(uploadBody, 'Arquivo não encontrado')
        } catch (error) {
            return res.status(400).send(error)
        }
        // owner contém os dados do registro que receberá o id do arquivo
        const owner = await app.db(tabelaOwnerDomain).where({ id: itemData.registro_id }).first()
        // last contém os dados do registro antes da alteração
        const last = { ...owner }
        const { createEventUpd } = app.api.sisEvents
        let evento = undefined
        // Verificar se há um arquivo e registro no banco de dados referente registro anterior
        // Se houver, excluir o arquivo do servidor e cancela o registro do banco de dados
        try {
            const uploadBodyRemove = await app.db(tabelaDomain).where({ id: last[itemData.field] }).first()
            const uploadBodyRemoveBefore = { ...uploadBodyRemove }
            if (uploadBodyRemove && uploadBodyRemove.id) {
                uploadBodyRemove.status = STATUS_DELETE

                evento = await createEventUpd({
                    "notTo": ['created_at', 'updated_at', 'evento'],
                    "last": uploadBodyRemoveBefore,
                    "next": uploadBodyRemove,
                    "request": req,
                    "evento": {
                        "classevento": "Remove",
                        "evento": `Exclusão de ${tabela}`,
                        "tabela_bd": tabela,
                    }
                })
                uploadBodyRemove.updated_at = new Date()
                uploadBodyRemove.evento = evento
                await app.db(tabelaDomain)
                    .update(uploadBodyRemove)
                    .where({ id: last[itemData.field] })
            }
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: Erro ao enviar arquivo: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        }

        // Setar o id do arquivo no registro no field informado em itemData.field
        owner[itemData.field] = uploadBody.id

        // Variáveis da edição de um registro
        // registrar o evento na tabela de eventos
        evento = await createEventUpd({
            "notTo": ['created_at', 'updated_at', 'evento',],
            "last": last,
            "next": owner,
            "request": req,
            "evento": {
                "evento": `Alteração de ${itemData.tabela}`,
                "tabela_bd": itemData.tabela,
            }
        })

        owner.evento = evento
        owner.updated_at = new Date()

        app.db(tabelaOwnerDomain)
            .update(owner)
            .where({ id: last.id })
            .then((ret) => {
                if (ret > 0) res.status(200).send(body)
                else res.status(200).send('Registro não foi encontrado')
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                return res.status(500).send(error)
            })
    }

    /**
     * Função para redimensionar uma imagem para um tamanho máximo
     * @param {*} inputPath 
     * @param {*} outputPath 
     * @param {*} maxWidth 
     * @param {*} maxHeight 
     */
    const resizeImage = async (inputPath, outputPath, maxWidth, maxHeight) => {
        const image = sharp(inputPath)
        const metadata = await image.metadata()
        await image.resize({
            width: maxWidth || metadata.width,
            height: maxHeight || metadata.height,
            fit: 'inside', // ou 'cover' dependendo do comportamento desejado
            withoutEnlargement: true,
        })
            .toFile(outputPath);
    };

    return { save, get, getById, remove, getByFunction, removeFileFromServer }
}
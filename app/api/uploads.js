const { log } = require("console")
const { dbPrefix, uploadsRoot, baseFrontendUrl } = require("../.env")
const sharp = require('sharp');
module.exports = app => {
    const { existsOrError, isMatchOrError, noAccessMsg } = require('./validation.js')(app)
    const tabela = 'uploads'
    const tabelaAlias = 'Uploads'
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
            if (body.id) isMatchOrError(uParams && uParams.uploads >= 3, `${noAccessMsg} "Edição de ${tabelaAlias}"`)
            else isMatchOrError(uParams && uParams.uploads >= 2, `${noAccessMsg} "Inclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
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
                console.log(error);
                return res.status(400).send(error)
            }
        }
        delete body.hash; delete body.tblName;

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
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
                    return res.status(500).send(error)
                })
        } else {
            // Criação de um novo registro
            const nextEventID = await app.db('sis_events').select(app.db.raw('count(*) as count')).first()

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
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
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
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.uploads >= 1, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        
        const tabelaDomain = `${dbPrefix}_api.${tabela}`

        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*, SUBSTRING(SHA(CONCAT(id,'${tabela}')),8,6) as hash`))

        ret.where({ 'tbl1.status': STATUS_ACTIVE })
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
            isMatchOrError(uParams && uParams.uploads >= 1, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_api.${tabela}`
        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*, TO_BASE64('${tabela}') tblName, SUBSTRING(SHA(CONCAT(tbl1.id,'${tabela}')),8,6) as hash`))
            .where({ 'tbl1.id': req.params.id, 'tbl1.status': STATUS_ACTIVE }).first()
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
            isMatchOrError(uParams && uParams.uploads >= 4, `${noAccessMsg} "Exclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
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
                if (await removeFileFromServer(rowsUpdated) != true) throw 'Erro ao excluir arquivo do servidor'
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

    const removeFileFromServer = async (rowUpdated) => {
        // Excluir o arquivo do servidor com o endereço contido em rowsUpdated.path
        const fs = require('fs');
        const path = require('path');
        const { promisify } = require('util');
        const unlink = promisify(fs.unlink);
        try {
            // Identificar a existência do arquivo referenciado em rowUpdated.path antes de excluir
            // Receber o caminho do arquivo a ser excluído ou um objeto contendo uma proprieadade path
            const pathTo = rowUpdated.path || rowUpdated
            if (fs.existsSync(pathTo)) {
                await unlink(pathTo);
            }
            return true
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } });
            return false
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
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        // Configurando o multer para lidar com o upload de arquivos
        const destinationPath = path.join(__dirname, uploadsRoot, uParams.schema_description);
        const storage = multer.diskStorage({
            destination: function (req, file, cb) {
                if (!fs.existsSync(destinationPath)) {
                    fs.mkdirSync(destinationPath, { recursive: true });
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
        upload(req, res, async (error) => {
            const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
            // Verifica se tem alçada para upload
            let files = req.files;
            req.user = uParams;
            try {
                isMatchOrError(uParams && uParams.uploads >= 2, `${noAccessMsg} "Upload de arquivos"`)
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
            if (error) {
                console.log(error);
                return res.status(500).send({ message: 'Erro ao enviar arquivos', error });
            }
            files.forEach(async (file) => {
                // Caminho do arquivo original
                const inputPath = path.join(destinationPath, file.filename);
                // Caminho do arquivo redimensionado
                file.filename = `reduced_${file.filename}`;
                const outputPath = path.join(destinationPath, file.filename);
                file.path = outputPath;
                // Atualiza a URL para apontar para a versão redimensionada
                file.url = `${baseFrontendUrl}/assets/files/${uParams.schema_description}/${file.filename}`;
                // Adicione a propriedade file.label contendo o file.originalname sem a extensão
                let nomeArquivo = file.originalname;
                let ultimaPosicaoPonto = nomeArquivo.lastIndexOf(".");
                let nomeSemExtensao = ultimaPosicaoPonto !== -1 ? nomeArquivo.substring(0, ultimaPosicaoPonto) : nomeArquivo;
                file.label = nomeSemExtensao;
                // Da propriedade/valor filename: '?????????-1700489374395.jpg', extraia o valor 1700489374395 e atribua à propriedade file.uid.
                // Esse valor estará sempre após o último traço (-) do nome do arquivo.
                let nomeArquivoUid = file.filename.split('-');
                file.uid = nomeArquivoUid[nomeArquivoUid.length - 1].split('.')[0];

                // Redimensiona a imagem para 250x250
                await resizeImage(inputPath, outputPath, 250, 250);
                // Exclui o arquivo original
                await removeFileFromServer(inputPath)
            });
            req.body = files
            files = await registerFileInDb(req)
            return res.status(200).send({ message: 'Arquivos enviados com sucesso', files: files });
        });
    }

    const registerFileInDb = async (req) => {
        const tabelaDomain = `${dbPrefix}_api.${tabela}`
        let body = req.body
        const nextEventID = await app.db('sis_events').select(app.db.raw('count(*) as count')).first()
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
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
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
                if (await removeFileFromServer(uploadBodyRemove) != true) throw 'Erro ao excluir arquivo do servidor'
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
            console.log(error);
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
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
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
        await sharp(inputPath)
            .resize({
                width: maxWidth,
                height: maxHeight,
                fit: 'inside', // ou 'cover' dependendo do comportamento desejado
                withoutEnlargement: true,
            })
            .toFile(outputPath);
    };

    return { save, get, getById, remove, getByFunction, removeFileFromServer }
}
const { dbPrefix, tempFiles, baseFilesUrl, minio } = require("../.env")
const minioClient = require('../config/minioClient.js');
const { Client } = require('basic-ftp');
const path = require('path');
const sharp = require('sharp');
const multer = require('multer');
const fs = require('fs');
module.exports = app => {
    const { existsOrError, isMatchOrError, noAccessMsg } = require('./validation.js')(app)
    const tabela = 'uploads'
    const tabelaAlias = 'Uploads'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99
    // const clienteFTP = new ftp.Client();
    const { removeAccents } = app.api.facilities

    const save = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
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

        body.filename = removeAccents(body.filename.replaceAll(/ /g, '_'));

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

    const get = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
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
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
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
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
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
            const tabelaDomain = `${dbPrefix}_api.${tabela}`;
            const filesToDelete = await app.db(tabelaDomain).where({ status: STATUS_DELETE });

            for (const file of filesToDelete) {
                const objectKey = `${file.url_path}/${file.uid}_${file.filename}`; // Caminho do arquivo no bucket
                console.log(`Excluindo arquivo ${objectKey}...`);


                try {
                    // Remover o arquivo do MinIO
                    await new Promise((resolve, reject) => {
                        minioClient.removeObject(file.bucket || 'vivazul', objectKey, (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                console.log(`Arquivo ${objectKey} excluído com sucesso do bucket ${file.bucket || 'vivazul'}`);
                                resolve();
                            }
                        });
                    });

                    app.api.logger.logInfo({ log: { line: `Arquivo ${objectKey} excluído com sucesso`, sConsole: true } });
                } catch (error) {
                    app.api.logger.logError({ log: { line: `Erro ao excluir arquivo no MinIO: ${error.message}`, sConsole: true } });
                }

                try {
                    // Atualizar o status do arquivo no banco de dados
                    await app.db(tabelaDomain)
                        .update({ status: 999, updated_at: new Date() })
                        .where({ id: file.id });
                } catch (error) {
                    app.api.logger.logError({ log: { line: `Erro ao atualizar referência do arquivo no banco de dados: ${error.message}`, sConsole: true } });
                }
            }

            if (req.method === 'PUT') return true;
            else return res.status(204).send();
        } catch (error) {
            app.api.logger.logError({ log: { line: `Erro na função removeFileFromServer: ${error.message}`, sConsole: true } });
            return res.status(500).send(error.message);
        }
    };


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

    // Função para hospedar arquivos no MinIO
    const hostFile = async (req, res) => {
        const bucketName = req.query.sd ? req.query.sd.replace(/_/g, '-') : 'vivazul'; // Nome do bucket
        const folder = req.query.folder || undefined; // Subpasta no bucket do cliente

        try {
            // Criar o bucket se ele não existir
            await createBucket(bucketName);

            let destinationPath = path.join(__dirname, tempFiles, folder || '');
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
                if (error) {
                    console.error(`Error in file: ${__filename} (${__function}). Error: ${error}`);
                    return res.status(500).send({ message: 'Erro ao enviar arquivos', error });
                }

                const files = req.files;

                for (const file of files) {
                    file.uid = Math.floor(Date.now());
                    file.extension = file.originalname.split('.').pop();

                    const inputPath = path.join(file.destination, removeAccents(file.originalname.replace(/ /g, '_')));
                    const objectKey = `${folder ? '/' + folder : ''}/${file.uid}_${file.filename}`; // Caminho do arquivo no bucket

                    try {
                        // Enviar o arquivo para o MinIO
                        await new Promise((resolve, reject) => {
                            minioClient.fPutObject(
                                bucketName, // Nome do bucket
                                objectKey, // Caminho do arquivo no bucket
                                inputPath, // Caminho do arquivo local
                                { 'Content-Type': file.mimetype }, // Metadados
                                (err, etag) => {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve(etag);
                                    }
                                }
                            );
                        });

                        // Gerar URL pública (presigned URL)
                        const presignedUrl = await new Promise((resolve, reject) => {
                            minioClient.presignedUrl(
                                'GET', // Método HTTP
                                bucketName, // Nome do bucket
                                objectKey, // Caminho do arquivo no bucket
                                24 * 60 * 60, // Tempo de expiração em segundos (24 horas)
                                (err, url) => {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve(url);
                                    }
                                }
                            );
                        });

                        file.public_url = presignedUrl;
                        const minioFileUrl = presignedUrl.split('/');
                        file.url_destination = `${minioFileUrl[0]}//${minioFileUrl[2]}/${minioFileUrl[3]}`;
                        file.url_path = `${minioFileUrl[4]}`;
                    } catch (minioError) {
                        app.api.logger.logError({ log: { line: `Erro ao enviar arquivo ao MinIO: ${minioError.message}`, sConsole: true } });
                    }

                    try {
                        fs.unlinkSync(inputPath); // Remove o arquivo local após o upload
                    } catch (fsError) {
                        app.api.logger.logError({ log: { line: `Erro ao excluir arquivo temporário: ${fsError.message}`, sConsole: true } });
                    }
                }

                req.body = files;
                const registeredFiles = await registerFileInDb(req);
                return res.status(200).send({ message: 'Arquivo(s) enviado(s) com sucesso', files: registeredFiles });
            });
        } catch (error) {
            app.api.logger.logError({ log: { line: `Erro na função hostFile: ${error.message}`, sConsole: true } });
            return res.status(500).send(error.message);
        }
    };

    // const createBucket = async (bucketName) => {
    const createBucket = async (bucketName) => {
        try {
            const exists = await new Promise((resolve, reject) => {
                minioClient.bucketExists(bucketName, (err, exists) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(exists);
                    }
                });
            });

            if (!exists) {
                await new Promise((resolve, reject) => {
                    minioClient.makeBucket(bucketName, 'us-east-1', (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            console.log(`Bucket '${bucketName}' criado com sucesso`);
                            resolve();
                        }
                    });
                });
            } else {
                console.log(`Bucket '${bucketName}' já existe`);
            }
        } catch (error) {
            console.error(`Erro ao criar/verificar bucket '${bucketName}': ${error.message}`);
            throw error;
        }
    };

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
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
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
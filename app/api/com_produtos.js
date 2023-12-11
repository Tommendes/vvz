const { dbPrefix } = require("../.env")
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const { removeFileFromServer } = app.api.uploads
    const tabela = 'com_produtos'
    const tabelaCadastros = 'cadastros'
    const tabelaAlias = 'Produtos'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99
    const { removeAccents, titleCase } = app.api.facilities

    const save = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        let body = { ...req.body }
        delete body.id;
        if (req.params.id) body.id = req.params.id
        try {
            // Alçada do usuário
            if (body.id) isMatchOrError(uParams && (uParams.at >= 3 || uParams.comercial >= 3), `${noAccessMsg} "Edição de ${tabelaAlias}"`)
            else isMatchOrError(uParams && (uParams.at >= 2 || uParams.comercial >= 2), `${noAccessMsg} "Inclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`

        // Para o caso de exclusão de imagem, dispensar a validação dos campos
        if (!body.delete_imagem)
            try {
                existsOrError(body.nome_comum, 'Nome curto(código) não informado')
                existsOrError(body.descricao, 'Descrição longa não informada')
                existsOrError(body.id_params_unidade, 'Unidade de medida não informada')
                existsOrError(String(body.produto), 'Produto/Serviço não informado')
                if (body.produto == 1) {
                    existsOrError(body.ncm, 'Nomenclatura comum Mercosul não informada')
                    // existsOrError(body.cean, 'cEAN não informado')
                }
                existsOrError(body.id_fornecedor, 'Fornecedor não informado')
            } catch (error) {
                return res.status(400).send(error)
            }
        const delete_imagem = body.delete_imagem
        const url_logo = body.url_logo
        delete body.hash; delete body.tblName; delete body.endereco; delete body.url_logo; delete body.delete_imagem;
        if (body.id) {
            const { createEventUpd } = app.api.sisEvents
            // Variáveis da edição de um registro
            // registrar o evento na tabela de eventos
            const last = await app.db(tabelaDomain).where({ id: body.id }).first()
            if (delete_imagem) {
                const tabelaUploadsDomain = `${dbPrefix}_api.uploads`
                const uploadBodyRemove = await app.db(tabelaUploadsDomain).where({ id: body.id_uploads_imagem }).first()
                const uploadBodyRemoveBefore = { ...uploadBodyRemove }
                if (uploadBodyRemove && uploadBodyRemove.id) {
                    if (await removeFileFromServer(uploadBodyRemove) != true) throw 'Erro ao excluir arquivo do servidor'
                    uploadBodyRemove.status = STATUS_DELETE

                    let evento = await createEventUpd({
                        "notTo": ['created_at', 'updated_at', 'evento'],
                        "last": uploadBodyRemoveBefore,
                        "next": uploadBodyRemove,
                        "request": req,
                        "evento": {
                            "classevento": "Remove",
                            "evento": `Exclusão de imagem de ${tabela}`,
                            "tabela_bd": 'uploads',
                        }
                    })
                    uploadBodyRemove.updated_at = new Date()
                    uploadBodyRemove.evento = evento
                    await app.db(tabelaUploadsDomain)
                        .update(uploadBodyRemove)
                        .where({ id: body.id_uploads_imagem })
                }

                try {
                    if (await removeFileFromServer(uploadBodyRemove) != true) throw 'Erro ao excluir arquivo do servidor'
                    // Remove a referência de upload da tabela
                    body.id_uploads_imagem = null
                } catch (error) {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
                    return res.status(500).send(error)
                }
            }

            evento = await createEventUpd({
                "notTo": ['created_at', 'updated_at', 'evento',],
                "last": last,
                "next": body,
                "request": req,
                "evento": {
                    "evento": `Alteração de cadastro de ${tabela}`,
                    "tabela_bd": tabela,
                }
            })

            body.evento = evento
            body.updated_at = new Date()
            //body = JSON.parse(JSON.stringify(body).toUpperCase())
            // Colocar cada campo em maiúsculo e remover acentos
            Object.keys(body).forEach(function (key) {
                if (typeof body[key] == 'string' && key != 'uf') {
                    body[key] = removeAccents(titleCase(body[key]))
                } else if (typeof body[key] == 'string' && key == 'uf') {
                    body[key] = body[key].toUpperCase()
                }
            });

            let rowsUpdated = app.db(tabelaDomain)
                .update(body)
                .where({ id: body.id })
                .then((ret) => {
                    if (ret > 0) res.status(200).send(body)
                    else res.status(200).send(`${tabelaAlias} não encontrado`)
                })
                .catch(error => {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
                    return res.status(500).send(error)
                })
        } else {

            try {
                const unique = await app.db(tabelaDomain).where({ nome_comum: body.nome_comum, produto: body.produto, descricao: body.descricao, status: STATUS_ACTIVE }).first()
                notExistsOrError(unique, 'Este produto já foi registrado')
            } catch (error) {
                return res.status(400).send(error)
            }
            // Criação de um novo registro
            const nextEventID = await app.db('sis_events').select(app.db.raw('count(*) as count')).first()

            body.evento = nextEventID.count + 1
            // Variáveis da criação de um novo registro
            body.status = STATUS_ACTIVE
            body.created_at = new Date()
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

    const get = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.at >= 1 || uParams.comercial >= 1), `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaCadastrosDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaCadastros}`

        let queryes = undefined
        let query = undefined
        let page = 0
        let rows = 10
        let sortField = app.db.raw('tbl1.nome_comum,tbl1.descricao')
        let sortOrder = 'asc'
        if (req.query) {
            queryes = req.query
            query = ''
            for (const key in queryes) {
                let operator = queryes[key].split(':')[0]
                let value = queryes[key].split(':')[1]
                if (key.split(':')[0] == 'field') {
                    switch (operator) {
                        case 'startsWith': operator = `like '${value}%'`
                            break;
                        case 'contains': operator = `regexp("${value.toString().replace(' ', '.+')}")`
                            break;
                        case 'notContains': operator = `not regexp("${value.toString().replace(' ', '.+')}")`
                            break;
                        case 'endsWith': operator = `like '%${value}'`
                            break;
                        case 'notEquals': operator = `!= '${value}'`
                            break;
                        default: operator = `= '${value}'`
                            break;
                    }
                    let queryField = key.split(':')[1]
                    if (queryField == 'fornecedor') queryField = 'c.nome'
                    query += `${queryField} ${operator} AND `
                } else if (key.split(':')[0] == 'params') {
                    switch (key.split(':')[1]) {
                        case 'page': page = Number(queryes[key]);
                            break;
                        case 'rows': rows = Number(queryes[key]);
                            break;
                    }
                } else if (key.split(':')[0] == 'sort') {
                    sortField = key.split(':')[1].split('=')[0]
                    sortOrder = queryes[key]
                }
            }
            query = query.slice(0, -5).trim()
        }
        let filter = req.query.filter
        if (filter) {
            filter = filter.trim()
        }

        const totalRecords = await app.db({ tbl1: tabelaDomain })
            .countDistinct('tbl1.id as count').first()
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'tbl1.id_fornecedor')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')

        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*,c.nome fornecedor,c.cpf_cnpj,TO_BASE64('${tabela}') tblName,SUBSTRING(SHA(CONCAT(tbl1.id,'${tabela}')),8,6) AS hash`))
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'tbl1.id_fornecedor')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')
            .groupBy('tbl1.id')
            .orderBy(sortField, sortOrder)
            .limit(rows).offset((page + 1) * rows - rows)
            .then(body => {
                return res.json({ data: body, totalRecords: totalRecords.count })
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
            isMatchOrError(uParams && (uParams.at >= 1 || uParams.comercial >= 1), `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaUploadsDomain = `${dbPrefix}_api.uploads`
        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*, u.url url_logo, TO_BASE64('${tabela}') tblName, SUBSTRING(SHA(CONCAT(tbl1.id,'${tabela}')),8,6) as hash`))
            .leftJoin({ u: tabelaUploadsDomain }, function () {
                this.on('tbl1.id_uploads_imagem', '=', 'u.id')
                    .andOn('u.status', '=', STATUS_ACTIVE)
            })
            .where({ 'tbl1.id': req.params.id, 'tbl1.status': STATUS_ACTIVE }).first()
            .then(body => {
                if (!body) return res.status(404).send('Registro não encontrado')
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
            isMatchOrError(uParams && (uParams.at >= 4 || uParams.comercial >= 4), `${noAccessMsg} "Exclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
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
                    "evento": `Exclusão de Endereço de ${tabela}`,
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
            existsOrError(rowsUpdated, 'Registro não foi encontrado')

            res.status(204).send()
        } catch (error) {
            res.status(400).send(error)
        }
    }

    const getByFunction = async (req, res) => {
        const func = req.params.func
        switch (func) {
            case 'gbf':
                getByField(req, res)
                break;
            case 'glf':
                getListByField(req, res)
                break;
            default:
                res.status(404).send('Função inexitente')
                break;
        }
    }

    const getByField = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const fieldName = req.query.fld
        const value = req.query.vl
        const select = req.query.slct

        const first = req.query.first && req.params.first == true
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const ret = app.db(tabelaDomain)

        if (select) {
            // separar os campos e retirar os espaços
            const selectArr = select.split(',').map(s => s.trim())
            ret.select(selectArr)
        }

        ret.where(app.db.raw(`${fieldName} = '${value}'`))
            .where({ status: STATUS_ACTIVE })

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

    const getListByField = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const fieldName = req.query.fld
        const value = req.query.vl
        const select = req.query.slct

        const first = req.query.first && req.params.first == true
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const ret = app.db(tabelaDomain)

        if (select) {
            // separar os campos e retirar os espaços
            const selectArr = select.split(',').map(s => s.trim())
            ret.select(selectArr)
        }

        ret.where(app.db.raw(`${fieldName} regexp("${value.toString().replace(' ', '.+')}")`))
            .where({ status: STATUS_ACTIVE })

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

    return { save, get, getById, remove, getByFunction }
}
const { dbPrefix } = require("../.env")
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const tabela = 'com_produtos'
    const tabelaAlias = 'Produtos'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99
    const { removeAccents, titleCase } = app.api.facilities

    const save = async (req, res) => {
        let user = req.user
        const uParams = await app.db('users').where({ id: user.id }).first();
        let body = { ...req.body }
        if (req.params.id) body.id = req.params.id
        try {
            // Alçada para edição
            if (body.id)
                isMatchOrError(uParams, `${noAccessMsg} "Edição de ${tabela.charAt(0).toUpperCase() + tabela.slice(1).replaceAll('_', ' ')}"`)
            // Alçada para inclusão
            else isMatchOrError(uParams, `${noAccessMsg} "Inclusão de ${tabela.charAt(0).toUpperCase() + tabela.slice(1).replaceAll('_', ' ')}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }
        const tabelaDomain = `${dbPrefix}_${user.cliente}_${user.dominio}.${tabela}`

        try {
            existsOrError(body.nome_comum, 'Nome curto(código) não informado')
            existsOrError(body.descricao, 'Descrição longa não informada')
            existsOrError(body.id_params_unidade, 'Unidade de medida não informada')
            existsOrError(String(body.produto), 'Produto/Serviço não informado')
            if (body.produto == 1) {
                existsOrError(body.ncm, 'Nomenclatura comum Mercosul não informada')
                existsOrError(body.cean, 'Código EAN não informado')
            }
            existsOrError(body.id_fornecedor, 'Fornecedor não informado')
        } catch (error) {
            return res.status(400).send(error)
        }
        delete body.hash; delete body.tblName; delete body.endereco; delete body.url_logo;
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
            rowsUpdated.then((ret) => {
                if (ret > 0) res.status(200).send(body)
                else res.status(200).send('Endereço não encontrado')
            })
                .catch(error => {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
                    return res.status(500).send(error)
                })
        } else {

            try {
                const unique = await app.db(tabelaDomain).where({ nome_comum: body.nome_comum, produto: body.produto, descricao: body.descricao }).first()
                notExistsOrError(unique, 'Este produto já foi registrado')
            } catch (error) {
                console.log(error);
                return res.status(400).send(error)
            }
            // Criação de um novo registro
            const nextEventID = await app.db('sis_events').select(app.db.raw('count(*) as count')).first()

            body.evento = nextEventID.count + 1
            // Variáveis da criação de um novo registro
            body.status = STATUS_ACTIVE
            body.created_at = new Date()

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

        const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
        const tabelaUploadsDomain = `${dbPrefix}_api.uploads`
        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*, u.url url_logo, SUBSTRING(SHA(CONCAT(tbl1.id,'${tabela}')),8,6) as hash`))
            .leftJoin({ u: tabelaUploadsDomain }, function () {
                this.on('tbl1.id_uploads_logo', '=', 'u.id')
                    .andOn('u.status', '=', STATUS_ACTIVE)
            })
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .groupBy('tbl1.id')
        ret.then(body => {
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

        const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
        const tabelaUploadsDomain = `${dbPrefix}_api.uploads`
        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*, u.url url_logo, TO_BASE64('${tabela}') tblName, SUBSTRING(SHA(CONCAT(tbl1.id,'${tabela}')),8,6) as hash`))
            .leftJoin({ u: tabelaUploadsDomain }, function () {
                this.on('tbl1.id_uploads_logo', '=', 'u.id')
                    .andOn('u.status', '=', STATUS_ACTIVE)
            })
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
        const uParams = await app.db('users').where({ id: user.id }).first();
        try {
            // Alçada para exibição
            isMatchOrError((uParams && uParams.admin >= 1), `${noAccessMsg} "Exclusão de Endereço de ${tabela}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }

        const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
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
        const uParams = await app.db('users').where({ id: user.id }).first();
        try {
            // Alçada para exibição
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }

        const fieldName = req.query.fld
        const value = req.query.vl
        const select = req.query.slct

        const first = req.query.first && req.params.first == true
        const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
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
        const uParams = await app.db('users').where({ id: user.id }).first();
        try {
            // Alçada para exibição
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }

        const fieldName = req.query.fld
        const value = req.query.vl
        const select = req.query.slct

        const first = req.query.first && req.params.first == true
        const tabelaDomain = `${dbPrefix}_${uParams.cliente}_${uParams.dominio}.${tabela}`
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
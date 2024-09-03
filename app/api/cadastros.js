const { dbPrefix } = require("../.env")
const moment = require('moment')
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const tabela = 'cadastros'
    const tabelaAlias = 'Cadastros'
    const tabelaLocalParams = 'local_params'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99

    const save = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        let body = { ...req.body }
        delete body.id;
        if (req.params.id) body.id = req.params.id
        try {
            // Alçada do usuário
            if (body.id) isMatchOrError(uParams && uParams.cadastros >= 3, `${noAccessMsg} "Edição de ${tabelaAlias}"`)
            else isMatchOrError(uParams && uParams.cadastros >= 2, `${noAccessMsg} "Inclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`

        try {

            existsOrError(body.cpf_cnpj, 'CNPJ ou CPF não informado')
            if (body.cpf_cnpj && body.cpf_cnpj.length == 11) cpfOrError(body.cpf_cnpj)
            else if (body.cpf_cnpj && body.cpf_cnpj.length == 14) cnpjOrError(body.cpf_cnpj)
            else throw 'Documento (CNPJ ou CPF) inválido. Favor verificar'
            if (body.cpf_cnpj) {
                const unique = await app.db(tabelaDomain)
                    .where({ cpf_cnpj: body.cpf_cnpj, status: STATUS_ACTIVE })
                    .andWhere(app.db.raw(body.id ? (`id != '${body.id}'`) : '1=1'))
                    .first()
                notExistsOrError(unique, `Combinação de CNPJ/ CPF já cadastrado`)
            }

            existsOrError(body.nome, 'Nome não informado')

            existsOrError(body.id_params_tipo, 'Tipo de registro não informado')

            if (!body.prospecto) {
                // Campos exigidos caso não seja prospecto                
                existsOrError(body.aniversario, 'Data de Fundação/Nascimento não informado')
                const dtNascto = moment(body.aniversario);
                if (!dtNascto.isValid()) throw 'Data de Fundação/Nascimento inválida. Favor verificar'
                existsOrError(body.id_params_p_nascto, 'País de origem não informado')
                existsOrError(body.id_params_atuacao, 'Área de atuação não informada')
                existsOrError(body.telefone, 'Telefone não informado')
                existsOrError(body.email, 'E-mail não informado')

                existsOrError(body.id_params_tipo_end, 'Tipo do endereço não informado')
                existsOrError(body.cep, 'CEP não informado')
                if (body.cep.trim().length != 8) throw "CEP é inválido"
                existsOrError(body.nr, 'Número não informado')
                existsOrError(body.logradouro, 'Logradouro não informado')
                existsOrError(body.bairro, 'Bairro não informado')
                existsOrError(body.cidade, 'Cidade não informada')
                existsOrError(body.uf, 'Estado não informado')
            }

        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: Erro ao enviar arquivo: ${error}`, sConsole: true } })
            return res.status(400).send(error)
        }
        delete body.ibge;
        // body.nascimento = moment(body.nascimento).format("DD/MM/YYYY")
        const { changeUpperCase, removeAccentsObj } = app.api.facilities
        body = (JSON.parse(JSON.stringify(body), removeAccentsObj));
        body = (JSON.parse(JSON.stringify(body), changeUpperCase));

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
            rowsUpdated.then((ret) => {
                if (ret > 0) res.status(200).send(body)
                else res.status(200).send('Cadastro não foi encontrado')
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
            isMatchOrError(uParams && uParams.cadastros >= 1, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaLocalParamsDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaLocalParams}`

        let queryes = undefined
        let query = undefined
        let page = 0
        let rows = 10
        let sortField = app.db.raw('tbl1.nome, tbl1.cpf_cnpj')
        let sortOrder = 'asc'
        let sortByAnivFundacao = undefined
        if (req.query) {
            queryes = req.query
            query = ''
            for (const key in queryes) {
                let operator = queryes[key].split(':')[0]
                let value = queryes[key].split(':')[1]
                if (key.split(':')[0] == 'field') {
                    if (['aniversario'].includes(key.split(':')[1])) {
                        query += `EXTRACT(MONTH FROM ${key.split(':')[1]}) = '${value}' AND `
                    } else if (['cadastro'].includes(key.split(':')[1])) {
                        const fields = ['nome', 'cpf_cnpj', 'telefone', 'email']
                        switch (operator) {
                            case 'startsWith': operator = `like '${value}%'`
                                break;
                            case 'contains': operator = `regexp("${value.toString().replaceAll(' ', '.+')}")`
                                break;
                            case 'notContains': operator = `not regexp("${value.toString().replaceAll(' ', '.+')}")`
                                break;
                            case 'endsWith': operator = `like '%${value}'`
                                break;
                            case 'notEquals': operator = `!= '${value}'`
                                break;
                            default: operator = `= '${value}'`
                                break;
                        }
                        query += '('
                        fields.forEach(element => {
                            query += `tbl1.${element} ${operator} or `
                        });
                        query = query.slice(0, -3).trim()
                        query += ') AND '
                    } else {
                        if (['cpf_cnpj'].includes(key.split(':')[1])) value = value.replace(/([^\d])+/gim, "")

                        switch (operator) {
                            case 'startsWith': operator = `like '${value}%'`
                                break;
                            case 'contains': operator = `regexp("${value.toString().replaceAll(' ', '.+')}")`
                                break;
                            case 'notContains': operator = `not regexp("${value.toString().replaceAll(' ', '.+')}")`
                                break;
                            case 'endsWith': operator = `like '%${value}'`
                                break;
                            case 'notEquals': operator = `!= '${value}'`
                                break;
                            default: operator = `= '${value}'`
                                break;
                        }
                        let queryField = key.split(':')[1]
                        if (queryField == 'atuacao') {
                            queryField = 'id_params_atuacao'
                            operator = `= '${value}'`
                        }
                        // else 
                        if (queryField == 'tipo_cadas') queryField = 'lpTp.label'
                        query += `${queryField} ${operator} AND `
                    }
                } else if (key.split(':')[0] == 'params') {
                    switch (key.split(':')[1]) {
                        case 'page': page = Number(queryes[key]);
                            break;
                        case 'rows': rows = Number(queryes[key]);
                            break;
                    }
                } else if (key.split(':')[0] == 'sort') {
                    if (['aniversario'].includes(key.split(':')[1])) {
                        sortField = app.db.raw('extract(day from tbl1.aniversario)')
                        sortByAnivFundacao = app.db.raw('extract(year from tbl1.aniversario)')
                    }
                    else sortField = key.split(':')[1].split('=')[0]
                    sortOrder = queryes[key]
                }
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
            .join({ lp: tabelaLocalParamsDomain }, 'lp.id', '=', 'tbl1.id_params_atuacao')
            .join({ lpTp: tabelaLocalParamsDomain }, 'lpTp.id', '=', 'tbl1.id_params_tipo')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')

        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`lp.label as atuacao, lpTp.label as tipo_cadas, tbl1.id, tbl1.cpf_cnpj, tbl1.nome, tbl1.telefone, tbl1.email, tbl1.aniversario`))
            .join({ lp: tabelaLocalParamsDomain }, 'lp.id', '=', 'tbl1.id_params_atuacao')
            .join({ lpTp: tabelaLocalParamsDomain }, 'lpTp.id', '=', 'tbl1.id_params_tipo')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')
            .groupBy('tbl1.id')
            .orderBy(sortField, sortOrder)
        if (sortByAnivFundacao) ret.orderBy(sortByAnivFundacao, sortOrder)
        ret.limit(rows).offset((page + 1) * rows - rows)
        ret.then(body => {
            return res.json({ data: body, totalRecords: totalRecords.count })
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
            isMatchOrError(uParams && uParams.cadastros >= 1, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
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
            isMatchOrError(uParams && uParams.cadastros >= 4, `${noAccessMsg} "Exclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
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
                    "evento": `Exclusão de ${tabela}`,
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
            case 'gbi':
                getBIData(req, res)
                break;
            default:
                res.status(404).send('Função inexitente')
                break;
        }
    }

    // Busca por campo
    const getByField = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const fieldName = req.query.fld
        const value = req.query.vl
        const select = req.query.slct

        const first = req.query.first && req.query.first == true
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
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        })
    }

    // Lista de registros por campo
    const getListByField = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const fieldName = req.query.fld
        const value = req.query.vl
        const literal = req.query.literal || false
        const select = req.query.slct

        const first = req.query.first && req.query.first == true
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const ret = app.db(tabelaDomain)

        if (select) {
            // separar os campos e retirar os espaços
            const selectArr = select.split(',').map(s => s.trim())
            ret.select(selectArr)
        }

        if (literal) ret.where(app.db.raw(`${fieldName} = "${value.toString()}"`))
        else ret.where(app.db.raw(`${fieldName} regexp("${value.toString().replaceAll(' ', '.+')}")`))

        ret.where({ status: STATUS_ACTIVE })

        if (first) {
            ret.first()
        }
        ret.orderBy('nome', 'asc')
        ret.then(body => {
            const count = body.length
            return res.json({ data: body, count })
        }).catch(error => {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        })
    }

    // Recupera dados para index da plataforma BI
    const getBIData = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        const biPeriodDi = req.query.periodDi
        const biPeriodDf = req.query.periodDf
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        try {
            const ret = app.db(tabelaDomain)
            const total = await ret.count('id as count').where({ status: STATUS_ACTIVE }).first()
            let noPeriodo = { count: 0 }
            if (biPeriodDi && biPeriodDf)
                noPeriodo = await app.db(tabelaDomain).count('id as count').whereRaw(`created_at between "${biPeriodDi}" and "${biPeriodDf}"`).first()
            const novos = await ret.count('id as count')
                .whereRaw(`EXTRACT(YEAR FROM date(created_at)) = EXTRACT(YEAR FROM NOW())`)
                .whereRaw(`EXTRACT(MONTH FROM date(created_at)) = EXTRACT(MONTH FROM NOW())`)
            return res.send({ total: total.count, novos: novos.count, noPeriodo: noPeriodo.count })
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        }
    }

    return { save, get, getById, remove, getByFunction }
}
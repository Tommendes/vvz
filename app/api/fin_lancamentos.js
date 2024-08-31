const { dbPrefix } = require("../.env")
const moment = require('moment')
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const tabela = 'fin_lancamentos'
    const tabelaAlias = 'Registro Financeiro'
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
            if (body.id) isMatchOrError(uParams && uParams.financeiro >= 3, `${noAccessMsg} "Edição de ${tabelaAlias}"`)
            else isMatchOrError(uParams && uParams.financeiro >= 2, `${noAccessMsg} "Inclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`

        delete body.old_id;
        if (body.valor_bruto) body.valor_bruto = body.valor_bruto.replace(".", "").replace(",", ".")
        if (body.valor_liquido) body.valor_liquido = body.valor_liquido.replace(".", "").replace(",", ".")

        try {
            existsOrError(body.id_empresa, 'Empresa destinatária da nota não informada')
            existsOrError(String(body.centro), 'Centro de custo não informado')
            let credorDevedor = 'Devedor'
            if (body.centro === 1) credorDevedor = 'Credor'
            existsOrError(body.id_cadastros, `${credorDevedor} não informado`)
            existsOrError(body.data_emissao, 'Data de emissão não informada')
            // Verificar se a data de emissão é válida
            if (!moment(body.data_emissao, 'YYYY-MM-DD', true).isValid()) throw 'Data de emissão inválida'
            existsOrError(body.valor_bruto, 'Valor bruto não informado')
            existsOrError(body.valor_liquido, 'Valor líquido não informado')
            if (body.valor_bruto) body.valor_bruto = Number(String(body.valor_bruto).replace(",", "."));
            if (body.valor_liquido) body.valor_liquido = Number(String(body.valor_liquido).replace(",", "."));
            body.valor_bruto = body.valor_bruto.toFixed(2)
            body.valor_liquido = body.valor_liquido.toFixed(2)
            const unique = await app.db(tabelaDomain).where({ id_empresa: body.id_empresa, centro: body.centro, id_cadastros: body.id_cadastros, data_emissao: body.data_emissao, valor_bruto: body.valor_bruto, valor_liquido: body.valor_liquido, status: STATUS_ACTIVE }).first()
            if (unique && unique.id != body.id) throw `Já existe um registro ${credorDevedor.toLowerCase()} para esta empresa com esses dados: ${JSON.stringify(unique)}`
        } catch (error) {
            return res.status(400).send(error)
        }

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
                else res.status(200).send(`${tabelaAlias} não encontrado`)
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
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.financeiro >= 1, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaCadastrosDomain = `${dbPrefix}_${uParams.schema_name}.cadastros`
        const tabelaEmpresaDomain = `${dbPrefix}_${uParams.schema_name}.empresa`

        let queryes = undefined
        let query = undefined
        let page = 0
        let rows = 50
        let sortField = app.db.raw('tbl1.data_emissao')
        let sortOrder = 'desc'
        if (req.query) {
            queryes = req.query
            query = ''
            for (const key in queryes) {
                let operator = queryes[key].split(':')[0]
                let value = queryes[key].split(':')[1]
                if (key.split(':')[0] == 'field') {
                    if (['cadastro'].includes(key.split(':')[1])) {
                        const fields = ['nome', 'cpf_cnpj', 'telefone', 'email']
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
                        // Pesquisar por field com nome diferente do campo na tabela e valor literal - operador de igualdade
                        if (queryField == 'atuacao') {
                            queryField = 'id_params_atuacao'
                            operator = `= '${value}'`
                        }
                        // Pesquisar por field com nome diferente do campo na tabela e valor literal - operador vindo do frontend
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
                    sortField = key.split(':')[1].split('=')[0]
                    sortOrder = queryes[key]
                }
            }
            query = query.slice(0, -5).trim()
        }

        let totalRecords = app.db({ tbl1: tabelaDomain })
            .countDistinct('tbl1.id as count').first()
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'tbl1.id_cadastros')
            .join({ e: tabelaEmpresaDomain }, 'e.id', '=', 'tbl1.id_empresa')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')
        // Verificar a permissão de multiCliente do usuário
        if (!uParams.multiCliente || uParams.multiCliente < 1) totalRecords.where({ 'tbl1.id_empresa': uParams.id_empresa })
        totalRecords = await totalRecords

        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`e.id as id_empresa, e.razaosocial as emitente, c.nome as destinatario, c.cpf_cnpj cpf_cnpj_destinatario,  tbl1.*`))
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'tbl1.id_cadastros')
            .join({ e: tabelaEmpresaDomain }, 'e.id', '=', 'tbl1.id_empresa')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')

        // Verificar a permissão de multiCliente do usuário
        if (!uParams.multiCliente || uParams.multiCliente < 1) ret.where({ 'tbl1.id_empresa': uParams.id_empresa })

        ret.groupBy('tbl1.id')
            // .orderBy(app.db.raw(`IF(e.ordem_financeiro AND e.ordem_financeiro > 0, e.ordem_financeiro, ${sortField})`))
            .orderBy(sortField, sortOrder)
        ret.limit(rows).offset((page + 1) * rows - rows)
        console.log(ret.toString());

        ret.then(body => {
            body.forEach(element => {
                element.descricao = convertToHTML(element.descricao)
                element.valor_bruto = parseFloat(element.valor_bruto).toFixed(2).replace('.', ',')
                element.valor_liquido = parseFloat(element.valor_liquido).toFixed(2).replace('.', ',')
            });
            return res.json({ data: body, totalRecords: totalRecords.count })
        })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            })
    }

    function convertToHTML(inputString) {
        if (inputString) {
            // Remove espaços em branco no início e no final, incluindo \n extras
            inputString = inputString.trim();

            // Separa a string por linhas duplas, que indicam um novo parágrafo
            const paragraphs = inputString.split(/\n+/);

            // Mapeia as partes, envolvendo-as em <p> tags
            const htmlString = paragraphs.map(para => `<p>${para.trim()}</p>`).join('');

            return htmlString;
        } else return ''
    }

    const getById = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.financeiro >= 1, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
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
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.financeiro >= 1, `${noAccessMsg} "Exclusão de ${tabelaAlias}"`)
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
            const rowsUpdated = await app.db(tabelaDomain).update(registro).where({ id: req.params.id })
            existsOrError(rowsUpdated, 'Registro não foi encontrado')

            res.status(204).send()
        } catch (error) {
            res.status(400).send(error)
        }
    }

    return {
        save, get, getById, remove
    }
}
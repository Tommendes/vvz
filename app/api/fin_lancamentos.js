const { dbPrefix } = require("../.env")
const moment = require('moment')
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const { SITUACAO_ABERTO, SITUACAO_PAGO, SITUACAO_CONCILIADO, SITUACAO_CANCELADO, SITUACAO_DOADO_PERMUTADO, SITUACAO_PROTESTADO } = require('./fin_parcelas')(app)
    const tabela = 'fin_lancamentos'
    const tabelaAlias = 'Registro Financeiro'
    const tabelaFtp = 'pipeline_ftp'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99
    const STATUS_REGISTRO_ABERTO = 1
    const STATUS_REGISTRO_PAGO = 2
    const STATUS_REGISTRO_CONCILIADO = 3
    const STATUS_REGISTRO_CANCELADO = 99
    const digitsOfAFolder = 6

    const save = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
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
        const tabelaParcelasDomain = `${dbPrefix}_${uParams.schema_name}.fin_parcelas`

        delete body.old_id;
        delete body.nome;
        delete body.cpf_cnpj;
        delete body.valor_liquido;

        if (body.valor_bruto) body.valor_bruto = body.valor_bruto.replace(".", "").replace(",", ".");
        else body.valor_bruto = 0;

        try {
            existsOrError(body.id_empresa, 'Empresa destinatária da nota não informada')
            existsOrError(body.centro, 'Centro de custo não informado')
            let credorDevedor = 'Devedor'
            if (body.centro === 1) credorDevedor = 'Credor'
            existsOrError(body.id_cadastros, `${credorDevedor} não informado`)
            existsOrError(body.data_emissao, 'Data de emissão não informada')
            // Verificar se a data de emissão é válida e converte para en
            if (!moment(body.data_emissao, 'DD/MM/YYYY', true).isValid()) throw 'Data de emissão inválida'
            body.data_emissao = moment(body.data_emissao, 'DD/MM/YYYY').format('YYYY-MM-DD')
            existsOrError(body.valor_bruto, 'Valor bruto não informado')

            const unique = await app.db(tabelaDomain).where({ id_empresa: body.id_empresa, centro: body.centro, id_cadastros: body.id_cadastros, data_emissao: body.data_emissao, valor_bruto: body.valor_bruto, pedido: body.pedido || '', status: STATUS_ACTIVE }).first()
            if (unique && unique.id != body.id) throw `Já existe um registro ${credorDevedor.toLowerCase()} para esta empresa com esses dados: ${JSON.stringify(unique)}`
        } catch (error) {
            console.log(error);
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
            const dataVencimento = body.data_emissao
            const valorVencimento = body.valor_bruto.replace(",", ".")
            app.db(tabelaDomain)
                .insert(body)
                .then(async (ret) => {
                    body.id = ret[0]
                    // registrar o evento na tabela de eventos
                    const { createEventIns } = app.api.sisEvents
                    const nextEventID = await createEventIns({
                        "notTo": ['created_at', 'evento'],
                        "next": body,
                        "request": req,
                        "evento": {
                            "evento": `Novo registro`,
                            "tabela_bd": tabela,
                        }
                    })
                    // Criação de um registro de parcela
                    const parcelaUnica = {
                        created_at: new Date(),
                        status: STATUS_ACTIVE,
                        evento: nextEventID,
                        id_fin_lancamentos: body.id,
                        situacao: SITUACAO_ABERTO,
                        valor_vencimento: valorVencimento,
                        data_vencimento: dataVencimento,
                        parcela: 'U'
                    }

                    const newPaymentPlan = await app.db(tabelaParcelasDomain).insert(parcelaUnica)

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
            isMatchOrError(uParams && uParams.financeiro >= 1, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaCadastrosDomain = `${dbPrefix}_${uParams.schema_name}.cadastros`
        const tabelaEmpresaDomain = `${dbPrefix}_${uParams.schema_name}.empresa`
        const tabelaParcelasDomain = `${dbPrefix}_${uParams.schema_name}.fin_parcelas`
        const tabelaRetencoesDomain = `${dbPrefix}_${uParams.schema_name}.fin_retencoes`

        let queryes = undefined
        let query = undefined
        let page = 0
        let rows = 50
        let sortField = app.db.raw('tbl1.data_vencimento')
        let sortOrder = 'desc'
        const ret = app.db({ tbl1: tabelaParcelasDomain })
        if (req.query) {
            queryes = req.query
            query = ''
            for (const key in queryes) {
                let operator = queryes[key].split(':')[0]
                let value = queryes[key].split(':')[1]

                if (key.split(':')[0] == 'field') {
                    let queryField = key.split(':')[1]
                    if (['destinatario_agrupado'].includes(key.split(':')[1])) {
                        const cpfCnpj = value.replace(/([^\d])+/gim, "")
                        const nome = value
                        query += '('
                        switch (operator) {
                            case 'startsWith': operator = `like '${value}%'`
                                break;
                            case 'contains': operator = `regexp("${value.toString().trim().replaceAll(' ', '.+')}")`
                                break;
                            case 'notContains': operator = `not regexp("${value.toString().trim().replaceAll(' ', '.+')}")`
                                break;
                            case 'endsWith': operator = `like '%${value}'`
                                break;
                            case 'notEquals': operator = `!= '${value}'`
                                break;
                            default: operator = `= '${value}'`
                                break;
                        }
                        if (cpfCnpj)
                            query += `c.nome ${operator} or c.cpf_cnpj like '%${cpfCnpj}%') AND `
                        else
                            query += `c.nome ${operator}) AND `
                    } else if (['descricao_agrupada'].includes(key.split(':')[1])) {
                        const fields = ['tbl1.duplicata', 'tbl1.documento', 'fl.pedido', 'tbl1.descricao', 'fl.descricao']//, 'telefone', 'email'
                        switch (operator) {
                            case 'startsWith': operator = `like '${value}%'`
                                break;
                            case 'contains': operator = `regexp("${value.toString().trim().replaceAll(' ', '.+')}")`
                                break;
                            case 'notContains': operator = `not regexp("${value.toString().trim().replaceAll(' ', '.+')}")`
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
                            query += `${element} ${operator} or `
                        });
                        query = query.slice(0, -3).trim()
                        query += ') AND '
                    } else if (['data_vencimento', 'data_pagto'].includes(queryField)) {
                        sortField = queryField
                        operator = queryes[key].split(':')[0]
                        let values = queryes[key].split(':')[1].split(',')
                        let valueI = moment(values[0]).format('YYYY-MM-DD');
                        let valueF = moment(values[1]).format('YYYY-MM-DD');
                        if (!moment(valueF, 'YYYY-MM-DD', true).isValid()) {
                            valueF = moment(valueI).add(1, 'day').format('YYYY-MM-DD');
                        }
                        switch (operator) {
                            case 'dateIsNot': operator = `not between "${valueI}" and "${valueF}"`
                                break;
                            case 'dateBefore': operator = `< "${valueI}"`
                                break;
                            case 'dateAfter': operator = `> "${valueF}"`
                                break;
                            default: operator = `between "${valueI}" and "${valueF}"`
                                break;
                        }
                        query += `date(tbl1.${sortField}) ${operator} AND `
                    } else {
                        if (['cpf_cnpj_destinatario'].includes(queryField)) value = value.replace(/([^\d])+/gim, "")
                        else if (['valor_bruto_conta', 'valor_liquido_conta', 'valor_vencimento_parcela'].includes(queryField)) value = value.replace(".", "").replace(",", ".")


                        switch (operator) {
                            case 'startsWith': operator = `like '${value}%'`
                                break;
                            // Substituir todos espaços por .+
                            case 'contains': operator = `regexp("${value.toString().trim().replaceAll(' ', '.+')}")`
                                break;
                            case 'notContains': operator = `not regexp("${value.toString().trim().replaceAll(' ', '.+')}")`
                                break;
                            case 'endsWith': operator = `like '%${value}'`
                                break;
                            case 'notEquals': operator = `!= '${value}'`
                                break;
                            default: operator = `= '${value}'`
                                break;
                        }
                        // Pesquisar por field com nome diferente do campo na tabela e valor literal - operador vindo do frontend
                        if (queryField == 'valor_bruto_conta') queryField = 'fl.valor_bruto'
                        if (queryField == 'emp_fantasia') queryField = 'e.fantasia'
                        else if (queryField == 'valor_vencimento_parcela') queryField = 'tbl1.valor_vencimento'
                        else if (queryField == 'valor_liquido_conta') queryField = `(SELECT fl.valor_bruto - COALESCE(SUM(r.valor_retencao), 0) FROM ${tabelaRetencoesDomain} r WHERE r.id_fin_lancamentos = fl.id)`
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
                    if (sortField == 'destinatario_agrupado') sortField = 'c.nome'
                    if (sortField == 'descricao_agrupada') sortField = 'tbl1.descricao'
                    sortOrder = queryes[key]
                }
            }
            query = query.slice(0, -5).trim()
        }

        let totalRecords = ret.clone()
            .countDistinct('tbl1.id as count')
            .sum('tbl1.valor_vencimento as sum')
            .select(app.db.raw(`(select fl.valor_bruto - coalesce(sum(r.valor_retencao), 0) from ${tabelaRetencoesDomain} r where r.id_fin_lancamentos = fl.id) AS valor_liquido_conta`))
            .first()
            .join({ fl: tabelaDomain }, 'fl.id', '=', 'tbl1.id_fin_lancamentos')
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'fl.id_cadastros')
            .join({ e: tabelaEmpresaDomain }, 'e.id', '=', 'fl.id_empresa')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')
            // .groupBy('tbl1.id')

        // Verificar a permissão de multiCliente do usuário
        if (!uParams.multiCliente || uParams.multiCliente < 1) totalRecords.where({ 'fl.id_empresa': uParams.id_empresa })

        try {
            totalRecords = await totalRecords
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error Query totalRecords = await totalRecords: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
        }

        ret.select(app.db.raw(`fl.id, tbl1.id AS id_parcela, fl.centro, fl.data_emissao, tbl1.data_vencimento, tbl1.data_pagto, tbl1.situacao, fl.valor_bruto AS valor_bruto_conta`))
            .select(app.db.raw(`(select fl.valor_bruto - coalesce(sum(r.valor_retencao), 0) from ${tabelaRetencoesDomain} r where r.id_fin_lancamentos = fl.id) AS valor_liquido_conta`))
            .select(app.db.raw(`tbl1.parcela, tbl1.valor_vencimento AS valor_vencimento_parcela, tbl1.duplicata, tbl1.documento`))
            .select(app.db.raw(`fl.pedido, tbl1.descricao AS descricao_parcela, fl.descricao AS descricao_conta, fl.id_empresa, e.razaosocial AS empresa, e.fantasia AS emp_fantasia`))
            .select(app.db.raw(`e.cpf_cnpj_empresa, c.nome AS destinatario, c.cpf_cnpj cpf_cnpj_destinatario`))
            .join({ fl: tabelaDomain }, 'fl.id', '=', 'tbl1.id_fin_lancamentos')
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'fl.id_cadastros')
            .join({ e: tabelaEmpresaDomain }, 'e.id', '=', 'fl.id_empresa')
            .whereNot({ 'tbl1.status': STATUS_DELETE })
            .andWhereNot({ 'fl.status': STATUS_DELETE })
            .whereRaw(query ? query : '1=1')

        // Verificar a permissão de multiCliente do usuário
        if (!uParams.multiCliente || uParams.multiCliente < 1) ret.where({ 'fl.id_empresa': uParams.id_empresa })

        ret.groupBy('tbl1.id').orderBy(sortField, sortOrder)
            .limit(rows).offset((page + 1) * rows - rows)

        ret.then(async (body) => {
            const length = body.length
            for (const element of body) {
                element.descricao_parcela = convertToHTML(element.descricao_parcela)
                element.descricao_conta = convertToHTML(element.descricao_conta)
                element.valor_bruto = element.valor_bruto_conta
                element.valor_liquido = element.valor_liquido_conta
                element.valor_vencimento = element.valor_vencimento_parcela
                element.valor_bruto_conta = parseFloat(element.valor_bruto_conta).toFixed(2).replace('.', ',')
                element.valor_liquido_conta = parseFloat(element.valor_liquido_conta).toFixed(2).replace('.', ',')
                element.valor_vencimento_parcela = parseFloat(element.valor_vencimento_parcela).toFixed(2).replace('.', ',')
                switch (element.situacao) {
                    case SITUACAO_ABERTO: element.situacaoLabel = '<h4>Registro em Aberto</h4>'; break;
                    case SITUACAO_PAGO: element.situacaoLabel = '<h4>Registro Pago</h4>'; break;
                    case SITUACAO_CONCILIADO: element.situacaoLabel = '<h4>Registro Conciliado</h4>'; break;
                    case SITUACAO_CANCELADO: element.situacaoLabel = '<h4>Registro Cancelado</h4>'; break;
                    case SITUACAO_DOADO_PERMUTADO: element.situacaoLabel = '<h4>Registro Doado/Permutado</h4>'; break;
                    case SITUACAO_PROTESTADO: element.situacaoLabel = '<h4>Registro em Protesto</h4>'; break;
                    case SITUACAO_CANCELADO: element.situacaoLabel = '<h4>Registro Cancelado</h4>'; break;
                    default: element.situacaoLabel = '<h4>Situação não identificada</h4>';
                        break;
                }
            }

            const total = totalRecords && totalRecords.count ? totalRecords.count : 0
            const sum = totalRecords && totalRecords.sum ? totalRecords.sum : 0
            return res.json({ data: body, totalRecords: total, sumRecords: sum })
        })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error Query totalRecords = await totalRecords: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
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
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.financeiro >= 1, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaCadastrosDomain = `${dbPrefix}_${uParams.schema_name}.cadastros`
        const ret = app.db({ tbl1: tabelaDomain })
            .join({ c: tabelaCadastrosDomain }, 'c.id', '=', 'tbl1.id_cadastros')
            .select(app.db.raw(`tbl1.*, c.nome, c.cpf_cnpj`))
            .whereNot({ 'tbl1.status': STATUS_DELETE })
            .where({ 'tbl1.id': req.params.id }).first()
        ret.then(body => {
            if (!body) return res.status(404).send('Registro não encontrado')
            body.valor_bruto = parseFloat(body.valor_bruto).toFixed(2).replace('.', ',')
            body.valor_liquido = parseFloat(body.valor_liquido).toFixed(2).replace('.', ',')
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

    const getByFunction = async (req, res) => {
        const func = req.params.func
        switch (func) {
            default:
                res.status(404).send('Função inexitente')
                break;
        }
    }

    return { save, get, getById, remove, getByFunction }
}
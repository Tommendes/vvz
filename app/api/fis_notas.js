// TODO: Criar a API de notas fiscais contendo os métodos de CRUD. Fazer validações de campos obrigatórios e tipos de dados. Em save, verificar se body.id existe e fazer update, caso contrário, fazer insert. Antes de excluir, verificar em fin_lancamentos se existe lançamento para a nota fiscal e não permitir caso exista.
const path = require('path');
const ftp = require('basic-ftp');
const { Client } = require("basic-ftp")
const { dbPrefix } = require("../.env")
const moment = require('moment')
const FOLDER_ROOT = 'Documentos_Fiscais'
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const { STATUS_ABERTO, STATUS_LIQUIDADO, STATUS_ENCERRADO, STATUS_FATURADO, STATUS_CONFIRMADO } = require('./comis_status.js')(app)
    // const { STATUS_COMISSIONADO } = require('./pipeline_status.js')(app)
    const tabela = 'fis_notas'
    const tabelaFinLancamentos = 'fin_lancamentos'
    const tabelaFtp = 'pipeline_ftp'
    const tabelaAlias = 'Nota Fiscal'
    const tabelaAliasPl = 'Notas Fiscais'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99

    const save = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        let body = { ...req.body }
        delete body.id
        body.id = req.params.id || undefined
        try {
            // Alçada do usuário
            if (body.id) isMatchOrError(uParams && uParams.fiscal >= 3, `${noAccessMsg} "Edição de ${tabelaAlias}"`)
            else isMatchOrError(uParams && uParams.fiscal >= 2, `${noAccessMsg} "Inclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`

        // TODO: alterar entre , e . nos campos a seguir: valor_total, valor_desconto, valor_liquido, valor_icms, valor_ipi, valor_pis, valor_cofins, valor_iss, valor_ir, valor_csll, valor_inss, valor_outros, valor_servicos, valor_produtos, valor_frete, valor_seguro, valor_despesas
        if (body.valor_total) body.valor_total = body.valor_total.replace(",", ".");
        if (body.valor_desconto) body.valor_desconto = body.valor_desconto.replace(",", ".");
        if (body.valor_liquido) body.valor_liquido = body.valor_liquido.replace(",", ".");
        if (body.valor_icms) body.valor_icms = body.valor_icms.replace(",", ".");
        if (body.valor_ipi) body.valor_ipi = body.valor_ipi.replace(",", ".");
        if (body.valor_pis) body.valor_pis = body.valor_pis.replace(",", ".");
        if (body.valor_cofins) body.valor_cofins = body.valor_cofins.replace(",", ".");
        if (body.valor_iss) body.valor_iss = body.valor_iss.replace(",", ".");
        if (body.valor_ir) body.valor_ir = body.valor_ir.replace(",", ".");
        if (body.valor_csll) body.valor_csll = body.valor_csll.replace(",", ".");
        if (body.valor_inss) body.valor_inss = body.valor_inss.replace(",", ".");
        if (body.valor_outros) body.valor_outros = body.valor_outros.replace(",", ".");
        if (body.valor_servicos) body.valor_servicos = body.valor_servicos.replace(",", ".");
        if (body.valor_produtos) body.valor_produtos = body.valor_produtos.replace(",", ".");
        if (body.valor_frete) body.valor_frete = body.valor_frete.replace(",", ".");
        if (body.valor_seguro) body.valor_seguro = body.valor_seguro.replace(",", ".");
        if (body.valor_despesas) body.valor_despesas = body.valor_despesas.replace(",", ".");

        try {
            existsOrError(body.numero, 'Número da nota não informado')
            existsOrError(body.serie, 'Série da nota não informada')
            existsOrError(body.id_empresa, 'Empresa destinatária da nota não informada')
            const empresa = await app.db(`${dbPrefix}_${uParams.schema_name}.empresa`).where({ id: body.id_empresa }).first()
            existsOrError(empresa, 'Empresa não encontrada')
            existsOrError(body.id_fornecedor, 'Fornecedor não informado')
            const fornecedor = await app.db(`${dbPrefix}_${uParams.schema_name}.cadastros`).where({ id: body.id_fornecedor }).first()
            existsOrError(fornecedor, 'Fornecedor não encontrado')
            existsOrError(body.valor_total, 'Valor total da nota não informado')
            body.valor_total = Number(body.valor_total).toFixed(2)
            existsOrError(body.data_emissao, 'Data de emissão da nota não informada')
            // TODO: Validar se a data de emissão é uma data válida em EN
            if (!moment(body.data_emissao, 'YYYY-MM-DD', true).isValid()) throw 'Data de emissão inválida'
            // TODO: Validar se a data de emissão é menor ou igual a data atual
            if (moment(body.data_emissao).isAfter(new Date())) throw 'Data de emissão não pode ser maior que a data atual'
            existsOrError(String(body.mov_e_s), 'Movimento de entrada/saída não informado')
            const uniqueNFFornecedor = await app.db(tabelaDomain).where({ mov_e_s: body.mov_e_s, numero: body.numero, serie: body.serie, id_fornecedor: body.id_fornecedor, status: STATUS_ACTIVE }).first()
            if (uniqueNFFornecedor && uniqueNFFornecedor.id != body.id) throw 'Já existe uma nota fiscal com o mesmo número e série para o fornecedor'
            const uniqueNFChave = await app.db(tabelaDomain).where({ chave: body.chave, status: STATUS_ACTIVE }).first()
            if (uniqueNFChave && uniqueNFChave.id != body.id) throw 'Já existe uma nota fiscal com a mesma chave informada'
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            return res.status(400).send(error)
        }

        delete body.fornecedor;
        delete body.cpf_cnpj_fornecedor;
        delete body.empresa;
        delete body.cpf_cnpj_empresa;

        let last = {}
        if (body.id) last = await app.db(tabelaDomain).where({ id: body.id, status: STATUS_ACTIVE }).first()

        if (body.id) {
            try {
                existsOrError(last, `${tabelaAlias} ${body.numero} série ${body.serie} não localizada`)
            } catch (error) {
                return res.status(400).send(error)
            }

            const { createEventUpd } = app.api.sisEvents
            const evento = await createEventUpd({
                "notTo": ['created_at', 'updated_at', 'evento',],
                "last": last,
                "next": body,
                "request": req,
                "evento": {
                    "evento": `Alteração de registro de ${tabela}`,
                    "tabela_bd": tabela,
                }
            })
            app.db.transaction(async (trx) => {
                body.evento = evento
                body.updated_at = new Date()
                await trx(tabelaDomain)
                    .update(body)
                    .where({ id: body.id })
                    .then(async (ret) => {
                        if (ret > 0) {
                            return res.status(200).send(body)
                        }
                        else res.status(200).send(`${tabelaAlias} não encontrada`)
                    })
                    .catch(error => {
                        app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                        return res.status(500).send(error)
                    })
            })
        } else {
            app.db.transaction(async (trx) => {
                // Criação de um novo registro
                const nextEventID = await trx(`${dbPrefix}_api.sis_events`).select(app.db.raw('max(id) as count')).first()
                body.evento = nextEventID.count + 1
                // Variáveis da criação de um novo registro
                body.status = STATUS_ACTIVE
                body.created_at = new Date()

                await trx(tabelaDomain)
                    .insert(body)
                    .then(async (ret) => {
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
            })
        }
    }

    const get = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.fiscal >= 1, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaDomainCadastros = `${dbPrefix}_${uParams.schema_name}.cadastros`
        const tabelaDomainEmpresa = `${dbPrefix}_${uParams.schema_name}.empresa`

        let queryes = undefined
        let query = undefined
        let page = 0
        let rows = 10
        let sortField = app.db.raw('tbl1.data_emissao')
        let sortOrder = 'desc'
        const ret = app.db({ tbl1: tabelaDomain })
        if (req.query) {
            queryes = req.query
            query = ''
            for (const key in queryes) {
                let operator = queryes[key].split(':')[0]
                let value = queryes[key].split(':')[1]
                if (key.split(':')[0] == 'field') {
                    let queryField = key.split(':')[1]
                    if (['data_emissao'].includes(queryField)) {
                        const fields = [queryField]
                        value = typeof queryes[key] === 'object' ? queryes[key][0].split(':')[1].split(',') : queryes[key].split(':')[1].split(',')
                        let valueI = moment(value[0]);
                        let valueF = moment(value[1]);

                        if (valueI.isValid()) valueI = valueI.format('YYYY-MM-DD')
                        if (valueF.isValid()) valueF = valueF.format('YYYY-MM-DD')
                        else valueF = valueI

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
                        query += `${queryField} ${operator} AND `
                    }
                    else if (['empresa', 'fornecedor'].includes(queryField)) {
                        const fields = [queryField]
                        if ([`cpf_cnpj_${queryField}`].includes(key.split(':')[1])) value = value.replace(/([^\d])+/gim, "")
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
                            if (['empresa', 'fornecedor'].includes(element)) element = 'id_' + element
                            query += `tbl1.${element} ${operator} or `
                        });
                        query = query.slice(0, -3).trim()
                        query += ') AND '
                    } else {
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

        let totalRecords = await app.db({ tbl1: tabelaDomain })
            .countDistinct('tbl1.id as count')
            .first()
            .join({ tbl2: tabelaDomainCadastros }, 'tbl2.id', 'tbl1.id_fornecedor')
            .join({ tbl3: tabelaDomainEmpresa }, 'tbl3.id', 'tbl1.id_empresa')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')
            .groupBy('tbl1.id')

        ret.select(app.db.raw(`tbl1.*`), 'tbl2.nome as fornecedor', 'tbl2.cpf_cnpj as cpf_cnpj_fornecedor', 'tbl3.razaosocial as empresa', 'tbl3.cpf_cnpj_empresa')
            .join({ tbl2: tabelaDomainCadastros }, 'tbl2.id', 'tbl1.id_fornecedor')
            .join({ tbl3: tabelaDomainEmpresa }, 'tbl3.id', 'tbl1.id_empresa')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .whereRaw(query ? query : '1=1')
            .orderBy(app.db.raw(sortField), sortOrder)
            .orderBy('tbl1.id', 'desc') // além de ordenar por data, ordena por id para evitar que registros com a mesma data sejam exibidos em ordem aleatória
            .limit(rows).offset((page + 1) * rows - rows)

        ret.then(body => {
            const length = body.length
            return res.json({ data: body, totalRecords: totalRecords.count || length })
        })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                return res.status(401).send(error)
            })
    }

    const getById = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.fiscal >= 1, `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaDomainCadastros = `${dbPrefix}_${uParams.schema_name}.cadastros`
        const tabelaDomainEmpresa = `${dbPrefix}_${uParams.schema_name}.empresa`
        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*`), 'tbl2.nome as fornecedor', 'tbl2.cpf_cnpj as cpf_cnpj_fornecedor', 'tbl3.razaosocial as empresa', 'tbl3.cpf_cnpj_empresa')
            .join({ tbl2: tabelaDomainCadastros }, 'tbl2.id', 'tbl1.id_fornecedor')
            .join({ tbl3: tabelaDomainEmpresa }, 'tbl3.id', 'tbl1.id_empresa')
            .where({ 'tbl1.id': req.params.id, 'tbl1.status': STATUS_ACTIVE }).first()
            .then(async (body) => {
                if (!body) return res.status(404).send('Registro não encontrado')
                body.valor_total = parseFloat(body.valor_total).toFixed(2).replace('.', ',')
                body.valor_desconto = parseFloat(body.valor_desconto).toFixed(2).replace('.', ',')
                body.valor_liquido = parseFloat(body.valor_liquido).toFixed(2).replace('.', ',')
                body.valor_icms = parseFloat(body.valor_icms).toFixed(2).replace('.', ',')
                body.valor_ipi = parseFloat(body.valor_ipi).toFixed(2).replace('.', ',')
                body.valor_pis = parseFloat(body.valor_pis).toFixed(2).replace('.', ',')
                body.valor_cofins = parseFloat(body.valor_cofins).toFixed(2).replace('.', ',')
                body.valor_iss = parseFloat(body.valor_iss).toFixed(2).replace('.', ',')
                body.valor_ir = parseFloat(body.valor_ir).toFixed(2).replace('.', ',')
                body.valor_csll = parseFloat(body.valor_csll).toFixed(2).replace('.', ',')
                body.valor_inss = parseFloat(body.valor_inss).toFixed(2).replace('.', ',')
                body.valor_outros = parseFloat(body.valor_outros).toFixed(2).replace('.', ',')
                body.valor_servicos = parseFloat(body.valor_servicos).toFixed(2).replace('.', ',')
                body.valor_produtos = parseFloat(body.valor_produtos).toFixed(2).replace('.', ',')
                body.valor_frete = parseFloat(body.valor_frete).toFixed(2).replace('.', ',')
                body.valor_seguro = parseFloat(body.valor_seguro).toFixed(2).replace('.', ',')
                body.valor_despesas = parseFloat(body.valor_despesas).toFixed(2).replace('.', ',')
                // body.data_emissao = moment(body.data_emissao).format('DD/MM/YYYY')
                body.fornecedor = `${body.fornecedor} - ${body.cpf_cnpj_fornecedor}`
                body.empresa = `${body.empresa} - ${body.cpf_cnpj_empresa}`
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
            isMatchOrError(uParams && uParams.fiscal >= 4, `${noAccessMsg} "Exclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaFinLancamentosDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaFinLancamentos}`
        // Verificar se existe lançamento financeiro para a nota fiscal
        let last = {}
        try {
            const lancamento = await app.db(tabelaFinLancamentosDomain).where({ id_notas: req.params.id, status: STATUS_ACTIVE }).first()
            last = await app.db(tabelaDomain).where({ id: req.params.id }).first()
            notExistsOrError(lancamento, `Não é possível excluir. Existe lançamento financeiro para a nota fiscal ${last.numero}`)
        } catch (error) {
            return res.status(400).send(error)
        }
        const registro = { status: STATUS_DELETE }
        try {
            // registrar o evento na tabela de eventos
            req.uParams = uParams
            req.body = last
            const { createEventUpd } = app.api.sisEvents
            const evento = await createEventUpd({
                "notTo": ['created_at', 'updated_at', 'evento'],
                "last": last,
                "next": registro,
                "request": req,
                "evento": {
                    "classevento": "Remove",
                    "evento": `Exclusão de registro de ${tabela}`,
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
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            res.status(400).send(error)
        }
    }

    // Retorna uma lista contendo os dados [id, nome e cpf_cnpj] de todos os fornecedores na tabela cadastros que possuem correspondência na tabela fis_notas
    const getFornecedores = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.fiscal >= 1, `${noAccessMsg} "Exibição de ${tabelaAliasPl}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaDomainCadastros = `${dbPrefix}_${uParams.schema_name}.cadastros`
        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`distinct tbl1.id_fornecedor as id, tbl2.nome, tbl2.cpf_cnpj`))
            .join({ tbl2: tabelaDomainCadastros }, 'tbl2.id', 'tbl1.id_fornecedor')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .orderBy('tbl2.nome', 'asc')

        ret.then(body => {
            return res.json(body)
        })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                return res.status(401).send(error)
            })
    }

    // Cria pasta no servidor ftp
    const mkFolder = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.pipeline >= 2, `${noAccessMsg} "Inclusão de pastas de documentos"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const body = { ...req.body }
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaFornecedorDomain = `${dbPrefix}_${uParams.schema_name}.cadastros`
        const tabelaEmpresaDomain = `${dbPrefix}_${uParams.schema_name}.empresa`
        let registro = undefined
        try {
            if (!body.id_fis_notas) throw 'Documento não informado. Por favor recarregue a página...'
            registro = await app.db({ pp: tabelaDomain })
            .join({ c: tabelaFornecedorDomain }, 'c.id', 'pp.id_fornecedor')
            .join({ e: tabelaEmpresaDomain }, 'e.id', 'pp.id_empresa')
                .select('pp.id', 'pp.numero', 'pp.serie', 'c.nome as fornecedor', 'c.cpf_cnpj as cpf_cnpj_fornecedor', 'e.razaosocial as empresa', 'e.fantasia', 'e.cpf_cnpj_empresa')
                .where({ 'pp.id': body.id_fis_notas }).first()
            if (!registro.id) throw 'Registro não encontrado'
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            return res.status(200).send(error)
        }

        if (!body.path) body.path = `${registro.fantasia.replace(/ /g, '_') || registro.cpf_cnpj_empresa.replace(/\D+/g, '')}/${registro.fornecedor.replace(/ /g, '_')}/${registro.numero}${registro.serie ? `-${registro.serie}` : ''}`;
        const pathDoc = path.join(FOLDER_ROOT, body.path);

        const client = new ftp.Client();

        const tabelaFtpDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaFtp}`
        const ftpParamsArray = await app.db({ ftp: tabelaFtpDomain }).select('host', 'port', 'user', 'pass', 'ssl')
        ftpParamsArray.forEach(ftpParam => {
            ftpParam.path = pathDoc;
        });
        let clientFtp = undefined;
        try {
            existsOrError(ftpParamsArray, 'Dados de conexão com o servidor de arquivos não informados');
            let connectionResult = await connectToFTP(ftpParamsArray, uParams);
            if (!connectionResult.success) {
                throw new Error('Não foi possível conectar ao servidor de arquivos neste momento');
            }
            clientFtp = connectionResult.client;
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            return res.status(400).send(error.message);
        }
        try {
            await clientFtp.ensureDir(pathDoc);
            app.api.logger.logInfo({ log: { line: `Folder created: ${pathDoc}`, sConsole: true } })
            // Registrar o evento na tabela de eventos
            const { createEvent } = app.api.sisEvents
            evento = await createEvent({
                "request": req,
                "evento": {
                    id_user: user.id,
                    evento: `Criação de pasta no servidor ftp`,
                    classevento: `mkFolder`,
                    id_registro: body.id,
                    tabela_bd: 'fis_notas',
                }
            })
            if (['POST', 'PUT'].includes(req.method)) return res.send(`Pasta criada com sucesso no caminho: ${body.path}`);
            else return true;
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            if (error.code == 'EHOSTUNREACH') return res.status(500).send(`Servidor de arquivos temporariamente indisponível. Tente novamente ou tente mais tarde`);
            else return res.status(500).send(error)
        } finally {
            client.close();
        }
    }

    // Lista arquivos da pasta no servidor ftp
    const lstFolder = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.pipeline >= 1, `${noAccessMsg} "Listagem de pastas de documentos"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        let body = { ...req.body }

        try {
            if (!body.id_fis_notas) throw 'Documento a ser listado não informado. Por favor recarregue a página...'
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            return res.status(200).send(error)
        }
        
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaFornecedorDomain = `${dbPrefix}_${uParams.schema_name}.cadastros`
        const tabelaEmpresaDomain = `${dbPrefix}_${uParams.schema_name}.empresa`
        const tabelaFtpDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaFtp}`

        let registro = undefined
        try {
            if (!body.id_fis_notas) throw 'Documento não informado. Por favor recarregue a página...'
            registro = await app.db({ pp: tabelaDomain })
            .join({ c: tabelaFornecedorDomain }, 'c.id', 'pp.id_fornecedor')
            .join({ e: tabelaEmpresaDomain }, 'e.id', 'pp.id_empresa')
                .select('pp.id', 'pp.numero', 'pp.serie', 'c.nome as fornecedor', 'c.cpf_cnpj as cpf_cnpj_fornecedor', 'e.razaosocial as empresa', 'e.fantasia', 'e.cpf_cnpj_empresa')
                .where({ 'pp.id': body.id_fis_notas }).first()
            if (!registro.id) throw 'Registro não encontrado'
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            return res.status(200).send(error)
        }

        const pathDoc = path.join(FOLDER_ROOT, registro.fantasia.replace(/ /g, '_') || registro.cpf_cnpj_empresa.replace(/\D+/g, ''), registro.fornecedor.replace(/ /g, '_'), `${registro.numero}${registro.serie ? `-${registro.serie}` : ''}`);
        const ftpParamsArray = await app.db({ ftp: tabelaFtpDomain }).select('host', 'port', 'user', 'pass', 'ssl')

        ftpParamsArray.forEach(ftpParam => {
            ftpParam.path = pathDoc;
        });
        let clientFtp = undefined;
        try {
            existsOrError(ftpParamsArray, 'Dados de conexão com o servidor de arquivos não informados');

            let connectionResult = await connectToFTP(ftpParamsArray, uParams);

            if (!connectionResult.success) {
                throw new Error('Não foi possível conectar ao servidor de arquivos neste momento');
            }

            clientFtp = connectionResult.client;
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            return res.status(400).send(error.message);
        }

        try {
            const list = await clientFtp.list('/' + pathDoc);
            
            if (!list) return res.status(200).send(`Pasta de arquivos não encontrado. Você pode criar uma clicando no botão "Criar pasta"`);
            else return res.send(list);
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${uParams.name}. Path: ${pathDoc}. Error: ${error}`, sConsole: true } })
            if (error.code == 'EHOSTUNREACH') return res.status(200).send(`Servidor de arquivos temporariamente indisponível`);
            else if (error.code == 550) return res.status(200).send(`Pasta de arquivos não encontrado. Você pode criar uma clicando no botão "Criar pasta"`);
            else return res.status(200).send(error)
        } finally {
            clientFtp.close();
        }
    }

    const connectToFTP = async (ftpParamsArray, uParams) => {
        let allErrors = [];
        for (let i = 0; i < ftpParamsArray.length; i++) {
            const ftpParam = ftpParamsArray[i];
            const client = new Client();
            try {
                const dataConnect = {
                    host: ftpParam.host,
                    port: ftpParam.port,
                    user: ftpParam.user,
                    password: ftpParam.pass,
                    secure: ftpParam.ssl
                }
                await client.access(dataConnect);
                return { success: true, client }; // Retorna o cliente se a conexão for bem-sucedida
            } catch (error) {
                allErrors.push(`Conexão FTP falhou para a opção ${i + 1}: ${error.message}`);
                client.close(); // Fecha a conexão falhada
            }
        }
        // Se todas as conexões falharem, registre os erros do array allErrors e retorne falso
        app.api.logger.logError({ log: { line: allErrors.join('; '), sConsole: false } })
        return { success: false }; // Retorna falso se todas as conexões falharem
    }

    const getByFunction = async (req, res) => {
        const func = req.params.func
        switch (func) {
            case 'gfr':
                getFornecedores(req, res)
                break;
            case 'mfd':
                mkFolder(req, res)
                break;
            case 'lfd':
                lstFolder(req, res)
                break;
            // case 'gbi':
            //     getBIData(req, res)
            //     break;
            default:
                res.status(404).send('Função inexitente')
                break;
        }
    }

    return { save, get, getById, remove, getByFunction }

}
// TODO: Criar a API de notas fiscais contendo os métodos de CRUD. Fazer validações de campos obrigatórios e tipos de dados. Em save, verificar se body.id existe e fazer update, caso contrário, fazer insert. Antes de excluir, verificar em fin_lancamentos se existe lançamento para a nota fiscal e não permitir caso exista.
const { dbPrefix } = require("../.env")
const moment = require('moment')
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const { STATUS_ABERTO, STATUS_LIQUIDADO, STATUS_ENCERRADO, STATUS_FATURADO, STATUS_CONFIRMADO } = require('./comis_status.js')(app)
    // const { STATUS_COMISSIONADO } = require('./pipeline_status.js')(app)
    const tabela = 'fis_notas'
    const tabelaFinLancamentos = 'fin_lancamentos'
    const tabelaAlias = 'Nota Fiscal'
    const tabelaAliasPl = 'Notas Fiscais'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99

    const save = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        let body = { ...req.body }
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
        try {
            existsOrError(body.numero, 'Número da nota não informado')
            existsOrError(body.serie, 'Série da nota não informada')
            existsOrError(body.id_empresa, 'Empresa destinatária da nota não informada')
            existsOrError(body.id_cadastros, 'Fornecedor não informado')
            existsOrError(body.valor_total, 'Valor total da nota não informado')
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            return res.status(400).send(error)
        }

        delete body.nome_fornecedor;
        delete cnpj_cpf_fornecedor;
        delete empresar;
        delete cpf_cnpj_empresa;

        let last = {}
        if (body.id) last = await app.db(tabelaDomain).where({ id: body.id }).first()

        if (body.id) {
            try {
                existsOrError(last, `${tabelaAlias} (${body.id}) não encontrada`)
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
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
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
        let totalRecords = await app.db({ tbl1: tabelaDomain })
            .countDistinct('tbl1.id as count').first()
            .join({ tbl2: tabelaDomainCadastros }, 'tbl2.id', 'tbl1.id_cadastros')
            .join({ tbl3: tabelaDomainEmpresa }, 'tbl3.id', 'tbl1.id_empresa')
            .where({ 'tbl1.status': STATUS_ACTIVE })

        const ret = app.db({ tbl1: tabelaDomain })
            .join({ tbl2: tabelaDomainCadastros }, 'tbl2.id', 'tbl1.id_cadastros')
            .join({ tbl3: tabelaDomainEmpresa }, 'tbl3.id', 'tbl1.id_empresa')
            .where({ 'tbl1.status': STATUS_ACTIVE })
            .orderBy('tbl1.id', 'desc')

        ret.then(body => {
            return res.json({ data: body, totalRecords: totalRecords.count })
        })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                return res.status(401).send(error)
            })
    }

    const getById = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
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
            .select(app.db.raw(`tbl1.*`), 'tbl2.nome as nome_fornecedor', 'tbl2.cnpj_cpf as cnpj_cpf_fornecedor', 'tbl3.razaosocial as empresa', 'tbl3.cpf_cnpj_empresa')
            .join({ tbl2: tabelaDomainCadastros }, 'tbl2.id', 'tbl1.id_cadastros')
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
            isMatchOrError(uParams && uParams.fiscal >= 4, `${noAccessMsg} "Exclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaFinLancamentosDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaFinLancamentos}`
        // Verificar se existe lançamento financeiro para a nota fiscal
        try {
            const lancamento = await app.db(tabelaFinLancamentosDomain).where({ id_notas: req.params.id, status: STATUS_ACTIVE }).first()
            const last = await app.db(tabelaDomain).where({ id: req.params.id }).first()
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

    const getByFunction = async (req, res) => {
        const func = req.params.func
        switch (func) {
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
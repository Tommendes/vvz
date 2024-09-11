const { dbPrefix } = require("../.env")
const moment = require('moment')
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const tabela = 'fin_contas'
    const tabelaAlias = 'Conta'
    const tabelaAliasPL = 'Contas'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99
    const SITUACAO_ABERTO = 1
    const SITUACAO_PAGO = 2
    const SITUACAO_CONCILIADO = 3
    const SITUACAO_CANCELADO = 99

    const save = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        let body = { ...req.body }
        delete body.id;
        if (req.params.id) body.id = req.params.id
        body.id_fin_lancamentos = req.params.id_fin_lancamentos || undefined
        try {
            // Alçada do usuário
            if (body.id) isMatchOrError(uParams && uParams.financeiro >= 3, `${noAccessMsg} "Edição de ${tabelaAlias}"`)
            else isMatchOrError(uParams && uParams.financeiro >= 2, `${noAccessMsg} "Inclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        if (body.valor_vencimento) body.valor_vencimento = body.valor_vencimento.replace(".", "").replace(",", ".");
        body.duplicata = body.duplicata || ''
        body.documento = body.documento || ''

        try {
            if (body.id) {
                const exists = await app.db(tabelaDomain).where({ id: body.id, status: STATUS_ACTIVE }).first()
                existsOrError(exists, 'Registro não encontrado')
            }
            existsOrError(body.id_fin_lancamentos, 'Conta não informada')
            existsOrError(body.data_vencimento, 'Data do vencimento não informada')
            existsOrError(body.valor_vencimento, 'Valor do vencimento não informado')
            existsOrError(body.parcela, 'Conta não informada')
            existsOrError(body.situacao, 'Situação da parcela não informada')
            // Verificar se a data de vencimanto é válida e converte para en
            if (!moment(body.data_vencimento, 'DD/MM/YYYY', true).isValid()) throw 'Data de vencimanto inválida'
            body.data_vencimento = moment(body.data_vencimento, 'DD/MM/YYYY').format('YYYY-MM-DD')
            if (['2', '3'].includes(String(body.situacao))) {
                existsOrError(body.data_pagto, 'Data de pagamento não informada')
                existsOrError(body.id_fin_contas, 'Conta de recebimento ou pagamento não informada')
                existsOrError(body.documento, 'Documento não informado')
            } else if (['99'].includes(String(body.situacao))) {
                existsOrError(body.motivo_cancelamento, 'Motivo do cancelamento não informado')
            }
            const unique = await app.db(tabelaDomain).where({ id_fin_lancamentos: body.id_fin_lancamentos, data_vencimento: body.data_vencimento, id_fin_contas: body.id_fin_contas, duplicata: body.duplicata, status: STATUS_ACTIVE }).first()
            if (unique && unique.id != body.id) throw 'Conta já registrada para esta conta'
        } catch (error) {
            console.log(error);
            return res.status(400).send(error)
        }

        delete body.old_id;
        delete body.situacaoVencimento;
        delete body.situacaoLabel;
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
        let user = req.user;
        const uParams = await app.db({ u: `${dbPrefix}_api.users` })
            .join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id')
            .where({ 'u.id': user.id })
            .first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.financeiro >= 1), `${noAccessMsg} "Exibição de ${tabelaAlias}"`);
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
            return res.status(401).send(error);
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`;
        const ret = app.db({ tbl1: tabelaDomain })
            .where({ 'tbl1.status': STATUS_ACTIVE, 'tbl1.id_fin_lancamentos': req.params.id_fin_lancamentos })
            .orderBy('tbl1.created_at', 'desc')
            .then(body => {
                const quantidade = body.length;
                let total = 0;
                const today = new Date();

                // Ordenar os registros pela situação(asc) e depois por data de vencimento
                body.sort((a, b) => {
                    if (a.situacao > b.situacao) return 1;
                    if (a.situacao < b.situacao) return -1;
                    if (a.data_vencimento > b.data_vencimento) return 1;
                    if (a.data_vencimento < b.data_vencimento) return -1;
                    return 0;
                });

                body.forEach((item) => {
                    total += item.valor_vencimento;
                    item.valor_vencimento = parseFloat(item.valor_vencimento).toFixed(2).replace('.', ',');
                    // Adicionar a propriedade situacaoVencimento contendo uma das seguintes situações: -1 = emAtraso, 0 = paraHoje ou 2 = aVencer utilizando moment
                    if (item.situacao == SITUACAO_ABERTO)
                        item.situacaoVencimento = moment(item.data_vencimento, 'YYYY-MM-DD').isBefore(today, 'day') ? 0 : moment(item.data_vencimento, 'YYYY-MM-DD').isSame(today, 'day') ? 1 : 2;
                    switch (item.situacao) {
                        case SITUACAO_ABERTO: item.situacaoLabel = 'Registro em Aberto'; break;
                        case SITUACAO_PAGO: item.situacaoLabel = 'Registro Pago'; break;
                        case SITUACAO_CONCILIADO: item.situacaoLabel = 'Registro Conciliado'; break;
                        case SITUACAO_CANCELADO: item.situacaoLabel = 'Registro Cancelado'; break;
                        default: item.situacaoLabel = 'Situação do registro não identificada';
                            break;
                    }
                    item.situacao = String(item.situacao);
                });

                total = parseFloat(total).toFixed(2);
                return res.json({ data: body, count: quantidade, total: total });
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
                return res.status(500).send(error);
            });
    };

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
        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*`))
            .where({ 'tbl1.id': req.params.id, 'tbl1.status': STATUS_ACTIVE }).first()
            .then(body => {
                if (!body) return res.status(404).send('Registro não encontrado')
                body.valor_vencimento = parseFloat(body.valor_vencimento || 0).toFixed(2).replace('.', ',')
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
            case 'glf':
                getListByField(req, res)
                break;
            default:
                res.status(404).send('Função inexitente')
                break;
        }
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
        // console.log(ret.toString());
        
        ret.then(body => {
            const count = body.length
            return res.json({ data: body, count })
        }).catch(error => {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        })
    }


    return {
        save, get, getById, remove, getByFunction
    }
}
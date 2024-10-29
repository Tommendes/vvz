const { dbPrefix } = require("../.env")
const moment = require('moment')
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const tabela = 'fin_parcelas'
    const tabelaFinanceiro = 'fin_lancamentos'
    const tabelaAlias = 'Parcela'
    const tabelaAliasPL = 'Parcelas'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99
    const SITUACAO_ABERTO = 1
    const SITUACAO_PAGO = 2
    const SITUACAO_CONCILIADO = 3
    const SITUACAO_CANCELADO = 99
    const { ceilTwoDecimals, formatCurrency } = app.api.facilities

    const save = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        let body = { ...req.body }
        const bodyMultiplicate = body.bodyMultiplicate || undefined
        delete body.bodyMultiplicate
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
        const centroCusto = body.centro || undefined
        delete body.centro

        try {
            if (body.id) {
                const exists = await app.db(tabelaDomain).where({ id: body.id, status: STATUS_ACTIVE }).first()
                existsOrError(exists, 'Registro não encontrado')
            }
            existsOrError(body.id_fin_lancamentos, 'Conta não informada')
            existsOrError(body.data_vencimento, 'Data do vencimento não informada')
            existsOrError(body.valor_vencimento, 'Valor do vencimento não informado')
            existsOrError(body.parcela, 'Parcela não informada')
            existsOrError(body.situacao, 'Situação da parcela não informada')
            // Verificar se a data de vencimanto é válida e converte para en
            if (!moment(body.data_vencimento, 'DD/MM/YYYY', true).isValid()) throw 'Data de vencimanto inválida'
            body.data_vencimento = moment(body.data_vencimento, 'DD/MM/YYYY').format('YYYY-MM-DD')

            console.log('body.data_pagto', body.data_pagto, 'body.situacao', Number(body.situacao));

            switch (Number(body.situacao)) {
                case SITUACAO_PAGO:
                case SITUACAO_CONCILIADO:
                    existsOrError(body.data_pagto, 'Data de pagamento não informada');
                    if (!moment(body.data_pagto, 'DD/MM/YYYY', true).isValid()) {
                        body.data_pagto = null;
                        throw 'Data de pagamento inválida';
                    }
                    existsOrError(body.id_fin_contas, `Conta de ${centroCusto == '1' ? 'recebimento' : 'pagamento ou conciliação'} não informada`);
                    if (centroCusto == '2') existsOrError(body.documento, 'Documento de pagamento ou conciliação não informado');
                    break;
                case SITUACAO_CANCELADO:
                    existsOrError(body.motivo_cancelamento, 'Motivo do cancelamento não informado');
                    break;
                default:
                    body.data_pagto = null;
                    console.log('Number(body.situacao)', Number(body.situacao), body.data_pagto);
                    
                    break;
            }


            // if (Number(body.situacao) == SITUACAO_ABERTO) {
            //     body.data_pagto = '(null)'
            //     console.log('Number(body.situacao)', Number(body.situacao));
            // }

            // if ([SITUACAO_CONCILIADO, SITUACAO_PAGO].includes(Number(body.situacao))) {
            //     existsOrError(body.data_pagto, 'Data de pagamento não informada')
            //     if (!moment(body.data_pagto, 'DD/MM/YYYY', true).isValid()) {
            //         body.data_pagto = null
            //         throw 'Data de pagamento inválida'
            //     }
            //     existsOrError(body.id_fin_contas, `Conta de ${centroCusto == '1' ? 'recebimento' : 'pagamento ou conciliação'} não informada`)
            //     if (centroCusto == '2') existsOrError(body.documento, 'Documento de pagamento ou conciliação não informado')
            // }
            // if ([SITUACAO_CANCELADO].includes(Number(body.situacao))) {
            //     existsOrError(body.motivo_cancelamento, 'Motivo do cancelamento não informado')
            // }
            const unique = await app.db(tabelaDomain).where({ id_fin_lancamentos: body.id_fin_lancamentos, data_vencimento: body.data_vencimento, id_fin_contas: body.id_fin_contas || '', duplicata: body.duplicata, status: STATUS_ACTIVE }).first()
            if (unique && unique.id != body.id) throw 'Parcela já registrada para esta conta'
        } catch (error) {
            console.log(error);
            return res.status(400).send(error)
        }

        delete body.old_id;
        delete body.situacaoVencimento;
        delete body.situacaoLabel;
        delete body.itemPosition;
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

            app.db.transaction(async (trx) => {
                body.evento = evento
                body.updated_at = new Date()
                /*
                    Se for uma multiplicação de registros, faça:
                    1: Edite o valor_base para receber o bodyMultiplicate.valor_base_um e atualize o valor de acordo com o calculo entre o bodyMultiplicate.valor_base_um e o percentual e
                    2: O número da parcela será 1 
                    3: Crie N registros (bodyMultiplicate.parcelas) com os mesmos dados exceto que a parcela será 2, 3 e assim por diante e o valor da parcela será o valor do bodyMultiplicate.valor_base_demais
                */

                if (bodyMultiplicate && bodyMultiplicate.parcelas > 1) {
                    const valorVencimento = parseFloat(body.valor_vencimento.replace(',', '.'));
                    const parcelas = parseInt(bodyMultiplicate.parcelas);


                    // Calcular valor da primeira parcela
                    const dividirParcelas = bodyMultiplicate.dividirParcelas || false;

                    let valorVencimentoDemais = Math.floor((valorVencimento / (dividirParcelas ? parcelas : 1)) * 100) / 100; // Arredonda para baixo
                    let valorVencimentoUm = Math.floor((valorVencimento / (dividirParcelas ? parcelas : 1)) * 100) / 100; // Arredonda para baixo

                    if (valorVencimentoUm * parcelas < valorVencimento) {
                        valorVencimentoUm += valorVencimento - (valorVencimentoUm * parcelas)
                    }

                    // Calcular valor das demais parcelas
                    // const valorVencimentoDemais = ((valorVencimento - valorVencimentoUm) / (parcelas - 1)).toFixed(2);

                    body.valor_vencimento = valorVencimentoUm
                    body.parcela = '1'
                    const novasParcelas = {
                        status: STATUS_ACTIVE,
                        id_fin_lancamentos: body.id_fin_lancamentos,
                        situacao: SITUACAO_ABERTO,
                        valor_vencimento: valorVencimentoDemais,
                        created_at: new Date()
                    }
                    for (let i = 2; i <= parcelas; i++) {
                        // novoVencimento é igual a data de vencimento da primeira parcela acrescentando um mês usando moment.js
                        const novoVencimento = moment(body.data_vencimento, 'YYYY-MM-DD').add(i - 1, 'months').format('YYYY-MM-DD');
                        novasParcelas.parcela = i
                        novasParcelas.data_vencimento = novoVencimento

                        // Evento de parcelamento financeiro. Evento informado no financeiro
                        const { createEvent } = app.api.sisEvents
                        const nextEventID = await createEvent({
                            "request": req,
                            "evento": {
                                id_user: user.id,
                                evento: `Parcelamento financeiro. ID do parcelamento: ${body.id}`,
                                classevento: `PaymentPlan`,
                                id_registro: body.id_fin_lancamentos,
                                tabela_bd: tabelaFinanceiro
                            }
                        })

                        novasParcelas.evento = nextEventID

                        const newPaymentPlan = await trx(tabelaDomain).insert(novasParcelas)
                    }
                }              

                await trx(tabelaDomain)
                    .update(body)
                    .where({ id: body.id })
                    .then(async (ret) => {
                        if (ret > 0) {
                            req.uParams = uParams
                            return res.status(200).send(body)
                        }
                        else res.status(200).send(`${tabelaAlias} não encontrado`)
                    })
                    .catch(error => {
                        app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                        return res.status(500).send(error)
                    })
            }).catch((error) => {
                // Se ocorrer um erro, faça rollback da transação
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
                return res.status(500).send(error);
            });
        } else {
            // Criação de um novo registro
            const nextEventID = await app.db(`${dbPrefix}_api.sis_events`).select(app.db.raw('max(id) as count')).first()

            body.evento = nextEventID.count + 1
            // Variáveis da criação de um novo registro
            body.status = STATUS_ACTIVE
            body.created_at = new Date()
            app.db(tabelaDomain)
                .insert(body)
                .then(async (ret) => {
                    body.id = ret[0]
                    // Evento de parcelamento financeiro. Evento informado no financeiro
                    const { createEvent } = app.api.sisEvents
                    await createEvent({
                        "request": req,
                        "evento": {
                            id_user: user.id,
                            evento: `Parcelamento financeiro. ID do parcelamento: ${body.id}`,
                            classevento: `PaymentPlan`,
                            id_registro: body.id_fin_lancamentos,
                            tabela_bd: tabelaFinanceiro
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
                let pago = 0;
                let emAtraso = 0;
                const estaSemana = [];
                let aVencer = 0;
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

                    const valorVencimento = Math.round(Number(item.valor_vencimento) * 100);
                    total += valorVencimento;
                    if (item.situacao == SITUACAO_PAGO) pago += valorVencimento;
                    if (item.situacao == SITUACAO_ABERTO) aVencer += valorVencimento;
                    // Somar para estaSemana += valorVencimento caso a data de vencimento esteja entre o último domingo e o próximo sábado
                    if (item.situacao == SITUACAO_ABERTO && moment(item.data_vencimento, 'YYYY-MM-DD').isBetween(moment().startOf('week').add(1, 'days'), moment().endOf('week').add(1, 'days')))
                        estaSemana.push({
                            valor: (valorVencimento / 100).toFixed(2).replace('.', ','),
                            data: moment(item.data_vencimento, 'YYYY-MM-DD').format('DD/MM/YYYY'),
                            labelData: moment(item.data_vencimento, 'YYYY-MM-DD').isBefore(today, 'day') ? 'Vencida' : 'Vencendo'
                        });
                    if (item.situacao == SITUACAO_ABERTO && moment(item.data_vencimento, 'YYYY-MM-DD').isBefore(today, 'day')) emAtraso += valorVencimento;
                    // Somar para emAtraso += valorVencimento caso a data de vencimento seja anterior a hoje
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

                total = (total / 100).toFixed(2).replace('.', ',');
                pago = (pago / 100).toFixed(2).replace('.', ',');
                aVencer = (aVencer / 100).toFixed(2).replace('.', ',');
                emAtraso = (emAtraso / 100).toFixed(2).replace('.', ',');
                return res.json({ data: body, count: quantidade, total: total, pago: pago, emAtraso: emAtraso, estaSemana, aVencer: aVencer });
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

        const registro = {
            status: STATUS_DELETE,
            updated_at: new Date()
        }
        try {
            // registrar o evento na tabela de eventos
            const last = await app.db(tabelaDomain).where({ id: req.params.id }).first()

            // Evento de parcelamento financeiro. Evento informado no financeiro
            const { createEvent } = app.api.sisEvents
            const nextEventID = await createEvent({
                "request": req,
                "evento": {
                    id_user: user.id,
                    evento: `Exclusão da parcela ${last.parcela} do registro financeiro. <a href="#/casaoficio/eventos?tabela_bd=fin_parcelas&id_registro=${last.id}" target="_blank">Evento de exclusão</a>`,
                    classevento: `RemovePaymentPlan`,
                    id_registro: last.id_fin_lancamentos,
                    tabela_bd: tabelaFinanceiro
                }
            })

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
            const rowsUpdated = await app.db(tabelaDomain).update({ ...registro, evento: evento }).where({ id: req.params.id })
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

    return {
        save, get, getById, remove, getByFunction, SITUACAO_ABERTO, SITUACAO_PAGO, SITUACAO_CONCILIADO, SITUACAO_CANCELADO
    }
}
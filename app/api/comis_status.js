const { dbPrefix } = require("../.env")
const moment = require('moment')
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const tabela = 'comis_status'
    const tabelaAlias = 'Status de Comissão'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99
    // Andamento do registro        
    const STATUS_ABERTO = 10
    const STATUS_LIQUIDADO = 20
    const STATUS_ENCERRADO = 30
    const STATUS_FATURADO = 40
    const STATUS_CONFIRMADO = 50

    const get = async (req, res) => {
        let user = req.user
        const id_comis = req.params.id_comis
        // Enviar apenas o último registro de cada comis
        const last = req.query.last || false

        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.comercial >= 1 || uParams.comissoes >= 1), `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaUsers = `${dbPrefix}_api.users`
        const tabelaEvents = `${dbPrefix}_api.sis_events`
        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`u.name, tbl1.*`))
            .leftJoin({ se: tabelaEvents }, 'se.id', 'tbl1.evento')
            .leftJoin({ u: tabelaUsers }, 'u.id', 'se.id_user')
            .where({ id_comissoes: id_comis })
            .groupBy('tbl1.id')
        if (last) ret.orderBy('tbl1.created_at', 'desc').orderBy('tbl1.status_comis', 'desc').first()
        else ret.orderBy('created_at').orderBy('status_comis')

        ret.then(body => {
            const quantidade = body.length
            body.forEach(element => {
                if (element.evento == 1) element.name = 'Vivazul'
            });
            return res.json({ data: body, count: quantidade })
        })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            })
    }

    const getByFunction = async (req, res) => {
        const func = req.params.func
        switch (func) {
            case 'glf':
                getListByField(req, res)
                break;
            case 'set':
                setStatus(req, res)
                break;
            case 'gsr':
                getStatusReleased(req, res)
                break;
            case 'ssc':
                setStatusClosed(req, res)
                break;
            case 'get':
                getStatus(req, res)
                break;
            default:
                res.status(404).send('Função inexitente')
                break;
        }
    }

    // Lista de registros por campo
    const getListByField = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
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

        const limit = req.query.limit && req.query.limit > 0 ? req.query.limit : 0
        const order = 'created_at:desc,' + (req.query.order || 'status_comis:desc')
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const ret = app.db(tabelaDomain)

        if (select) {
            // separar os campos e retirar os espaços
            const selectArr = select.split(',').map(s => s.trim())
            ret.select(selectArr)
        }

        ret.where(app.db.raw(`${fieldName} = ${value}`))

        if (order) {
            // separar os campos e retirar os espaços
            const orderArr = order.split(',').map(s => s.trim())
            orderArr.forEach(element => {
                ret.orderBy(element.split(':')[0], element.split(':')[1])
            });
        }

        if (limit) {
            ret.limit(limit)
        }
        ret.then(body => {
            const count = body.length
            return res.json({ data: body, count })
        }).catch(error => {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        })
    }

    const setStatus = async (req, res) => {
        let user = req.user
        const body = { ...req.body }
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        const agenteV = uParams.agente_v
        delete body.agente_v
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.financeiro >= 3 || uParams.comissoes >= 3 || (agenteV == uParams.agente_v)), `${noAccessMsg} "Alteração de status de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        try {
            existsOrError(body.id_comissoes, 'Comissão não informada')
            existsOrError(body.status_comis, 'Status não informado')
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(400).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const nextEventID = await app.db(`${dbPrefix}_api.sis_events`).select(app.db.raw('max(id) as count')).first()
        body.evento = nextEventID.count + 1
        body.created_at = new Date()
        if (body.remove_status) {
            const bodyRemove = { id_comissoes: body.id_comissoes, status_comis: body.status_comis }
            app.db(tabelaDomain)
                .where(bodyRemove)
                .del()
                .then(async (ret) => {
                    const { createEventRemove } = app.api.sisEvents
                    const evento = await createEventRemove({
                        "last": await app.db(tabelaDomain)
                            .where({ id_comissoes: body.id_comissoes }).first(),
                        "request": req,
                        "evento": {
                            "classevento": "Remove",
                            "evento": `Exclusão de status de comissão`,
                            "tabela_bd": tabela,
                        }
                    })
                    return res.json(body)
                })
                .catch(error => {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                    return res.status(500).send(error)
                })
        } else {
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
                            "evento": `Novo status: ${JSON.stringify(body)}`,
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

    const setStatusClosed = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.comissoes >= 4), `${noAccessMsg} "Encerrar Liquidações de Comissão"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        // Recupere a data de corte no banco de dados: SELECT parametro FROM `vivazul_bceaa5`.local_params WHERE grupo = 'comis_corte';
        const dCorte = await app.db(`${dbPrefix}_${uParams.schema_name}.local_params`).select('parametro').where({ grupo: 'comis_corte' }).first()
        const cutoffDay = dCorte.parametro || 17; // Dia de corte

        // Determine a última data de corte pois será a data final da operação
        const today = moment(req.body.dOper || moment()); // Obtém a data de hoje
        let thisMonth = today.month(); // Mês atual
        let thisYear = today.year(); // Ano atual

        // Verifica se today é menor a dCorte e se for decrementa o mês
        thisMonth++; // Incrementa o mês
        if (today.date() >= cutoffDay) {
            if (thisMonth < 1) {
                thisMonth = 1; // Volta para janeiro se exceder dezembro
                thisYear--; // Incrementa o ano
            }
        }

        // Atualiza os valores de dataCorte e monthPicker
        const startDate = moment(`${cutoffDay}/${thisMonth < 10 ? '0' : ''}${thisMonth}/${thisYear}`, 'DD/MM/YYYY').subtract(2, 'months');
        const endDate = moment(startDate).add(1, 'months').subtract(1, 'days');

        const released = await app.db({ cs1: `${dbPrefix}_${uParams.schema_name}.comis_status` })
            .join(
                app.db(`${dbPrefix}_${uParams.schema_name}.comis_status`)
                    .select('id_comissoes')
                    .max('created_at as max_created_at')
                    .whereIn('status_comis', [STATUS_ABERTO, STATUS_LIQUIDADO, STATUS_ENCERRADO])
                    .groupBy('id_comissoes')
                    .as('cs2'),
                function () {
                    this.on('cs1.id_comissoes', '=', 'cs2.id_comissoes')
                        .andOn('cs1.created_at', '=', 'cs2.max_created_at');
                }
            )
            .andWhere('cs1.status_comis', STATUS_LIQUIDADO)
            .andWhere('cs2.max_created_at', '<=', endDate.format('YYYY-MM-DD'))
            .select(
                'cs1.id_comissoes',
                'cs2.max_created_at'
            )
            .orderBy('cs1.created_at', 'desc')
            .orderBy('cs1.status_comis', 'desc')
            .catch(error => {
                return res.status(400).send({ msg: error })
            });
        // Para cada item de released, inserir um registro de status_comis = STATUS_ENCERRADO com a data de hoje e apenas ao final com sucesso enviar o resultado
        for (let index = 0; index < released.length; index++) {
            const element = released[index];

            const body = {
                id_comissoes: element.id_comissoes,
                status_comis: STATUS_ENCERRADO,
                created_at: new Date()
            }
            const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
            const nextEventID = await app.db(`${dbPrefix}_api.sis_events`).select(app.db.raw('max(id) as count')).first()
            body.evento = nextEventID.count + 1
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
                            "evento": `Novo status: ${JSON.stringify(body)}`,
                            "tabela_bd": tabela,
                        }
                    })
                })
                .catch(error => {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                    return res.status(500).send(error)
                })
        }
        return res.json({ startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD'), quant: released.length, closed: released })
    }

    const getStatusReleased = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.comissoes >= 4), `${noAccessMsg} "Encerrar Liquidações de Comissão"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        // Recupere a data de corte no banco de dados: SELECT parametro FROM `vivazul_bceaa5`.local_params WHERE grupo = 'comis_corte';
        const dCorte = await app.db(`${dbPrefix}_${uParams.schema_name}.local_params`).select('parametro').where({ grupo: 'comis_corte' }).first()
        const cutoffDay = dCorte.parametro || 17; // Dia de corte

        // Determine a última data de corte pois será a data final da operação
        const today = moment(req.body.dOper || moment()); // Obtém a data de hoje
        let thisMonth = today.month(); // Mês atual
        let thisYear = today.year(); // Ano atual

        // Verifica se today é menor a dCorte e se for decrementa o mês
        thisMonth++; // Incrementa o mês
        if (today.date() >= cutoffDay) {
            if (thisMonth < 1) {
                thisMonth = 1; // Volta para janeiro se exceder dezembro
                thisYear--; // Incrementa o ano
            }
        }

        // Atualiza os valores de dataCorte e monthPicker
        const startDate = moment(`${cutoffDay}/${thisMonth < 10 ? '0' : ''}${thisMonth}/${thisYear}`, 'DD/MM/YYYY').subtract(2, 'months');
        const endDate = moment(startDate).add(1, 'months').subtract(1, 'days');

        app.db({ cs1: `${dbPrefix}_${uParams.schema_name}.comis_status` })
            .join(
                app.db(`${dbPrefix}_${uParams.schema_name}.comis_status`)
                    .select('id_comissoes')
                    .max('created_at as max_created_at')
                    .whereIn('status_comis', [STATUS_ABERTO, STATUS_LIQUIDADO, STATUS_ENCERRADO])
                    .groupBy('id_comissoes')
                    .as('cs2'),
                function () {
                    this.on('cs1.id_comissoes', '=', 'cs2.id_comissoes')
                        .andOn('cs1.created_at', '=', 'cs2.max_created_at');
                }
            )
            // .join({ c: `${dbPrefix}_${uParams.schema_name}.comissoes` }, 'c.id', 'cs1.id_comissoes')
            // .join({ p: `${dbPrefix}_${uParams.schema_name}.pipeline` }, 'p.id', 'c.id_pipeline')
            // .join({ pp: `${dbPrefix}_${uParams.schema_name}.pipeline_params` }, 'pp.id', 'p.id_pipeline_params')
            // .where('p.id', idPipeline)
            .andWhere('cs1.status_comis', STATUS_LIQUIDADO)
            // .andWhereBetween('cs2.max_created_at', [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')])
            .andWhere('cs2.max_created_at', '<=', endDate.format('YYYY-MM-DD'))
            // .select(
            //     // 'p.id as id_pipeline',
            //     // 'pp.descricao',
            //     // 'p.documento',
            //     // 'cs1.id',
            //     // 'cs1.status_comis',
            //     'cs1.id_comissoes',
            //     'cs2.max_created_at'
            // )
            // .orderBy('cs1.created_at', 'desc')
            // .orderBy('cs1.status_comis', 'desc')
            .count('cs1.id_comissoes as quant')
            .then(results => {
                return res.json({ endDate: endDate.format('YYYY-MM-DD'), quant: results[0].quant })
            })
            .catch(error => {
                return res.status(400).send({ msg: error })
            });
    }

    const getStatus = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.comercial >= 1 || uParams.comissoes >= 1), `${noAccessMsg} "Consultar status de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        try {
            existsOrError(req.query.id_comis, 'Comissão não informada')
        } catch (error) {
            return res.status(400).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        try {
            const body = await app.db(tabelaDomain)
                .select(`status_comis`)
                .where({ id_comissoes: req.query.id_comis })
                .orderBy('created_at', 'desc')
                .first()
            return res.json(body)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        }
    }

    return {
        get, getByFunction,
        STATUS_ABERTO,
        STATUS_LIQUIDADO,
        STATUS_ENCERRADO,
        STATUS_FATURADO,
        STATUS_CONFIRMADO
    }
}
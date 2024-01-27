const { dbPrefix } = require("../.env")
module.exports = app => {
    const { existsOrError, notExistsOrError, valueOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const { STATUS_COMP_ACTIVE } = app.api.com_prop_compos
    const tabela = 'com_prop_itens'
    const tabelaComposicoes = 'com_prop_compos'
    const tabelaAlias = 'Item'
    const STATUS_ITEM_INACTIVE = 0
    const STATUS_ITEM_ACTIVE = 1
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
            if (body.id) isMatchOrError(uParams && (uParams.at >= 3 || uParams.comercial >= 3), `${noAccessMsg} "Edição de ${tabelaAlias}"`)
            else isMatchOrError(uParams && (uParams.at >= 2 || uParams.comercial >= 2), `${noAccessMsg} "Inclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaComposicoesDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaComposicoes}`
        body.id_com_propostas = req.params.id_com_propostas
        body.item_ativo = body.item_ativo == true ? 1 : 0
        body.compoe_valor = body.compoe_valor == true ? 1 : 0
        body.desconto_total = body.desconto_total || 0
        body.desconto_ativo = String(body.desconto_ativo) || 0

        try {
            existsOrError(body.id_com_produtos, 'Produto não selecionado')
            // existsOrError(body.descricao, 'Descrição não informada')
            valueOrError(body.quantidade, 'Quantidade não informada')
            valueOrError(body.valor_unitario, 'Valor unitário não informado')
            if (body.id_com_prop_compos) {
                const compos = await app.db(tabelaComposicoesDomain).where({ id_com_propostas: body.id_com_propostas, id: body.id_com_prop_compos }).first()
                existsOrError(compos, 'Composição não encontrada ou não pertence a esta proposta')
            }
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(400).send(error)
        }

        if (body.item_ativo == 0) delete body.item
        delete body.hash; delete body.tblName
        if (body.id) {
            try {
                if (body.item_ativo == 1) existsOrError(String(body.item), 'Item não informado')
            } catch (error) {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                return res.status(400).send(error)
            }
            const { createEventUpd } = app.api.sisEvents
            // Variáveis da edição de um registro
            // registrar o evento na tabela de eventos
            const last = await app.db(tabelaDomain).where({ id: body.id }).first()

            const evento = await createEventUpd({
                "notTo": ['created_at', 'updated_at', 'evento',],
                "last": last,
                "next": body,
                "request": req,
                "evento": {
                    "evento": `Alteração de ${tabelaAlias}`,
                    "tabela_bd": tabela,
                }
            })

            body.evento = evento
            body.updated_at = new Date()
            const ordem = await app.db(tabelaDomain).where({ id_com_propostas: body.id_com_propostas }).select(app.db.raw('count(*) as count')).first()
            body.ordem = body.ordem || ordem.count + 1 || 1

            try {
                const ret = await app.db(tabelaDomain)
                    .update(body)
                    .where({ id: body.id })

                if (ret > 0) {
                    // Reordena as composições ativas
                    if (body.item_ativo == 0 || body.item_ativo != last.item_ativo || last.id_com_prop_compos != body.id_com_prop_compos || last.item != body.item) {
                        const method = req.method
                        req.method = 'BOOLEAN'
                        await setReorderItemNr(req, res)
                        req.method = method
                        body = await app.db(tabelaDomain).where({ id: body.id }).first()
                    }
                    return res.status(200).send(body)
                }
                else return res.status(200).send(`${tabelaAlias} não encontrado`)
            } catch (error) {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                return res.status(500).send(error)
            }
        } else {

            // try {
            //     const unique = await app.db(tabelaDomain)
            //         .where({ id_com_propostas: body.id_com_propostas, item: body.item, id_com_produtos: body.id_com_produtos })
            //         .whereIn('status', [STATUS_ACTIVE, STATUS_ITEM_INACTIVE])
            //         .first()
            //     notExistsOrError(unique, 'Este produto já foi adicionado a este item')
            // } catch (error) {
            //     app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            //     return res.status(400).send(error)
            // }
            // Criação de um novo registro
            const nextEventID = await app.db(`${dbPrefix}_api.sis_events`).select(app.db.raw('count(*) as count')).first()

            body.evento = nextEventID.count + 1
            // Variáveis da criação de um novo registro
            body.status = STATUS_ACTIVE
            body.item_ativo = STATUS_ITEM_ACTIVE
            body.created_at = new Date()
            const ordem = await app.db(tabelaDomain).where({ id_com_propostas: body.id_com_propostas }).select(app.db.raw('count(*) as count')).first()
            body.ordem = ordem.count + 1 || 1
            const item = await app.db(tabelaDomain)
                .where({ id_com_propostas: body.id_com_propostas, item_ativo: STATUS_ITEM_ACTIVE })
                .where(app.db.raw('id_com_prop_compos is null'))
                .select(app.db.raw('count(*) as count')).first()
            body.item = item.count + 1 || 1
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
            isMatchOrError(uParams && (uParams.at >= 1 || uParams.comercial >= 1), `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const id_com_propostas = req.params.id_com_propostas
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaProdutosDomain = `${dbPrefix}_${uParams.schema_name}.com_produtos`
        const tabelaComposicoesDomain = `${dbPrefix}_${uParams.schema_name}.com_prop_compos`

        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*, tbl3.compos_nr, tbl2.nome_comum, tbl2.descricao descricao_produto, SUBSTRING(SHA(CONCAT(tbl1.id,'${tabela}')),8,6) as hash`))
            .join({ tbl2: tabelaProdutosDomain }, 'tbl2.id', 'tbl1.id_com_produtos')
            .leftJoin({ tbl3: tabelaComposicoesDomain }, 'tbl3.id', 'tbl1.id_com_prop_compos')
            .where({ 'tbl1.id_com_propostas': id_com_propostas })
            .whereIn('tbl1.status', [STATUS_ACTIVE, STATUS_ITEM_INACTIVE])
            .orderBy(app.db.raw('cast(tbl3.compos_nr as int)'), 'asc')
            .orderBy(app.db.raw('cast(tbl1.item as int)'), 'desc')
            .then(body => {
                const count = body.length
                return res.json({ data: body, count: count })
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            })
    }

    const getById = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.at >= 1 || uParams.comercial >= 1), `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const ret = app.db({ tbl1: tabelaDomain })
            .select(app.db.raw(`tbl1.*, TO_BASE64('${tabela}') tblName, SUBSTRING(SHA(CONCAT(tbl1.id,'${tabela}')),8,6) as hash`))
            .where({ 'tbl1.id': req.params.id })
            .whereIn('tbl1.status', [STATUS_ACTIVE, STATUS_ITEM_INACTIVE]).first()
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
            isMatchOrError(uParams && (uParams.at >= 4 || uParams.comercial >= 4), `${noAccessMsg} "Exclusão de ${tabelaAlias}"`)
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
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
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
            case 'rcn':
                setReorderItemNr(req, res)
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

        const first = req.query.first && req.query.first == true
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
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        })
    }

    const setReorderItemNr = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        let body = { ...req.body }

        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.at >= 3 || uParams.comercial >= 3), `${noAccessMsg} "Edição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}:${__line}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        try {
            existsOrError(body.id_com_propostas, 'Proposta não informada')
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(400).send(error)
        }
        // Localizar no BD todas as composições do item de body.id_com_propostas ordenadas por body.ordem
        // executar um laço forEach para atualizar o campo item começando do 1
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const tabelaComposicoesDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaComposicoes}`
        // Primeiro seta todos os itens inativos da proposta como item = 0 (zero)
        if (body.id_com_propostas)
            await app.db(tabelaDomain).update({ item: 0 }).where({ id_com_propostas: body.id_com_propostas, item_ativo: STATUS_ITEM_INACTIVE })

        // Localiza todas os itens ativos sem composição da proposta ordenadas por ordem e data de criação
        const itens = await app.db(tabelaDomain).where({ id_com_propostas: body.id_com_propostas, item_ativo: STATUS_ITEM_ACTIVE })
            .andWhere(app.db.raw('id_com_prop_compos is null'))
            .orderBy('ordem', 'asc').orderBy('created_at', 'asc')
        // Inicia o contador de composições ativas
        let item = 1
        // Reordena os itens sem composição ativos
        itens.forEach(async (c) => {
            await app.db(tabelaDomain).update({ item: item++ }).where({ id: c.id })
        })

        // Localiza todas as composições ativas na proposta ordenadas por ordem e data de criação
        const compos = await app.db(tabelaComposicoesDomain).where({ id_com_propostas: body.id_com_propostas, comp_ativa: STATUS_COMP_ACTIVE }).orderBy('ordem', 'asc').orderBy('created_at', 'asc')
        // Reordena os itens das composições ativas
        compos.forEach(async (c) => {
            let item = 1
            // Localiza todas os itens ativos da composição da proposta ordenadas por ordem e data de criação
            const itensEmComposicoes = await app.db(tabelaDomain).where({ id_com_propostas: c.id_com_propostas, id_com_prop_compos: c.id, item_ativo: STATUS_ITEM_ACTIVE })
                .andWhere(app.db.raw('id_com_prop_compos is not null'))
                .orderBy('ordem', 'asc').orderBy('created_at', 'asc')
            itensEmComposicoes.forEach(async (c) => {
                await app.db(tabelaDomain).update({ item: item++ }).where({ id: c.id })
            })
        })
        // Retorna true ou mensagem de sucesso
        if (req.method == 'BOOLEAN') return true
        else return res.status(200).send('Reordenação de composições realizada com sucesso')
    }

    return { save, get, getById, remove, getByFunction }
}
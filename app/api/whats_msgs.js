const { dbPrefix, speedchat } = require("../.env")
const schedule = require('node-schedule');
const moment = require('moment')
const axios = require('axios')
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const { convertHtmlToWhatsappFormat } = app.api.facilities
    const tabela = 'whats_msgs'
    const tabelaAliasPL = 'Mensagens de WhatsApp'
    const tabelaAlias = 'Mensagem de WhatsApp'
    const STATUS_ACTIVE = 10
    const STATUS_DELETE = 99


    const save = async (req, res) => {
        let user = req.user
        const tabelaSchemas = `${dbPrefix}_api.schemas_control`;
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: tabelaSchemas }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
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

        body.situacao = body.situacao || 1
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        try {
            existsOrError(body.schedule, 'Data e hora do envio não informada')
            // Verificar formato da data e hora (YYYY-MM-DD HH:mm:ss)
            if (!moment(body.schedule, 'YYYY-MM-DD HH:mm:ss', true).isValid()) throw 'Data e hora do envio inválida'
            existsOrError(body.phone, 'Número do telefone não informado')
            // Validar o número de telefone com regex onde deve conter no mínimo 10 dígitos
            if (!/^\d{10,}$/.test(body.phone)) throw 'Número de telefone inválido'
            // Onde phone é um número de telefone no formato 5511999999999, se o valor for 11999999999, o sistema deve adicionar o 55
            if ([10, 11].includes(body.phone.length)) body.phone = `55${body.phone}`
            existsOrError(body.message, 'Mensagem não informada')
            body.message = convertHtmlToWhatsappFormat(body.message)
            // O corpo da mensagem deve ser no máximo 500 caracteres
            if (body.message.length > 500) throw 'Mensagem deve ter no máximo 500 caracteres'
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
            delete body.old_id;
            const bodyMessage = body
            await app.db(tabelaDomain)
                .insert(body)
                .then(async (ret) => {
                    body.id = ret[0]
                    bodyMessage.id = ret[0]
                    const now = moment().format('YYYY-MM-DD HH:mm:ss');
                    if (bodyMessage.schedule <= now) await sendMessage(bodyMessage, uParams, tabelaDomain) // Certifique-se de que sendMessage está definido
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
        const tabelaSchemas = `${dbPrefix}_api.schemas_control`;
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: tabelaSchemas }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && (uParams.financeiro >= 1), `${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`
        const ret = app.db({ tbl1: tabelaDomain }).where({ status: STATUS_ACTIVE }).orderBy('created_at', 'desc')

        if (req.query.situacao) ret.andWhere('tbl1.situacao', req.query.situacao)

        ret.then(body => {
            const quantidade = body.length
            return res.json({ data: body, count: quantidade })
        })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            })
    }

    const getById = async (req, res) => {
        let user = req.user
        const tabelaSchemas = `${dbPrefix}_api.schemas_control`;
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: tabelaSchemas }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
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
        const tabelaSchemas = `${dbPrefix}_api.schemas_control`;
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: tabelaSchemas }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
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
            const rowsUpdated = await app.db(tabelaDomain).del().where({ id: req.params.id })
            existsOrError(rowsUpdated, 'Registro não foi encontrado')

            res.status(204).send()
        } catch (error) {
            res.status(400).send(error)
        }
    }

    const schedule = require('node-schedule'); // Certifique-se de que está instalado
    const moment = require('moment'); // Certifique-se de que está instalado
    const axios = require('axios'); // Certifique-se de que está instalado

    // Método responsável por enviar uma mensagem de WhatsApp e atualizar a situação da mensagem para 2 (enviada) além de registrar o evento na tabela de eventos
    const sendMessage = async (message, uParams, tabelaDomain) => {
        try {
            if (!uParams || uParams.chat_account_tkn === null) return;
            const config = {
                headers: {
                    'Authorization': uParams.chat_account_tkn // Certifique-se de que uParams.chat_account_tkn está sendo passado corretamente
                },
            };
            const novoBodyMessage = await substituirAtributosEspeciais(uParams, message) // Certifique-se de que substituirAtributosEspeciais está definido
            await axios.post(`${speedchat.host}/send-text`, { message: novoBodyMessage, phone: message.phone }, config) // Certifique-se de que speedchat.host está definido
                .then(async _ => {
                    // Atualizar a situação da mensagem para 2 (enviada)
                    await app.db(tabelaDomain) // Certifique-se de que app.db está definido
                        .update({ situacao: 2 })
                        .where({ id: message.id });
                })
                .catch(error => {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } }); // Certifique-se de que app.api.logger.logError está definido
                });
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } }); // Certifique-se de que app.api.logger.logError está definido
        }
    };

    // Método com schedule para envio de mensagens. O método deverá ficar ativo e verificar a cada minutos se há mensagens a serem enviadas. A verificação deve ocorrer a partir do campo schedule + situação. Se a situação for 1 e a data e hora de envio for menor ou igual a data e hora atual, a mensagem deve ser enviada.
    const sendScheduledMessages = async () => {
        const tabelaSchemas = `${dbPrefix}_api.schemas_control`;
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: tabelaSchemas }, 'sc.id', 'u.schema_id').where({ 'sc.status': STATUS_ACTIVE }).whereNotNull('chat_account_tkn').groupBy('sc.id') // Certifique-se de que app.db está definido
        if (!uParams) return;        
        for (const schema of uParams) {
            console.log('Verificando mensagens agendadas para o schema:', schema.schema_name);
            const tabelaDomain = `${dbPrefix}_${schema.schema_name}.${tabela}`; // Certifique-se de que dbPrefix e tabela estão definidos
            const messages = await app.db(tabelaDomain).where({ situacao: 1, status: STATUS_ACTIVE }).orderBy('schedule', 'asc'); // Certifique-se de que app.db e STATUS_ACTIVE estão definidos
            const now = moment().format('YYYY-MM-DD HH:mm:ss');
            for (const message of messages) {
                if (message.schedule <= now) {
                    message.message = await substituirAtributosEspeciais(schema, message) // Certifique-se de que substituirAtributosEspeciais está definido
                    await sendMessage(message, schema, tabelaDomain); // Certifique-se de que sendMessage está definido
                }
            }
        }
    };

    const getByFunction = async (req, res) => {
        const func = req.params.func
        switch (func) {
            case 'swm':
                sendWhatsappMessage(req, res) // Certifique-se de que sendWhatsappMessage está definido
                break;
            default:
                res.status(404).send('Função inexistente')
                break;
        }
    }

    const sendWhatsappMessage = async (req, res) => {
        let user = req.user
        const method = req.method
        const tabelaSchemas = `${dbPrefix}_api.schemas_control`;
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: tabelaSchemas }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first(); // Certifique-se de que app.db está definido
        if (req.params.id) body.id = req.params.id
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.id, `${noAccessMsg} "Envio de ${tabelaAlias}"`) // Certifique-se de que isMatchOrError, noAccessMsg e tabelaAlias estão definidos
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } }) // Certifique-se de que app.api.logger.logError está definido
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}` // Certifique-se de que dbPrefix e tabela estão definidos
        let body = await app.db({ tbl1: tabelaDomain }).where({ 'tbl1.id': req.body.id_message, 'tbl1.status': STATUS_ACTIVE }).first() // Certifique-se de que app.db e STATUS_ACTIVE estão definidos

        /**
         * O body.message poderá receber alguns atributos especiais. Identificar e substituir os valores
         * {clientName} = fantasia da tabela empresa (id = 1 ou de acordo com o remetente caso seja uma mensagem vindo do financeiro)
         * {clientCpfCnpj} = cpf_cnpj_empresa da tabela empresa (id = 1 ou de acordo com o remetente caso seja uma mensagem vindo do financeiro)
         * {clientEmail} = email da tabela empresa (id = 1 ou de acordo com o remetente caso seja uma mensagem vindo do financeiro)
         * {clientTel} = tel1 da tabela empresa (id = 1 ou de acordo com o remetente caso seja uma mensagem vindo do financeiro)
         * {userName} = nome do usuário que enviou a mensagem (remetente)
         * {senderName} = nome do usuário que receberá a mensagem (destinatário)
        */
        const novoBodyMessage = await substituirAtributosEspeciais(uParams, body) // Certifique-se de que substituirAtributosEspeciais está definido
        try {
            await sendMessage({ id: body.id, message: novoBodyMessage, phone: body.phone }, uParams, tabelaDomain) // Certifique-se de que sendMessage está definido
            return res.status(200).send('Mensagem enviada com sucesso')
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } }) // Certifique-se de que app.api.logger.logError está definido
            return res.status(500).send(error)
        }
    }

    // Função para substituir os placeholders no body.message
    const substituirAtributosEspeciais = async (remetente, messageBody) => {
        // Obter os dados da empresa e dos usuários        
        const tabelaEmpresaDomain = `${dbPrefix}_${remetente.schema_name}.empresa` // Certifique-se de que dbPrefix está definido
        let empresa = await app.db(tabelaEmpresaDomain).where({ id: remetente.id_empresa }).first(); // Certifique-se de que app.db está definido
        let destinatario = {}
        // Verificar se a mensagem possui uma tag {senderName} e se possuir, validar se existe messageBody.destinId
        if (messageBody.message.includes('{senderName}')) {
            if (messageBody.destinId) {
                destinatario = await obterDadosDestinatario(remetente, messageBody.destinId); // Certifique-se de que obterDadosDestinatario está definido
                // Capturar o primeiro e último nome do destinatário.nome
                const nome = destinatario.nome.split(' ')
                destinatario.nome = nome[0]
                if (nome.length > 1) destinatario.nome += ` ${nome[nome.length - 1]}`
                messageBody.message = messageBody.message.replace(/{senderName}/g, destinatario.nome);
            } else messageBody.message = messageBody.message.replace(/{senderName}/g, '');
        }

        // Substituir os placeholders pelos valores reais
        messageBody.message = messageBody.message
            .replace(/{clientName}/g, `${empresa.fantasia}`)
            .replace(/{clientCpfCnpj}/g, empresa.cpf_cnpj_empresa)
            .replace(/{clientEmail}/g, empresa.email_comercial)
            .replace(/{clientTel}/g, empresa.tel1)
            .replace(/{userName}/g, remetente.name)

        return messageBody.message;
    };

    const obterDadosDestinatario = async (remetente, destinatarioId) => {
        const tabelaCadastrosDomain = `${dbPrefix}_${remetente.schema_name}.cadastros` // Certifique-se de que dbPrefix está definido
        const destinatario = await app.db({ u: tabelaCadastrosDomain }).select('nome').where({ 'id': destinatarioId }).first(); // Certifique-se de que app.db está definido
        return destinatario;
    }

    // Agendar a verificação e envio de mensagens a cada minuto
    schedule.scheduleJob('* * * * *', async () => {
        await sendScheduledMessages(); // Certifique-se de que sendScheduledMessages está definido
    });

    sendScheduledMessages();

    return { save, get, getById, remove, getByFunction }
}
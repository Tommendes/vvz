const { dbPrefix, speedchat } = require("../.env")
const schedule = require('node-schedule');
const moment = require('moment')
const axios = require('axios')
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const { convertHtmlToWhatsappFormat } = app.api.facilities
    const tabela = 'whats_msgs'
    const tabelaAliasPL = 'Mensagens'
    const tabelaAlias = 'Mensagem'
    const STATUS_ACTIVE = 10
    const STATUS_DONE = 20
    const STATUS_DELETE = 99
    const MAX_BODY_LENGTH = 1000
    // Situação da mensagem (1: Ativa; 2: Enviada; 3: Pausada; 99: Cancelada)
    const SITUACAO_ATIVA = 1
    const SITUACAO_ENVIADA = 2
    const SITUACAO_PAUSADA = 3
    const SITUACAO_CANCELADA = 99

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
            existsOrError(body.message, 'Mensagem não informada')
            // body.message = await convertHtmlToWhatsappFormat(body.message)
            // console.log('body.message', body.message);

            // O corpo da mensagem deve ser no máximo ${MAX_BODY_LENGTH} caracteres
            if (body.message.length > MAX_BODY_LENGTH) {
                console.log(`Mensagem deve ter no máximo ${MAX_BODY_LENGTH} caracteres.`, body.message.length);
                throw `Mensagem deve ter no máximo ${MAX_BODY_LENGTH} caracteres.`
            }
            existsOrError(body.schedule, 'Data e hora do envio não informada')
            // Verificar formato da data e hora (YYYY-MM-DD HH:mm:ss)
            if (!moment(body.schedule, 'YYYY-MM-DD HH:mm:ss', true).isValid()) throw 'Data e hora do envio inválida'
            if (body.recurrence.end_date && !moment(body.recurrence.end_date, 'YYYY-MM-DD HH:mm:ss', true).isValid()) throw 'Data e hora final da recorrência inválida'
            existsOrError(body.phone, 'Número do telefone não informado')
            // Validar o número de telefone com regex onde deve conter no mínimo 10 dígitos
            if (!/^\d{10,}$/.test(body.phone)) throw 'Número de telefone inválido'
            // Onde phone é um número de telefone no formato 5511999999999, se o valor for 11999999999, o sistema deve adicionar o 55
            if ([10, 11].includes(body.phone.length)) body.phone = `55${body.phone}`
        } catch (error) {
            return res.status(400).send(error)
        }

        // body.message terminar com <p><br></p> remova
        body.message = body.message.replaceAll('<p><br></p><p><br></p>', '')
        if (body.message.endsWith('<p><br></p>')) body.message = body.message.slice(0, -11)
        if (body.id) {
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
            // Se body.schedule for menor que agora, alterar para agora
            if (moment(body.schedule).isBefore(moment())) body.schedule = moment().format('YYYY-MM-DD HH:mm:00')
            // Criar nova mensagem
            body.status = STATUS_ACTIVE
            body.created_at = new Date()

            delete body.old_id;
            let recurrence = undefined
            if (body.recurrent && body.recurrence) {
                recurrence = {
                    frequency: body.recurrence.frequency.code,
                    interval: body.recurrence.interval,
                    next_run: moment(body.schedule).format('YYYY-MM-DD HH:mm:ss'),//.add(body.recurrence.interval, body.recurrence.frequency).format('YYYY-MM-DD HH:mm:ss'),
                    end_date: body.recurrence.end_date ? moment(body.recurrence.end_date).format('YYYY-MM-DD HH:mm:ss') : null
                };
            }
            delete body.recurrence;
            await app.db(tabelaDomain)
                .insert(body)
                .then(async (ret) => {
                    const msgId = ret[0];
                    const message = {
                        id: msgId,
                        identified: body.identified, message: body.message,
                        id_profile: body.id_profile, phone: body.phone, situacao: SITUACAO_ENVIADA
                    }
                    if (recurrence) {
                        recurrence.msg_id = msgId;
                        delete message.situacao;
                        await app.db(`${dbPrefix}_${uParams.schema_name}.whats_msgs_recurrences`).insert(recurrence);
                    }
                    if (body.schedule <= moment().format('YYYY-MM-DD HH:mm:ss')) await sendMessage(message, uParams, tabelaDomain)
                    return res.status(200).send({ id: msgId })
                })
                .catch(error => {
                    app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                    return res.status(401).send(error)
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
        const ret = app.db({ tbl1: tabelaDomain })
            .where({ status: STATUS_ACTIVE, id_profile: req.params.id_profile })
            .orderBy(app.db.raw('coalesce(tbl1.delivered_at, tbl1.schedule)'), 'desc')

        if (req.query.situacao) ret.andWhere('tbl1.situacao', req.query.situacao)
        else ret.andWhere('tbl1.situacao', '<>', SITUACAO_CANCELADA)

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
            const last = await app.db(tabelaDomain).where({ id: req.params.id }).first()
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

    // Método responsável por enviar uma mensagem de WhatsApp e atualizar a situação da mensagem para SITUACAO_ENVIADA (enviada)
    const sendMessage = async (message, uParams, tabelaDomain) => {
        try {
            if (!uParams || uParams.chat_account_tkn === null) return;
            const config = {
                headers: {
                    'Authorization': uParams.chat_account_tkn // Certifique-se de que uParams.chat_account_tkn está sendo passado corretamente
                },
            };
            let novoBodyMessage = ``
            if (message.identified) {
                const nome = uParams.name.split(' ')
                uParams.name = nome[0]
                if (nome.length > 1) uParams.name += ` ${nome[nome.length - 1]}`
                novoBodyMessage = `*${uParams.name}:*\n`
            }
            novoBodyMessage += await substituirAtributosEspeciais(uParams, message) // Certifique-se de que substituirAtributosEspeciais está definido
            novoBodyMessage = await convertHtmlToWhatsappFormat(await convertHtmlToWhatsappFormat(novoBodyMessage)) // Certifique-se de que convertHtmlToWhatsappFormat está definido
            await axios.post(`${speedchat.host}/send-text`, { message: novoBodyMessage, phone: message.phone }, config) // Certifique-se de que speedchat.host está definido
                .then(async _ => {
                    let body = { delivered_at: moment().format('YYYY-MM-DD HH:mm:ss') }

                    if (message.situacao === SITUACAO_ENVIADA) body.situacao = SITUACAO_ENVIADA
                    // Atualizar a situação da mensagem para 2 (enviada)
                    await app.db(tabelaDomain) // Certifique-se de que app.db está definido
                        .update(body)
                        .where({ id: message.id });
                })
                .catch(error => {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } }); // Certifique-se de que app.api.logger.logError está definido
                });
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } }); // Certifique-se de que app.api.logger.logError está definido
        }
    };

    // Método com schedule para envio de mensagens. O método deverá ficar ativo e verificar a cada minutos se há mensagens a serem enviadas. A verificação deve ocorrer a partir do campo schedule + situação. Se a situação for SITUACAO_ATIVA e a data e hora de envio for menor ou igual a data e hora atual, a mensagem deve ser enviada.
    const sendScheduledMessages = async () => {
        const tabelaSchemas = `${dbPrefix}_api.schemas_control`;
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: tabelaSchemas }, 'sc.id', 'u.schema_id').where({ 'sc.status': STATUS_ACTIVE }).whereNotNull('chat_account_tkn').groupBy('sc.id')

        if (!uParams) return;

        for (const schema of uParams) {
            const tabelaDomain = `${dbPrefix}_${schema.schema_name}.${tabela}`;
            const tabelaRecurrencesDomain = `${dbPrefix}_${schema.schema_name}.whats_msgs_recurrences`;
            const messages = await app.db({ tbl1: tabelaDomain })
                .select(app.db.raw(`tbl1.*, rec.id as recurrence_id, rec.next_run, rec.frequency, rec.interval, rec.end_date`))
                .leftJoin({ rec: tabelaRecurrencesDomain }, 'tbl1.id', 'rec.msg_id')
                .where('tbl1.situacao', SITUACAO_ATIVA)
                .andWhere(function () {
                    this.orWhere(function () {
                        this.where('tbl1.schedule', '<=', moment().format('YYYY-MM-DD HH:mm:00'))
                            .where('tbl1.recurrent', 0);
                    })
                        .orWhere(function () {
                            this.where('rec.next_run', '<=', moment().format('YYYY-MM-DD HH:mm:00'))
                                .andWhere(function () {
                                    this.whereNull('rec.end_date')
                                        .orWhere('rec.end_date', '>=', moment().format('YYYY-MM-DD HH:mm:00'));
                                })
                        });
                })
                .groupBy('tbl1.id');

            for (const message of messages) {
                await sendMessage(message, schema, tabelaDomain);

                if (message.recurrence_id) {
                    // Corrigir a lógica de cálculo da próxima execução
                    const nextRun = moment(message.next_run).add(message.interval, message.frequency).format('YYYY-MM-DD HH:mm:00');
                    // caso moment(nextRun).isAfter(message.end_date) ou igual, alterar a situação da mensagem para SITUACAO_ENVIADA (enviada) e excluir a recorrência
                    if (moment(nextRun).isAfter(message.end_date)) { //  || moment(nextRun).isSame(message.end_date)
                        // Alterar a situação da mensagem para SITUACAO_ENVIADA (enviada) e excluir a recorrência
                        await app.db(tabelaDomain).where({ id: message.id }).update({ situacao: SITUACAO_ENVIADA });
                        await app.db(tabelaRecurrencesDomain).where({ id: message.recurrence_id }).update({ status: STATUS_DONE });
                    } else {
                        await app.db(tabelaRecurrencesDomain).where({ id: message.recurrence_id }).update({ next_run: nextRun });
                    }
                } else {
                    await app.db(tabelaDomain).where({ id: message.id }).update({ situacao: SITUACAO_ENVIADA });
                }
            }
        }
    };

    const changeScheduledMessagesSituation = async (req, res) => {
        let user = req.user
        const tabelaSchemas = `${dbPrefix}_api.schemas_control`;
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: tabelaSchemas }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        if (!uParams) return;
        const body = { ...req.body }
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabela}`;
        app.db(tabelaDomain).where({ id: body.id }).update({ situacao: body.situacao })
            .then(_ => {
                // Situação da mensagem (2: Enviada; 3: Pausada; 99: Cancelada)
                const situacao = body.situacao === 1 ? 'Reativada' : body.situacao === 3 ? 'Pausada' : 'Cancelada';
                res.status(200).send({ msg: `Mensagem ${situacao} com sucesso` })
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } }); // Certifique-se de que app.api.logger.logError está definido
                return res.status(500).send(error)
            })
    }

    const getByFunction = async (req, res) => {
        const func = req.params.func
        switch (func) {
            case 'changeScheduledMessagesSituation':
                changeScheduledMessagesSituation(req, res)
                break;
            default:
                res.status(404).send('Função inexistente')
                break;
        }
    }

    // Função para substituir os placeholders no body.message
    const substituirAtributosEspeciais = async (remetente, messageBody) => {
        // Obter os dados da empresa e dos usuários        
        const tabelaEmpresaDomain = `${dbPrefix}_${remetente.schema_name}.empresa` // Certifique-se de que dbPrefix está definido
        let empresa = await app.db(tabelaEmpresaDomain).where({ id: remetente.id_empresa }).first(); // Certifique-se de que app.db está definido
        let destinatario = {}
        // Verificar se a mensagem possui uma tag {senderName} e se possuir, validar se existe messageBody.id_profile
        if (messageBody.message.includes('{senderName}')) {
            if (messageBody.id_profile) {
                destinatario = await obterDadosDestinatario(remetente, messageBody.id_profile); // Certifique-se de que obterDadosDestinatario está definido
                // Capturar o primeiro e último nome do destinatário.nome
                const name = destinatario.name.split(' ')
                destinatario.name = name[0]
                // if (name.length > 1) destinatario.name += ` ${name[name.length - 1]}`
                messageBody.message = messageBody.message.replace(/{senderName}/g, destinatario.name);
            } else messageBody.message = messageBody.message.replace(/ {senderName}/g, '').replace(/{senderName}/g, '');
        }

        // Detectar e formatar o valor da tag especial {time-1:mi} ou {time+2:h}
        const timeRegex = /{time([+-])(\d+):([a-z]+)}/g;
        const timeMatches = messageBody.message.match(timeRegex);

        /**
         * O body.message poderá receber alguns atributos especiais. Identificar e substituir os valores
         * {clientName} = fantasia da tabela empresa (id = 1 ou de acordo com o remetente caso seja uma mensagem vindo do financeiro)
         * {clientCpfCnpj} = cpf_cnpj_empresa da tabela empresa (id = 1 ou de acordo com o remetente caso seja uma mensagem vindo do financeiro)
         * {clientEmail} = email da tabela empresa (id = 1 ou de acordo com o remetente caso seja uma mensagem vindo do financeiro)
         * {clientTel} = tel1 da tabela empresa (id = 1 ou de acordo com o remetente caso seja uma mensagem vindo do financeiro)
         * {userName} = nome do usuário que enviou a mensagem (remetente)
         * {time-1:mi} = momento do envio - 1:(mi)nuto,(h)ora,(d)ia,(s)emana,(m)es,(a)no
         * {time} = momento do envio
         * {senderName} = nome do usuário que receberá a mensagem (destinatário)
        */

        if (timeMatches) {
            for (const match of timeMatches) {
                const timeMatch = match.match(/{time([+-])(\d+):([a-z]+)}/);
                const operator = timeMatch[1];
                const timeValue = parseInt(timeMatch[2]);
                let timeUnit = timeMatch[3];
                switch (timeUnit) {
                    case 'mi': timeUnit = 'minutes'; break;
                    case 'h': timeUnit = 'hours'; break;
                    case 'd': timeUnit = 'days'; break;
                    case 's': timeUnit = 'weeks'; break;
                    case 'm': timeUnit = 'months'; break;
                    case 'a': timeUnit = 'years'; break;
                    default: timeUnit = 'minutes'; break;
                }

                let time;
                if (operator === '+') {
                    if (['d', 's', 'm', 'a'].includes(timeMatch[3])) time = moment().add(timeValue, timeUnit).format('DD/MM/YYYY');
                    else time = moment().add(timeValue, timeUnit).format('HH:mm');
                } else {
                    if (['d', 's', 'm', 'a'].includes(timeMatch[3])) time = moment().subtract(timeValue, timeUnit).format('DD/MM/YYYY');
                    else time = moment().subtract(timeValue, timeUnit).format('HH:mm');
                }

                messageBody.message = messageBody.message.replace(timeMatch[0], time);
            }
        }
        // Substituir os placeholders pelos valores reais
        messageBody.message = messageBody.message
            .replace(/{clientName}/g, `${empresa.fantasia}`)
            .replace(/{clientCpfCnpj}/g, empresa.cpf_cnpj_empresa)
            .replace(/{clientEmail}/g, empresa.email_comercial)
            .replace(/{clientTel}/g, empresa.tel1)
            .replace(/{userName}/g, remetente.name)
            .replace(/{time}/g, moment().format('HH:mm'))

        return messageBody.message;
    };

    const obterDadosDestinatario = async (remetente, destinatarioId) => {
        const tabelaCadastrosDomain = `${dbPrefix}_${remetente.schema_name}.whats_profiles` // Certifique-se de que dbPrefix está definido
        const destinatario = await app.db({ u: tabelaCadastrosDomain }).select('name').where({ 'id': destinatarioId }).first(); // Certifique-se de que app.db está definido
        return destinatario;
    }

    // Agendar a verificação e envio de mensagens a cada minuto
    schedule.scheduleJob('* * * * *', () => {
        sendScheduledMessages();
    });

    return { save, get, getById, remove, getByFunction }
}
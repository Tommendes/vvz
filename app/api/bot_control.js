const randomstring = require("randomstring")
const { dbPrefix, apiWats } = require("../.env")
const schedule = require('node-schedule');
const axios = require('axios');
const moment = require('moment')
module.exports = app => {
    const { transporterBot } = app.api.mailer
    const { existsOrError } = app.api.validation
    const tabelaEvents = 'azulbot_events'
    const tabelaBuyers = 'azulbot_buyers'
    const tabelaSubscriptions = 'azulbot_subscriptions'
    const STATUS_ACTIVE = 10
    const STATUS_INACTIVE = 20
    const STATUS_DELETED = 99

    // Retorna os contatos do plugchat 
    const setRequest = async (req, res) => {
        const body = { ...req.body }
        try {
            existsOrError(body, 'Corpo da requisição não informado')
        } catch (error) {            
            return res.status(400, error)
        }

        const event = body.event
        
        if (event == 'PURCHASE_APPROVED') {
            const getEvent = await setEvent(req)
            const getSubscription = await setSubscription(req, getEvent[0])
            const getBuyer = await setBuyer(req, getSubscription[0])
            let bodyRes = { vivazul: getEvent[0], subscription: getSubscription[0], buyer: getBuyer[0] }            
            if (bodyRes.vivazul && bodyRes.subscription && bodyRes.buyer) {
                try {
                    const tenant = await setTenant(req)
                    req.body.data.tenant = tenant
                    const welcome = await whatsWelcome(req)
                    const welcomeMail = await mailWelcome(req)
                    bodyRes = { ...bodyRes, tenant, welcomeWhatsApp: welcome, welcomeMail: welcomeMail }
                    // bodyRes = { ...bodyRes, tenant, welcomeMail: welcomeMail }
                    // app.api.logger.logInfo({ log: { line: JSON.stringify(body), sConsole: true } })
                    res.status(200).send(bodyRes)
                } catch (error) {
                    const erro = 'Erro ao inserir dados: ' + error
                    res.status(200).send(erro)
                }
            } else {
                res.status(400).send('Erro ao inserir dados')
            }
        } else if (event == 'SWITCH_PLAN') {
        } else if (event == 'SUBSCRIPTION_CANCELLATION') {
        } else {
            const bodyFail = {
                msg: "Evento desconecido",
                ...body
            }
            res.status(200).send(erro)
        }
    }

    /**
     * Recebe e executa a criação de um novo tenant a partir de uma requisião de compra: event == 'PURCHASE_APPROVED'
     * @param {*} req 
     * @returns 
     */
    const setTenant = async (req) => {
        const bodyData = { ...req.body.data }
        const planoBasic = {
            "maxUsers": 3,
            "maxConnections": 1
        }
        const planoMaster = {
            "maxUsers": 5,
            "maxConnections": 2
        }
        const planoPremium = {
            "maxUsers": 10,
            "maxConnections": 4
        }
        let plano = planoBasic
        switch (bodyData.subscription.plan.name) {
            case "Basic": plano = planoBasic; break;
            case "Master": plano = planoMaster; break;
            case "Premium": plano = planoPremium; break;
        }
        const bodyTo = {
            "status": "active",
            "name": bodyData.buyer.name,
            ...plano,
            "acceptTerms": true,
            "email": bodyData.buyer.email,
            "password": randomstring.generate(6).toUpperCase(),
            "userName": bodyData.buyer.name,
            "identity": bodyData.buyer.document,
            "profile": "admin",
            "trial": "disabled",
            "trialPeriod": 0
        }
        try {
            const response = await axios.post(endpoint, bodyTo, { headers: { Authorization: headerAuthorization } })
            console.log(response.data);
            return bodyTo
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return error
        }
    }

    /**
     * Recebe e executa o update de um tenant existente a partir de uma requisião de troca de plano: event == 'SWITCH_PLAN'
     * @param {*} req 
     * @returns 
     */
    const updateTenant = async (req) => { }

    const setEvent = async (req) => {
        const body = { ...req.body }
        /*
            evento = notNull()
            created_at = notNull()
            vivazul = notNullable()
            event_id = notNullable() 
            creation_date = notNullable()
            event = notNullable()
            version = notNullable()
            data = notNullable()
        */
        const tabelaEventsDomain = `${dbPrefix}_api.${tabelaEvents}`
        const { createEventIns } = app.api.sisEvents
        const evId = await createEventIns({
            "notTo": ['created_at', 'evento'],
            "next": { marcacao: 'setEvent' },
            "request": req,
            "evento": {
                "evento": `setEvent`,
                "tabela_bd": tabelaEvents,
            }
        })
        const bodyTo = {
            evento: evId,
            created_at: created_at = moment().format('YYYY-MM-DD HH:mm:ss'),
            gateway: 'Hotmart',
            event_id: body.id,
            creation_date: body.creation_date,
            event: body.event,
            version: body.version,
            data: JSON.stringify(body.data)
        }

        const id = await app.db(tabelaEventsDomain).insert(bodyTo)
        return id
    }

    const setSubscription = async (req, idEvent) => {
        const bodyData = { ...req.body.data }
        /*            
            evento = notNull()
            created_at = notNull()
            status = defaultTo(10)
            id_event = notNull()
            subscriber_code = notNullable()
            plan_name = notNullable()
            plan_id = notNullable()
            plan_status = notNullable()
            product = notNullable()
            commissions = notNullable()
            purchase = notNullable()
            affiliates = notNullable()
        */
        const tabelaSubscriptionDomain = `${dbPrefix}_api.${tabelaSubscriptions}`
        const { createEventIns } = app.api.sisEvents
        const evId = await createEventIns({
            "notTo": ['created_at', 'evento'],
            "next": { marcacao: 'subscription' },
            "request": req,
            "evento": {
                "evento": `setSubscription`,
                "tabela_bd": tabelaSubscriptions,
            }
        })
        const bodyTo = {
            status: STATUS_ACTIVE,
            evento: evId,
            created_at: created_at = moment().format('YYYY-MM-DD HH:mm:ss'),
            id_event: idEvent,
            subscriber_code: bodyData.subscription.subscriber.code,
            plan_name: bodyData.subscription.plan.name,
            plan_id: bodyData.subscription.plan.id,
            plan_status: bodyData.subscription.status,
            product: JSON.stringify(bodyData.product),
            commissions: JSON.stringify(bodyData.commissions),
            purchase: JSON.stringify(bodyData.purchase),
            affiliates: JSON.stringify(bodyData.affiliates)
        }

        const id = await app.db(tabelaSubscriptionDomain).insert(bodyTo)
        return id
    }

    const setBuyer = async (req, idSubscription) => {
        const bodyData = { ...req.body.data }
        /*            
            evento = notNull()
            created_at = notNull()
            status = defaultTo(10)
            id_subscription = notNull()
            document = notNullable()
            name = notNullable()
            email = notNullable()
            zipcode = notNullable()
            country = notNullable()
            number = notNullable()
            address = notNullable()
            city = notNullable()
            state = notNullable()
            neighborhood = notNullable()
            complement = comment()
            country_iso = notNullable()
        */
        const tabelaBuyersDomain = `${dbPrefix}_api.${tabelaBuyers}`
        const { createEventIns } = app.api.sisEvents
        const evId = await createEventIns({
            "notTo": ['created_at', 'evento'],
            "next": { marcacao: 'buyer' },
            "request": req,
            "evento": {
                "evento": `setBuyer`,
                "tabela_bd": tabelaBuyers,
            }
        })
        const bodyTo = {
            status: STATUS_ACTIVE,
            evento: evId,
            created_at: created_at = moment().format('YYYY-MM-DD HH:mm:ss'),
            id_subscription: idSubscription,
            document: bodyData.buyer.document,
            name: bodyData.buyer.name,
            email: bodyData.buyer.email,
            zipcode: bodyData.buyer.address.zipcode,
            country: bodyData.buyer.address.country,
            number: bodyData.buyer.address.number,
            address: bodyData.buyer.address.address,
            city: bodyData.buyer.address.city,
            state: bodyData.buyer.address.state,
            neighborhood: bodyData.buyer.address.neighborhood,
            complement: bodyData.buyer.address.complement,
            country_iso: bodyData.buyer.address.country_iso
        }

        const id = await app.db(tabelaBuyersDomain).insert(bodyTo)
        return id
    }

    /**
     * Função utilizada para envio de mensagem de boas vindas por email
     * @param {*} req 
     * @param {*} res 
     */
    const mailWelcome = async (req) => {
        const bodyData = { ...req.body.data }
        
        if (!bodyData.buyer) return
        try {
            await transporterBot.sendMail({
                from: `"${bodyData.product.name}" <contato@azulbot.com.br>`, // sender address
                to: `${bodyData.buyer.email}`, // list of receivers
                subject: `Bem-vindo ao ${bodyData.product.name}`, // Subject line
                text: `Olá ${bodyData.buyer.name.split(' ')[0]}!\n
                        Parabéns ${bodyData.buyer.name.split(' ')[0]} por sua aquisição, o ${bodyData.product.name} -  ${bodyData.subscription.plan.name} ✔
                        Agora você faz parte do time ${bodyData.product.name}!\n
                        Para acessar o sistema utilize o link abaixo:\n
                        https://bot.azulbot.com.br/#/login\n
                        Criei uma senha aleatória para você mas sugiro que troque já no primeiro acesso: ${bodyData.tenant.password}\n
                        Atenciosamente,\nTime ${bodyData.product.name}`,


                html: `<p><b>Olá ${bodyData.buyer.name.split(' ')[0]}!</b></p>
            <p>Parabéns ${bodyData.buyer.name.split(' ')[0]} por sua aquisição, o ${bodyData.product.name} -  ${bodyData.subscription.plan.name} ✔</p>
            <p>Agora você faz parte do time ${bodyData.product.name}!</p>
            <p>Para acessar o sistema utilize o link a seguir: https://bot.azulbot.com.br/#/login</p>
            <p>Criei uma senha aleatória para você mas sugiro que troque já no primeiro acesso: ${bodyData.tenant.password}</p>
            <p>Atenciosamente,</p>
            <p><b>Time ${bodyData.product.name}</b></p>`,
            }).then(_ => {
                return true
            }).catch(error => {
                console.log('error', error);
                return error
            })
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            res.status(400).send(error)
        }
    }
    /**
     * Função utilizada para envio de mensagem de boas vindas por whatsapp
     * @param {*} req 
     * @param {*} res 
     */
    const whatsWelcome = async (req) => {
        const bodyData = { ...req.body.data }
        if (!bodyData.buyer) return
        try {
            const text = [
                `Parabéns ${bodyData.buyer.name.split(' ')[0]} por sua aquisição, o ${bodyData.product.name} -  ${bodyData.subscription.plan.name}!`,
                `Agora você faz parte do time ${bodyData.product.name}!`,
                `Para acessar o sistema utilize o link abaixo:`,
                `https://bot.azulbot.com.br/#/login`,
                `Criei uma senha aleatória para você mas sugiro que troque já no primeiro acesso:`,
                `${bodyData.tenant.password}`,
                `Time ${bodyData.product.name}`
            ];
            sendMessage({ phone: `${bodyData.buyer.checkout_phone}`, message: text })
                .then(() => app.api.logger.logInfo({ log: { line: `Mensagem whatsPasswordReset enviada com sucesso para ${bodyData.buyer.checkout_phone}`, sConsole: true } }))
                .catch(error => app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } }))
            return text
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            res.status(400).send(error)
        }
    }

    /**
     * Envo de mensagem por WhatsApp
     * @param {*} messageBody 
     * @returns 
     */
    const sendMessage = async (messageBody) => {
        const schemaRoot = await app.db({ sc: 'schemas_control' }).where({ 'sc.schema_name': 'root' }).first();
        try {
            if (!schemaRoot) throw `Falha no banco de dados. Esquema root não localizado`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return error
        }
        try {
            existsOrError(messageBody.message, 'Mensagem não informada')
            existsOrError(messageBody.phone, 'Número de WhatsApp não informado')
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return error
        }
        const config = {
            headers: {
                'Authorization': `Bearer ${schemaRoot.chat_account_tkn}` // Certifique-se de que uParams.chat_account_tkn está sendo passado corretamente
            },
        };

        if (typeof messageBody.message === 'string') messageBody.message = [messageBody.message]
        for (let index = 0; index < messageBody.message.length; index++) {
            const element = messageBody.message[index];

            const body = {
                "number": messageBody.phone,
                "body": element,
                "externalKey": "{{SecretKey}}"
            }
            await axios.post(apiWats.host, body, config)
                .then(async (res) => {
                    return res.data
                })
                .catch(error => {
                    console.log('sendMessage error', error);
                    return error
                })
        };
    }

    return { setRequest }
}
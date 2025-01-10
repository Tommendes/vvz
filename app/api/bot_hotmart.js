const randomstring = require("randomstring")
const { dbPrefix, apiWats, azulbotLinks, env, zproEnv } = require("../.env")
const schedule = require('node-schedule');
const axios = require('axios');
const moment = require('moment')
module.exports = app => {
    const { transporterBot } = app.api.mailer
    const { existsOrError } = app.api.validation
    const { removeAccents, titleCase } = app.api.facilities
    const tabelaEvents = 'azulbot_events'
    const tabelaBuyers = 'azulbot_buyers'
    const tabelaSubscriptions = 'azulbot_subscriptions'
    const STATUS_INACTIVE = 0
    const STATUS_ACTIVE = 10
    const STATUS_DELETED = 99
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

    // Retorna os contatos do plugchat 
    const setRequest = async (req, res) => {
        if (req.body.data.buyer.name) req.body.data.buyer.name = removeAccents(titleCase(req.body.data.buyer.name))
        const body = { ...req.body }
        try {
            existsOrError(body, 'Corpo da requisição não informado')
        } catch (error) {
            return res.status(400, error)
        }

        const event = body.event
        /**
         * Registra todos os eventos recebidos
         */
        const getEvent = await setEvent(req)
        if (event == 'PURCHASE_APPROVED') {
            try {
                const bodyData = { ...req.body.data }
                const subscriber_code = bodyData.subscription.subscriber.code
                const plan_name = bodyData.subscription.plan.name
                // Verificar se o comprador já está cadastrado em um plano qualquer
                const uniqueBuyer = await app.db({ b: `${dbPrefix}_api.${tabelaBuyers}` })
                .select({ idBuyer: 'b.id', idSubscription: 's.id', plan_name: 's.plan_name' })
                .join({ s: `${dbPrefix}_api.${tabelaSubscriptions}` }, 'b.id_subscription', 's.id')
                .where({ 'b.subscriber_code': subscriber_code, 's.status': STATUS_ACTIVE, 'b.status': STATUS_ACTIVE })
                .orderBy('s.created_at', 'desc')
                .orderBy('b.created_at', 'desc')
                .first()

                // Verificar se o comprador já está cadastrado neste plano
                const uniqueSubscriptionPlanBuyer = await app.db({ b: `${dbPrefix}_api.${tabelaBuyers}` })
                    .select({ idBuyer: 'b.id', idSubscription: 's.id', plan_name: 's.plan_name' })
                    .join({ s: `${dbPrefix}_api.${tabelaSubscriptions}` }, 'b.id_subscription', 's.id')
                    .where({ 'b.subscriber_code': subscriber_code, 's.plan_name': plan_name, 's.status': STATUS_ACTIVE, 'b.status': STATUS_ACTIVE })
                    .orderBy('s.created_at', 'desc')
                    .orderBy('b.created_at', 'desc')
                    .first()

                let getSubscription = undefined
                let getBuyer = undefined
                // Se não existir a inscrição, então registra nova inscrição, comprador e tenant
                if (!uniqueBuyer) {
                    console.log('Novo cliente');
                    getSubscription = await setSubscription(req, getEvent[0])
                    getBuyer = await setBuyer(req, getSubscription)
                    let bodyRes = { vivazul: getEvent[0], subscription: getSubscription[0], buyer: getBuyer[0] }
                    if (bodyRes.vivazul && bodyRes.subscription && bodyRes.buyer) {
                        const tenant = await setTenant(req)
                        req.body.data.tenant = tenant
                        const tenantSuccess = tenant.success
                        if (!tenantSuccess) {
                            const failWhatsApp = await whatsFail(req)
                            const failMail = await mailFail(req)
                            bodyRes = { ...bodyRes, tenant, welcomeWhatsApp: failWhatsApp, welcomeMail: failMail }
                        } else {
                            const welcome = await whatsWelcome(req)
                            const welcomeMail = await mailWelcome(req)
                            bodyRes = { ...bodyRes, tenant, welcomeWhatsApp: welcome, welcomeMail: welcomeMail }
                            // bodyRes = { ...bodyRes, tenant, welcomeMail: welcomeMail }
                            // app.api.logger.logInfo({ log: { line: JSON.stringify(body), sConsole: true } })
                        }
                        res.status(200).send(bodyRes)
                    } else {
                        res.status(400).send('Erro ao inserir dados')
                    }
                }
                // Se existir a inscrição, o plano e o comprador, então retorna mensagem de erro e envia mensagem de falha por email e WhatsApp
                else if (uniqueSubscriptionPlanBuyer) {
                    console.log('Plano e comprador já registrados');
                    getSubscription = uniqueSubscriptionPlanBuyer.idSubscription
                    getBuyer = uniqueSubscriptionPlanBuyer.idBuyer
                    let msgError = `Usuário (e-mail: "${bodyData.buyer.email}") já cadastrado neste plano: ${bodyData.subscription.plan.name}`
                    req.body.data = { ...req.body.data, tenant: { msgError } }
                    mailFail(req)
                    whatsFail(req)
                    res.status(200).send(req.body.data.tenant.msgError)
                }
                // Se existir o comprador, mas o plano é diferente, então registra nova inscrição com o plan_name diferente, muda o status da inscrição anterior para inativo, altera o id_subscrition do buyer para a nova subscription e altera o plano do tenant
                else if (uniqueBuyer && !uniqueSubscriptionPlanBuyer) {
                    console.log('Troca de plano');
                    // Registra nova inscrição
                    getSubscription = await setSubscription(req, getEvent[0])
                    // Muda o status da inscrição anterior para inativo
                    await app.db(`${dbPrefix}_api.${tabelaSubscriptions}`).update({ status: STATUS_INACTIVE }).where({ id: uniqueBuyer.idSubscription })
                    // Altera o id_subscrition do buyer para a nova subscription
                    await app.db(`${dbPrefix}_api.${tabelaBuyers}`).update({ id_subscription: getSubscription }).where({ id: uniqueBuyer.idBuyer })
                    // Altera o plano do tenant
                    const updateTen = await updateTenant({ plan_name: uniqueBuyer.plan_name, subscriber_code: subscriber_code }, { plan_name: plan_name, status: STATUS_ACTIVE, maxUsers: 3, maxConnections: 1 })
                    // Envia mensagem de boas vindas por email e WhatsApp
                    req.body.data.last_plan_name = uniqueBuyer.plan_name
                    const mailPlan = await mailPlanChange(req)
                    const whatsPlan = await whatsPlanChange(req)
                    bodyRes = { mailPlan, whatsPlan, updateTen }
                    res.status(200).send(bodyRes)
                } else {
                    res.status(400).send('Erro ao inserir dados')
                }
            } catch (error) {
                const erro = 'Erro ao inserir dados: ' + error
                res.status(400).send(erro)
            }
        } else if (event == 'SWITCH_PLAN') {
        } else if (event == 'SUBSCRIPTION_CANCELLATION') {
        } else {
            const bodyFail = {
                msg: "Evento desconecido",
                ...body
            }
            res.status(200).send(bodyFail)
        }
    }

    // Registra o evento recebido e envia email e WhatsApp informando
    const setEvent = async (req) => {
        const body = { ...req.body }
        mailGeneral('Evento Hotmart recebido', `Evento: ${body.event} - Transação: ${body.data.purchase.transaction}`, 'nao-responda@azulbot.com.br');
        const text = [
            `Evento Hotmart recebido!`,
            `Evento:  ${body.event} - Transação: ${body.data.purchase.transaction}!`
        ];
        whatsGeneral(text, ['558281499024', '558296051985'])
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

    /**
     * Recebe e executa a criação de um novo tenant a partir de uma requisião de compra: event == 'PURCHASE_APPROVED'
     * @param {*} req 
     * @returns 
     */
    const setTenant = async (req) => {
        const bodyData = { ...req.body.data }
        let plano = planoBasic
        switch (bodyData.subscription.plan.name) {
            case "Basic": plano = planoBasic; break;
            case "Master": plano = planoMaster; break;
            case "Premium": plano = planoPremium; break;
        }
        // userName deve conter o primeiro e último nome do comprador se disponível
        let userName = bodyData.buyer.name.split(' ')
        if (userName.length > 1) userName = `${userName[0]} ${userName[userName.length - 1]}`
        else userName = bodyData.buyer.name
        const bodyTo = {
            "status": "active",
            "name": bodyData.buyer.name,
            ...plano,
            "acceptTerms": true,
            "email": bodyData.buyer.email,
            "password": randomstring.generate(6).toUpperCase(),
            "userName": userName,
            "identity": bodyData.subscription.subscriber.code,
            "asaasCustomerId": bodyData.purchase.transaction,
            "profile": "admin",
            "trial": "disabled",
            "trialPeriod": 0
        }
        const endpoint = `${apiWats.superHost}/tenantApiStoreTenant`
        const headerAuthorization = apiWats.superHostToken
        try {
            const response = await axios.post(endpoint, bodyTo, { headers: { Authorization: headerAuthorization } })
                .then(response => {
                    if (response.data.tenant.id) return { success: true, ...bodyTo }
                    else {
                        mailGeneral('Erro ao criar tenant', `Erro ao criar tenant: ${response.response}`, 'nao-responda@azulbot.com.br')
                        return { success: false, msgError: response, ...bodyTo }
                    }
                })
                .catch(error => {
                    const errorBody = 'error.response.data.error'
                    try {
                        mailGeneral('Erro ao criar tenant', `Erro ao criar tenant: ${error.response.data.error}`, 'nao-responda@azulbot.com.br')
                    } catch (error) {
                        errorBody += `; ${error}`
                    }
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })

                    return error.response.data.error
                })
            return response
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return error
        }
    }

    /**
     * Recebe e executa o update de um tenant existente a partir de uma requisião de troca de plano
     * @param {*} ondPlan 
     * @param {*} newPlan 
     * @returns 
     */
    const updateTenant = async (oldPlan, newPlan) => {
        // comparar os dois objetos e enviar um update para api tenantApiUpdateTenant com os dados novos        
        let plano = planoBasic
        switch (newPlan.plan_name) {
            case "Basic": plano = planoBasic; break;
            case "Master": plano = planoMaster; break;
            case "Premium": plano = planoPremium; break;
        }
        const bodyTo = {
            "status": newPlan.status == STATUS_ACTIVE ? "active" : "inactive",
            "maxUsers": plano.maxUsers,
            "maxConnections": plano.maxConnections,
            "identity": oldPlan.subscriber_code
        }
        const endpoint = `${apiWats.superHost}/tenantApiUpdateTenant`
        const headerAuthorization = apiWats.superHostToken
        const tenantUpgrades = await setTenantUpgrades(bodyTo)
        // const response = await axios.post(endpoint, bodyTo, { headers: { Authorization: headerAuthorization } })
        //     .then(response => {
        //         if (response.data.id) return { success: true, ...bodyTo }
        //         else {
        //             mailGeneral('Erro ao editar tenant', `Erro ao editar tenant: ${response.response}`, 'nao-responda@azulbot.com.br')
        //             return { success: false, msgError: response, ...bodyTo }
        //         }
        //     })
        //     .catch(error => {
        //         let errorBody = 'error.response.data.error'
        //         try {
        //             mailGeneral('Erro ao editar tenant', `Erro ao editar tenant: ${error.response.data.error}`, 'nao-responda@azulbot.com.br')
        //         } catch (error) {
        //             errorBody += `; ${error}`
        //         }
        //         app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })

        //         return error.response.data.error
        //     })
        return tenantUpgrades
    }

    // Conectar no servidor Postgres e executar a query de update
    const setTenantUpgrades = async (bodyTo) => {
        const { Pool } = require('pg');
        const pool = new Pool({
            user: zproEnv.POSTGRES_USER,
            host: zproEnv.POSTGRES_HOST,
            database: zproEnv.POSTGRES_DB,
            password: zproEnv.POSTGRES_PASSWORD,
            port: zproEnv.POSTGRES_PORT,
        });

        const query = `UPDATE public."Tenants" SET "maxUsers"=$1, "maxConnections"=$2, "status" = $3 WHERE "identity" = $4`;
        const values = [bodyTo.maxUsers, bodyTo.maxConnections, bodyTo.status, bodyTo.identity];

        try {
            const res = await pool.query(query, values);
            pool.end();
            return res.rowCount;
        } catch (error) {
            pool.end();
            return error.stack;
        }
    };

    const setSubscription = async (req, idEvent) => {
        const bodyData = { ...req.body.data }
        /*            
            evento = notNull()
            created_at = notNull()
            status = defaultTo(10)
            id_event = notNull()
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
            subscriber_code = notNullable()
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
        // Se bodyData.buyer.address.country_iso == 'BR', então bodyData.buyer.checkout_phone deve iniciar com '55' e o valor deve ser alterado em req.body.data.buyer.checkout_phone para que o WhatsApp envie a mensagem corretamente
        let checkout_phone = bodyData.buyer.checkout_phone
        if (bodyData.buyer.address.country_iso == 'BR') {
            if (!checkout_phone.startsWith('55')) checkout_phone = `55${checkout_phone}`
            req.body.data.buyer.checkout_phone = checkout_phone
        }
        const bodyTo = {
            status: STATUS_ACTIVE,
            evento: evId,
            created_at: created_at = moment().format('YYYY-MM-DD HH:mm:ss'),
            id_subscription: idSubscription,
            subscriber_code: bodyData.subscription.subscriber.code,
            document: bodyData.buyer.document,
            name: bodyData.buyer.name,
            email: bodyData.buyer.email,
            checkout_phone: checkout_phone,
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
        if (env != 'production') return true
        if (!bodyData.buyer) return
        try {
            await transporterBot.sendMail({
                from: `"${bodyData.product.name}" <nao-responda@azulbot.com.br>`, // sender address
                to: `${bodyData.buyer.email}`, // list of receivers
                bcc: ['tommendespereira@gmail.com', 'mxdearaujo@gmail.com'], // cópia oculta para a Azulbot
                subject: `Bem-vindo ao ${bodyData.product.name}`, // Subject line
                text: `Olá ${bodyData.buyer.name.split(' ')[0]}!\n
                        Parabéns ${bodyData.buyer.name.split(' ')[0]} por sua aquisição, o ${bodyData.product.name} - ${bodyData.subscription.plan.name} ✔
                        Agora você faz parte do time ${bodyData.product.name}!\n
                        Para acessar o sistema utilize o link abaixo:\n
                        https://bot.azulbot.com.br/#/login\n
                        Criei uma senha aleatória para você mas sugiro que troque já no primeiro acesso: ${bodyData.tenant.password}\n
                        Atenciosamente,\nTime ${bodyData.product.name}`,


                html: `<p><b>Olá ${bodyData.buyer.name.split(' ')[0]}!</b></p>
            <p>Parabéns ${bodyData.buyer.name.split(' ')[0]} por sua aquisição, o ${bodyData.product.name} - ${bodyData.subscription.plan.name} ✔</p>
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
     * Função utilizada para envio de mensagem de falha por email
     * @param {*} req 
     * @param {*} res 
     */
    const mailFail = async (req) => {
        const bodyData = { ...req.body.data }
        if (env != 'production') return true
        if (!bodyData.buyer) return
        try {
            await transporterBot.sendMail({
                from: `"${bodyData.product.name}" <nao-responda@azulbot.com.br>`, // sender address
                to: `${bodyData.buyer.email}`, // list of receivers
                bcc: ['tommendespereira@gmail.com', 'mxdearaujo@gmail.com'], // cópia oculta para a Azulbot
                subject: `Problemas no paraíso 😬`, // Subject line
                text: `Puxa vida, ${bodyData.buyer.name.split(' ')[0]}! Não conseguimos registrar seu perfil no ${bodyData.product.name}\n
                        Ao tentar, recebemos a seguinte mensagem do ${bodyData.product.name}: ""${bodyData.tenant.msgError}""\n
                        Se você acredita que essa mensagem está errada, por favor, entre em contato conosco.\n
                        Mas se for, por exemplo, um erro de digitação, por favor, tente novamente.\n
                        Por outro lado, se você já é cliente, por favor, acesse o sistema com seu login e senha. E se você não lembra sua senha, clique em "Esqueci minha senha" na tela de login (${azulbotLinks.login}) e siga as instruções.\n
                        Atenciosamente\nTime ${bodyData.product.name}`,


                html: `<p><b>Puxa vida, ${bodyData.buyer.name.split(' ')[0]}!</b></p>
            <p>Não conseguimos registrar seu perfil no ${bodyData.product.name}!</p>
            <p>Ao tentar, recebemos a seguinte mensagem do ${bodyData.product.name}: <b>${bodyData.tenant.msgError}</b></p>
            <p>Se você acredita que essa mensagem está errada, por favor, entre em contato conosco.</p>
            <p>Mas se for, por exemplo, um erro de digitação, por favor, tente novamente.</p>
            <p>Por outro lado, se você já é cliente, por favor, acesse o sistema com seu login e senha. E se você não lembra sua senha, clique em "Esqueci minha senha" na tela de login (${azulbotLinks.login}) e siga as instruções.</p>
            <p>Atenciosamente</p>
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
     * Função utilizada para envio de mensagem de troca de plano por email
     * @param {*} req 
     * @param {*} res 
     */
    const mailPlanChange = async (req) => {
        const bodyData = { ...req.body.data }
        if (env != 'production') return true
        if (!bodyData.buyer) return
        try {
            await transporterBot.sendMail({
                from: `"${bodyData.product.name}" <nao-responda@azulbot.com.br>`, // sender address
                to: `${bodyData.buyer.email}`, // list of receivers
                bcc: ['tommendespereira@gmail.com', 'mxdearaujo@gmail.com'], // cópia oculta para a Azulbot
                subject: `Solicitação de mudança de plano no ${bodyData.product.name}`, // Subject line
                text: `${bodyData.buyer.name.split(' ')[0]}, recebemos seu pedido de mudança de plano ""${bodyData.product.name}"" do ${bodyData.last_plan_name} para o ${bodyData.subscription.plan.name}\n
                        A mudança passa a valer a partir de agora!\n
                        Se você acredita que essa mudança foi um engano, por favor, entre em contato conosco.\n
                        Atenciosamente\nTime ${bodyData.product.name}`,


                html: `<p><b>${bodyData.buyer.name.split(' ')[0]}, recebemos seu pedido de mudança de plano <b>${bodyData.product.name}</b> do ${bodyData.last_plan_name} para o ${bodyData.subscription.plan.name}</b></p>
            <p>A mudança passa a valer a partir de agora!</p>
            <p>Se você acredita que essa mudança foi um engano, por favor, entre em contato conosco.</p>
            <p>Atenciosamente</p>
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
     * Função utilizada para envio de mensagem em geral por email
     * @param {*} subject 
     * @param {*} msg 
     * @param {*} to 
     * @returns 
     */
    const mailGeneral = async (subject, msg, to) => {
        if (env != 'production') return true
        try {
            await transporterBot.sendMail({
                from: `"Azulbot" <nao-responda@azulbot.com.br>`, // sender address
                to,
                bcc: ['tommendespereira@gmail.com', 'mxdearaujo@gmail.com'], // cópia oculta para a Azulbot
                subject, // Subject line
                text: msg, // body plain text
                html: msg, // body htnl text
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
     * Função utilizada para envio de mensagem em geral por email
     * @param {*} subject 
     * @param {*} msg 
     * @param {*} to 
     * @returns 
     */
    const whatsGeneral = async (msg, to) => {
        try {
            if (env == 'production') {
                if (typeof to === 'string') sendMessage({ phone: to, message: msg })
                    .then(() => app.api.logger.logInfo({ log: { line: `Mensagem whatsGeneral enviada com sucesso para ${to}`, sConsole: true } }))
                    .catch(error => app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } }))
                else if (typeof to === 'object') {
                    for (let index = 0; index < to.length; index++) {
                        const element = to[index];
                        sendMessage({ phone: element, message: msg })
                            .then(() => app.api.logger.logInfo({ log: { line: `Mensagem whatsGeneral enviada com sucesso para ${element}`, sConsole: true } }))
                            .catch(error => app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } }))
                    }
                }
            }
            else {
                console.log('Corpo da mensagem geral por WhatsApp');
                for (let index = 0; index < msg.length; index++) {
                    const element = msg[index];
                    console.log(index + 1, element);
                }
            }
            return msg
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
                `Parabéns ${bodyData.buyer.name.split(' ')[0]} por sua aquisição, o ${bodyData.product.name} - ${bodyData.subscription.plan.name}!`,
                `Agora você faz parte do time ${bodyData.product.name}!`,
                `Para acessar o sistema utilize o link abaixo:`,
                `https://bot.azulbot.com.br/#/login`,
                `Criei uma senha aleatória para você mas sugiro que troque já no primeiro acesso:`,
                `${bodyData.tenant.password}`,
                `Time ${bodyData.product.name}`
            ];

            if (env == 'production') sendMessage({ phone: `${bodyData.buyer.checkout_phone}`, message: text })
                .then(() => app.api.logger.logInfo({ log: { line: `Mensagem whatsWelcome enviada com sucesso para ${bodyData.buyer.checkout_phone}`, sConsole: true } }))
                .catch(error => app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } }))
            else {
                console.log('Corpo da mensagem de boas vindas por WhatsApp');
                for (let index = 0; index < text.length; index++) {
                    const element = text[index];
                    console.log(index + 1, element);
                }
            }
            return text
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            res.status(400).send(error)
        }
    }
    /**
     * Função utilizada para envio de mensagem de falha por whatsapp
     * @param {*} req 
     * @param {*} res 
     */
    const whatsFail = async (req) => {
        const bodyData = { ...req.body.data }
        if (!bodyData.buyer) return
        try {
            const text = [
                `Problemas no paraíso, ${bodyData.buyer.name.split(' ')[0]} 😬! Não conseguimos registrar seu perfil no ${bodyData.product.name}!`,
                `Ao tentar, recebemos a seguinte mensagem do ${bodyData.product.name}: *${bodyData.tenant.msgError}*`,
                `Se você acredita que essa mensagem está errada, por favor, entre em contato conosco.`,
                `Mas se for, por exemplo, um erro de digitação, por favor, tente novamente.`,
                `Por outro lado, se você já é cliente, por favor, acesse o sistema com seu login e senha. E se você não lembra sua senha, clique em "Esqueci minha senha" na tela de login (${azulbotLinks.login}) e siga as instruções.`,
                `Atenciosamente\nTime ${bodyData.product.name}`
            ];
            if (env == 'production') sendMessage({ phone: `${bodyData.buyer.checkout_phone}`, message: text })
                .then(() => app.api.logger.logInfo({ log: { line: `Mensagem whatsFail enviada com sucesso para ${bodyData.buyer.checkout_phone}`, sConsole: true } }))
                .catch(error => app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } }))
            else {
                console.log('Corpo da mensagem de falha por WhatsApp');
                for (let index = 0; index < text.length; index++) {
                    const element = text[index];
                    console.log(index + 1, element);
                }
            }
            return text
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            res.status(400).send(error)
        }
    }
    /**
     * Função utilizada para envio de mensagem de troca de plano por whatsapp
     * @param {*} req 
     * @param {*} res 
     */
    const whatsPlanChange = async (req) => {
        const bodyData = { ...req.body.data }
        if (!bodyData.buyer) return
        try {
            const text = [
                `${bodyData.buyer.name.split(' ')[0]}, recebemos seu pedido de mudança de plano *${bodyData.product.name}* do ${bodyData.last_plan_name} para o ${bodyData.subscription.plan.name}!`,
                `A mudança passa a valer a partir de agora!`,
                `Se você acredita que essa mudança foi um engano, por favor, entre em contato conosco.`,
                `Atenciosamente\nTime ${bodyData.product.name}`
            ];
            if (env == 'production') sendMessage({ phone: `${bodyData.buyer.checkout_phone}`, message: text })
                .then(() => app.api.logger.logInfo({ log: { line: `Mensagem whatsFail enviada com sucesso para ${bodyData.buyer.checkout_phone}`, sConsole: true } }))
                .catch(error => app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } }))
            else {
                console.log('Corpo da mensagem de falha por WhatsApp');
                for (let index = 0; index < text.length; index++) {
                    const element = text[index];
                    console.log(index + 1, element);
                }
            }
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

            // const body = {
            //     "number": messageBody.phone,
            //     "body": `*AzulBot:*\n${element}`,
            //     "externalKey": "{{SecretKey}}"
            // }
            // await axios.post(apiWats.host, body, config)
            const body = {
                "number": messageBody.phone,
                "text": `*AzulBot:*\n${element}`
            }
            await axios.post(apiWats.evo, body)
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
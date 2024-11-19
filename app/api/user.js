
const randomstring = require("randomstring")
const { emailAdmin, appName } = require("../config/params")
const { baseVivazulUrl, dbPrefix, apiWats, jasperServerU, jasperServerK } = require("../.env")
const { STATUS_INACTIVE, STATUS_WAITING, STATUS_PASS_EXPIRED, STATUS_SUSPENDED, STATUS_SUSPENDED_BY_TKN, STATUS_ACTIVE,
    STATUS_DELETE, MINIMUM_KEYS_BEFORE_CHANGE, TOKEN_VALIDE_MINUTES } = require("../config/userStatus")
const axios = require('axios')
const moment = require('moment')
const welcomeUserMessages = require('../config/ia-models/welcomeUserMessages.js')
const newUserMessages = require('../config/ia-models/newUserMessages.js')
const concludeRegistrationMessages = require('../config/ia-models/concludeRegistrationMessages.js')
const noRepeatMessages = require('../config/ia-models/noRepeatMessages.js')
const incorrectKeyPassMsgs = require('../config/ia-models/incorrectKeyPassMsgs.js')
const noUserFoundMessages = require('../config/ia-models/noUserFoundMessages.js')

module.exports = app => {
    const { existsOrError, notExistsOrError, equalsOrError, isValidEmail, emailOrError, noAccessMsg, isValidCelPhone, cpfOrError, isValue, isBooleanOrError, booleanOrError } = app.api.validation
    const { titleCase, encryptPassword, comparePassword } = app.api.facilities
    const { transporter } = app.api.mailer
    const tabela = `users`
    const tabelaAlias = 'Usuários'
    const tabelaKeys = 'users_keys'
    const tabelaParams = 'params'
    const tabelaFinParametros = 'fin_parametros'

    /** 
     * Esta função vai tratar as seguintes situações de signup
     * 
     * #1 - Se o solicitante já tem perfil, então deve redirecionar para a tela de login
     * #2 - Se não tem perfil tenta localizar nos schemas dos clientes e se localizado:
     *      I - Se não tem um telefone válido deve informar que deve corrigir isso antes de prosseguir
     *      II - Se tiver um telefone válido informado
     *          a) Deve localizar entre os schemas dos clientes e devolver os dados para então prosseguir com a criação da senha
     *          b) Se não tem um email válido deve sugerir a inclusão. Isso deve ocorrer no frontend
     * #3 - Se não tem perfil e não é localizado nos schemas dos clientes todos os dados tornam-se obrigatórios exceto o id
     */
    const signup = async (req, res) => {
        const body = { ...req.body }
        let registered = false;
        try {
            existsOrError(body.name, 'Nome não informado')
            existsOrError(body.fantasia, 'Nome Fantasia não informado')
            existsOrError(body.email, 'E-mail não informado')
            emailOrError(body.email, 'E-mail informado está num formato inválido')
            existsOrError(body.password, 'Senha não informada')
            existsOrError(body.confirmPassword, 'Confirmação de Senha não informada')
            equalsOrError(body.password, body.confirmPassword, 'Senhas não conferem')
            existsOrError(body.telefone, 'Número de WhatsApp não informado')
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(400).send({ msg: error })
        }
        body.initial_schema_description = body.fantasia
        body.telefone = body.telefone.replace(/([^\d])+/gim, "")
        body.email = body.email.trim().toLowerCase()

        /**
         * Tenta localizar o usuário a partir do cpf informado
        */
        const userFromDB = await app.db(tabela)
            .select('id', 'email', 'name', 'telefone', 'status')
            .where({ email: body.email }).first()
        const isStatusActive = (userFromDB && userFromDB.status == STATUS_ACTIVE) || false

        /**
         * #1 - Se o solicitante já tem perfil:
         *      a) Se é um usuário ativo então deve redirecionar para a tela de login
         *      b) Se ainda necessita confirmar o token de acesso deve ser informado
         */
        if (userFromDB && userFromDB.id) {
            registered = true
            let msg = `O e-mail informado já se encontra registrado. `
            if (isStatusActive)
                msg += `Por favor prossiga para o login ou se esqueceu sua senha então poderá recuperá-la.`
            else
                msg += `Mas o sistema ainda não recebeu o seu token de confirmação.`
            return res.status(200).send({
                registered: registered,
                isStatusActive: isStatusActive,
                msg: msg,
                data: userFromDB
            })
        }

        /**
         * Se for informado um e-mail bloqueia a duplicidade de e-mails
         */
        if (body.email) {
            try {
                const userEmail = await app.db(tabela).where({ email: body.email }).first()
                if (userEmail && !isStatusActive) notExistsOrError(userEmail.email, 'E-mail já registrado')
            } catch (error) {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
                return res.status(400).send({ msg: error })
            }
        }

        /**
         * #2 - Se não tem perfil e já informou os dados necessários para a criação do perfil:
        */
        if (body.name && body.email && body.password && body.telefone) {
            /**
             * Bloqueia a duplicidade de celulares
             */
            if (body.telefone)
                try {
                    isValidCelPhone(body.telefone, 'Número de WhatsApp informado é inválido')
                    // const userCelPhone = await app.db(tabela).select('telefone').where({ telefone: body.telefone }).first()
                    // if (userCelPhone) notExistsOrError(userCelPhone.telefone, 'Número de WhatsApp já registrado')
                } catch (error) {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
                    return res.status(400).send({ msg: error })
                }

            try {
                if (typeof isValidPassword(body.password) === 'string') throw isValidPassword(body.password)
            } catch (error) {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
                return res.status(400).send({
                    isInvalidPassword: true,
                    msg: error
                })
            }

            // Dados necessários agrupados
            // Criação de um novo registro
            const nextEventID = await app.db(`${dbPrefix}_api.sis_events`).select(app.db.raw('max(id) as count')).first()

            // Variáveis da criação de um novo registro
            body.evento = nextEventID.count + 1
            const now = Math.floor(Date.now() / 1000)
            body.password_reset_token = randomstring.generate(8).toUpperCase() + '_' + Number(now + TOKEN_VALIDE_MINUTES * 60)
            body.status = STATUS_WAITING
            body.created_at = new Date()

            const password = encryptPassword(body.password)
            const bodyToMessage = { ...body }

            delete body.id
            delete body.confirmPassword
            delete body.password
            delete body.fantasia
            await app.db(tabela)
                .insert(body)
                .then(async (ret) => {
                    body.id = ret[0]
                    req.body = body
                    bodyToMessage.id = body.id
                    await mailyToken(bodyToMessage)
                    let newUserDestin = `${baseVivazulUrl}/user-unlock/${bodyToMessage.id}?tkn=${bodyToMessage.password_reset_token}`
                    if (bodyToMessage.whats_groups >= 4 && bodyToMessage.whats_msgs >= 4) newUserDestin = `${baseVivazulUrl}/user-unlock/${bodyToMessage.id}?tkn=${bodyToMessage.password_reset_token}`
                    const welcomeUserMessages = {
                        phone: `55${bodyToMessage.telefone}`,
                        message: [
                            `Olá ${bodyToMessage.name.split(' ')[0]}! Estamos confirmando sua inscrição ✔`,
                            `Para liberar seu acesso, informe dentro dos próximos ${TOKEN_VALIDE_MINUTES} minutos o token a seguir: ${bodyToMessage.password_reset_token.split('_')[0]}\n`,
                            `Ou, se preferir, pode apenas acessar este link para liberar seu acesso: ${newUserDestin}`
                        ]
                    }
                    sendMessage(welcomeUserMessages)
                    // registrar o evento na tabela de eventos
                    const { createEventIns } = app.api.sisEvents
                    createEventIns({
                        "notTo": ['created_at', 'password', 'password_reset_token', 'evento'],
                        "next": body,
                        "request": req,
                        "evento": {
                            "evento": `Novo perfil de usuário`,
                            "tabela_bd": "user",
                        }
                    })

                    // Criação do registro da senha
                    const userKey = {}
                    const nextEventID = await app.db(`${dbPrefix}_api.sis_events`).select(app.db.raw('max(id) as count')).first()
                    userKey.evento = nextEventID.count + 1
                    userKey.password = password
                    userKey.status = STATUS_ACTIVE
                    app.db(tabelaKeys)
                        .insert({
                            created_at: new Date(),
                            evento: userKey.evento,
                            status: userKey.status,
                            password: userKey.password,
                            id_users: body.id
                        })
                        .then(() => {
                            const { createEventIns } = app.api.sisEvents
                            createEventIns({
                                "notTo": ['created_at', 'password', 'evento'],
                                "next": userKey,
                                "request": req,
                                "evento": {
                                    "evento": `Registro de senha de usuário`,
                                    "tabela_bd": "users_keys",
                                }
                            })
                        })
                        .catch(error => {
                            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
                            return res.status(500).send({ msg: error })
                        })

                    app.api.logger.logInfo({ log: { line: `Novo de perfil de usuário! Usuário: ${body.name}`, sConsole: true } })

                    return res.json({
                        data: body,
                        msg: [
                            `Olá ${body.name.split(' ')[0]}!`,
                            `Estamos confirmando sua inscrição ✔`,
                            `Para liberar seu acesso, informe dentro dos próximos ${TOKEN_VALIDE_MINUTES} minutos o token que enviamos em seu email`
                        ]
                    })
                })
                .catch(error => {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
                    return res.status(500).send({ msg: error })
                })
        }
    }
    /**
     * Gera e envia um token e uma URL (apenas no email registrado) para criação de uma nova senha
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    const requestPasswordReset = async (req, res) => {
        let user = { ...req.body }
        console.log('requestPasswordReset', user);
        
        try {
            existsOrError(user.email, 'E-mail não informado')
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(200).send(error)
        }
        const thisUser = await app.db(tabela)
            .where({ email: user.email })
            .first()
        try {
            existsOrError(thisUser, await showRandomMessage())
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}. E-mail: ${user.cpf}`, sConsole: true } })
            return res.status(200).send(error)
        }

        let password_reset_token = undefined
        const now = Math.floor(Date.now() / 1000)
        let validate = 0
        if (thisUser.password_reset_token && thisUser.password_reset_token.split('_').length > 0) validate = thisUser.password_reset_token.split('_')[1]
        if (validate > (now - 60)) {
            // Se o token estiver dentro da validade menos um minuto então não gera outro
            mailyPasswordReset(thisUser)
            whatsPasswordReset(thisUser)
            return res.status(200).send({
                id: thisUser.id,
                msg: `Te enviamos uma senha temporária. Verifique seu email${thisUser.email ? (' (' + thisUser.email + ')') : ''} e ou WhatsApp${thisUser.telefone ? (' (55' + thisUser.telefone + ')') : ''} para concluir a operação!`,
                token: thisUser.password_reset_token
            })
        } else {
            // Editar perfil de um usuário inserindo um token de renovação e um time
            // registrar o evento na tabela de eventos
            const { createEvent } = app.api.sisEvents
            const evento = await createEvent({
                "request": req,
                "evento": {
                    "id_user": thisUser.id,
                    "evento": `Criação de token de troca de senha de usuário`,
                    "classevento": `requestPasswordReset`,
                    "id_registro": null
                }
            })

            thisUser.evento = evento
            password_reset_token = randomstring.generate(8).toUpperCase() + '_' + Number(now + TOKEN_VALIDE_MINUTES * 60)
            // try {
            app.db(tabela)
                .update({
                    evento: evento,
                    updated_at: new Date(),
                    password_reset_token: password_reset_token,
                })
                .where({ email: thisUser.email })
                .then(_ => {
                    req.body = thisUser
                    mailyPasswordReset(thisUser)
                    whatsPasswordReset(thisUser)
                    return res.status(200).send({
                        id: thisUser.id,
                        msg: `Verifique seu email${thisUser.email ? (' (' + thisUser.email + ')') : ''} para concluir a operação!`,
                        token: password_reset_token
                    })
                })
                .catch(msg => {
                    res.status(200).send(error)
                })
        }
    }

    /**
     * Operações de troca de senha
     */
    const passwordReset = async (req, res) => {
        let user = { ...req.body }
        try {
            existsOrError(user.password, 'Senha não informada')
            existsOrError(user.confirmPassword, 'Confirmação de Senha não informada')
            if (user.password != user.confirmPassword) throw 'Senhas não conferem'
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(400).send(error)
        }
        if (!(req.query.tkn || (req.body && req.body.token)))
            return res.status(400).send(await showRandomMessage() || 'Token ausente, inválido ou não corresponde a nenhuma conta em nosso sistema')
        const token = req.query.tkn || req.body.token
        const userFromDB = await app.db(tabela)
            .select('id', 'status', 'email', 'password_reset_token', 'name')
            .where({ id: req.params.id })
            .where(function () {
                this.where(app.db.raw(`SUBSTRING_INDEX(password_reset_token,'_',1) = '${token}'`))
                    .andWhere({ id: req.params.id })
            }).first()
        if (!(userFromDB))
            return res.status(400).send(await showRandomMessage() || 'Token informado é inválido ou não correspondem a nenhuma conta em nosso sistema')

        // verifica se o token é válido em relação ao tempo de criação
        const now = Math.floor(Date.now() / 1000)
        if (userFromDB.password_reset_token.split('_')[1] < now)
            return res.status(400).send('Token expirado!')

        // Localiza as últimas 
        const lastUserKeys = await app.db({ ut: tabelaKeys })
            .select('password')
            .where({ 'id_users': userFromDB.id })
            .orderBy('created_at', 'desc')
            .limit(MINIMUM_KEYS_BEFORE_CHANGE)

        let isMatch = false
        for (const element of lastUserKeys) {
            isMatch = comparePassword(user.password, element.password)
            if (isMatch) {
                return res.status(400).send(await showRandomNoRepeatMessage() || 'Por favor, selecione uma nova senha que não tenha sido usada nas últimas vezes')
            }
        };

        const passTest = user.password
        try {
            if (typeof isValidPassword(passTest) === 'string') throw isValidPassword(passTest)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(200).send({
                isValidPassword: false,
                msg: error
            })
        }

        user.password = encryptPassword(user.password)
        delete user.confirmPassword

        // registrar o evento na tabela de eventos
        const { createEvent } = app.api.sisEvents
        const evento = await createEvent({
            "request": req,
            "evento": {
                "id_user": userFromDB.id,
                "evento": `Nova de senha do usuário ${userFromDB.id} ${userFromDB.email}`,
                "classevento": `password-reset`,
                "id_registro": userFromDB.id,
                "tabela_bd": "users_keys"
            }
        })

        await app.db(tabela)
            .update({
                status: STATUS_ACTIVE,
                updated_at: new Date(),
                password_reset_token: null
            })
            .where({ id: userFromDB.id })
        delete user.password_reset_token

        user.evento = evento
        user.status = STATUS_ACTIVE
        app.db(tabelaKeys)
            .insert({
                created_at: new Date(),
                evento: user.evento,
                status: user.status,
                password: user.password,
                id_users: userFromDB.id
            })
            .then(_ => {
                return res.status(200).send({
                    isValidPassword: true,
                    msg: 'Senha criada/alterada com sucesso!'
                })
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
                return res.status(500).send({ msg: error })
            })
    }

    /**
     * Função para o desbloqueio de usuário por link de email/WhatsApp
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    const unlock = async (req, res) => {
        if (!(req.query.tkn || (req.body && req.body.token)))
            return res.status(400).send(await showRandomMessage() || 'Token ausente, inválido ou não corresponde a nenhuma conta em nosso sistema')
        const token = req.query.tkn || req.body.token
        const userFromDB = await app.db(tabela)
            .select('id', 'status', 'email', 'password_reset_token', 'name')
            .where(function () {
                this.where(app.db.raw(`SUBSTRING_INDEX(password_reset_token,'_',1) = '${token}'`))
                    .andWhere({ id: req.params.id })
            }).first()

        if (!(userFromDB))
            return res.status(400).send({
                msg: await showRandomMessage() || 'Token informado é inválido ou não correspondem a nenhuma conta em nosso sistema'
            })

        const now = Math.floor(Date.now() / 1000)
        let expirationTimOk = false
        if (userFromDB.password_reset_token) expirationTimOk = Number(userFromDB.password_reset_token.split('_')[1]) > now

        if (!expirationTimOk)
            return res.status(200).send({
                msg: 'O token informado é inválido ou já foi utilizado'
            })

        const user = userFromDB

        user.status = STATUS_ACTIVE
        user.multiCliente = '1'
        // registrar o evento na tabela de eventos
        const { createEventUpd } = app.api.sisEvents
        const evento = await createEventUpd({
            "notTo": ['created_at', 'password', 'password_reset_token', 'evento'],
            "last": userFromDB,
            "next": user,
            "request": req,
            "evento": {
                "evento": `Liberação de perfil de usuário`,
                "tabela_bd": "user",
            }
        })
        user.evento = evento
        user.status = STATUS_ACTIVE
        user.updated_at = new Date()
        user.password_reset_token = null
        app.db(tabela)
            .update(user)
            .where({ id: user.id })
            .then(_ => {
                if (userFromDB.email)
                    mailyUnlocked(userFromDB)
                whatsUnlocked(userFromDB)
                app.api.logger.logInfo({ log: { line: `Usuário autorizado a usar o sistema! Usuário: ${userFromDB.name}`, sConsole: true } })
                return res.status(200).send({ msg: 'Usuário autorizado a usar o sistema! Obrigado por sua confirmação' })
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
                return res.status(500).send({ msg: error })
            })
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

    /**
     * Função utilizada para envio/reenvio do token por WhatsApp
     * @param {*} req 
     * @param {*} res 
     */
    const whatsToken = async (req, res) => {
        try {
            const userFromDB = await app.db(tabela).where({ id: req.body.id }).first()
            existsOrError(userFromDB, await showRandomMessage())
            const now = Math.floor(Date.now() / 1000)
            if (!(userFromDB.password_reset_token && userFromDB.password_reset_token.split('_')[1] > now)) {
                userFromDB.password_reset_token = randomstring.generate(8).toUpperCase() + '_' + Number(Math.floor(Date.now() / 1000) + TOKEN_VALIDE_MINUTES * 60)
                await app.db(tabela)
                    .update({ password_reset_token: userFromDB.password_reset_token })
                    .where({ id: userFromDB.id })
            }

            let newUserDestin = `${baseVivazulUrl}/user-unlock/${userFromDB.id}?tkn=${userFromDB.password_reset_token}`
            if (userFromDB.whats_groups >= 4 && userFromDB.whats_msgs >= 4) newUserDestin = `${baseVivazulUrl}/user-unlock/${userFromDB.id}?tkn=${userFromDB.password_reset_token}`

            const text = `Olá ${userFromDB.name}!\nEstamos confirmando sua inscrição ✔\nPara liberar seu acesso, por favor acesse o link abaixo ou utilize o código ${userFromDB.password_reset_token.split('_')[0]} na tela de login.\n${newUserDestin}\nAtenciosamente,\nTime ${appName}`;
            const bodyMessage = {
                phone: `55${userFromDB.telefone}`,
                message: text
            }
            sendMessage(bodyMessage).then(_ => {
                if (req.method === 'PATCH') {
                    res.send(`Token enviado com sucesso para 55${userFromDB.telefone}`)
                    app.api.logger.logInfo({ log: { line: `Mensagem whatsToken enviada com sucesso para 55${userFromDB.telefone}`, sConsole: true } })
                }
                else return userFromDB.password_reset_token
            })
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            res.status(400).send(error)
        }
    }

    /**
     * Função utilizada para envio/reenvio do token por email
     * @param {*} req 
     * @param {*} res 
     */
    const mailyToken = async (req, res) => {
        const body = req.method && req.method === 'PATCH' ? { ...req.body } : req
        try {
            const userFromDB = await app.db(tabela)
                .where(function () {
                    if (body.id) this.where({ id: body.id })
                    else this.orWhere({ email: body.email })
                        .orWhere({ email: body.email })
                }).first()
            existsOrError(userFromDB, await showRandomMessage())
            // Se houver password_reset_token, verifique se ainda é válido
            // Não não for válido ou não existir então crie um novo
            const now = Math.floor(Date.now() / 1000)
            if (!(userFromDB.password_reset_token && userFromDB.password_reset_token.split('_')[1] > now)) {
                userFromDB.password_reset_token = randomstring.generate(8).toUpperCase() + '_' + Number(Math.floor(Date.now() / 1000) + TOKEN_VALIDE_MINUTES * 60)
                await app.db(tabela)
                    .update({ password_reset_token: userFromDB.password_reset_token })
                    .where({ id: userFromDB.id })
            }

            if (userFromDB.email) {
                let newUserDestin = `${baseVivazulUrl}/user-unlock/${userFromDB.id}?tkn=${userFromDB.password_reset_token}`
                if (userFromDB.whats_groups >= 4 && userFromDB.whats_msgs >= 4) newUserDestin = `${baseVivazulUrl}/user-unlock/${userFromDB.id}?tkn=${userFromDB.password_reset_token}`
                await transporter.sendMail({
                    from: `"${appName}" <contato@vivazul.com.br>`, // sender address
                    to: `${userFromDB.email}`, // list of receivers
                    subject: `Bem-vindo ao ${appName}`, // Subject line
                    text: `Olá ${userFromDB.name}!\n
                Estamos confirmando sua inscrição ✔
                Para liberar seu acesso, por favor acesse o link abaixo ou utilize o código ${userFromDB.password_reset_token.split('_')[0]} na tela de login.\n
                ${newUserDestin}\n
                Atenciosamente,\nTime ${appName}`,
                    html: `<p><b>Olá ${userFromDB.name}!</b></p>
                <p>Estamos confirmando sua inscrição ✔</p>
                <p>Para liberar seu acesso utilize uma das seguinte opções:</p>
                <ul>
                <li>Clique <a href="${newUserDestin}">aqui</a></li>
                <li>Acesse o link ${newUserDestin}</li>
                <li>Ou utilize o código <strong><code>${userFromDB.password_reset_token.split('_')[0]}</code></strong> na tela de login</li>
                </ul>
                <p>Atenciosamente,</p>
                <p><b>Time ${appName}</b></p>`,
                }).then(_ => {
                })
            }
            transporter.sendMail({
                from: `"${appName}" <contato@vivazul.com.br>`, // sender address
                to: `${emailAdmin}`, // list of receivers
                subject: `Novo usuário ${appName}`, // Subject line
                text: `Estamos confirmando a inscrição de um novo usuário\n
                ${userFromDB.name}: ${userFromDB.email ? userFromDB.email : 'Não informado'}✔\n
                Atenciosamente,\n
                Time ${appName}`,
                html: `<p>Estamos confirmando a inscrição de um novo usuário</p>
                <p>${userFromDB.name}✔</p>
                <p>Atenciosamente,</p>
                <p><b>Time ${appName}</b></p>`,
            }).then(_ => {
                if (req.method === 'PATCH') res.send(`E-mail enviado com sucesso para ${userFromDB.email}! Por favor verifique sua caixa de entrada`)
                else return userFromDB.password_reset_token
            })
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(500).send({ msg: error })
        }
    }

    /**
     * Função utilizada para envio de email de atualização de senha
     * @param {*} req 
     * @param {*} res 
     */
    const mailyPasswordReset = async (req, res) => {
        try {
            const user = await app.db(tabela)
                .where({ email: req.email }).first()
            existsOrError(user, await showRandomMessage())
            let newUserDestin = `${baseVivazulUrl}/password-reset?q=${user.id}&tkn=${user.password_reset_token}`
            if (user.whats_groups >= 4 && user.whats_msgs >= 4) newUserDestin = `${baseVivazulUrl}/password-reset?q=${user.id}&tkn=${user.password_reset_token}`
            const bodyEmail = {
                from: `"${appName}" <contato@vivazul.com.br>`, // sender address
                to: `${user.email}`, // list of receivers
                subject: `Alteração de senha ${appName}`, // Subject line
                text: `Olá ${user.name}!\n
                Para atualizar/criar sua senha, por favor acesse o link abaixo.\n
                Lembre-se de que esse link tem validade de ${TOKEN_VALIDE_MINUTES} minutos.\n
                ${newUserDestin}\n
                Atenciosamente,\nTime ${appName}`,
                html: `<p><b>Olá ${user.name}!</b></p>
                <p>Para atualizar/criar sua senha, por favor acesse o link abaixo.</p>
                <p>Lembre-se de que esse link tem validade de ${TOKEN_VALIDE_MINUTES} minutos.</p>
                ${user.password_reset_token ? `<p>Você necessitará informar o token a seguir para liberar sua nova senha: <strong>${user.password_reset_token.split('_')[0]}</strong></p>` : ''}
                <a href="${newUserDestin}">${newUserDestin}</a>
                <p>Atenciosamente,</p>
                <p><b>Time ${appName}</b></p>`,
            }
            await transporter.sendMail(bodyEmail).then(() => app.api.logger.logInfo({ log: { line: `Email password-reset enviado com sucesso para ${user.email}`, sConsole: true } }))
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            res.status(400).send(error)
        }
    }
    /**
     * Função utilizada para envio de mensagem de atualização de senha
     * @param {*} req 
     * @param {*} res 
     */
    const whatsPasswordReset = async (req, res) => {
        try {
            const user = await app.db(tabela)
                .where({ email: req.email }).first()
            existsOrError(user, await showRandomMessage())
            let newUserDestin = `${baseVivazulUrl}/password-reset?q=${user.id}&tkn=${user.password_reset_token}`
            if (user.whats_groups >= 4 && user.whats_msgs >= 4) newUserDestin = `${baseVivazulUrl}/password-reset?q=${user.id}&tkn=${user.password_reset_token}`
            const text = [
                `Olá ${user.name}!`,
                `Para atualizar/criar sua senha, por favor acesse o link abaixo`,
                `Lembre-se de que esse link tem validade de ${TOKEN_VALIDE_MINUTES} minutos`,
                `${newUserDestin}`,
                `Time ${appName}`
            ];
            sendMessage({ phone: `55${user.telefone}`, message: text })
                .then(() => app.api.logger.logInfo({ log: { line: `Mensagem whatsPasswordReset enviada com sucesso para 55${user.telefone}`, sConsole: true } }))
                .catch(error => app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } }))
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            res.status(400).send(error)
        }
    }

    /**
     * Função utilizada para enviar email de confirmação de novo usuário
     * @param {*} req 
     * @param {*} res 
     */
    const mailyUnlocked = async (req, res) => {
        try {
            const user = await app.db(tabela)
                .where({ email: req.email }).first()
            existsOrError(user, await showRandomMessage())
            await transporter.sendMail({
                from: `"${appName}" <contato@vivazul.com.br>`, // sender address
                to: `${user.email}`, // list of receivers
                subject: `Usuário liberado`, // Subject line
                text: `Olá ${user.name}!\n
                Estamos felizes que conseguiu liberar seu acesso.\n
                A partir de agora poderá acessar e utilizar o sistema.\n
                Sempre que precisar, solicite suporte pelo nosso canal exclusivo em: 81 98718-6424.\n
                Nosso horário de atendimento é de segunda a sexta-feira, das 8h às 12h e das 13h30 às 17h30\n
                Atenciosamente,\nTime ${appName}`,
                html: `<p><b>Olá ${user.name}!</b></p>
                <p>Estamos felizes que conseguiu liberar seu acesso.</p>
                <p>A partir de agora poderá acessar e utilizar o sistema.</p>
                <p>Sempre que precisar, solicite suporte pelo nosso canal exclusivo em: <a href="https://wa.me/5581987186424" target="_blank">81 98718-6424</a>.</p>
                <p>Nosso horário de atendimento é de segunda a sexta-feira, das 8h às 12h e das 13h30 às 17h30</p>
                <p>Atenciosamente,</p>
                <p><b>Time ${appName}</b></p>`,
            })
                .then(() => app.api.logger.logInfo({ log: { line: `Email mailyUnlocked enviado com sucesso para ${user.email}`, sConsole: true } }))
                .catch(error => app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } }))
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            res.status(400).send(error)
        }
    }
    /**
     * Função utilizada para enviar email de confirmação de novo usuário
     * @param {*} req 
     * @param {*} res 
     */
    const whatsUnlocked = async (req, res) => {
        try {
            const user = await app.db(tabela)
                .where({ email: req.email }).first()
            existsOrError(user, await showRandomMessage())
            const text = [
                `Olá ${user.name}!\nEstamos felizes que conseguiu liberar seu acesso`,
                `A partir de agora poderá acessar e utilizar o sistema.\nSempre que precisar, solicite suporte pelo nosso canal exclusivo em: 81 98718-6424.\nNosso horário de atendimento é de segunda a sexta-feira, das 8h às 12h e das 13h30 às 17h30\n`,
                `Te desejamos sucesso`,
                `Time ${appName}`
            ];
            sendMessage({ phone: `55${user.telefone}`, message: text })
                .then(() => app.api.logger.logInfo({ log: { line: `Mensagem whatsUnlocked enviada com sucesso para 55${user.telefone}`, sConsole: true } }))
                .catch(error => app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } }))
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            res.status(400).send(error)
        }
    }

    function isValidPassword(params) {
        // Expressão regular atualizada para incluir apenas @, # e $
        const regex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$])(?!.*['"`])(?!.*[\s])(?!.*[_-]{2})[A-Za-z\d@#$]{8,}$/
        const teste = regex.test(params)
        if (!teste) {
            const msgs = "A senha informada não atende aos requisitos mínimos de segurança. Necessita conter ao menos oito caracteres e ter ao menos uma letra maiúscula, "
                + "uma letra minúscula, um dígito numérico, um dos seguintes caracteres especiais @#$, não pode conter aspas simples ou duplas e "
                + "não pode conter espaços em branco"
            return msgs
        }
        return teste
    }

    const save = async (req, res) => {
        let user = { ...req.body }

        user.cpf = user.cpf.replace(/([^\d])+/gim, "")

        if (req.params.id) user.id = req.params.id

        if (!req.originalUrl.startsWith('/users')) user.gestor = false

        const sql = app.db(tabela)

        try {
            existsOrError(user.schema_id, 'Faltou infomar o cliente do usuário')
            existsOrError(user.id_empresa, 'Informe a empresa padrão do usuário')
            existsOrError(user.name, 'Nome não informado')
            existsOrError(user.email, 'E-mail não informado')
            const emailUnique = await app.db(tabela).where({ email: user.email }).first()
            if (emailUnique && emailUnique.id != user.id) throw 'E-mail já cadastrado'
            existsOrError(user.cpf, 'CPF não informado')
            const cpfUnique = await app.db(tabela).where({ cpf: user.cpf }).first()
            if (cpfUnique && cpfUnique.id != user.id) throw 'CPF já cadastrado'
            // existsOrError(user.email, 'E-mail não informado')
            existsOrError(user.telefone, 'Telefone não informado')
            const telefoneUnique = await app.db(tabela).where({ telefone: user.telefone }).first()
            if (telefoneUnique && telefoneUnique.id != user.id) throw 'Telefone já cadastrado'
            if ((user.password || user.confirmPassword) && user.password != user.confirmPassword) {
                existsOrError(user.password, 'Senha não informada')
                existsOrError(user.confirmPassword, 'Confirmação de Senha inválida')
                equalsOrError(user.password, user.confirmPassword, 'Senhas não conferem')
            } else if (!user.password) {
                delete user.password
            }
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(400).send(error)
        }

        // // Apenas gestores e admins podem selecionar alçadas de usuários
        // if (!(user.gestor >= 1 || user.admin >= 1)) {
        //     delete user.admin
        //     delete user.gestor
        //     delete user.multiCliente
        // }

        if (user.email && !isValidEmail(user.email))
            return res.status(400).send('E-mail inválido')

        if (user.password && user.confirmPassword)
            user.password = encryptPassword(user.password)

        delete user.confirmPassword
        delete user.schema_description
        delete user.j_user
        delete user.j_paswd
        if (user.id) {
            // Variáveis da edição de um registro
            // registrar o evento na tabela de eventos
            const { createEventUpd } = app.api.sisEvents
            const evento = await createEventUpd({
                "notTo": ['created_at', 'password_reset_token', 'evento'],
                "last": await app.db(tabela).where({ id: user.id }).first(),
                "next": user,
                "request": req,
                "evento": {
                    "evento": `Alteração de perfil de usuário`,
                    "tabela_bd": "user",
                }
            })

            app.api.logger.logInfo({ log: { line: `Alteração de perfil de usuário! Usuário: ${user.name}`, sConsole: true } })

            user.evento = evento
            user.updated_at = new Date()

            const rowsUpdated = await app.db(tabela)
                .update(user)
                .where({ id: user.id })
                .then(_ => {
                    return res.json(user)
                })
                .catch(error => {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
                    return res.status(500).send({ msg: error })
                })
            existsOrError(rowsUpdated, 'Usuário não foi encontrado')
        } else {
            // Variáveis da criação de um novo registro
            // registrar o evento na tabela de eventos
            const { createEvent } = app.api.sisEvents
            const evento = await createEvent({
                "request": req,
                "evento": {
                    "evento": `Criação de novo usuário`,
                    "tabela_bd": "user",
                }
            })

            user.evento = evento
            user.created_at = new Date()
            app.api.logger.logInfo({ log: { line: `Criação de novo usuário! Usuário: ${user.name}`, sConsole: true } })
            const rowsInserted = await app.db(tabela)
                .insert(user)
                .then((user) => {
                    const data = { id: user[0] }
                    return res.json(data)
                })
                .catch(error => {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
                    return res.status(500).send({ msg: error })
                })
            existsOrError(rowsInserted, 'Usuário não foi inserido')
        }
    }

    const get = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            if (!(uParams && (uParams.admin + uParams.gestor) >= 1)) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const page = req.query.page || 1
        const key = req.query.key ? req.query.key : undefined
        const sql = app.db({ us: tabela }).select(app.db.raw('count(*) as count'))
        // .where(app.db.raw(`us.status = ${STATUS_ACTIVE}`))
        if (key)
            sql.where(function () {
                this.where('us.name', 'like', `%${key}%`)
            })
        if (uParams.multiCliente <= 1) {
            // Não troca cliente nem domínio
            sql.where({ 'us.schema_id': uParams.schema_id })
        }
        if (uParams.gestor < 1) {
            // Se não for gestor vÊ apenas seus registros
            sql.where({ 'us.id': req.user.id })
        }
        const result = await app.db.raw(sql.toString())
        count = parseInt(result[0][0].count) || 0

        const ret = app.db({ us: tabela })
            .join({ sc: 'schemas_control' }, 'sc.id', 'us.schema_id')
            .select("us.status", "us.id", "us.name", "us.cpf", "us.email", "us.telefone", "sc.schema_description",
                "us.admin", "us.gestor", "us.multiCliente", "us.cadastros", "us.pipeline", "us.pv",
                "us.comercial", "us.fiscal", "us.financeiro", "us.comissoes", "us.agente_v",
                "us.agente_arq", "us.agente_at", "us.time_to_pas_expires")
        // .where(app.db.raw(`us.status = ${STATUS_ACTIVE}`))
        if (key)
            ret.where(function () {
                this.where('us.name', 'like', `%${key}%`)
            })
        if (uParams.multiCliente == '0') {
            // Não troca cliente nem domínio
            ret.where({ 'us.schema_id': uParams.schema_id })
        }
        if (uParams.gestor < 1) {
            // Se não for gestor vÊ apenas seus registros
            ret.where({ 'us.id': req.user.id })
        }
        ret.orderBy("us.name")

        ret.then(users => {
            return res.json({ data: users, count })
        })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
                return res.status(500).send({ msg: error })
            })
    }

    const getById = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();

        if (req.user.id != req.params.id && !(uParams && (uParams.admin + uParams.gestor) >= 1)) return res.status(401).send(`${noAccessMsg} "Exibição de ${tabelaAlias}"`)
        app.db({ us: tabela })
            .join({ sc: 'schemas_control' }, 'sc.id', 'us.schema_id')
            .select("us.status", "us.name", "us.cpf", "us.email", "us.telefone", "us.id", "us.admin", "us.gestor", "us.multiCliente", "us.cadastros",
                "us.pipeline", "us.pipeline_params", "us.pv", "us.comercial", "us.fiscal", "us.financeiro", "us.comissoes", "us.prospeccoes",
                "us.at", "us.protocolo", "us.uploads", "us.agente_v", "us.agente_arq", "us.agente_at", "us.time_to_pas_expires", "sc.schema_description", "us.schema_id", "us.id_empresa")
            .where(app.db.raw(`us.id = ${req.params.id}`))
            .where(app.db.raw(`us.status = ${STATUS_ACTIVE}`))
            .first()
            .then(users => {
                users.j_user = jasperServerU
                users.j_paswd = jasperServerK
                delete users.password
                // Antes de enviar os dados, converta todos os valores int para string
                for (const key in users) {
                    if (typeof users[key] === 'number') users[key] = users[key].toString()
                }
                return res.json(users)
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
                return res.status(500).send({ msg: error })
            })
    }

    const getByCpf = async (req, res) => {
        let user = req.user
        try {
            cpfOrError()
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
        }
        app.db(tabela)
            .select('dominio', 'cliente', 'email', 'telefone', 'name', 'cpf')
            .where({ cpf: req.params.cpf, status: STATUS_ACTIVE })
            .first()
            .then(users => {
                return res.json(users)
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
                return res.status(500).send({ msg: error })
            })
    }

    const getByToken = async (req, res) => {
        if (!req.params.token) return res.status(401).send('Unauthorized')
        const sql = app.db(tabela)
            .select('users.id', app.db.raw('REPLACE(users.name, " de", "") as name'), app.db.raw('substring(users.password_reset_token, 1, 8) as password_reset_token'))
            .where(app.db.raw(`users.password_reset_token = '${req.params.token}'`))
            .first()
        sql.then(user => {
            const username = user.name.split(" ")
            user.name = `${username[0]}${username[1] ? ` ${username[1]}` : ''}`
            return res.json(user)
        })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
                return res.status(500).send({ msg: error })
            })
    }

    const remove = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.admin >= 2, `${noAccessMsg} "Exclusão de ${tabelaAlias}"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        try {
            // registrar o evento na tabela de eventos
            const last = await app.db(tabela).where({ id: req.params.id }).first()
            const { createEventUpd } = app.api.sisEvents
            const evento = await createEventUpd({
                "notTo": ['created_at', 'password', 'password_reset_token', 'evento'],
                "last": last,
                "next": user,
                "request": req,
                "evento": {
                    "classevento": "Remove",
                    "evento": `Exclusão de usuário`,
                    "tabela_bd": "user",
                }
            })
            const rowsUpdated = await app.db(tabela)
                .update({
                    status: STATUS_DELETE,
                    evento: evento
                })
                .where({ id: req.params.id })
            existsOrError(rowsUpdated, 'Usuário não foi encontrado')

            res.status(204).send()
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            res.status(400).send(error)
        }
    }

    const getByFunction = async (req, res) => {
        const func = req.params.func
        switch (func) {
            case 'gsm':
                getSisMessages(req, res)
                break;
            case 'gss':
                getSisStatus(req, res)
                break;
            case 'gtt':
                getTokenTime(req, res)
                break;
            case 'gbf':
                getByField(req, res)
                break;
            case 'glf':
                getListByField(req, res)
                break;
            case 'gag':
                getAgentesVendas(req, res)
                break;
            default:
                res.status(404).send('Função inexitente')
                break;
        }
    }

    const getByField = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }

        const fieldName = req.query.fld
        const value = req.query.vl
        const oper = req.query.oper || undefined
        const select = req.query.slct
        const status = req.query.status || undefined
        const order = req.query.order || undefined

        const first = req.query.first && req.query.first == true
        const tabelaDomain = `${dbPrefix}_api.${tabela}`
        const ret = app.db(tabelaDomain)

        if (select) {
            // separar os campos e retirar os espaços
            const selectArr = select.split(',').map(s => s.trim())
            ret.select(selectArr)
        }
        let operComp = '='
        switch (oper) {
            case '1': operComp = '='; break;
            case '2': operComp = '>'; break;
            case '3': operComp = '<'; break;
            case '4': operComp = '>='; break;
            case '5': operComp = '<='; break;
            case '6': operComp = '<>'; break;
            default: operComp = '='; break;
        }
        ret.where(app.db.raw(`${fieldName} ${operComp} '${value}'`))
        if (status) ret.where({ status: status })
        else ret.whereIn('status', [STATUS_SUSPENDED, STATUS_ACTIVE])

        if (order) ret.orderBy(order)

        if (first) {
            ret.first()
        }
        ret.then(body => {
            const count = body.length
            return res.json({ data: body, count })
        }).catch(error => {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        })
    }


    // Lista de registros por campo
    const getListByField = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }

        const fieldName = req.query.fld
        const value = req.query.vl
        const select = req.query.slct
        const orderBy = req.query.order

        const first = req.query.first && req.query.first == true
        const tabelaDomain = `${dbPrefix}_api.${tabela}`
        const ret = app.db(tabelaDomain)

        if (select) {
            // separar os campos e retirar os espaços
            const selectArr = select.split(',').map(s => s.trim())
            ret.select(selectArr)
        }

        ret.where(app.db.raw(`${fieldName} = ${value}`))
            .where({ status: STATUS_ACTIVE })

        if (first) {
            ret.first()
        }

        if (orderBy) ret.orderBy(orderBy)
        else ret.orderBy('created_at')
        ret.then(body => {
            const count = body.length
            return res.json({ data: body, count })
        }).catch(error => {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
            return res.status(500).send(error)
        })
    }

    // Lista de agentes de negócios
    const getAgentesVendas = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            if (!uParams) throw `${noAccessMsg} "Exibição de ${tabelaAlias}"`
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }

        const tabelaDomain = `${dbPrefix}_api.${tabela}`
        const tabelaPipelineDomain = `${dbPrefix}_${uParams.schema_name}.pipeline`
        const ret = app.db({ u: tabelaDomain }).select('u.id', 'u.name')
            .join({ p: tabelaPipelineDomain }, 'p.id_com_agentes', 'u.id')
            .where('u.agente_v', '>=', '1')
            .groupBy('u.id', 'u.name')
            .orderBy('u.name')
            .then(body => {
                return res.json(body)
            }).catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). Error: ${error}`, sConsole: true } })
                return res.status(500).send(error)
            })
    }

    const getSisMessages = async (req, res) => {
        const user = req.user
        if (user.id) {
            app.db('sis_messages').where({ status: STATUS_ACTIVE, id_user: user.id })
                .then(msgs => {
                    res.send(msgs)
                })
        }
    }

    const getSisStatus = async (req, res) => {
        const user = req.user
        if (user.id) {
            app.db('sis_messages').where({ status: STATUS_ACTIVE, status_user: STATUS_SUSPENDED, id_user: user.id }).first()
                .then(msgs => {
                    let status_user = true
                    if (msgs && moment().format() >= msgs.valid_from && moment().format() <= msgs.valid_to) status_user = false
                    res.send(status_user)
                })
        }
    }

    const getTokenTime = async (req, res) => {
        const userFromDB = await app.db(tabela)
            .select('name', 'email', 'initial_schema_description', 'status', 'password_reset_token')
            .where({ id: req.query.q }).first()
        let tokenCreationTime = 0
        if (userFromDB && userFromDB.password_reset_token) {
            tokenCreationTime = Number(userFromDB.password_reset_token.split('_')[1])
        }

        const now = Math.floor(Date.now() / 1000)
        let expirationTimOk = false
        if (userFromDB && userFromDB.password_reset_token) {
            if (userFromDB.password_reset_token) expirationTimOk = Number(userFromDB.password_reset_token.split('_')[1]) > now
            if (!expirationTimOk) {
                return res.status(200).send({
                    name: userFromDB.name,
                    isTokenValid: false,
                    gtt: 0,
                    msg: 'O token informado ultrapassou o tempo máximo para ser utilizado'
                })
            }
            else {
                const totalTimeRelase = tokenCreationTime - now
                return res.send({
                    initial_schema_description: userFromDB.initial_schema_description,
                    name: userFromDB.name,
                    email: userFromDB.email,
                    isTokenValid: true,
                    gtt: totalTimeRelase
                })
            }
        } else if (userFromDB && userFromDB.status == STATUS_ACTIVE) {
            return res.status(400).send({
                isToken: false,
                msg: 'Este usuário já foi validado. Prossiga para o login'
            })
        } else
            return res.status(400).send({
                isTokenValid: false,
                gtt: 0,
                msg: 'Não há um token válido para este usuário'
            })
    }

    let unshownMessages = noUserFoundMessages.slice(); // create a copy of the messages array

    const showRandomMessage = async () => {
        if (unshownMessages.length > 0) {
            const randomIndex = Math.floor(Math.random() * unshownMessages.length);
            const message = unshownMessages.splice(randomIndex, 1)[0];
            return message
        } else {
            unshownMessages = noUserFoundMessages.slice()
            await showRandomMessage()
        }
    }

    let unshownKeyMessages = incorrectKeyPassMsgs.slice(); // create a copy of the messages array

    const showRandomKeyPassMessage = async () => {
        if (unshownKeyMessages.length > 0) {
            const randomIndex = Math.floor(Math.random() * unshownKeyMessages.length);
            const message = unshownKeyMessages.splice(randomIndex, 1)[0];
            return message
        } else {
            unshownKeyMessages = incorrectKeyPassMsgs.slice()
            await showRandomKeyPassMessage()
        }
    }

    let unshownRepeatMessages = noRepeatMessages.slice(); // create a copy of the messages array

    const showRandomNoRepeatMessage = async () => {
        if (unshownRepeatMessages.length > 0) {
            const randomIndex = Math.floor(Math.random() * unshownRepeatMessages.length);
            const message = unshownRepeatMessages.splice(randomIndex, 1)[0];
            return message
        } else {
            unshownRepeatMessages = noRepeatMessages.slice()
            await showRandomNoRepeatMessage()
        }
    }

    let unconcludeRegistrationMessages = concludeRegistrationMessages.slice(); // create a copy of the messages array

    const showUnconcludedRegistrationMessage = async () => {
        if (unconcludeRegistrationMessages.length > 0) {
            const randomIndex = Math.floor(Math.random() * unconcludeRegistrationMessages.length);
            const message = unconcludeRegistrationMessages.splice(randomIndex, 1)[0];
            return message
        } else {
            unconcludeRegistrationMessages = concludeRegistrationMessages.slice()
            await showUnconcludedRegistrationMessage()
        }
    }

    let unnewUserMessages = newUserMessages.slice(); // create a copy of the messages array

    const showNewUserMessage = async () => {
        if (unnewUserMessages.length > 0) {
            const randomIndex = Math.floor(Math.random() * unnewUserMessages.length);
            const message = unnewUserMessages.splice(randomIndex, 1)[0];
            return message
        } else {
            unnewUserMessages = newUserMessages.slice()
            await showNewUserMessage()
        }
    }

    let unwelcomeUserMessages = welcomeUserMessages.slice(); // create a copy of the messages array

    const showWelcomeUserMessage = async (uName) => {
        if (unwelcomeUserMessages.length > 0) {
            const randomIndex = Math.floor(Math.random() * unwelcomeUserMessages.length);
            const message = unwelcomeUserMessages.splice(randomIndex, 1)[0].replace('####', uName);
            return message
        } else {
            unwelcomeUserMessages = welcomeUserMessages.slice()
            await showWelcomeUserMessage()
        }
    }

    return {
        signup, requestPasswordReset, passwordReset, TOKEN_VALIDE_MINUTES, showRandomMessage, showRandomKeyPassMessage,
        showUnconcludedRegistrationMessage, save, get, getById, getByCpf, getByToken, mailyToken, whatsToken, remove, getByFunction,
        unlock, showWelcomeUserMessage
    }
}
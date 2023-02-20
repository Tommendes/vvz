const { authSecret } = require('../.env.js')
const jwt = require('jwt-simple')
const bcrypt = require('bcrypt-nodejs')

module.exports = app => {
    const STATUS_INACTIVE = 0
    const STATUS_WAITING = 9
    const STATUS_ACTIVE = 10
    const tabela = 'users'
    const signin = async (req, res) => {
        const email = req.body.email
        if (!(req.body.reload && req.body.reload === true) && !(email || req.body.password)) {
            return res.status(400).send('Informe usuário e senha!')
        }
        const user = await app.db(tabela)
            .select('users.*')
            .where(function () {
                this.where({ status: STATUS_ACTIVE })
                    .orWhere({ status: STATUS_WAITING })
            })
            .where(function () {
                this.where({ email: email })
                    .orWhere({ name: email })
                    .orWhere({ cpf: email.replace(/([^\d])+/gim, "") })
            })
            .first()

        if (!(req.body.reload && req.body.reload === true)) {
            if (!user) return res.status(400).send('Usuário não encontrado!')
            if (user && user.status === 0) return res.status(400).send('Usuário aguardando liberação!')
            if (user && !req.body.password) {
                // Signin de usuário
                return res.status(200).send({ id: user.id, cpf: user.cpf, email: user.email, name: user.name, status: user.status })
            }
            let isMatch = false
            if (user) isMatch = bcrypt.compareSync(req.body.password, user.password)
            if (!isMatch) return res.status(400).send('Dados inválidos!')
        }

        const now = Math.floor(Date.now() / 1000)
        const uParams = await app.db('users').where({ id: user.id }).first();
        const expirationTime = now + (uParams.admin >= 1 ? (60 * 60 * 24 * 3) : (60 * 60 * 8)) // três dias ou 8 horas
        const payload = {
            id: user.id,
            status: user.status,
            created_at: user.created_at,
            name: user.name,
            email: user.email,
            telefone: user.telefone,
            cliente: user.cliente,
            dominio: user.dominio,
            admin: user.admin,
            gestor: user.gestor,
            multiCliente: user.multiCliente,
            cadastros: user.cadastros,
            ged: user.ged,
            pv: user.pv,
            comercial: user.comercial,
            fiscal: user.fiscal,
            financeiro: user.financeiro,
            comissoes: user.comissoes,
            agente_v: user.agente_v,
            agente_arq: user.agente_arq,
            agente_at: user.agente_at,
            iat: now,
            exp: expirationTime
        }

        res.json({
            ...payload,
            token: jwt.encode(payload, authSecret)
        })

        app.api.logger.logInfo({ log: { line: `Login bem sucedido: ${user.name}`, sConsole: true } })

        // registrar o evento na tabela de eventos
        const { createEvent } = app.api.sisEvents
        createEvent({
            "request": req,
            "evento": {
                "ip": req.ip,
                "id_user": user.id,
                "evento": `Login no sistema`,
                "classevento": `signin`,
                "id_registro": null
            }
        })
    }

    const validateToken = async (req, res) => {
        const userData = req.body || null
        try {
            if (userData) {
                const token = jwt.decode(userData.token, authSecret)
                if (new Date(token.exp * 1000) > new Date()) {
                    return res.send(true)
                }
                app.api.logger.logInfo({ log: { line: `Token validado com sucesso`, sConsole: true } })
            }
        } catch (e) {
            // problema com o token
        }

        res.send(false)
    }

    return { signin, validateToken }
}
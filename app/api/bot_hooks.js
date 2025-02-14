const randomstring = require("randomstring")
const { dbPrefix, apiWats, azulbotLinks, env, azulbotEnv } = require("../.env")
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
        const body = { ...req.body }
        try {
            existsOrError(body, 'Corpo da requisição não informado')
        } catch (error) {
            return res.status(400, error)
        }

        // console.log('method', body.method);
        // console.log('body', body);
        

        // console.log('msg', body.msg);
        // console.log('ticket', body.ticket);
        

        // /**
        //  * Registra todos os eventos recebidos
        //  */
        mailGeneral('Recepção de hooks: ' + body.method, JSON.stringify(body.msg), 'nao-responda@azulbot.com.br')
        
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

    return { setRequest }
}
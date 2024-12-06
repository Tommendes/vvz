const { dbPrefix, apiWats } = require("../.env")
const schedule = require('node-schedule');
const axios = require('axios');
const moment = require('moment')
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const { SITUACAO_ATIVA, SITUACAO_ENVIADA, SITUACAO_PAUSADA, SITUACAO_CANCELADA } = require('./whats_msgs')
    const { convertWhatsappFormattoHtml } = app.api.facilities
    const tabelaProfiles = 'whats_profiles'
    const tabelaGroups = 'whats_groups'
    const tabelaMsgs = 'whats_msgs'
    const STATUS_ACTIVE = 10
    const STATUS_INACTIVE = 20
    const STATUS_DELETED = 99

    // Retorna os contatos do plugchat 
    const getRequest = async (req, res) => {
        body = { ...req.body }
        try {
            existsOrError(body, 'Corpo da requisição não informado')
        } catch (error) {
            return res.status(400, error)
        }     
        
        app.api.logger.logInfo({ log: { line: JSON.stringify(body), sConsole: true } })
        res.status(200).send(body)
    }

    return { getRequest }
}
const { dbPrefix, speedchat } = require("../.env")
const schedule = require('node-schedule');
const axios = require('axios');
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const urlSpeedChat = `https://www.speedtest.dev.br/api/whatsapp/`
    const urlPlugChat = `https://www.plugchat.com.br/api/whatsapp/`
    const tabelaProfiles = 'whats_profiles'

    const getLocalContacts = async (req, res) => {
        let user = req.user
        const tabelaSchemas = `${dbPrefix}_api.schemas_control`;
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: tabelaSchemas }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            existsOrError(uParams && uParams.chat_account_tkn, `${noAccessMsg} "Exibição de contatos de WhatsApp"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaProfiles}`
        const ret = app.db({ tbl1: tabelaDomain })
            .select('tbl1.id', 'tbl1.name', 'tbl1.phone', 'tbl1.short', 'tbl1.verify', 'tbl1.image')
            .orderBy('tbl1.name', 'tbl1.short', 'tbl1.phone')
            .then(body => {
                const quantidade = body.length
                return res.json({ data: body, count: quantidade })
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            })
    }

    const setContactsInLocal = async (req, res) => {
        let user = req.user
        const tabelaSchemas = `${dbPrefix}_api.schemas_control`;
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: tabelaSchemas }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            existsOrError(uParams && uParams.chat_account_tkn, `${noAccessMsg} "Exibição de contatos de WhatsApp"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        const body = req.body
        for (let i = 0; i < body.length; i++) {
            try {
                existsOrError(body[i].phone, 'Telefone não informado')
            } catch (error) {
                return res.status(400).send(error)
            }
        }
        // return res.status(200).send(body)
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaProfiles}`
        // Criar um update or insert baseado em body.phone
        let errors = []
        let success = 0
        try {
            for (let i = 0; i < body.length; i++) {
                const imageProfile = await getProfileImage(body[i].phone, uParams)
                if (imageProfile && imageProfile.link) body[i].image = imageProfile.link
                const ret = await app.db(tabelaDomain).where({ phone: body[i].phone }).first()
                if (ret) {
                    body[i].updated_at = new Date()
                    await app.db(tabelaDomain).update(body[i]).where({ phone: body[i].phone }).then(() => success++).catch(error => errors.push(error))
                } else {
                    body[i].created_at = new Date()
                    await app.db(tabelaDomain).insert(body[i]).then(() => success++).catch(error => errors.push(error))
                }
            }
            return res.status(200).send({body, errors})
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(500).send(errors)
        }
    }

    const getProfileImage = async (phone, uParams) => {
        const config = {
            headers: {
                'Authorization': uParams.chat_account_tkn
            },
        };
        const url = `${urlPlugChat}profile-picture?phone=${phone}`
        try {
            const data = await axios.get(url, config)
            return data.data
        } catch (error) {

        }
    }

    const getContacts = async (req, res) => {
        let user = req.user
        const tabelaSchemas = `${dbPrefix}_api.schemas_control`;
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: tabelaSchemas }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            existsOrError(uParams && uParams.chat_account_tkn, `${noAccessMsg} "Exibição de contatos de WhatsApp"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const urlQueryes = req.query
        const url = `${urlPlugChat}contacts?page=${urlQueryes.page || 1}&pageSize=${urlQueryes.pageSize || 20}`

        const config = {
            headers: {
                'Authorization': uParams.chat_account_tkn
            },
        };
        axios.get(url, config)
            .then(response => {
                return res.json(response.data)
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                return res.status(500).send(error)
            })
    }

    const getGeneric = async (req, res) => {
        let user = req.user
        const tabelaSchemas = `${dbPrefix}_api.schemas_control`;
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: tabelaSchemas }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            existsOrError(uParams && uParams.chat_account_tkn, `${noAccessMsg} "Exibição de contatos de WhatsApp"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }

        const urlQueryes = req.query
        const urlDestination = urlQueryes.url
        delete urlQueryes.url
        const url = `${urlPlugChat}${urlDestination}?${new URLSearchParams(urlQueryes).toString()}`

        const config = {
            headers: {
                'Authorization': uParams.chat_account_tkn
            },
        };
        axios.get(url, config)
            .then(response => {
                return res.json(response.data)
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                return res.status(500).send(error)
            })
    }

    const getByFunction = async (req, res) => {
        const func = req.params.func
        switch (func) {
            case 'contacts':
                getContacts(req, res)
                break;
            case 'gen':
                getGeneric(req, res)
                break;
            case 'glc':
                getLocalContacts(req, res)
                break;
            case 'scl':
                setContactsInLocal(req, res)
                break;
            default:
                res.status(404).send('Função inexistente')
                break;
        }
    }

    return { getByFunction }
}
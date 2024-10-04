const { dbPrefix, speedchat } = require("../.env")
const schedule = require('node-schedule');
const axios = require('axios');
const moment = require('moment')
module.exports = app => {
    const { existsOrError, notExistsOrError, cpfOrError, cnpjOrError, lengthOrError, emailOrError, isMatchOrError, noAccessMsg } = app.api.validation
    const { convertWhatsappFormattoHtml } = app.api.facilities
    const urlSpeedChat = `https://www.speedtest.dev.br/api/whatsapp/`
    const urlPlugChat = `https://www.plugchat.com.br/api/whatsapp/`
    const tabelaProfiles = 'whats_profiles'
    const STATUS_ACTIVE = 10
    const STATUS_INACTIVE = 20
    const STATUS_DELETED = 99
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

        const filter = req.query.filter || undefined
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaProfiles}`
        const tabelaMsgsDomain = `${dbPrefix}_${uParams.schema_name}.whats_msgs`
        const ret = app.db({ tbl1: tabelaDomain })
            .leftJoin({ msgs: tabelaMsgsDomain }, 'tbl1.phone', 'msgs.phone')
            .select('msgs.schedule', app.db.raw('COUNT(msgs.id) as quant'), 'msgs.situacao', 'msgs.message', 'tbl1.id', 'tbl1.name', 'tbl1.phone', 'tbl1.short', 'tbl1.verify', 'tbl1.image')
        if (filter) {
            ret.where('tbl1.name', 'like', `%${filter}%`)
                .orWhere('tbl1.phone', 'like', `%${filter}%`)
        }
        ret.groupBy('tbl1.id')
            .orderBy('msgs.situacao', 'desc')
            .orderBy('msgs.schedule', 'desc')
            .orderBy('tbl1.name', 'asc')
            .limit(20)

        ret.then(body => {
            body.forEach(element => {
                if (element.schedule) {
                    element.schedule = moment(element.schedule).format('DD/MM/YYYY HH:mm')
                }
            });
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
            return res.status(200).send({ body, errors })
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

    // Este função será responsável por inicializar os contatos no banco de dados local baixando do plugchat os contatos e depois as imagens de perfil
    const initializeContactsInLocal = async (req, res) => {
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


        await app.db(`${dbPrefix}_${uParams.schema_name}.${tabelaProfiles}`).where({ status: STATUS_ACTIVE }).update({ status: STATUS_INACTIVE })

        const url = `${urlPlugChat}contacts?page=1&pageSize=10000`
        const config = {
            headers: {
                'Authorization': uParams.chat_account_tkn
            },
        };
        axios.get(url, config)
            .then(async response => {
                const body = response.data
                // Insere o nono dígito no telefone
                for (let i = 0; i < body.length; i++) {
                    body[i].phone = addNinthDigit(body[i].phone)
                }
                // Inserir contatos no banco de dados local
                app.db(tabelaDomain).insert(body).then((res) => {
                    const count = res.length
                    return res.status(200).send({ count, res })
                }).catch(error => {
                    app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                    res.status(500).send(error)
                })
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                return res.status(500).send(error)
            })
    }

    // Esta função será responsável por atualizar as imagens de perfil do perfil informado a partir do plugchat
    const updateProfileImageInLocal = async (req, res) => {
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

        const phone = req.query.phone
        const imageProfile = await getProfileImage(phone, uParams)
        if (imageProfile && imageProfile.link) {
            const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaProfiles}`
            await app.db(tabelaDomain).update({ image: imageProfile.link }).where({ phone }).then(() => {
                return res.status(200).send(imageProfile)
            }).catch(error => {
                return res.status(500).send(error)
            })
        } else {
            return res.status(404).send('Imagem não encontrada')
        }
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
            case 'icl':
                initializeContactsInLocal(req, res)
                break;
            case 'upl':
                updateProfileImageInLocal(req, res)
            default:
                res.status(404).send('Função inexistente')
                break;
        }
    }

    // Função para Adicionar o Nono Dígito
    function addNinthDigit(phone) {
        // Remove espaços, hifens e parênteses
        phone = phone.replace(/\s|[-()]/g, '');

        // Verifica se o número é do Brasil
        const isBrasil = phone.startsWith('+55') || phone.startsWith('55');

        if (isBrasil) {
            // Remove o código do país para facilitar a verificação
            phone = phone.replace(/^(\+55|55)/, '');

            // Verifica se o número tem 10 dígitos (fixo) ou 11 dígitos (celular)
            if (phone.length === 10) {
                // Número fixo, não adiciona o nono dígito
                return '+55' + phone;
            } else if (phone.length === 11) {
                // Número celular, verifica se precisa adicionar o nono dígito
                const ddd = phone.slice(0, 2);
                const primeiroDigito = phone[2];

                if (['9', '8', '7', '6'].includes(primeiroDigito)) {
                    // Número celular, adiciona o nono dígito se não estiver presente
                    if (phone[2] !== '9') {
                        return '+55' + ddd + '9' + phone.slice(2);
                    }
                }
            }
        }

        // Retorna o número original se não for do Brasil ou não precisar de ajuste
        return phone;
    }
    return { getByFunction }
}
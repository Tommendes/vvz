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
    const tabelaGroups = 'whats_groups'
    const tabelaMsgs = 'whats_msgs'
    const STATUS_ACTIVE = 10
    const STATUS_INACTIVE = 20
    const STATUS_DELETED = 99

    // Retorna os contatos do plugchat 
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
        const url = `${urlPlugChat}contacts?page=${urlQueryes.page || 1}&pageSize=${urlQueryes.pageSize || 999999}`

        const config = {
            headers: {
                'Authorization': uParams.chat_account_tkn
            },
        };
        axios.get(url, config)
            .then(response => {
                const count = response.data.length
                return res.json({ count, data: response.data })
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                return res.status(500).send(error)
            })
    }

    // retorna os contatos presentes no banco de dados local
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
        const pageSize = req.query.pageSize || 99999
        const isGroups = req.query.g || null
        const isContacts = req.query.c || null
        const tabelaProfilesDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaProfiles}`
        const tabelaGroupsDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaGroups}`
        const tabelaMsgsDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaMsgs}`
        // Subconsulta para obter a última mensagem entregue para cada telefone
        const subquery = app.db({ msgs: tabelaMsgsDomain })
            .select('msgs.id_profile', 'msgs.id_group', app.db.raw('COUNT(msgs.id) as quant'), app.db.raw('MAX(msgs.delivered_at) as last_delivered_at'))
            .where('msgs.situacao', 'delivered')
            .groupBy(app.db.raw('COALESCE(msgs.id_profile, msgs.id_group)'));

        // Consulta principal
        let ret = app.db({ tbl1: tabelaProfilesDomain })
        if (isContacts) {
            ret.leftJoin({ last_msgs: subquery }, 'tbl1.id', 'last_msgs.id_profile')
                .leftJoin({ msgs: tabelaMsgsDomain }, function () {
                    this.on('tbl1.id', '=', 'msgs.id_profile')
                        .andOn('last_msgs.last_delivered_at', '=', 'msgs.delivered_at');
                })
                .select('msgs.id as idMessage', 'msgs.schedule', 'last_msgs.quant',
                    'msgs.situacao', 'msgs.message', 'tbl1.id AS id_profile', 'tbl1.name', 'tbl1.phone',
                    'tbl1.short', 'tbl1.verify', 'tbl1.image')
                .where('tbl1.status', STATUS_ACTIVE)
                .groupBy('tbl1.id')
                .orderBy('last_msgs.last_delivered_at', 'desc')
                .orderBy('tbl1.name', 'asc')
        } else if (isGroups) {
            ret = app.db({ tbl1: tabelaGroupsDomain })
                .leftJoin({ last_msgs: subquery }, 'tbl1.id', 'last_msgs.id_group')
                .leftJoin({ msgs: tabelaMsgsDomain }, function () {
                    this.on('tbl1.id', '=', 'msgs.id_group')
                        .andOn('last_msgs.last_delivered_at', '=', 'msgs.delivered_at');
                })
                .select('msgs.id as idMessage', 'msgs.schedule', 'last_msgs.quant',
                    'msgs.situacao', 'msgs.message', 'tbl1.id AS id_profile', 'tbl1.group_name as name', 'tbl1.contact_ids')
                .where('tbl1.status', STATUS_ACTIVE)
                .groupBy('tbl1.id')
                .orderBy('last_msgs.last_delivered_at', 'desc')
                .orderBy('tbl1.group_name', 'asc')
        }

        ret.limit(pageSize)
            .offset(((req.query.page || 1) - 1) * pageSize);
        if (filter) {
            ret.where(function () {
                if (isContacts) this.where('tbl1.name', 'like', `%${filter}%`)
                if (isGroups) this.where('tbl1.group_name', 'like', `%${filter}%`)
                this.orWhere('tbl1.phone', 'like', `%${filter}%`);
            });
        }

        ret.then(async body => {
            for (const element of body) {
                if (isGroups) {
                    const contactIds = JSON.parse(element.contact_ids)
                    delete element.contact_ids
                    element.components = ''
                    const limit = 10
                    const max = contactIds.length > limit ? limit : contactIds.length
                    let quant = 0
                    for (const profile of contactIds) {
                        const contact = await app.db(tabelaProfilesDomain).select('name', 'phone').where({ id: profile }).first()
                        if (contact && contact.name) {
                            const name = contact.name.split(' ')
                            element.components += `${name[0]}${name[name.length - 1] != name[0] ? ' ' + name[name.length - 1] : ''}`
                        } else {
                            element.components += contact.phone
                        }
                        quant++
                        // Se quant for menor que max -1 ou se for menor que max e houver mais de (limit) contatos, acrescentar vírgula
                        if (quant < max - 1 || (quant < max && contactIds.length > limit)) element.components += ', '
                        // Se não, se quant for igual a max -1 e houver menos de 10 contatos, acrescentar 'e'
                        else if (quant == max - 1 && contactIds.length <= limit) element.components += ' e '
                        // Se não, se quant atingir max e houver mais de 10 contatos, parar a iteração e acrescentar ` e mais ${contactIds.length - limit} contatos` no final
                        else if (quant == max && contactIds.length > limit) {
                            element.components += ` e mais ${contactIds.length - limit} contatos  `
                            break;
                        }
                    }
                    // Remover a última vírgula ou o 'e' se houver menos de 10 contatos e remover o espaço em branco
                    element.components = element.components.trim()
                    element.composedName = `${element.name} - ${contactIds.length} contatos`;
                    // Colocar primeira em maiúscula
                    element.composedName = element.composedName.charAt(0).toUpperCase() + element.composedName.slice(1)
                }
                if (isContacts)
                    if (element.name) {
                        element.composedName = `${element.name} +${element.phone}`;
                    } else {
                        element.composedName = `+${element.phone}`;
                    }
                if (element.schedule) {
                    element.schedule = moment(element.schedule).format('DD/MM/YYYY HH:mm')
                }
            }
            const quantidade = body.length
            return res.json({ data: body, count: quantidade })
        })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            })
    }

    const getProfileImage = async (phone, uParams) => {
        const config = {
            headers: {
                'Authorization': uParams.chat_account_tkn
            },
        };
        const url = `${urlPlugChat}profile-picture?phone=${phone}`
        const picture = await axios.get(url, config)
        return picture.data
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

        const tabelaProfilesDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaProfiles}`

        const url = `${urlPlugChat}contacts?page=1&pageSize=99999`
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
                    body[i].status = STATUS_ACTIVE
                    body[i].created_at = new Date()
                }
                // capturar name e phone no bd local, comparar com nome baseado no phone, se não existir, inserir e se existir, atualizar
                const localContacts = await app.db(tabelaProfilesDomain).select('name', 'phone')
                for (let i = 0; i < body.length; i++) {
                    const found = localContacts.find(element => element.phone == body[i].phone)
                    if (found) {
                        try {
                            await app.db(tabelaProfilesDomain).update(body[i]).where({ phone: body[i].phone })
                        } catch (error) {
                            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                        }
                    } else {
                        try {
                            await app.db(tabelaProfilesDomain).insert(body[i])
                        } catch (error) {
                            app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                        }
                    }
                }
                // // Inserir contatos no banco de dados local
                // try {
                //     const insertBody = await app.db(tabelaProfilesDomain).insert(body)
                // } catch (error) {
                //     app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                // }
                const count = body.length
                return res.status(200).send({ count, data: body })
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

        if (imageProfile && imageProfile.link && imageProfile.link != 'null') {
            const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaProfiles}`
            await app.db(tabelaDomain).update({ image: imageProfile.link }).where({ phone }).then(() => {
                return res.status(200).send(imageProfile)
            }).catch(error => {
                return res.status(500).send(error)
            })
        }
    }

    const phoneExists = async (req, res) => {
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
        try {
            existsOrError(phone, 'Telefone não informado')
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(400).send(error)
        }
        const tabelaDomain = `${dbPrefix}_${uParams.schema_name}.${tabelaProfiles}`
        const found = await app.db(tabelaDomain).select('name', 'phone').where({ phone }).first()
        if (found) {
            // Chamar https://www.plugchat.com.br/api/whatsapp/phone-exists/[phone] para saber se o número é válido
            const url = `${urlPlugChat}phone-exists/${phone}`
            const config = {
                headers: {
                    'Authorization': uParams.chat_account_tkn
                },
            };
            axios.get(url, config)
                .then(response => {
                    return res.status(200).send(found)
                })
                .catch(error => {
                    app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
                    return res.status(500).send(error)
                })
        } else {
            return res.status(200).send('Telefone não encontrado no banco de dados local')
        }
    }

    const getByFunction = async (req, res) => {
        const func = req.params.func
        switch (func) {
            case 'contacts':
                getContacts(req, res)
                break;
            case 'lstContacts':
                getListContacts(req, res)
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
                updateProfileImageInLocal(req, res);
                break;
            case 'phx':
                phoneExists(req, res);
                break;
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
                // Número celular, verifica se precisa adicionar o nono dígito
                const ddd = phone.slice(0, 2);
                const primeiroDigito = phone[2];

                if (['9', '8', '7', '6'].includes(primeiroDigito)) {
                    // Número celular, adiciona o nono dígito
                    return '55' + ddd + '9' + phone.slice(2);
                }
            } else if (phone.length === 11) {
                // Número fixo, não adiciona o nono dígito
                return '55' + phone;
            }
        }
        return phone;
    }

    return { getByFunction }
}
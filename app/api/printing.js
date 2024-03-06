const moment = require('moment')
const { dbPrefix, jasperServerUrl, jasperServerU, jasperServerK } = require("../.env")
const JSIntegration = require('../config/jSIntegration')
const { cnpj } = require('cpf-cnpj-validator')
const path = require('path')
const fs = require('fs')
const axios = require('axios')

module.exports = app => {
    const { isMatchOrError, noAccessMsg, existsOrError } = app.api.validation
    const { capitalizeFirstLetter, capitalizeWords } = app.api.facilities
    const STATUS_ACTIVE = 10

    const getByFunction = async (req, res) => {
        const func = req.params.func
        switch (func) {
            case 'oat':
                getReportOat(req, res)
                break;
            case 'proposta':
                getReportProposal(req, res)
                break;
            case 'resumo':
                getReportProposalResume(req, res)
                break;
            default:
                res.status(404).send('Função inexitente')
                break;
        }
    }

    const getReportOat = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        console.log('uParams', uParams);
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.pv >= 1, `${noAccessMsg} "Impressão de OAT"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
        }
        const body = { ...req.body }
        try {
            existsOrError(body.idOat, 'OAT não informada')
        } catch (error) {
            return res.status(400).send(error)
        }
        console.log('body', body);
        const dbSchema = `${dbPrefix}_${uParams.schema_name}`
        const usuario = uParams.name
        const idEmpresa = 1
        const empresa = await app.db({ e: `${dbSchema}.empresa` }).select('e.*').where({ 'e.id': idEmpresa }).first()
        const idOat = req.body.idOat
        const tabelaPvOatDomain = `${dbPrefix}_${uParams.schema_name}.pv_oat`
        const tabelaPvDomain = `${dbPrefix}_${uParams.schema_name}.pv`
        const oat = await app.db({ oat: tabelaPvOatDomain })
            .join({ pv: tabelaPvDomain }, 'pv.id', 'oat.id_pv')
            .select(app.db.raw(`pv.pv_nr, oat.nr_oat`))
            .where({ 'oat.id': idOat, 'oat.status': STATUS_ACTIVE }).first()
        console.log('oat', oat);
        moment.locale('pt-br');
        const fileName = oat.pv_nr.toString().padStart(6, '0') + '_' + oat.nr_oat.toString().padStart(3, '0') + '_' + moment().format('DDMMYYYY_HHmmss')
        console.log('fileName', fileName);
        const optionParameters = {
            "usuario": usuario,
            "idEmpresa": empresa.id,
            "idOat": idOat,
            "dbSchema": dbSchema
        }
        console.log('optionParameters', optionParameters);
        const exportType = body.exportType || 'pdf'
        const fileRootName = 'reports/Vivazul/pv/oat/Oat'

        const jsIntegration = new JSIntegration(
            jasperServerUrl, // URL of the Jasper Server'
            fileRootName, // Path to the Report Unit
            exportType, // Export type
            jasperServerU, // User
            jasperServerK, // Password
            optionParameters // Optional parameters
        )
        console.log('jsIntegration', jsIntegration);
        const data = jsIntegration.execute()
            .then(async (data) => {
                const { createEvent } = app.api.sisEvents
                evento = await createEvent({
                    "request": req,
                    "evento": {
                        id_user: uParams.id,
                        evento: `Impressão de OAT`,
                        classevento: `printing`,
                        id_registro: idOat,
                        tabela_bd: 'pv_oat'
                    }
                })
                res.setHeader("Content-Type", `application/${exportType}`);
                res.setHeader("Content-Disposition", `inline; filename=${fileName}.${exportType}`);
                res.setHeader("Content-Length", data.length);
                if (body.encoding == 'base64') res.send(Buffer.from(data).toString('base64'))
                else
                    res.send(data)
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
                res.send(error)
            });
    }

    const getReportProposal = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.pv >= 1, `${noAccessMsg} "Impressão de Propostas"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
        }
        const body = { ...req.body }
        try {
            existsOrError(body.idProposta, 'Proposta não informada')
        } catch (error) {
            return res.status(400).send(error)
        }
        const dbSchema = `${dbPrefix}_${uParams.schema_name}`
        const usuario = uParams.name
        const idEmpresa = 1
        const empresa = await app.db({ e: `${dbSchema}.empresa` }).select('e.*').where({ 'e.id': idEmpresa }).first()
        const idProposta = req.body.idProposta
        const tabelaPipelineDomain = `${dbPrefix}_${uParams.schema_name}.pipeline`
        const tabelaComPropostasDomain = `${dbPrefix}_${uParams.schema_name}.com_propostas`
        const proposta = await app.db({ proposta: tabelaComPropostasDomain })
            .join({ pipeline: tabelaPipelineDomain }, 'pipeline.id', 'proposta.id_pipeline')
            .select(app.db.raw(`pipeline.documento`))
            .where({ 'proposta.id': idProposta, 'proposta.status': STATUS_ACTIVE }).first()


        moment.locale('pt-br');
        const fileName = 'Proposta_' + proposta.documento.toString().padStart(6, '0') + '_' + moment().format('DDMMYYYY_HHmmss')

        const optionParameters = {
            "usuario": usuario,
            "idEmpresa": empresa.id,
            "idProposta": idProposta,
            "dbSchema": dbSchema
        }

        const exportType = body.exportType || 'pdf'
        const fileRootName = 'reports/Vivazul/com_propostas/model001/ComPropostas'

        const jsIntegration = new JSIntegration(
            jasperServerUrl, // URL of the Jasper Server'
            fileRootName, // Path to the Report Unit
            exportType, // Export type
            jasperServerU, // User
            jasperServerK, // Password
            optionParameters // Optional parameters
        )
        const data = jsIntegration.execute()
            .then(async (data) => {
                const { createEvent } = app.api.sisEvents
                evento = await createEvent({
                    "request": req,
                    "evento": {
                        id_user: uParams.id,
                        evento: `Impressão de Proposta`,
                        classevento: `printing`,
                        id_registro: idProposta,
                        tabela_bd: 'com_propostas'
                    }
                })
                res.setHeader("Content-Type", `application/${exportType}`);
                res.setHeader("Content-Disposition", `inline; filename=${fileName}.${exportType}`);
                res.setHeader("Content-Length", data.length);
                if (body.encoding == 'base64') res.send(Buffer.from(data).toString('base64'))
                else
                    res.send(data)
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
                res.send(error)
            });
    }

    const getReportProposalResume = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.pv >= 1, `${noAccessMsg} "Impressão de Resumo de Propostas"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
        }
        const body = { ...req.body }
        try {
            existsOrError(body.idProposta, 'Proposta não informada')
        } catch (error) {
            return res.status(400).send(error)
        }
        const dbSchema = `${dbPrefix}_${uParams.schema_name}`
        const usuario = uParams.name
        const idEmpresa = 1
        const empresa = await app.db({ e: `${dbSchema}.empresa` }).select('e.*').where({ 'e.id': idEmpresa }).first()
        const idProposta = req.body.idProposta
        const tabelaPipelineDomain = `${dbPrefix}_${uParams.schema_name}.pipeline`
        const tabelaComPropostasDomain = `${dbPrefix}_${uParams.schema_name}.com_propostas`
        const proposta = await app.db({ proposta: tabelaComPropostasDomain })
            .join({ pipeline: tabelaPipelineDomain }, 'pipeline.id', 'proposta.id_pipeline')
            .select(app.db.raw(`pipeline.documento`))
            .where({ 'proposta.id': idProposta, 'proposta.status': STATUS_ACTIVE }).first()


        moment.locale('pt-br');
        const fileName = 'Resumo_' + proposta.documento.toString().padStart(6, '0') + '_' + moment().format('DDMMYYYY_HHmmss')

        const optionParameters = {
            "usuario": usuario,
            "idEmpresa": empresa.id,
            "idProposta": idProposta,
            "dbSchema": dbSchema
        }

        const exportType = body.exportType || 'pdf'
        const fileRootName = 'reports/Vivazul/com_propostas/ComPropostasResumo'

        const jsIntegration = new JSIntegration(
            jasperServerUrl, // URL of the Jasper Server'
            fileRootName, // Path to the Report Unit
            exportType, // Export type
            jasperServerU, // User
            jasperServerK, // Password
            optionParameters // Optional parameters
        )
        const data = jsIntegration.execute()
            .then(async (data) => {
                const { createEvent } = app.api.sisEvents
                evento = await createEvent({
                    "request": req,
                    "evento": {
                        id_user: uParams.id,
                        evento: `Impressão de Resumo do Proposta`,
                        classevento: `printing`,
                        id_registro: idProposta,
                        tabela_bd: 'com_propostas'
                    }
                })
                res.setHeader("Content-Type", `application/${exportType}`);
                res.setHeader("Content-Disposition", `inline; filename=${fileName}.${exportType}`);
                res.setHeader("Content-Length", data.length);
                if (body.encoding == 'base64') res.send(Buffer.from(data).toString('base64'))
                else
                    res.send(data)
            })
            .catch(error => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}:${__line}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
                res.send(error)
            });
    }

    return { getByFunction }
}
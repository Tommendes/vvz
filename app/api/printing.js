const moment = require('moment')
const { dbPrefix, jasperServerUrl, jasperServerU, jasperServerK } = require("../.env")
const JSIntegration = require('../config/jSIntegration')
const { cnpj } = require('cpf-cnpj-validator')
const path = require('path')
const fs = require('fs')

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
            default:
                res.status(404).send('Função inexitente')
                break;
        }
    }

    const getReportOat = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: 'users' }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.pv >= 1, `${noAccessMsg} "Impressão de OAT"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } })
        }
        const body = { ...req.body }
        try {
            existsOrError(body.idOat, 'OAT não informada')
        } catch (error) {
            return res.status(400).send(error)
        }
        const dbSchema = `${dbPrefix}_${uParams.schema_name}`
        const usuario = uParams.name
        const idEmpresa = 1
        const empresa = await app.db({ e: `${dbSchema}.empresa` }).select('e.*').where({ 'e.id': idEmpresa }).first()
        const logoUrl = await app.db({ u: `${dbPrefix}_api.uploads` }).select('u.url').where({ 'u.id': empresa.id_uploads_logo }).first()
        const idOat = req.body.idOat
        const tabelaPvOatDomain = `${dbPrefix}_${uParams.schema_name}.pv_oat`
        const tabelaPvDomain = `${dbPrefix}_${uParams.schema_name}.pv`
        const oat = await app.db({ oat: tabelaPvOatDomain })
            .join({ pv: tabelaPvDomain }, 'pv.id', 'oat.id_pv')
            .select(app.db.raw(`pv.pv_nr, oat.nr_oat`))
            .where({ 'oat.id': idOat, 'oat.status': STATUS_ACTIVE }).first()


        moment.locale('pt-br');
        const fileName = oat.pv_nr.toString().padStart(6, '0') + '_' + oat.nr_oat.toString().padStart(3, '0') + '_' + moment().format('DDMMYYYY_HHmmss')

        const optionParameters = {
            "usuario": usuario,
            "idEmpresa": empresa.id,
            "idOat": idOat,
            "dbSchema": dbSchema,
            "logoUrl": logoUrl.url,
        }
        console.log(optionParameters);

        const exportType = body.exportType || 'pdf'

        const jsIntegration = new JSIntegration(
            jasperServerUrl, // URL of the Jasper Server
            'reports/Vivazul/pv/oat/Oat', // Path to the Report Unit
            exportType, // Export type
            jasperServerU, // User
            jasperServerK, // Password
            optionParameters // Optional parameters
        )
        const data = jsIntegration.execute()
            .then((data) => {
                res.setHeader("Content-Type", `application/${exportType}`);
                res.setHeader("Content-Disposition", `inline; filename=${fileName}.${exportType}`);
                res.setHeader("Content-Length", data.length);
                if (body.encoding == 'base64') res.send(Buffer.from(data).toString('base64'))
                else res.send(data)
            })
            .catch((error) => {
                app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). Error: ${error}`, sConsole: true } });
                res.send(error)
            });
    }

    return { getByFunction }
}
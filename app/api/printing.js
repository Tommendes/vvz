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
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
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
            "dbSchema": dbSchema
        }

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
        const data = jsIntegration.execute()
            .then((data) => {
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

    /*    

        // const username = 'vvz';
        // const password = 'v1V@zull';
        // const url = `http://85.31.231.103:8081/jasperserver/rest_v2/reports/${fileRootName}.${exportType}?usuario=Tom Mendes&idEmpresa=1&idOat=8201&dbSchema=vivazul_bceaa5`
        // const credentials = btoa(`${username}:${password}`);
        // const rep = await axios.get(url, { headers: { Authorization: `Basic ${credentials}` } })
        //     .then((data) => {
        //         const data64 = Buffer.from(data.data)
        //         const data64Length = data64.length
        //         // console.log(data64, data64Length);
        //         res.setHeader("Content-Type", `application/${exportType}`);
        //         res.setHeader("Content-Disposition", `inline; filename=${fileName}.${exportType}`);
        //         res.setHeader("Content-Length", data64Length);
        //         // if (body.encoding == 'base64') res.send(Buffer.from(data).toString('base64'))
        //         // else 
        //         console.log(res);
        //         res.send(data64)
        //     })
        //     .catch((error) => {
        //         app.api.logger.logError({ log: { line: `Error in file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } });
        //         res.send(error)
        //     });

     */

    return { getByFunction }
}
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
            case 'diarioComissionado':
                getReportDiarioComissionado(req, res)
                break;
            case 'posicaoMensal':
                getReportPosicaoComissionado(req, res)
                break;
            case 'finSintetico':
                getReportFinanceiroSintetico(req, res)
                break;
            default:
                res.status(404).send('Função inexitente')
                break;
        }
    }

    const getReportOat = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.pv >= 1, `${noAccessMsg} "Impressão de OAT"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
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
            .select(app.db.raw(`pv.id, pv.pv_nr, oat.nr_oat`))
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
            .then(async (data) => {
                const { createEventPrint } = app.api.sisEvents
                createEventPrint({
                    "notTo": ['created_at', 'evento'],
                    "next": oat,
                    "request": req,
                    "evento": {
                        "classevento": `printing-oat`,
                        "evento": `Impressão de OAT`,
                        "tabela_bd": "pv_oat",
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
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.pv >= 1, `${noAccessMsg} "Impressão de Propostas"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
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
            .select(app.db.raw(`proposta.id, pipeline.documento`))
            .where({ 'proposta.id': idProposta, 'proposta.status': STATUS_ACTIVE }).first()


        moment.locale('pt-br');
        const fileName = 'Proposta_' + proposta.documento.toString().padStart(6, '0') + '_' + moment().format('DDMMYYYY_HHmmss')

        const optionParameters = {
            "usuario": usuario,
            "idEmpresa": empresa.id,
            "idProposta": idProposta,
            "dbSchema": dbSchema,
            "net.sf.jasperreports.timezone" : "America/Recife"
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
                const { createEventPrint } = app.api.sisEvents
                createEventPrint({
                    "notTo": ['created_at', 'evento'],
                    "next": proposta,
                    "request": req,
                    "evento": {
                        "classevento": `printing-proposal`,
                        "evento": `Impressão de Proposta`,
                        "tabela_bd": "com_propostas",
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
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.pv >= 1, `${noAccessMsg} "Impressão de Resumo de Propostas"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
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
            .select(app.db.raw(`proposta.id, pipeline.documento`))
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
                // registrar o evento na tabela de eventos
                const { createEventPrint } = app.api.sisEvents
                createEventPrint({
                    "notTo": ['created_at', 'evento'],
                    "next": proposta,
                    "request": req,
                    "evento": {
                        "classevento": `printing-proposal-resume`,
                        "evento": `Impressão de Resumo do Proposta`,
                        "tabela_bd": "com_propostas",
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

    const getReportDiarioComissionado = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.pv >= 1, `${noAccessMsg} "Impressão de Resumo de Propostas"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        const body = { ...req.body }

        try {
            existsOrError(body.periodo, 'Período não informado')
            existsOrError(body.ano, 'Ano não informado')
            existsOrError(body.mes, 'Mês não informado')
            existsOrError(body.dataInicio, 'Data inicial das liquidações não informada')
            existsOrError(body.dataFim, 'Data final das liquidações não informada')
            existsOrError(body.reportTitle, 'Título do Relatório não informado')
            if (body.tpAgenteRep && ![0, 1, 2, 3].includes(body.tpAgenteRep)) throw 'Tipo de Agente informado inválido'
            if (body.idAgente) {
                const agenteExistes = await app.db({ a: `${dbPrefix}_${uParams.schema_name}.comis_agentes` }).where({ 'a.id': body.idAgente }).first()
                existsOrError(agenteExistes, 'Agente informado é não encontrado')

            }
            existsOrError(body.reportTitle, 'Título do Relatório não informado')
        } catch (error) {
            return res.status(400).send(error)
        }
        const dbSchema = `${dbPrefix}_${uParams.schema_name}`
        const usuario = uParams.name
        const idEmpresa = 1
        const empresa = await app.db({ e: `${dbSchema}.empresa` }).select('e.*').where({ 'e.id': idEmpresa }).first()
        const periodo = body.periodo
        const ano = body.ano
        const mes = body.mes
        const dataInicio = moment(body.dataInicio, 'DD/MM/YYYY').format('YYYY-MM-DD')
        const dataFim = moment(body.dataFim, 'DD/MM/YYYY').format('YYYY-MM-DD')

        const tpAgenteRep = body.tpAgenteRep || 0
        const idAgente = body.idAgente ? `ag.id IN (${body.idAgente})` : '1=1'
        const reportTitle = body.reportTitle

        moment.locale('pt-br');
        let agenteLabel = ''
        switch (tpAgenteRep) {
            case 0:
                agenteLabel = 'Representações'
                break;
            case 1:
                agenteLabel = 'Representadas'
                break;
            case 2:
                agenteLabel = 'Agentes'
                break;
            case 3:
                agenteLabel = 'Terceiros'
                break;
            default:
                agenteLabel = 'Não selecionado'
                break;
        }
        const fileName = reportTitle.replace(' ', '_') + agenteLabel + '_' + moment().format('DDMMYYYY_HHmmss')

        const optionParameters = {
            "usuario": usuario,
            "idEmpresa": empresa.id,
            "dbSchema": dbSchema,
            "periodo": periodo,
            "dataInicio": dataInicio,
            "dataFim": dataFim,
            "ano": ano,
            "mes": mes,
            "tpAgenteRep": tpAgenteRep,
            "idAgente": idAgente,
            "reportTitle": reportTitle,
        }

        const exportType = body.exportType || 'pdf'
        const fileRootName = 'reports/Vivazul/comissionamento/DiarioAgente'

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
                // registrar o evento na tabela de eventos
                const { createEventPrint } = app.api.sisEvents
                createEventPrint({
                    "notTo": ['created_at', 'evento'],
                    "next": {},
                    "request": req,
                    "evento": {
                        "classevento": `printing-commisioning-daily`,
                        "evento": `Impressão de Diário de Comissionamento de Agente`,
                        "tabela_bd": "comissoes",
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

    const getReportPosicaoComissionado = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.pv >= 1, `${noAccessMsg} "Impressão de Resumo de Propostas"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        const body = { ...req.body }
        try {
            existsOrError(body.periodo, 'Período não informado')
            existsOrError(body.dataInicio, 'Data inicial das liquidações não informada')
            existsOrError(body.dataFim, 'Data final das liquidações não informada')
            existsOrError(body.reportTitle, 'Título do Relatório não informado')
            if (body.tpAgenteRep && ![0, 1, 2, 3].includes(body.tpAgenteRep)) throw 'Tipo de Agente informado inválido'
            if (body.idAgente) {
                const agenteExistes = await app.db({ a: `${dbPrefix}_${uParams.schema_name}.comis_agentes` }).where({ 'a.id': body.idAgente }).first()
                existsOrError(agenteExistes, 'Agente informado é não encontrado')

            }
            existsOrError(body.reportTitle, 'Título do Relatório não informado')
        } catch (error) {
            return res.status(400).send(error)
        }
        const dbSchema = `${dbPrefix}_${uParams.schema_name}`
        const usuario = uParams.name
        const idEmpresa = 1
        const empresa = await app.db({ e: `${dbSchema}.empresa` }).select('e.*').where({ 'e.id': idEmpresa }).first()
        const periodo = body.periodo
        const dataInicio = moment(body.dataInicio, 'DD/MM/YYYY').format('YYYY-MM-DD')
        const dataFim = moment(body.dataFim, 'DD/MM/YYYY').format('YYYY-MM-DD')
        const reportTitle = body.reportTitle

        moment.locale('pt-br');
        const fileName = reportTitle.replace(' ', '_') + '_' + moment().format('DDMMYYYY_HHmmss')

        const optionParameters = {
            "usuario": usuario,
            "idEmpresa": empresa.id,
            "dbSchema": dbSchema,
            "periodo": periodo,
            "dataInicio": dataInicio,
            "dataFim": dataFim,
            "reportTitle": reportTitle,
        }

        const exportType = body.exportType || 'pdf'
        const fileRootName = 'reports/Vivazul/comissionamento/PosicaoMensal'

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
                // registrar o evento na tabela de eventos
                const { createEventPrint } = app.api.sisEvents
                createEventPrint({
                    "notTo": ['created_at', 'evento'],
                    "next": {},
                    "request": req,
                    "evento": {
                        "classevento": `printing-commisioning-daily`,
                        "evento": `Impressão de Diário de Comissionamento de Agente`,
                        "tabela_bd": "comissoes",
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

    const getReportFinanceiroSintetico = async (req, res) => {
        let user = req.user
        const uParams = await app.db({ u: `${dbPrefix}_api.users` }).join({ sc: 'schemas_control' }, 'sc.id', 'u.schema_id').where({ 'u.id': user.id }).first();
        try {
            // Alçada do usuário
            isMatchOrError(uParams && uParams.pv >= 1, `${noAccessMsg} "Impressão de Resumo de Propostas"`)
        } catch (error) {
            app.api.logger.logError({ log: { line: `Error in access file: ${__filename} (${__function}). User: ${uParams.name}. Error: ${error}`, sConsole: true } })
            return res.status(401).send(error)
        }
        const body = { ...req.body }
        try {
            existsOrError(body.reportTitle, 'Título do Relatório não informado')
        } catch (error) {
            return res.status(400).send(error)
        }
        let queryes = undefined
        let query = undefined
        let sortField = app.db.raw('tbl1.data_vencimento')
        let valueI = moment().startOf('month').format('YYYY-MM-DD');
        let valueF = moment().endOf('month').format('YYYY-MM-DD');
        if (req.query) {
            queryes = req.query
            query = ''
            for (const key in queryes) {
                let operator = queryes[key].split(':')[0]
                let value = queryes[key].split(':')[1]

                if (key.split(':')[0] == 'field') {
                    let queryField = key.split(':')[1]
                    if (['destinatario_agrupado'].includes(key.split(':')[1])) {
                        const cpfCnpj = value.replace(/([^\d])+/gim, "")
                        const nome = value
                        query += '('
                        switch (operator) {
                            case 'startsWith': operator = `like '${value}%'`
                                break;
                            case 'contains': operator = `regexp("${value.toString().trim().replaceAll(' ', '.+')}")`
                                break;
                            case 'notContains': operator = `not regexp("${value.toString().trim().replaceAll(' ', '.+')}")`
                                break;
                            case 'endsWith': operator = `like '%${value}'`
                                break;
                            case 'notEquals': operator = `!= '${value}'`
                                break;
                            default: operator = `= '${value}'`
                                break;
                        }
                        if (cpfCnpj)
                            query += `c.nome ${operator} or c.cpf_cnpj like '%${cpfCnpj}%') AND `
                        else
                            query += `c.nome ${operator}) AND `
                    } else if (['descricao_agrupada'].includes(key.split(':')[1])) {
                        const fields = ['tbl1.duplicata', 'tbl1.documento', 'fl.pedido', 'tbl1.descricao', 'fl.descricao']//, 'telefone', 'email'
                        switch (operator) {
                            case 'startsWith': operator = `like '${value}%'`
                                break;
                            case 'contains': operator = `regexp("${value.toString().trim().replaceAll(' ', '.+')}")`
                                break;
                            case 'notContains': operator = `not regexp("${value.toString().trim().replaceAll(' ', '.+')}")`
                                break;
                            case 'endsWith': operator = `like '%${value}'`
                                break;
                            case 'notEquals': operator = `!= '${value}'`
                                break;
                            default: operator = `= '${value}'`
                                break;
                        }
                        query += '('
                        fields.forEach(element => {
                            query += `${element} ${operator} or `
                        });
                        query = query.slice(0, -3).trim()
                        query += ') AND '
                    } else if (['data_vencimento', 'data_pagto'].includes(queryField)) {
                        sortField = queryField
                        operator = queryes[key].split(':')[0]
                        let values = queryes[key].split(':')[1].split(',')
                        valueI = moment(values[0]).format('YYYY-MM-DD');
                        valueF = moment(values[1]).format('YYYY-MM-DD');
                        if (!moment(valueF, 'YYYY-MM-DD', true).isValid()) {
                            valueF = moment(valueI).add(1, 'day').format('YYYY-MM-DD');
                        }
                        switch (operator) {
                            case 'dateIsNot': operator = `not between "${valueI}" and "${valueF}"`
                                break;
                            case 'dateBefore': operator = `< "${valueI}"`
                                break;
                            case 'dateAfter': operator = `> "${valueF}"`
                                break;
                            default: operator = `between "${valueI}" and "${valueF}"`
                                break;
                        }
                        query += `date(tbl1.${sortField}) ${operator} AND `
                    } else {
                        if (['cpf_cnpj_destinatario'].includes(queryField)) value = value.replace(/([^\d])+/gim, "")
                        else if (['valor_bruto_conta', 'valor_liquido_conta', 'valor_vencimento_parcela'].includes(queryField)) value = value.replace(".", "").replace(",", ".")


                        switch (operator) {
                            case 'startsWith': operator = `like '${value}%'`
                                break;
                            // Substituir todos espaços por .+
                            case 'contains': operator = `regexp("${value.toString().trim().replaceAll(' ', '.+')}")`
                                break;
                            case 'notContains': operator = `not regexp("${value.toString().trim().replaceAll(' ', '.+')}")`
                                break;
                            case 'endsWith': operator = `like '%${value}'`
                                break;
                            case 'notEquals': operator = `!= '${value}'`
                                break;
                            default: operator = `= '${value}'`
                                break;
                        }
                        // Pesquisar por field com nome diferente do campo na tabela e valor literal - operador vindo do frontend
                        if (queryField == 'valor_bruto_conta') queryField = 'fl.valor_bruto'
                        if (queryField == 'emp_fantasia') queryField = 'e.fantasia'
                        else if (queryField == 'valor_vencimento_parcela') queryField = 'tbl1.valor_vencimento'
                        else if (queryField == 'valor_liquido_conta') queryField = `(SELECT fl.valor_bruto - COALESCE(SUM(r.valor_retencao), 0) FROM ${tabelaRetencoesDomain} r WHERE r.id_fin_lancamentos = fl.id)`
                        query += `${queryField} ${operator} AND `
                    }
                } else if (key.split(':')[0] == 'params') {
                    switch (key.split(':')[1]) {
                        case 'page': page = Number(queryes[key]);
                            break;
                        case 'rows': rows = Number(queryes[key]);
                            break;
                    }
                } else if (key.split(':')[0] == 'sort') {
                    sortField = key.split(':')[1].split('=')[0]
                    if (sortField == 'destinatario_agrupado') sortField = 'c.nome'
                    if (sortField == 'descricao_agrupada') sortField = 'tbl1.descricao'
                    sortOrder = queryes[key]
                }
            }
            query = query.slice(0, -5).trim()
        }
        const dbSchema = `${dbPrefix}_${uParams.schema_name}`
        const usuario = uParams.name
        moment.locale('pt-br');
        // Período ser algo como "12 de dezembro de 2024 a 20 de dezembro de 2024" utilizando dataInicio e dataFim e utilizando moment para formatar
        const periodo = `${moment(valueI).format('DD [de] MMMM [de] YYYY')} a ${moment(valueF).format('DD [de] MMMM [de] YYYY')}`
        const reportTitle = body.reportTitle
        const fileName = reportTitle.replace(' ', '_') + '_' + moment().format('DDMMYYYY_HHmmss')
        const optionParameters = {
            "usuario": usuario,
            "dbSchema": dbSchema,
            "periodo": periodo,
            "query": `AND ${query}` || "1=1",
            "reportTitle": reportTitle,
        }

        const exportType = body.exportType || 'pdf'
        const fileRootName = 'reports/Vivazul/financeiro/Sintetico'

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
                // registrar o evento na tabela de eventos
                const { createEventPrint } = app.api.sisEvents
                createEventPrint({
                    "notTo": ['created_at', 'evento'],
                    "next": {},
                    "request": req,
                    "evento": {
                        "classevento": `printing-financial-synthetic`,
                        "evento": `Impressão de Resumo Financeiro Sintético`,
                        "tabela_bd": "comissoes",
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
const gestor = require('./gestor')

module.exports = app => {
    app.post('/signup', app.api.user.signup)
    app.post('/signin', app.api.auth.signin)
    app.post('/validateToken', app.api.auth.validateToken)

    /**
     * Exibição ou captura de ativos do sistema
     */
    app.route('/asset')
        .all(app.config.passport.authenticate())
        .post(app.api.assets.getAsset)

    /**
     * Rota de validação genérica de documentos
     */
    app.route('/validator/:func/:tk')
        .get(app.api.validator.getByFunction)

    /**
     * Rotas de usuários
     */
    // Solocitação de tokens de reset
    app.route('/request-password-reset').post(app.api.user.requestPasswordReset)
    // Entrega do token de reset e desbloqueio
    app.route('/password-reset/:id').put(app.api.user.passwordReset)
    // Desbloqueio de usuário por token 
    app.route('/user-unlock/:id')
        .get(app.api.user.unlock)
        .post(app.api.user.unlock)
    // Rotas utilizadas para envio do token por SMS e email
    app.route('/user-sms-unlock').patch(app.api.user.smsToken)
    app.route('/user-mail-unlock').patch(app.api.user.mailyToken)

    app.route('/users')
        .all(app.config.passport.authenticate())
        .post(gestor(app.api.user.save))
        .get(app.api.user.get)
    app.route('/users/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.user.save)
        .get(app.api.user.getById)
        .delete(gestor(app.api.user.remove))
    app.route('/user-token/:token').get(app.api.user.getByToken)
    app.route('/users/f-a/:func')
        .all(app.config.passport.authenticate())
        .get(app.api.user.getByFunction)
    app.route('/users/f/:func').get(app.api.user.getByFunction)
    app.route('/users-cpf/:cpf')
        .all(app.config.passport.authenticate())
        .get(app.api.user.getByCpf)
    app.route('/users/locate-servidor-on-client')
        .all(app.config.passport.authenticate())
        .post(app.api.user.locateServidorOnClient)

    /**
     * Rotas administrativas
     */
    app.route('/sis-events')
        .all(app.config.passport.authenticate())
        .post(app.api.sisEvents.createEventUpd)
        .get(app.api.sisEvents.get)
    app.route('/sis-events/:field')
        .all(app.config.passport.authenticate())
        .get(app.api.sisEvents.getByField)
    app.route('/params')
        .all(app.config.passport.authenticate())
        .post(app.api.params.save)
        .get(app.api.params.get)
    app.route('/params/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.params.save)
        .get(app.api.params.getById)
        .delete(app.api.params.remove)
    app.route('/params/f-a/:func').all(app.config.passport.authenticate()).get(app.api.params.getByFunction)
    app.route('/mailer-cli')
        .all(app.config.passport.authenticate())
        .post(app.api.mailerCli.mailyCliSender)
    app.route('/mailer-noncli')
        // .all(app.config.passport.authenticate())
        .post(app.api.mailerCli.mailyCliSender)

    /**
     * Rotas de cadastros
     */
    app.route('/cadastros')
        .all(app.config.passport.authenticate())
        .post(app.api.cadastros.save)
        .get(app.api.cadastros.get)
    app.route('/cadastros/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.cadastros.save)
        .get(app.api.cadastros.getById)
        .delete(app.api.cadastros.remove)
    app.route('/cadastros/f-a/:func')
        .all(app.config.passport.authenticate())
    // .post(app.api.cadastros.getByFunction)*/

    /**
     * Rota de local_params
     */
    app.route('/local-params/f-a/:func').all(app.config.passport.authenticate()).get(app.api.local_params.getByFunction)
    app.route('/local-params')
        .all(app.config.passport.authenticate())
        .post(app.api.local_params.save)
        .get(app.api.local_params.get)
    app.route('/local-params/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.local_params.save)
        .get(app.api.local_params.getById)
        .delete(app.api.local_params.remove)

    /**
     * Rota de cad_endereços
     */
    app.route('/cad-enderecos/:id_cadastros')
        .all(app.config.passport.authenticate())
        .post(app.api.cad_enderecos.save)
        .get(app.api.cad_enderecos.get)
    app.route('/cad-enderecos/:id_cadastros/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.cad_enderecos.save)
        .get(app.api.cad_enderecos.getById)
        .delete(app.api.cad_enderecos.remove)

    /**
     * Rota de cad_contatos
     */
    app.route('/cad-contatos/:id_cadastros')
        .all(app.config.passport.authenticate())
        .post(app.api.cad_contatos.save)
        .get(app.api.cad_contatos.get)
    app.route('/cad-contatos/:id_cadastros/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.cad_contatos.save)
        .get(app.api.cad_contatos.getById)
        .delete(app.api.cad_contatos.remove)

    /**
     * Rota de cad_documentos
     */
    app.route('/cad-documentos/:id_cadastros')
        .all(app.config.passport.authenticate())
        .post(app.api.cad_documentos.save)
        .get(app.api.cad_documentos.get)
    app.route('/cad-documentos/:id_cadastros/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.cad_documentos.save)
        .get(app.api.cad_documentos.getById)
        .delete(app.api.cad_documentos.remove)

    /**
     * Rota de pipeline_params
     */
    app.route('/pipeline-params')
        .all(app.config.passport.authenticate())
        .post(app.api.pipeline_params.save)
        .get(app.api.pipeline_params.get)
    app.route('/pipeline-params/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.pipeline_params.save)
        .get(app.api.pipeline_params.getById)
        .delete(app.api.pipeline_params.remove)

    /**
     * Rota de com_agentes
     */
    app.route('/com-agentes')
        .all(app.config.passport.authenticate())
        .post(app.api.com_agentes.save)
        .get(app.api.com_agentes.get)
    app.route('/com-agentes/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.com_agentes.save)
        .get(app.api.com_agentes.getById)
        .delete(app.api.com_agentes.remove)

    /**
     * Rota de pipeline
     */
    app.route('/pipeline')
        .all(app.config.passport.authenticate())
        .post(app.api.pipeline.save)
        .get(app.api.pipeline.get)
    app.route('/pipeline/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.pipeline.save)
        .get(app.api.pipeline.getById)
        .delete(app.api.pipeline.remove)

    /**
     * Rota de pipeline_status
     */
    app.route('/pipeline-status')
        .all(app.config.passport.authenticate())
        .post(app.api.pipeline_status.save)
        .get(app.api.pipeline_status.get)
    app.route('/pipeline-status/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.pipeline_status.save)
        .get(app.api.pipeline_status.getById)
        .delete(app.api.pipeline_status.remove)

    /**
    * Rota de protocolo
    */
    app.route('/protocolo')
        .all(app.config.passport.authenticate())
        .post(app.api.protocolo.save)
        .get(app.api.protocolo.get)
    app.route('/protocolo/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.protocolo.save)
        .get(app.api.protocolo.getById)
        .delete(app.api.protocolo.remove)

    /**
    * Rota de com_terceiros
    */
    app.route('/com-terceiros')
        .all(app.config.passport.authenticate())
        .post(app.api.com_terceiros.save)
        .get(app.api.com_terceiros.get)
    app.route('/com-terceiros/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.com_terceiros.save)
        .get(app.api.com_terceiros.getById)
        .delete(app.api.com_terceiros.remove)

    /**
    * Rota de pv
    */
    app.route('/pv')
        .all(app.config.passport.authenticate())
        .post(app.api.pv.save)
        .get(app.api.pv.get)
    app.route('/pv/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.pv.save)
        .get(app.api.pv.getById)
        .delete(app.api.pv.remove)

    /**
    * Rota de pv_tecnicos
    */
    app.route('/pv-tecnicos')
        .all(app.config.passport.authenticate())
        .post(app.api.pv_tecnicos.save)
        .get(app.api.pv_tecnicos.get)
    app.route('/pv-tecnicos/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.pv_tecnicos.save)
        .get(app.api.pv_tecnicos.getById)
        .delete(app.api.pv_tecnicos.remove)

    /**
    * Rota de pv_oat
    */
    app.route('/pv-oat')
        .all(app.config.passport.authenticate())
        .post(app.api.pv_oat.save)
        .get(app.api.pv_oat.get)
    app.route('/pv-oat/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.pv_oat.save)
        .get(app.api.pv_oat.getById)
        .delete(app.api.pv_oat.remove)


    /**
     * Rota de empresa
    */
    app.route('/empresa')
        .all(app.config.passport.authenticate())
        .post(app.api.empresa.save)
        .get(app.api.empresa.get)
    app.route('/empresa/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.empresa.save)
        .get(app.api.empresa.getById)
        .delete(app.api.empresa.remove)


    /**
    * Rota de fin_cc
   */
    app.route('/fin-cc')
        .all(app.config.passport.authenticate())
        .post(app.api.fin_cc.save)
        .get(app.api.fin_cc.get)
    app.route('/fin-cc/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.fin_cc.save)
        .get(app.api.fin_cc.getById)
        .delete(app.api.fin_cc.remove)


    /**
    * Rota de fin_lancamentos
   */
    app.route('/fin-lancamentos')
        .all(app.config.passport.authenticate())
        .post(app.api.fin_lancamentos.save)
        .get(app.api.fin_lancamentos.get)
    app.route('/fin-lancamentos/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.fin_lancamentos.save)
        .get(app.api.fin_lancamentos.getById)
        .delete(app.api.fin_lancamentos.remove)


    /**
    * Rota de fin_retencoes
   */
    app.route('/fin-retencoes')
        .all(app.config.passport.authenticate())
        .post(app.api.fin_retencoes.save)
        .get(app.api.fin_retencoes.get)
    app.route('/fin-retencoes/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.fin_retencoes.save)
        .get(app.api.fin_retencoes.getById)
        .delete(app.api.fin_retencoes.remove)

}
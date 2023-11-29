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
        .get(app.api.cadastros.getByFunction)

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
    app.route('/cad-enderecos/f-a/:func')
        .all(app.config.passport.authenticate())
        .get(app.api.cad_enderecos.getByFunction)
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
    app.route('/pipeline-params/f-a/:func')
        .all(app.config.passport.authenticate())
        .get(app.api.pipeline_params.getByFunction)
    app.route('/pipeline-params/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.pipeline_params.save)
        .get(app.api.pipeline_params.getById)
        .delete(app.api.pipeline_params.remove)

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
    app.route('/pipeline/f-a/:func')
        .all(app.config.passport.authenticate())
        .get(app.api.pipeline.getByFunction)

    /**
     * Rota de pipeline_status
     */
    app.route('/pipeline-status/:id_pipeline')
        .all(app.config.passport.authenticate())
        .post(app.api.pipeline_status.save)
        .get(app.api.pipeline_status.get)
    app.route('/pipeline-status/:id_pipeline/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.pipeline_status.save)
        .get(app.api.pipeline_status.getById)
        .delete(app.api.pipeline_status.remove)
    app.route('/pipeline-status/f-a/:func')
        .all(app.config.passport.authenticate())
        .get(app.api.pipeline_status.getByFunction)

    /**
    * Rotas de protocolos
    */
    app.route('/protocolos')
        .all(app.config.passport.authenticate())
        .post(app.api.protocolos.save)
        .get(app.api.protocolos.get)
    app.route('/protocolos/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.protocolos.save)
        .get(app.api.protocolos.getById)
        .delete(app.api.protocolos.remove)
    app.route('/protocolos/f-a/:func')
        .all(app.config.passport.authenticate())
        .get(app.api.protocolos.getByFunction)
    app.route('/proto-docs/:id_protocolos')
        .all(app.config.passport.authenticate())
        .post(app.api.proto_docs.save)
        .get(app.api.proto_docs.get)
    app.route('/proto-docs/:id_protocolos/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.proto_docs.save)
        .get(app.api.proto_docs.getById)
        .delete(app.api.proto_docs.remove)

    /**
     * Rota de com_prospeccao
     */
    app.route('/com-prospeccoes')
        .all(app.config.passport.authenticate())
        .post(app.api.com_prospeccoes.save)
        .get(app.api.com_prospeccoes.get)
    app.route('/com-prospeccoes/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.com_prospeccoes.save)
        .get(app.api.com_prospeccoes.getById)
        .delete(app.api.com_prospeccoes.remove)
    app.route('/com-prospeccoes/f-a/:func')
        .all(app.config.passport.authenticate())
        .get(app.api.com_prospeccoes.getByFunction)

    /**
     * Rota de com_produtos
     */
    app.route('/com-produtos')
        .all(app.config.passport.authenticate())
        .post(app.api.com_produtos.save)
        .get(app.api.com_produtos.get)
    app.route('/com-produtos/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.com_produtos.save)
        .get(app.api.com_produtos.getById)
        .delete(app.api.com_produtos.remove)
    app.route('/com-produtos/f-a/:func')
        .all(app.config.passport.authenticate())
        .get(app.api.com_produtos.getByFunction)

    /**
     * Rota de com_prod_tabelas
     */
    app.route('/com-prod-tabelas/:id_com_produtos')
        .all(app.config.passport.authenticate())
        .post(app.api.com_prod_tabelas.save)
        .get(app.api.com_prod_tabelas.get)
    app.route('/com-prod-tabelas/:id_com_produtos/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.com_prod_tabelas.save)
        .get(app.api.com_prod_tabelas.getById)
        .delete(app.api.com_prod_tabelas.remove)
    app.route('/com-prod-tabelas/f-a/:func')
        .all(app.config.passport.authenticate())
        .get(app.api.com_prod_tabelas.getByFunction)

    /**
     * Rota de com_propostas
     */
    app.route('/com-propostas')
        .all(app.config.passport.authenticate())
        .post(app.api.com_propostas.save)
        .get(app.api.com_propostas.get)
    app.route('/com-propostas/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.com_propostas.save)
        .get(app.api.com_propostas.getById)
        .delete(app.api.com_propostas.remove)
    app.route('/com-propostas/f-a/:func')
        .all(app.config.passport.authenticate())
        .get(app.api.com_propostas.getByFunction)

    /**
     * Rota de com_prop_compos
     */
    app.route('/com-prop-compos/:id_com_propostas')
        .all(app.config.passport.authenticate())
        .post(app.api.com_prop_compos.save)
        .get(app.api.com_prop_compos.get)
    app.route('/com-prop-compos/:id_com_propostas/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.com_prop_compos.save)
        .get(app.api.com_prop_compos.getById)
        .delete(app.api.com_prop_compos.remove)
    app.route('/com-prop-compos/f-a/:func')
        .all(app.config.passport.authenticate())
        .get(app.api.com_prop_compos.getByFunction)
        .post(app.api.com_prop_compos.getByFunction)

    /**
     * Rota de com_prop_itens
     */
    app.route('/com-prop-itens/:id_com_propostas')
        .all(app.config.passport.authenticate())
        .post(app.api.com_prop_itens.save)
        .get(app.api.com_prop_itens.get)
    app.route('/com-prop-itens/:id_com_propostas/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.com_prop_itens.save)
        .get(app.api.com_prop_itens.getById)
        .delete(app.api.com_prop_itens.remove)
    app.route('/com-prop-itens/f-a/:func')
        .all(app.config.passport.authenticate())
        .get(app.api.com_prop_itens.getByFunction)
        .post(app.api.com_prop_itens.getByFunction)

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
     * Rota de pv_status
     */
    app.route('/pv-status/:id_pv')
        .all(app.config.passport.authenticate())
        .post(app.api.pv_status.save)
        .get(app.api.pv_status.get)
    app.route('/pv-status/:id_pv/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.pv_status.save)
        .get(app.api.pv_status.getById)
        .delete(app.api.pv_status.remove)
    app.route('/pv-status/f-a/:func')
        .all(app.config.passport.authenticate())
        .get(app.api.pv_status.getByFunction)

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
    app.route('/pv-oat/:id_pv')
        .all(app.config.passport.authenticate())
        .post(app.api.pv_oat.save)
        .get(app.api.pv_oat.get)
    app.route('/pv-oat/:id_pv/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.pv_oat.save)
        .get(app.api.pv_oat.getById)
        .delete(app.api.pv_oat.remove)

    /**
     * Rotas para uploads de arquivos
     */
    app.route('/uploads')
        .all(app.config.passport.authenticate())
        .post(app.api.uploads.save)
        .get(app.api.uploads.get)
    app.route('/uploads/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.uploads.save)
        .get(app.api.uploads.getById)
        .delete(app.api.uploads.remove)
    app.route('/uploads/f-a/:func')
        .all(app.config.passport.authenticate())
        .post(app.api.uploads.getByFunction)
    app.route('/uploads/f/:func').post(app.api.uploads.getByFunction)

    /**
     * Rota de pv_oat_status
     */
    app.route('/pv-oat-status/:id_pv_oat')
        .all(app.config.passport.authenticate())
        .get(app.api.pv_oat_status.get)
    app.route('/pv-oat-status/f-a/:func')
        .all(app.config.passport.authenticate())
        .get(app.api.pv_oat_status.getByFunction)


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

    /**
     * Rota para impressão
     */
    app.route('/printing/:func')
        .all(app.config.passport.authenticate())
        .post(app.api.printing.getByFunction)

}
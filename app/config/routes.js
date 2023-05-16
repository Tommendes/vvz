const gestor = require('./gestor')

module.exports = app => {
    /**
     * Rotas de usuários
     */
    app.post('/signup', app.api.user.save)
    app.post('/signin', app.api.auth.signin)
    app.post('/validateToken', app.api.auth.validateToken)
    app.route('/request-password-reset').post(app.api.user.requestPasswordReset)
    app.route('/password-reset/:token').put(app.api.user.passwordReset)
    app.route('/user-token/:token').get(app.api.user.getByToken)
    app.get('/user-unlock/:id/:token', app.api.user.unlock)
    app.route('/users-unique').get(app.api.user.getUnique)
    app.route('/users')
        .all(app.config.passport.authenticate())
        .post(gestor(app.api.user.save))
        .get(app.api.user.get)
    app.route('/users/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.user.save)
        .get(app.api.user.getById)
        .delete(gestor(app.api.user.remove))

    /**
     * Rotas de mensagens-sistema
     */
    app.route('/mensagens-sistema')
        .all(app.config.passport.authenticate())
        .post(app.api.mensagens_sistema.save)
        .get(app.api.mensagens_sistema.get)
    app.route('/mensagens-sistema/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.mensagens_sistema.save)
        .get(app.api.mensagens_sistema.getById)
        .delete(app.api.mensagens_sistema.remove)

    /**
    * Rotas de uploads
    */
    app.route('/uploads')
        .all(app.config.passport.authenticate())
        .post(app.api.uploads.save)
        .get(app.api.uploads.get)
    app.route('/uploads/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.uploads.save)
        .get(app.api.uploads.getById)
    /**
     * Rotas administrativas
     */
    app.route('/sis-events')
        .all(app.config.passport.authenticate())
        .post(app.api.sisEvents.createEventUpd)
        .get(app.api.sisEvents.get)
    app.route('/sis-events/f-a/:field')
        .all(app.config.passport.authenticate())
        .get(app.api.sisEvents.getByField)
    app.route('/sis-events/:id')
        .all(app.config.passport.authenticate())
        .get(app.api.sisEvents.getById)
    app.route('/params')
        .all(app.config.passport.authenticate())
        .post(app.api.params.get)
    app.route('/params/:id')
        .all(app.config.passport.authenticate())
        .get(app.api.params.getById)
    app.route('/params/f-a/:field')
        .all(app.config.passport.authenticate())
        .post(app.api.params.getByField)
    app.route('/params/f/:func')
        .post(app.api.params.getByFunction)

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
     * Rota de ged_params
     */
     app.route('/ged-params')
         .all(app.config.passport.authenticate())
         .post(app.api.ged_params.save)
         .get(app.api.ged_params.get)
     app.route('/ged-params/:id')
         .all(app.config.passport.authenticate())
         .put(app.api.ged_params.save)
         .get(app.api.ged_params.getById)
         .delete(app.api.ged_params.remove)

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
         * Rota de ged
         */
     app.route('/ged')
        .all(app.config.passport.authenticate())
        .post(app.api.ged.save)
        .get(app.api.ged.get)
     app.route('/ged/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.ged.save)
        .get(app.api.ged.getById)
        .delete(app.api.ged.remove)
   
        /**
         * Rota de ged_status
         */
     app.route('/ged-status')
        .all(app.config.passport.authenticate())
        .post(app.api.ged_status.save)
        .get(app.api.ged_status.get)
     app.route('/ged-status/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.ged_status.save)
        .get(app.api.ged_status.getById)
        .delete(app.api.ged_status.remove)


         /**
         * Rota de ged_protolo
         */
     app.route('/ged-protolo')
        .all(app.config.passport.authenticate())
        .post(app.api.ged_protolo.save)
        .get(app.api.ged_protolo.get)
     app.route('/ged-protolo/:id')
        .all(app.config.passport.authenticate())
        .put(app.api.ged_protolo.save)
        .get(app.api.ged_protolo.getById)
        .delete(app.api.ged_protolo.remove)

         /**
         * Rota de ged_protolo
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

}
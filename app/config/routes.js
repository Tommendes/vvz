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
     * Rota de endereços
     */
    app.route('/enderecos')
    .all(app.config.passport.authenticate())
    .post(app.api.enderecos.save)
    .get(app.api.enderecos.get)
    app.route('/enderecos/:id')
    .all(app.config.passport.authenticate())
    .put(app.api.enderecos.save)
    .get(app.api.enderecos.getById)
    .delete(app.api.enderecos.remove)

}
exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_cso_jp.pv', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.string('status').default(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_cadastros',10).unsigned().notNull().comment('Cliente')
        table.integer('id_ged',10).unsigned().comment('Ged')
        table.integer('tipo',1).notNull().default(0).comment('Tipo de pv (SUPORTE:0; MONTAGEM:1)')
        table.string('pv_nr',255).comment('Número do PV')
        table.text('obs').comment('Observação')
        table.char('situacao',2).notNull().comment('Situação do pós atendimento')


    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_cso_jp.pv')
};
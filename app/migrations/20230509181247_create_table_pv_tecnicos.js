const { migrationClientSchema } = require('../.env')

exports.up = function(knex, Promise) {
    return knex.schema.createTable(migrationClientSchema + '.pv_tecnicos', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.string('tecnico',255).comment('Técnico responsável')
        table.string('telefone_contato',255).notNull().comment('Telefone do contato')
        table.string('email_contato',255).comment('Email do contato')
        table.text('observacao').comment('Descrição dos serviços')
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.pv_tecnicos')
};
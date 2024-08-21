const { migrationClientSchema } = require('../.env')

exports.up = function(knex, Promise) {
    return knex.schema.createTable(migrationClientSchema + '.pv', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(10).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_cadastros',10).unsigned().notNull().comment('Cliente')
        table.integer('id_pipeline',10).unsigned().comment('pipeline')
        table.integer('tipo',1).notNull().defaultTo(0).comment('Tipo de pv (Suporte:0; Montagem:1; Vendas:2)')
        table.integer('pv_nr').notNull().comment('Número do PV')
        table.text('observacao').comment('Observação')
        table.foreign('id_cadastros').references('id').inTable(migrationClientSchema + '.cadastros').onUpdate('Cascade').onDelete('NO ACTION')
        table.foreign('id_pipeline').references('id').inTable(migrationClientSchema + '.pipeline').onUpdate('Cascade').onDelete('NO ACTION')

    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.pv')
};
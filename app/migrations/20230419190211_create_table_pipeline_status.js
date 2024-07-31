const { defaultClientSchema } = require('../.env')

exports.up = function(knex, Promise) {
    return knex.schema.createTable(defaultClientSchema + '.pipeline_status', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_pipeline',10).unsigned().comment('Documento pai')
        table.integer('status_params',10).unsigned().notNull().comment('Status do documento')
        table.foreign('id_pipeline').references('id').inTable('pipeline').onUpdate('Cascade').onDelete('NO ACTION')
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.pipeline_status')
};
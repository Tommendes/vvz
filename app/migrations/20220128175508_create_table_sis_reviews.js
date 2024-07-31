const { defaultApiSchema } = require('../.env')

exports.up = function(knex) {
    return knex.schema.createTable(defaultApiSchema + '.sis_reviews', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('status').notNull().defaultTo(10).comment("Status da revisão")
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.string('versao').comment("Versão")
        table.string('lancamento').comment("Lancamento")
        table.string('revisao').comment("Revisão")
        table.string('titulo').comment("Título")
        table.string('descricao', 2000).comment("Descrição")
    })
};

exports.down = function(knex) {
    return knex.schema.dropTable(defaultApiSchema + '.sis_reviews')
};
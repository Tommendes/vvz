const { db } = require('../.env')
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable(`${db.database}.schemas_control`, table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')

        table.string('schema_name').unique().comment('Nome do esquema')
        table.string('schema_version').notNull().comment('Versão do esquema').defaultTo('1.0.0')
        table.string('schema_description').notNull().comment('Descrição do esquema(nome do cliente)')
        table.string('schema_author').notNull().comment('Autor do esquema').defaultTo('Vivazul')
        table.string('schema_author_email').notNull().comment('Email do autor do esquema').defaultTo('contato@vivazul.com.br')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(`${db.database}.schemas_control`)
};

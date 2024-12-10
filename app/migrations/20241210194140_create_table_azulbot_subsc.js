const { db } = require('../.env')

exports.up = function(knex) {
    return knex.schema.createTable(db.database + '.azulbot_subsc', function (table) {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(10).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.string('group_name', 255).unique().notNullable().comment('Nome do grupo');
        table.json('contact_ids').notNullable().comment('Ids dos contatos do grupo');
    }); 
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable(db.database + '.azulbot_subsc');
};

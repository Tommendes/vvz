const { db } = require('../.env')

exports.up = function(knex) {
    return knex.schema.createTable(db.database + '.azulbot_events', function (table) {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('gateway').notNullable().comment('Gateway');
        table.string('event_id').notNullable().comment('ID do evento');
        table.string('creation_date').notNullable().comment('Data de criação');
        table.string('event').notNullable().comment('Evento');
        table.string('version').notNullable().comment('Versão');
        table.json('data').notNullable().comment('Corpo do evento');
    }); 
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable(db.database + '.azulbot_events');
};

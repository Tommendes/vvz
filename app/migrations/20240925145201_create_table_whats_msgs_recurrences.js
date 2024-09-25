const { migrationClientSchema } = require('../.env')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex, Promise) {
    return knex.schema.createTable(migrationClientSchema + '.whats_msgs_recurrences', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('msg_id').notNull().unsigned().references('id').inTable(migrationClientSchema + '.whats_msgs').onDelete('CASCADE')
        table.string('frequency').notNull().comment('Frequência da recorrência (minutes, hours, days, weeks)')
        table.integer('interval').notNull().comment('Intervalo da recorrência')
        table.string('next_run').notNull().comment('Próxima execução')
        table.string('end_date').comment('Data de término da recorrência')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex, Promise) {
    return knex.schema.dropTable(migrationClientSchema + '.whats_msgs_recurrences')
};
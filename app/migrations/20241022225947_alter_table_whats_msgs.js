const { migrationClientSchema } = require('../.env')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable(migrationClientSchema + '.whats_msgs', table => {
        table.string('zaapId').comment('Zaap Id')
        table.string('messageId').comment('Message Id')
    })
  
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable(migrationClientSchema + '.cadastros', table => {
        table.dropColumn('zaapId')
        table.dropColumn('messageId')
    })  
};

const { migrationClientSchema } = require('../.env')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable(migrationClientSchema + '.comissoes', table => {
        table.string('nf').comment('Nota fiscal da comissão')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable(migrationClientSchema + '.comissoes', table => {
        table.dropColumn('nf')
    })
};

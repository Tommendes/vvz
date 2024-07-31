const { defaultClientSchema } = require('../.env')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable(defaultClientSchema + '.comissoes', table => {
        table.foreign('id_pipeline').references('id').inTable('pipeline').onUpdate('Cascade').onDelete('NO ACTION')
    })
};

exports.down = function (knex, Promise) {
    return knex.schema.dropTable(defaultClientSchema + '.comissoes')
};
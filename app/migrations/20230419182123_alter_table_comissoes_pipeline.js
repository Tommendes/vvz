const { migrationClientSchema } = require('../.env')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable(migrationClientSchema + '.comissoes', table => {
        table.dropForeign(knex.raw('vivazul_bceaa5_comissoes_id_pipeline_foreign'));
        table.foreign(knex.raw('vivazul_comissoes_id_pipeline_foreign.id_pipeline')).references('id').inTable(migrationClientSchema + '.pipeline').onUpdate('Cascade').onDelete('NO ACTION');
    })
};

exports.down = function (knex, Promise) {
    return knex.schema.alterTable(migrationClientSchema + '.comissoes', table => {
        table.dropForeign(knex.raw('vivazul_comissoes_id_pipeline_foreign.id_pipeline'));
    })
};
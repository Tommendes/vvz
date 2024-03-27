/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('vivazul_bceaa5.comissoes', table => {
        table.string('liquidar_em', 10).after('desconto').comment('Previsão para liquidação da comissão')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('vivazul_bceaa5.comissoes', table => {
        table.dropColumn('alterTable')
    })
};

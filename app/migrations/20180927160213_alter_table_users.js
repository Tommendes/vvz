/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('users', table => {
        table.boolean('uploads').after('agente_at').notNull().defaultTo(0).comment('Permitir o usuário fazer upload de arquivos')
        table.boolean('at').after('comissoes').notNull().defaultTo(0).comment('Gestão de cadastros')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('users', table => {
        table.dropColumn('uploads')
        table.dropColumn('at')
    })
};

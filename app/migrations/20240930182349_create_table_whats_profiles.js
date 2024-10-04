const { migrationClientSchema } = require('../.env');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable(migrationClientSchema + '.whats_profiles', function (table) {
        table.engine('InnoDB');
        table.charset('utf8mb4');
        table.collate('utf8mb4_general_ci');
        table.increments('id').unsigned().notNullable();
        table.string('created_at', 255).notNullable();
        table.string('updated_at', 255)
        table.integer('status').defaultTo(10).comment('10 - Ativo, 20 - Inativo, 99 - Excluído');
        table.string('phone', 255).notNullable().comment('Número do telefone');
        table.string('vname', 255).nullable().comment('Nome do contato caso você tenha ele como contato');
        table.string('name', 255).nullable().comment('Nome e sobrenome do contato, só vai retornar preenchido caso você tenha o número em seus contatos');
        table.string('short', 255).nullable().comment('Nome do contato, só vai retornar preenchido caso você tenha o número em seus contatos');
        table.boolean('verify').defaultTo(false);
        table.string('image', 255).nullable().comment('Imagem do contato, só vai retornar preenchido caso você tenha o número em seus contatos');
        table.primary(['id', 'phone']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(migrationClientSchema + '.whats_profiles');
};
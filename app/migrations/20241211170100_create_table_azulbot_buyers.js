const { db } = require('../.env')

exports.up = function(knex) {
    return knex.schema.createTable(db.database + '.azulbot_buyers', function (table) {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.integer('status').defaultTo(10).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_subscription').notNull().unsigned().references('id').inTable(db.database + '.azulbot_subscriptions').onUpdate('Cascade').onDelete('Cascade').comment('ID da inscrição')
        table.string('document').notNullable().comment('CPF/CNPJ');
        table.string('name').notNullable().comment('Nome');
        table.string('email').notNullable().comment('E-mail');
        table.string('zipcode').notNullable().comment('CEP');
        table.string('country').notNullable().comment('País');
        table.string('number').notNullable().comment('Número');
        table.string('address').notNullable().comment('Endereço');
        table.string('city').notNullable().comment('Cidade');
        table.string('state').notNullable().comment('Estado');
        table.string('neighborhood').notNullable().comment('Bairro');
        table.string('complement').comment('Complemento');
        table.string('country_iso').notNullable().comment('ISO do país');
    }); 
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable(db.database + '.azulbot_buyers');
};

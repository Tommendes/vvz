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
        table.string('subscriber_code').notNullable().comment('Código do assinante');
        table.string('document').comment('CPF/CNPJ');
        table.string('name').notNullable().comment('Nome');
        table.string('email').notNullable().comment('E-mail');
        table.string('checkout_phone').comment('Telefone');
        table.string('zipcode').comment('CEP');
        table.string('country').comment('País');
        table.string('number').comment('Número');
        table.string('address').comment('Endereço');
        table.string('city').comment('Cidade');
        table.string('state').comment('Estado');
        table.string('neighborhood').comment('Bairro');
        table.string('complement').comment('Complemento');
        table.string('country_iso').comment('ISO do país');
    }); 
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable(db.database + '.azulbot_buyers');
};

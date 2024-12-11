const { db } = require('../.env')

exports.up = function(knex) {
    return knex.schema.createTable(db.database + '.azulbot_subscriptions', function (table) {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.integer('status').defaultTo(10).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_event').notNull().unsigned().references('id').inTable(db.database + '.azulbot_events').onUpdate('Cascade').onDelete('Cascade').comment('Lançamento proprietário da inscrição')
        table.string('subscriber_code').notNullable().comment('Código do assinante');
        table.string('plan_name').notNullable().comment('Nome do plano');
        table.string('plan_id').notNullable().comment('ID do plano');
        table.string('plan_status').notNullable().comment('Status do plano');
        table.json('product').notNullable().comment('Produto');
        table.json('commissions').notNullable().comment('Comissões');
        table.json('purchase').notNullable().comment('Compra');
        table.json('affiliates').notNullable().comment('Afiliados');
    }); 
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable(db.database + '.azulbot_subscriptions');
};

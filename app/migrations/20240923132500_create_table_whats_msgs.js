const { migrationClientSchema } = require('../.env')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex, Promise) {
    return knex.schema.createTable(migrationClientSchema + '.whats_msgs', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.string('created_at').notNull()
        table.integer('status').defaultTo(10).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.string('schedule').notNull().comment('Data e hora do agendamento do envio')
        table.integer('id_profile').comment('ID do cadastro do destinatário')
        table.boolean('identified').comment('Cabeçalho do remetente')
        table.string('phone').notNull().comment('Número do telefone')
        table.string('message', 1000).notNull().comment('Mensagem a ser enviada')
        table.integer('situacao').defaultTo(1).notNull().comment('Situação da parcela (1: Aberto; 2: Enviada; 3: Editada; 99: Cancelado)')
        table.string('delivered_at').comment('Horário real da entrega da mensagem (GMT-3)')
        table.boolean('recorrente').defaultTo(0).notNull().comment('Mensagem com recorrência')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.whats_msgs')
};
const { migrationClientSchema } = require('../.env')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex, Promise) {
    return knex.schema.createTable(migrationClientSchema + '.fin_parcelas', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(10).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('situacao').defaultTo(1).notNull().comment('Situação da parcela (1: Aberto; 2: Pago; 3: Conciliado; 99: Cancelado)')
        table.integer('id_fin_lancamentos').notNull().unsigned().references('id').inTable(migrationClientSchema + '.fin_lancamentos').onUpdate('Cascade').onDelete('Cascade').comment('Lançamento proprietário da parcela')
        table.string('data_vencimento').notNull().comment('Data de vencimento do registro')
        table.string('data_pagto').comment('Data de pagamento do registro')
        table.double('valor_vencimento', 11, 2).notNull().comment('Valor do vencimento')
        table.string('duplicata').comment('Número da duplicata')
        table.string('parcela', 2).comment('Vencimento da duplicata (U: Unica; 1: 1ª parcela; 2: 2ª parcela...)')
        table.string('recorrencia', 2).comment('Recorrência do vencimento (U: Unico; M: Mensal; S: Semestral; A: Anual)')
        table.string('descricao', 500).comment('Descrição curta do lançamento')
        table.integer('id_fin_contas').unsigned().references('id').inTable(migrationClientSchema + '.fin_contas').onUpdate('Cascade').onDelete('NO ACTION').comment('Conta/Meio de pagamento/recebimento')
        table.string('documento').comment('Número do documento de pagamento/recebimento')
        table.string('motivo_cancelamento').comment('Motivo do cancelamento')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.fin_parcelas')
};
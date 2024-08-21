const { migrationClientSchema } = require('../.env')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex, Promise) {
    return knex.schema.createTable(migrationClientSchema + '.fin_conciliacao', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(10).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')        
        table.integer('id_empresa').notNull().unsigned().references('id').inTable(migrationClientSchema + '.empresa').onUpdate('Cascade').onDelete('NO ACTION').comment('Empresa proprietária da conta')
        table.boolean('centro').comment('Tipo de relação (0: Receita; 1: Despesa)')
        table.boolean('tipo').comment('Origem (0: Conta bancpária; 1: Cartão de crédito)')
        table.integer('id_fin_contas').notNull().unsigned().references('id').inTable(migrationClientSchema + '.fin_contas').onUpdate('Cascade').onDelete('NO ACTION').comment('Conta relacionada')
        table.string('data_lancamento').comment('Data de lançamento')
        table.double('valor_lancamento', 11,2).notNull().defaultTo(0.00).comment('Valor do lançamento')
        table.string('descricao').comment('Descrição curta do lançamento')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.fin_conciliacao')
};
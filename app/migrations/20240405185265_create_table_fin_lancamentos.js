const { migrationClientSchema } = require('../.env')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex, Promise) {
    return knex.schema.createTable(migrationClientSchema + '.fin_lancamentos', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(10).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')        
        table.integer('id_empresa').notNull().unsigned().references('id').inTable(migrationClientSchema + '.empresa').onUpdate('Cascade').onDelete('NO ACTION').comment('Empresa proprietária da conta')
        table.boolean('centro').notNull().comment('Tipo de relação (1: Receita; 2: Despesa)')
        table.string('tags').comment('Tags para facilitar a busca. Receber valores separados por virgula')
        table.integer('id_cadastros').notNull().unsigned().references('id').inTable(migrationClientSchema + '.cadastros').onUpdate('Cascade').onDelete('NO ACTION').comment('Credor ou devedor')
        table.string('data_emissao').notNull().comment('Data de emissão do registro')
        table.double('valor_bruto', 11,2).notNull().defaultTo(0.00).comment('Valor bruto')
        table.double('valor_liquido', 11,2).notNull().defaultTo(0.00).comment('Valor líquido')
        table.string('pedido').comment('Pedido de compra')
        table.specificType('descricao', 'text').comment('Descrição curta do lançamento')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.fin_lancamentos')
};
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('vivazul_bceaa5.com_prod_tabelas', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_com_produtos').unsigned().references('id').inTable('com_produtos').onUpdate('Cascade').onDelete('NO ACTION').comment('Chave estrangeira com a tabela com_produtos')
        table.string('ini_validade', 10).notNull().comment('Início da validade')
        table.double('valor_compra', 11,2).defaultTo(0.00).comment('Valor de compra do produto')
        table.double('valor_venda', 11,2).defaultTo(0.00).comment('Valor de venda')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable('vivazul_bceaa5.com_prod_tabelas')
};

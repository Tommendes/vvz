/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('vivazul_bceaa5.com_prop_itens', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')

        table.integer('id_com_propostas').notNull().unsigned().references('id').inTable('com_propostas').onUpdate('Cascade').onDelete('NO ACTION').comment('Chave estrangeira com a tabela com_propostas')
        table.integer('id_com_prop_compos').unsigned().references('id').inTable('com_prop_compos').onUpdate('Cascade').onDelete('NO ACTION').comment('Chave estrangeira com a tabela com_prop_compos')
        table.integer('id_com_produtos').notNull().unsigned().references('id').inTable('com_produtos').onUpdate('Cascade').onDelete('NO ACTION').comment('Chave estrangeira com a tabela com_produtos')
        table.integer('ordem').unsigned().notNull().comment('Ordem em que o item foi criado. Utilizado para o caso de reordenar a coluna item')
        table.integer('item').unsigned().notNull().comment('Item')
        table.boolean('item_ativo').defaultTo(1).notNull().comment('Item ativo (Não:0; Sim:1)')
        table.boolean('compoe_valor').defaultTo(1).notNull().comment('Compõe valor (Não:0; Sim:1)')
        table.specificType('descricao', 'text').comment('Descrição')
        table.double('quantidade', 11,2).notNull().defaultTo(0.00).comment('Quantidade')
        table.double('valor_unitario', 11,2).notNull().defaultTo(0.00).comment('Valor unitário')
        table.boolean('desconto_ativo').defaultTo(0).notNull().comment('Desconto ativo (Não:0; Sim:1)')
        table.double('desconto_total', 11,2).defaultTo(0.00).comment('Desconto total em valor')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable('vivazul_bceaa5.com_prop_itens')
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('vivazul_cso_root.com_produtos', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_uploads_imagem').unsigned().references('id').inTable('vivazul_api.uploads').onUpdate('Cascade').onDelete('NO ACTION').comment('Chave estrangeira com a tabela uploads')
        table.string('nome_comum').notNull().comment('Nome curto')
        table.string('descricao', 1000).notNull().comment('Descrição longa')
        table.integer('id_params_unidade').unsigned().notNull().comment('Unidade de medida (Chave estrangeira com a tabela local_params)')
        table.boolean('produto').defaultTo(0).notNull().comment('Produto/Serviço (Produto:0; Serviço: 1)')
        table.string('ncm').comment('Nomenclatura comum Mercosul')
        table.string('cean').comment('Código EAN')
        table.integer('id_fornecedor').notNull().unsigned().references('id').inTable('cadastros').onUpdate('Cascade').onDelete('NO ACTION').comment('Chave estrangeira com a tabela cadastros')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable('vivazul_cso_root.com_produtos')
};

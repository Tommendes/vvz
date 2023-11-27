/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('vivazul_cso_root.com_propostas', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')

        table.integer('id_pipeline').notNull().unsigned().references('id').inTable('pipeline').onUpdate('Cascade').onDelete('NO ACTION').comment('Chave estrangeira com a tabela pipeline')
        table.integer('id_pv').unsigned().references('id').inTable('pv').onUpdate('Cascade').onDelete('NO ACTION').comment('Chave estrangeira com a tabela pv')
        table.string('pessoa_contato').notNull().comment('Pessoa de contato')
        table.string('telefone_contato').notNull().comment('Telefone de contato')
        table.string('email_contato').notNull().comment('E-mail de contato')
        table.specificType('saudacao_inicial', 'text').notNull().comment('Corpo da saudação inicial da proposta')
        table.specificType('conclusao', 'text').notNull().comment('Corpo da conclusão da proposta')
        table.specificType('garantia', 'text').notNull().comment('Corpo da garantia da proposta')
        table.boolean('desconto_ativo').defaultTo(0).notNull().comment('Desconto ativo (Não:0; Sim:1)')
        table.double('desconto_total', 11,2).defaultTo(0.00).comment('Desconto total em valor')
        table.specificType('observacoes_finais', 'text').notNull().comment('Corpo das observações finais da proposta')
        table.string('prz_entrega', 50).notNull().comment('Prazo de entrega')
        table.string('forma_pagto', 50).notNull().comment('Forma de pagamento')
        table.string('validade_prop', 50).notNull().comment('Validade da proposta')
        table.integer('id_uploads_logo').unsigned().references('id').inTable('vivazul_api.uploads').onUpdate('Cascade').onDelete('NO ACTION').comment('Chave estrangeira com a tabela uploads')
        table.integer('id_uploads_rodape').unsigned().references('id').inTable('vivazul_api.uploads').onUpdate('Cascade').onDelete('NO ACTION').comment('Chave estrangeira com a tabela uploads')
        table.specificType('assinatura', 'tinytext').notNull().comment('Assinatura da proposta')        
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable('vivazul_cso_root.com_propostas')
};

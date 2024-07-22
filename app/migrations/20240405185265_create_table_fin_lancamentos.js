/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_bceaa5.fin_lancamentos', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')        
        table.integer('id_empresa').notNull().unsigned().references('id').inTable('empresa').onUpdate('Cascade').onDelete('NO ACTION').comment('Empresa proprietária da conta')
        table.boolean('centro').comment('Tipo de relação (0: Receita; 1: Despesa)')
        table.string('tags').comment('Tags para facilitar a busca. Receber valores separados por virgula')
        table.integer('id_cadastros').notNull().unsigned().references('id').inTable('cadastros').onUpdate('Cascade').onDelete('NO ACTION').comment('Cadastro relacionado')
        table.integer('id_tipo_documento').notNull().unsigned().references('id').inTable('local_params').onUpdate('Cascade').onDelete('NO ACTION').comment('Tipo de documento')
        table.integer('id_pipeline').unsigned().references('id').inTable('pipeline').onUpdate('Cascade').onDelete('NO ACTION').comment('Pipeline relacionado')
        table.integer('id_comissoes').unsigned().references('id').inTable('comissoes').onUpdate('Cascade').onDelete('NO ACTION').comment('Comissão relacionada')
        table.integer('id_notas').unsigned().references('id').inTable('fis_notas').onUpdate('Cascade').onDelete('NO ACTION').comment('Nota relacionada')
        table.string('data_vencto').comment('Data de vencimento')
        table.string('data_pagto').comment('Data de pagamento')
        table.double('valor_bruto', 11,2).notNull().defaultTo(0.00).comment('Valor bruto')
        table.double('valor_retencao', 11,2).notNull().defaultTo(0.00).comment('Valor de retenção')
        table.text('descr_retencao').comment('Descrição da retenção')
        table.double('valor_liquido', 11,2).notNull().defaultTo(0.00).comment('Valor líquido')
        table.double('valor_total_nota', 11,2).notNull().defaultTo(0.00).comment('Valor total da nota')
        table.specificType('parcela', 'char(2)').notNull().defaultTo('U').comment('Parcela (Única: U; Número da parcela: 01, 02, 03, ...)')
        table.string('duplicata').comment('Número da duplicata')
        table.string('data_duplicata').comment('Data da duplicata')
        table.integer('id_fin_contas').notNull().unsigned().references('id').inTable('fin_contas').onUpdate('Cascade').onDelete('NO ACTION').comment('Conta relacionada')
        table.string('doc_pagto').comment('Documento de pagamento')
        table.string('descricao').comment('Descrição curta do lançamento')
        table.specificType('obs', 'text').comment('Observações')
        table.integer('id_fin_conciliacao').unsigned().references('id').inTable('fin_conciliacao').onUpdate('Cascade').onDelete('NO ACTION').comment('Conciliação relacionada')
        table.string('data_conciliacao').comment('Data da conciliação')      
        table.specificType('obs_conciliacao', 'text').comment('Observações da conciliação')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.fin_lancamentos')
};
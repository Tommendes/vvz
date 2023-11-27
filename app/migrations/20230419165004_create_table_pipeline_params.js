exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_cso_root.pipeline_params', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.string('descricao',50).comment('Descrição abreviada do parâmetro')
        table.boolean('bi_index').defaultTo(0).comment('Apresentação em BI')
        table.boolean('doc_venda').defaultTo(0).comment('É documento de venda (0: Não; 1: Proposta; 2: Pedido)')
        table.boolean('autom_nr').defaultTo(0).comment('Numeracao automatica')
        table.boolean('gera_baixa').defaultTo(0).comment('Pode ser convertido em pedido')
        table.integer('tipo_secundario', 10).unsigned().comment('Tipo secundário')
        table.boolean('obrig_valor').defaultTo(0).comment('Obrigatorio declarar valor')
        table.boolean('reg_agente').defaultTo(0).comment('Obrigatório agente ')
        table.integer('id_uploads_logo',255).unsigned().references('id').inTable('vivazul_api.uploads').onUpdate('Cascade').onDelete('Cascade').comment('URL logomarca representada')
        table.tinyint('gera_pasta',1).defaultTo(0).comment('Gera pasta(0=Não, 1=Documento, 2=documento_baixa)')
        table.tinyint('proposta_interna',1).defaultTo(0).comment('Utiliza o sistema de proposta interna')
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_cso_root.pipeline_params')
};
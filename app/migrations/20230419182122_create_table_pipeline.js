exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_bceaa5.pipeline', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_pipeline_params ',10).unsigned().notNull().comment('Parâmetro')
        table.integer('id_pai',10).unsigned().comment('Documento pai') 
        table.integer('id_filho',10).unsigned().comment('Documento filho')
        table.integer('id_cadastros',10).unsigned().notNull().comment('Cliente ')
        table.integer('id_com_agentes',10).unsigned().comment('Agente de vendas do atendimento')
        table.string('status_comissao',255).comment('Status da comissão')
        table.string('documento',255).notNull().defaultTo(0).comment('Número o documento')
        table.integer('versao',2).notNull().defaultTo(0).comment('Versão')
        table.string('descricao',2500).comment('Descrição abreviada do documento')
        table.decimal('valor_bruto',10,2).defaultTo(0).comment('Valor do documento')
        table.decimal('valor_liq',10,2).defaultTo(0).comment('Valor liquido do documento')
        table.decimal('valor_representacao',10,2).defaultTo(0).comment('Valor base de comissionamento da representação ')
        table.decimal('perc_represent',10,2).defaultTo(0).comment('Percentual de comissão da representação')
        table.decimal('valor_agente',10,2).defaultTo(0).comment('Valor base de comissionamento dos agentes')
        table.foreign('id_pipeline_params').references('id').inTable('pipeline_params').onUpdate('Cascade').onDelete('NO ACTION')
        table.foreign('id_cadastros').references('id').inTable('cadastros').onUpdate('Cascade').onDelete('NO ACTION')
       
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.pipeline')
};
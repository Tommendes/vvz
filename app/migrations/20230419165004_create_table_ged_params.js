exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_cso_jp.cad_contatos', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.string('status').default(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.string('descricao',50).comment('select,insert,update,references  Descrição abreviada do parâmetro')
        table.boolean('bi_index').default(0).comment('select,insert,update,references  Apresentação em BI')
        table.boolean('doc_venda').default(0).comment('select,insert,update,references  É documento de venda')
        table.boolean('autom_nr').default(0).comment('select,insert,update,references  Numeracao automatica')
        table.boolean('gera_baixa').default(0).comment('select,insert,update,references  Pode ser convertido em pedido')
        table.boolean('tipo_secundario').default(0).comment('select,insert,update,references  Tipo secundário')
        table.boolean('obrig_valor').default(0).comment('select,insert,update,references  Obrigatorio declarar valor')
        table.boolean('reg_agente').default(0).comment('select,insert,update,references  Obrigatório agente ')
        table.string('id_logo',255).default(0).comment('select,insert,update,references  URL logomarca representada')
        table.tinyint('gera_pasta',1).default(0).comment('select,insert,update,references  Gera pasta(0=Não, 1=Documento, 2=documento_baixa)')
        table.tinyint('proposta_interna',1).default(0).comment('select,insert,update,references  Utiliza o sistema de proposta interna')

    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_cso_jp.cad_contatos')
};
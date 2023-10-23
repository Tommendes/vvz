exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_cso_root.pv_oat', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.string('status').default(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_pv',10).unsigned().notNull().comment('ID do pv')
        table.integer('id_cadastro_endereco',10).unsigned().notNull().comment('Endereço do atendimento')
        table.integer('id_tecnico',10).unsigned().comment('Técnico responsável')
        table.integer('nr_oat',3).notNull().comment('OAT')
        table.integer('int_ext',10).notNull().comment('Interno/Externo')
        table.integer('garantia',1).notNull().comment('Garantia')
        table.string('nf_garantia',255).comment('Nota fiscal do produto')
        table.string('pessoa_contato',255).comment('Contato no cliente')
        table.string('telefone_contato',255).comment('Telefone do contato')
        table.string('email_contato',255).comment('Email do contato')
        table.text('descricao').comment('Descrição dos serviços')
        table.decimal('valor_total',10,2).comment('Valor dos serviços')
        table.string('aceite_do_cliente',255).comment('Data do aceite')
        table.foreign('id_pv').references('id').inTable('pv').onUpdate('Cascade').onDelete('NO ACTION')
        table.foreign('id_cadastro_endereco').references('id').inTable('cad_enderecos').onUpdate('Cascade').onDelete('NO ACTION')
        table.foreign('id_tecnico').references('id').inTable('pv_tecnicos').onUpdate('Cascade').onDelete('NO ACTION')
        
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_cso_root.pv_oat')
};
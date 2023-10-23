exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_cso_root.protocolo', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.string('status').default(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_cadastros',10).unsigned().notNull().comment('Registro do Destinatário no cadastro')
        table.string('email_destinatario',255).comment('Destinatário(email)')
        table.string('registro',255).comment('Número do protocolo')
        table.string('titulo',255).comment('Port')
        table.string('e_s',255).comment('Movimento')
        table.string('descricao',255).comment('Descrição do documento')
        table.foreign('id_cadastros').references('id').inTable('cadastros').onUpdate('Cascade').onDelete('NO ACTION')
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_cso_root.protocolo')
};
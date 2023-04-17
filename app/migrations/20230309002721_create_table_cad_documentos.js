exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_cso_jp.cad_documentos', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.string('status').default(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_cadastros').notNull().unsigned()
        table.integer('id_tipo').notNull().unsigned()
        table.string('documento').notNull().comment('Número do documento')
        table.string('emissao').comment('Data de emissão')
        table.string('validade').comment('Data de validade')
        table.string('obs').comment('Observações do documento')
        table.foreign('id_cadastros').references('id').inTable('cadastros').onUpdate('Cascade').onDelete('NO ACTION')
        table.foreign('id_tipo').references('id').inTable('local_params').onUpdate('Cascade').onDelete('NO ACTION')
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_cso_jp.cad_documentos')
};
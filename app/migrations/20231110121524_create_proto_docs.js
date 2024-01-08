exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_bceaa5.proto_docs', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_protocolos',10).unsigned().notNull().comment('Registro do protocolos')
        table.specificType('tp_documento','text').notNull().comment('Tipo do documento')
        table.string('descricao',255).notNull().comment('Descrição do documento')
        table.foreign('id_protocolos').references('id').inTable('protocolos').onUpdate('Cascade').onDelete('NO ACTION')
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.proto_docs')
};
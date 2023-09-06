exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_cliente_dominio.cad_contatos', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.string('status').default(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_cadastros').notNull().unsigned()
        table.integer('id_params_tipo').notNull().unsigned()
        table.string('pessoa').notNull().comment('Pessoa de contato')
        table.string('departamento').comment('Departamento')
        table.string('meio').notNull().comment('Meio de contato (P.Ex.: nr do telefone ou email)')
        table.string('observacao').comment('Observações do endereço')
        table.foreign('id_cadastros').references('id').inTable('cadastros').onUpdate('Cascade').onDelete('NO ACTION')
        table.foreign('id_params_tipo').references('id').inTable('local_params').onUpdate('Cascade').onDelete('NO ACTION')
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_cliente_dominio.cad_contatos')
};
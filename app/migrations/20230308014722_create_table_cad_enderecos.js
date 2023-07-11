exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_cliente_dominio.cad_enderecos', table => {
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
        table.string('cep',8).notNull().comment('Cep')
        table.string('logradouro').notNull().comment('Logradouro')
        table.string('nr').notNull().comment('Número')
        table.string('complnr').comment('Complemento')
        table.string('bairro').comment('Bairro')
        table.string('cidade').notNull().comment('Cidade')
        table.string('uf',2).notNull().comment('Estado')
        table.string('ibge',8).comment('IBGE')
        table.string('geo_ltd').comment('Geo. latd')
        table.string('geo_lng').comment('Geo. lng')
        table.string('obs').comment('Observações do endereço')
        table.foreign('id_cadastros').references('id').inTable('cadastros').onUpdate('Cascade').onDelete('NO ACTION')
        table.foreign('id_tipo').references('id').inTable('local_params').onUpdate('Cascade').onDelete('NO ACTION')
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_cliente_dominio.cad_enderecos')
};
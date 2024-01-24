exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_bceaa5.cad_dados_publicos', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_cadastros').notNull().unsigned().references('id').inTable('cadastros').onUpdate('Cascade').onDelete('NO ACTION')
        table.string('dados',2500).comment('Dados públicos do CNPJ do cliente')
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.cad_dados_publicos')
};
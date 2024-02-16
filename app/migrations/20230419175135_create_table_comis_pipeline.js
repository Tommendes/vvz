exports.up = function (knex, Promise) {
    return knex.schema.createTable('vivazul_bceaa5.comis_pipeline', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_pipeline', 10).unsigned().notNull().comment('Documento relacionado ').references('id').inTable('pipeline').onUpdate('Cascade').onDelete('NO ACTION')
        table.decimal('base_representacao', 10, 2).comment('Valor base de cálculo da comissão da representação')
        table.decimal('base_agentes', 10, 2).comment('Valor base de cálculo da comissão dos agentes')
        table.string('observacao').comment('Observação do registro')
    })
};

exports.down = function (knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.comis_pipeline')
};
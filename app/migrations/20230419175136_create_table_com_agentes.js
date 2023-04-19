exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_cso_jp.com_agentes', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.string('status').default(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.string('ordem',3).comment('Número identificador próprio')
        table.foreign('id_cadastros').references('id').inTable('cadastros').onUpdate('Cascade').onDelete('NO ACTION')
        table.tinyint('dsr',1).notNull().default(0).comment('Recebe DSR')
        table.decimal('observacao',10,2).comment('Observação do registro')
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_cso_jp.com_agentes')
};
exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_cso_root.fin_retencoes', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.string('status').default(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_fin_lanc',10).unsigned().notNull().comment('Chave estrangeira com a tabela fin_lancamentos')
        table.double('valor',11,2).default(0.00).comment('Valor da retenção')
        table.string('Valor da retenção',250).default(0.00).comment('Descrição da retenção')
        table.foreign('id_fin_lanc').references('id').inTable('fin_lancamentos').onUpdate('Cascade').onDelete('NO ACTION')
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_cso_root.fin_retencoes')
};
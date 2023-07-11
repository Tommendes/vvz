exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_cliente_dominio.fin_cc', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.string('status').default(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.string('codigo',255).notNull().comment('Código da despesa ou receita')
        table.specificType('tipo','char(1)').notNull().comment('Despesa ou receita')
        table.string('descricao',50).notNull().comment('Descrição do centro de custo')
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_cliente_dominio.fin_cc')
};
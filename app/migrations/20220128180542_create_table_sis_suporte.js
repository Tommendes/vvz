exports.up = function(knex) {
    return knex.schema.createTable('sis_suporte', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('status').notNull().default(10)
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.string('grupo').comment("Grupo")
        table.string('descricao').comment("Descrição")
        table.string('texto', 2000).comment("Texto do suporte")  
    })
};

exports.down = function(knex) {
    return knex.schema.dropTable('sis_suporte')
};
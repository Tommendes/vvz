exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_bceaa5.com_agentes', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.string('ordem',3).comment('Número identificador próprio')
        table.integer('id_users').unsigned().references('id').inTable('vivazul_api.users').onUpdate('Cascade').onDelete('NO ACTION').comment('Registro no cadastro')
        table.integer('id_cadastros').unsigned().notNull().references('id').inTable('cadastros').onUpdate('Cascade').onDelete('NO ACTION').comment('Registro no cadastro')
        table.tinyint('dsr',1).notNull().defaultTo(0).comment('Recebe DSR')
        table.string('observacao').comment('Observação do registro')
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.com_agentes')
};
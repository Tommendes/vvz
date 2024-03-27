exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_bceaa5.comis_status', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_comissoes',10).unsigned().comment('Documento pai').references('id').inTable('pv').onUpdate('Cascade').onDelete('NO ACTION')
        table.integer('status_comis',10).unsigned().defaultTo(10).notNull().comment('Status do comissionamento (Lançado:10; Pago:20; Cancelado:99)')
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.comis_status')
};
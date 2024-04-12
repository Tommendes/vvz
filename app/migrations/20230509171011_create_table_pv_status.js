exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_bceaa5.pv_status', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_pv',10).unsigned().comment('Documento pai')
        table.integer('status_pv',10).unsigned().notNull().comment('Status do PV')
        table.foreign('id_pv').references('id').inTable('pv').onUpdate('Cascade').onDelete('Cascade')
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.pv_status')
};
exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_cliente_dominio.pv', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.string('status').default(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_cadastros',10).unsigned().notNull().comment('Cliente')
        table.integer('id_ged',10).unsigned().comment('Ged')
        table.integer('tipo',1).notNull().default(0).comment('Tipo de pv (SUPORTE:0; MONTAGEM:1)')
        table.string('pv_nr',255).comment('Número do PV')
        table.text('observacao').comment('Observação')
        table.specificType('situacao', 'char(2)').notNull().comment('Situação do pós atendimento')
        table.foreign('id_cadastros').references('id').inTable('cadastros').onUpdate('Cascade').onDelete('NO ACTION')
        table.foreign('id_ged').references('id').inTable('ged').onUpdate('Cascade').onDelete('NO ACTION')

    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_cliente_dominio.pv')
};
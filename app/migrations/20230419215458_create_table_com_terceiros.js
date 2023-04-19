exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_cso_jp.com_terceiros', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.string('status').default(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.foreign('id_ged').references('id').inTable('ged').onUpdate('Cascade').onDelete('NO ACTION')
        table.foreign('id_com_agentes').references('id').inTable('com_agentes').onUpdate('Cascade').onDelete('NO ACTION')
        table.boolean('terceiro').comment('Se um terceiro')
        table.decimal('valor_base',10,2).comment('Valor base de cálculo da comissão')
        table.decimal('participacao',10,2).comment('Percentual de comissão')
        table.string('liquidacao',255).comment('Data da liquidação')
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_cso_jp.com_terceiros')
};
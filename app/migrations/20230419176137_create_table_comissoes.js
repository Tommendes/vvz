const { defaultClientSchema } = require('../.env')

exports.up = function (knex, Promise) {
    return knex.schema.createTable(defaultClientSchema + '.comissoes', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_pipeline', 10).unsigned().notNull().comment('Pipeline relacionado ')
        table.integer('id_comis_agentes', 10).unsigned().notNull().comment('Agente').references('id').inTable('comis_agentes').onUpdate('Cascade').onDelete('NO ACTION')
        table.decimal('valor_base', 10, 2).comment('Valor base de cálculo da comissão')
        table.decimal('desconto', 10, 2).comment('Percentual sobre a base')
        table.decimal('valor', 10, 2).comment('Valor da comissão')
        table.string('liquidar_em', 10).comment('Previsão para liquidação da comissão')
    })
};

exports.down = function (knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.comissoes')
};
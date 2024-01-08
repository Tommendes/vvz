/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex, Promise) {
    return knex.schema.createTable('vivazul_bceaa5.com_prospeccoes', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_agente', 10).unsigned().notNull().references('id').inTable('vivazul_api.users').onUpdate('Cascade').onDelete('NO ACTION').comment('Chave estrangeira com a tabela users')
        table.integer('id_cadastros', 10).unsigned().notNull().references('id').inTable('cadastros').onUpdate('Cascade').onDelete('NO ACTION').comment('Chave estrangeira com a tabela cadastros')
        table.integer('id_cad_end', 10).unsigned().notNull().references('id').inTable('cad_enderecos').onUpdate('Cascade').onDelete('NO ACTION').comment('Chave estrangeira com a tabela cad_enderecos')
        table.boolean('periodo').defaultTo(0).comment('0 = manhã, 1 = tarde, 2 = noite')
        table.string('pessoa').comment('Pessoa contatada')
        table.string('contato').comment('Forma de contato')
        table.string('observacoes', 2550).comment('Observações da visita')
        table.string('data_visita').comment('Data da visita')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.com_prospeccoes')
};
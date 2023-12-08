/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('vivazul_cso_root.com_prop_compos', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')

        table.integer('id_com_propostas').unsigned().references('id').inTable('com_propostas').onUpdate('Cascade').onDelete('NO ACTION').comment('Chave estrangeira com a tabela com_propostas')
        table.boolean('compoe_valor').defaultTo(1).notNull().comment('Compõe valor (Não:0; Sim:1)')
        table.integer('ordem').unsigned().notNull().comment('Ordem em que as composições foram criados. Utilizado para o caso de reordenar a coluna item')
        table.integer('compos_nr').unsigned().notNull().comment('Número da composição')
        table.string('localizacao').comment('Localização do produto')
        table.string('tombamento').comment('Tombamento do produto')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable('vivazul_cso_root.com_prop_compos')
};

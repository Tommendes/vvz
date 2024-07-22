/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_bceaa5.fin_etiquetas', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_etiqueta_pai').unsigned().references('id').inTable('fin_etiquetas').onUpdate('Cascade').onDelete('NO ACTION')
        table.integer('id_etiqueta_filho').unsigned().references('id').inTable('fin_etiquetas').onUpdate('Cascade').onDelete('NO ACTION')
        table.boolean('centro').comment('Tipo de relação (0: Receita; 1: Despesa)')
        table.string('descricao').comment('Descrição da etiqueta')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.fin_etiquetas')
};
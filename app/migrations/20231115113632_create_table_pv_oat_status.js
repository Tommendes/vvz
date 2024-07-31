const { defaultClientSchema } = require('../.env')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable(defaultClientSchema + '.pv_oat_status', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_pv_oat', 10).unsigned().comment('Documento pai')
        table.integer('status_pv_oat', 10).unsigned().notNull().comment('Status do PV')
        table.foreign('id_pv_oat').references('id').inTable('pv_oat').onUpdate('Cascade').onDelete('NO ACTION')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable('vivazul_bceaa5.pv_oat_status')
};

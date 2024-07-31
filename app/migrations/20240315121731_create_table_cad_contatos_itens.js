const { defaultClientSchema } = require('../.env')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex, Promise) {
    return knex.schema.createTable(defaultClientSchema + '.cad_contatos_itens', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('id_cad_contatos').notNull().unsigned().references('id').inTable('cad_contatos').onUpdate('Cascade').onDelete('Cascade')
        table.integer('id_params_tipo').notNull().unsigned().references('id').inTable('local_params').onUpdate('Cascade').onDelete('NO ACTION')
        table.string('meio').notNull().comment('Meio de contato (P.Ex.: nr do telefone ou email)')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.cad_contatos_itens')
};
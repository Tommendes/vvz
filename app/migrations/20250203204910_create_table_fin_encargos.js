const { migrationClientSchema } = require('../.env')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex, Promise) {
    return knex.schema.createTable(migrationClientSchema + '.fin_encargos', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(10).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')        
        table.integer('id_fin_lancamentos').notNull().unsigned().references('id').inTable(migrationClientSchema + '.fin_lancamentos').onUpdate('Cascade').onDelete('NO ACTION').comment('Lançamento relacionado')
        table.double('valor_encargo', 11,2).notNull().defaultTo(0.00).comment('Valor do encargo')
        table.string('descricao').notNull().comment('Descrição curta da retenção')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex, Promise) {
    return knex.schema.dropTable(migrationClientSchema + '.fin_encargos')
};
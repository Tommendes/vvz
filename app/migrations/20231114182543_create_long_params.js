/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 * @returns 
 */
exports.up = function (knex, Promise) {
    return knex.schema.createTable('vivazul_cso_root.long_params', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').notNull().defaultTo(0)
        table.string('grupo').comment('Grupo do parâmetro')
        table.specificType('parametro', 'text').comment('Parâmetro')
        table.string('label', 1000).comment('Label')
    })
};


/**
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 * @returns 
 */
exports.down = function (knex, Promise) {
    return knex.schema.dropTable('vivazul_cso_root.long_params')
};

const { defaultClientSchema } = require('../.env')

exports.up = function(knex, Promise) {
    return knex.schema.createTable(defaultClientSchema + '.local_params', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').notNull().defaultTo(0)
        table.string('grupo').comment('Grupo do parâmetro')
        table.string('parametro',1000).comment('Parâmetro')
        table.string('label',1000).comment('Label')
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.local_params')
};
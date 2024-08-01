const { db } = require('../.env')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
*/
exports.up = function (knex) {
    return knex.schema.createTable(`${db.database}.ftp_control`, table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')

        table.integer('schema_id').unsigned().references('id').inTable(db.database + '.schemas_control').onUpdate('Cascade').onDelete('NO ACTION').comment('Schema do cliente')
        table.string('descricao').comment('Descrição abreviada do host FTP')
        table.string('host').comment('DNS ou IP do host FTP')
        table.string('port').defaultTo('21').comment('Porta do host FTP')
        table.string('user').comment('Usuário do host FTP')
        table.string('pass').comment('Senha do host FTP')
        table.boolean('ssl').defaultTo(0).comment('Utiliza SSL')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(`${db.database}.ftp_control`)
};

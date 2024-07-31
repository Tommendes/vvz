const { defaultClientSchema } = require('../.env')

exports.up = function(knex, Promise) {
    return knex.schema.createTable(defaultClientSchema + '.pipeline_ftp', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.string('descricao').comment('Descrição abreviada do host FTP')
        table.string('host').comment('DNS ou IP do host FTP')
        table.string('port').defaultTo('21').comment('Porta do host FTP')
        table.string('user').comment('Usuário do host FTP')
        table.string('pass').comment('Senha do host FTP')
        table.boolean('ssl').defaultTo(0).comment('Utiliza SSL')
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.pipeline_ftp')
};
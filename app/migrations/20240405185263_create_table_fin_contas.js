const { migrationClientSchema } = require('../.env')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex, Promise) {
    // Registo das contas bancárias
    return knex.schema.createTable(migrationClientSchema + '.fin_contas', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')        
        table.integer('id_empresa').notNull().unsigned().references('id').inTable(migrationClientSchema + '.empresa').onUpdate('Cascade').onDelete('NO ACTION').comment('Empresa proprietária da conta')
        table.integer('conta_tipo').comment('Tipo de conta').comment('Tipo de conta (1:Corrente; 2:Poupança; 3:Caixinha; 4:Cartão; 5:Investimento; 6:Outros)')
        table.integer('id_fin_cad_bancos').unsigned().references('id').inTable(migrationClientSchema + '.fin_cad_bancos').onUpdate('Cascade').onDelete('NO ACTION').comment('Banco relacionado')
        table.string('agencia').comment('Agência')
        table.string('agencia_dv').comment('Dígito verificador da agência')
        table.string('conta').comment('Conta')
        table.string('conta_dv').comment('Dígito verificador da conta')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.fin_contas')
};
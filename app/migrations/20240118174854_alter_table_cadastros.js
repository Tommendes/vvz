const { migrationClientSchema } = require('../.env')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable(migrationClientSchema + '.cadastros', table => {
        table.integer('id_params_tipo_end').unsigned().references('id').inTable(migrationClientSchema + '.local_params').onUpdate('Cascade').onDelete('NO ACTION').comment('Tipo de endereço')
        table.string('cep',8).comment('Cep')
        table.string('logradouro').comment('Logradouro')
        table.string('nr').comment('Número')
        table.string('complnr').comment('Complemento')
        table.string('bairro').comment('Bairro')
        table.string('cidade').comment('Cidade')
        table.string('uf',2).comment('Estado')
        table.string('geo_ltd').comment('Geo. latd')
        table.string('geo_lng').comment('Geo. lng')
        table.string('observacao_endereco').comment('Observações do endereço')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable(migrationClientSchema + '.cadastros', table => {
        table.dropColumn('id_params_tipo')
        table.dropColumn('cep')
        table.dropColumn('logradouro')
        table.dropColumn('nr')
        table.dropColumn('complnr')
        table.dropColumn('bairro')
        table.dropColumn('cidade')
        table.dropColumn('uf')
        table.dropColumn('geo_ltd')
        table.dropColumn('geo_lng')
        table.dropColumn('observacao_endereco')
    })
};

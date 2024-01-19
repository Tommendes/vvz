/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('vivazul_bceaa5.cadastros', table => {
        table.integer('id_params_tipo_end').notNull().unsigned().comment('Tipo de endereço')
        table.string('cep',8).notNull().comment('Cep')
        table.string('logradouro').notNull().comment('Logradouro')
        table.string('nr').notNull().comment('Número')
        table.string('complnr').comment('Complemento')
        table.string('bairro').comment('Bairro')
        table.string('cidade').notNull().comment('Cidade')
        table.string('uf',2).notNull().comment('Estado')
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
    return knex.schema.alterTable('vivazul_bceaa5.cadastros', table => {
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

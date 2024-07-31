const { defaultClientSchema } = require('../.env')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex, Promise) {
    return knex.schema.createTable(defaultClientSchema + '.fis_notas', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('status').defaultTo(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.boolean('tipo').notNull().comment('Tipo de relação (0: Entrada; 1: Saída)')
        table.string('numero').notNull().comment('Número da nota')
        table.string('serie').notNull().comment('Série da nota')
        table.string('chave').comment('Chave de acesso')
        table.string('data_emissao').comment('Data de emissão')
        table.string('data_e_s').comment('Data de entrada/saída')
        table.integer('id_empresa').notNull().unsigned().references('id').inTable('empresa').onUpdate('Cascade').onDelete('NO ACTION').comment('Empresa proprietária da nota')
        table.integer('id_cadastros').notNull().unsigned().references('id').inTable('cadastros').onUpdate('Cascade').onDelete('NO ACTION').comment('Fornecedor relacionado')
        table.string('descricao').comment('Descrição da nota')
        table.double('valor_total', 11,2).notNull().defaultTo(0.00).comment('Valor total da nota')
        table.double('valor_desconto', 11,2).defaultTo(0.00).comment('Valor total de desconto')
        table.double('valor_liquido', 11,2).defaultTo(0.00).comment('Valor líquido')
        table.double('valor_icms', 11,2).defaultTo(0.00).comment('Valor total de ICMS')
        table.double('valor_ipi', 11,2).defaultTo(0.00).comment('Valor total de IPI')
        table.double('valor_pis', 11,2).defaultTo(0.00).comment('Valor total de PIS')
        table.double('valor_cofins', 11,2).defaultTo(0.00).comment('Valor total de COFINS')
        table.double('valor_iss', 11,2).defaultTo(0.00).comment('Valor total de ISS')
        table.double('valor_ir', 11,2).defaultTo(0.00).comment('Valor total de IR')
        table.double('valor_csll', 11,2).defaultTo(0.00).comment('Valor total de CSLL')
        table.double('valor_inss', 11,2).defaultTo(0.00).comment('Valor total de INSS')
        table.double('valor_outros', 11,2).defaultTo(0.00).comment('Valor total de outros impostos')
        table.double('valor_servicos', 11,2).defaultTo(0.00).comment('Valor total de serviços')
        table.double('valor_produtos', 11,2).defaultTo(0.00).comment('Valor total de produtos')
        table.double('valor_frete', 11,2).defaultTo(0.00).comment('Valor total de frete')
        table.double('valor_seguro', 11,2).defaultTo(0.00).comment('Valor total de seguro')
        table.double('valor_despesas', 11,2).defaultTo(0.00).comment('Valor total de despesas')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_bceaa5.fis_notas')
};
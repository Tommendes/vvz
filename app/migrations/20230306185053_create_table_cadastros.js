exports.up = function(knex, Promise) {
    return knex.schema.createTable('vivazul_cliente_dominio.cadastros', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.string('status').default(0).notNull().comment('Status do registro (INATIVO:0; ATIVO:10; EXCLUÍDO:99)')
        table.integer('prospect',1).default(1).notNull().comment('Prospecto (Não: 0; Sim: 1)')
        table.string('id_params_tipo').notNull().comment('Tipo de cliente (Arquiteto, Cliente, Fornecedor)')
        table.integer('id_params_atuacao',10).unsigned().notNull().comment('Área de atuação (Chave estrangeira com a tabela CLI_DOM.local_params)')
        table.string('cpf_cnpj').unique().notNull().comment('CPF ou CNPJ')
        table.string('rg_ie').comment('RG(PF) ou Inscrição Estadual(PJ)')
        table.string('nome').notNull().comment('Nome ou razão social')
        table.string('id_params_sexo').comment('Sexo(apenas PF) (Masc: 0; Fem: 1; Outro: 2)')
        table.string('aniversario').comment('Nascimento(PF) | Fundação(PJ)')
        table.string('id_params_p_nascto').comment('Nacionalidade')
        table.string('observacao',2500).comment('Observações do cliente')
        table.foreign('id_params_tipo').references('id').inTable('local_params').onUpdate('Cascade').onDelete('NO ACTION')
        table.foreign('id_params_atuacao').references('id').inTable('local_params').onUpdate('Cascade').onDelete('NO ACTION')
        table.foreign('id_params_sexo').references('id').inTable('vivazul_api.params').onUpdate('Cascade').onDelete('NO ACTION')
        table.foreign('id_params_p_nascto').references('id').inTable('vivazul_api.params').onUpdate('Cascade').onDelete('NO ACTION')
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('vivazul_cliente_dominio.cadastros')
};
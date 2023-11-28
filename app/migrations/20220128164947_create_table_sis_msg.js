exports.up = function(knex) {
    return knex.schema.createTable('sis_msg', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('id_user').comment('Se não informado então todos verão a mensagem')
        table.integer('status').notNull().defaultTo(10).comment('Se status = 10, exibe .title e .msg enquanto não atingir valid from')
        table.string('status_user').notNull().defaultTo(10).comment('Se informado, tem prioridade sobre DBuser.status')
        table.string('evento').notNull().defaultTo(10)
        table.string('created_at').notNull()
        table.string('updated_at')
        table.string('valid_from').comment('Se informado, mostra title_future e .msg_future')
        table.string('valid_to').comment('Tem prioridade sobre status=10. Se não informado, as mensagens aparecerão por tempo indeterminado e enquanto o status for = 10')
        table.string('title').comment('Exibido quanto status = 10 e, se valid_from for informado e não for atingido')
        table.string('msg').comment('Exibido quanto status = 10 e, se valid_from for informado e não for atingido')
        table.string('title_future').comment('Exibido se valid_from informado e atingido')
        table.string('msg_future').comment('Exibido se valid_from informado e atingido')
        table.string('body_variant')
    })
};

exports.down = function(knex) {
    return knex.schema.dropTable('sis_msg')
};
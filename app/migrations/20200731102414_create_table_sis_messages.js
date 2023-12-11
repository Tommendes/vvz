exports.up = function (knex) {
    return knex.schema.createTable('sis_messages', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('status').notNull().defaultTo(10)
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.integer('id_user').unsigned().references('id').inTable('users').onUpdate('Cascade').onDelete('Cascade').comment('Se não for informado o destinatário, então todos receberão')
        table.integer('status_user').defaultTo(10).comment('Se informado, tem prioridade sobre DBuser.status')
        table.string('valid_from', 10).notNull().comment('Se informado, mostra title_future e .msg_future')
        table.string('valid_to', 10).comment('Tem prioridade sobre status=10. Se não informado, as mensagens aparecerão por tempo indeterminado e enquanto o status for = 10')
        table.string('title').notNull().comment('Exibido quanto status = 10 e, se valid_from for informado e não for atingido')
        table.string('msg', 2500).notNull().comment('Exibido quanto status = 10 e, se valid_from for informado e não for atingido')
        table.string('title_future').comment('Exibido se valid_from informado e atingido')
        table.string('msg_future', 2500).comment('Exibido se valid_from informado e atingido')
        table.string('body_variant').comment('Cor da mensagem')
        table.boolean('severity').notNull().defaultTo(0).comment('Severidade da mensagem')
    })
};

exports.down = function (knex) {
    return knex.schema.dropTable('sis_messages')
};

exports.up = function (knex) {
    return knex.schema.createTable('uploads', table => {
        table.engine('InnoDB')
        table.charset('utf8mb4')
        table.collate('utf8mb4_general_ci')
        table.increments('id').primary()
        table.integer('status').notNull().defaultTo(10)
        table.integer('evento').notNull()
        table.string('created_at').notNull()
        table.string('updated_at')
        table.string('fieldname').notNull().comment('Nome do campo do formulário')
        table.string('originalname').notNull().comment('Nome original do arquivo')
        table.string('encoding').notNull().comment('Tipo de codificação do arquivo')
        table.string('mimetype').notNull().comment('Tipo do arquivo')
        table.string('destination').notNull().comment('Caminho da pasta onde o arquivo foi salvo')
        table.string('filename').notNull().comment('Nome do arquivo salvo')
        table.string('path').notNull().comment('Caminho completo do arquivo salvo')
        table.integer('size').notNull().comment('Tamanho do arquivo em bytes')
        table.string('url').notNull().comment('URL do arquivo')
        table.string('label').notNull().comment('Label do arquivo')
        table.string('uid').notNull().comment('UID do arquivo')
    })
};

exports.down = function (knex) {
    return knex.schema.dropTable('uploads')
};
const mysql = require('mysql');
const orignSchema = 'vivazul_bceaa5';
const newSchema = 'vivazul_bceaa6';
const newSchemaClientName = 'Nome do Cliente'; // Defina o nome do cliente aqui

// Configurações de conexão com o banco de dados
const connection = mysql.createConnection({
    host: '85.31.231.103',
    port: 3306,
    collation: 'utf8mb4_general_ci',
    database: 'vivazul_api',
    user: 'vivazul_ger3nci1d0r',
    password: 's3nh@ 1t1lizad@ pa4a gerenciar',
    charset: 'utf8mb4'
});

// Função para obter os nomes das tabelas no schema wwmgca_cliente_ativos
function getTableNames(callback) {
    connection.query(`SHOW TABLES IN ${orignSchema}`, (err, results) => {
        if (err) {
            console.error('Erro ao obter nomes das tabelas:', err);
            return callback(err, null);
        }
        const tables = results.map(row => row[`Tables_in_${orignSchema}`]);
        callback(null, tables);
    });
}

// Função para obter o CREATE TABLE de uma tabela específica
function getCreateTable(tableName, callback) {
    connection.query(`SHOW CREATE TABLE ${orignSchema}.${tableName}`, (err, results) => {
        if (err) {
            console.error(`Erro ao obter CREATE TABLE de ${tableName}:`, err);
            return callback(err, null);
        }
        let createTableSql = results[0]['Create Table'];
        createTableSql = createTableSql
            .replace('CREATE TABLE', 'CREATE TABLE IF NOT EXISTS')
            .replace(/\n/g, ' ')
            .replace(new RegExp(orignSchema, 'g'), newSchema); // Remove as quebras de linha e substitui o schema de origem pelo novo schema
        callback(null, createTableSql);
    });
}

// Função para criar um novo schema e as tabelas correspondentes
function criarNovoSchema(schemaName, tables, callback) {
    connection.query(`CREATE DATABASE IF NOT EXISTS \`${schemaName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`, err => {
        if (err) {
            console.error('Erro ao criar novo schema:', err);
            return callback(err);
        }
        console.log(`Schema ${schemaName} criado ou já existe.`);

        // Mudar para o novo schema
        connection.query(`USE \`${schemaName}\``, err => {
            if (err) {
                console.error(`Erro ao mudar para o schema ${schemaName}:`, err);
                return callback(err);
            }
            console.log(`Usando schema ${schemaName}.`);

            // Desativar checagens de chave estrangeira
            connection.query('SET FOREIGN_KEY_CHECKS = 0', err => {
                if (err) {
                    console.error('Erro ao desativar checagens de chave estrangeira:', err);
                    return callback(err);
                }

                // Itera sobre as tabelas, obtém o CREATE TABLE, remove se existir e cria no novo schema
                let completedTables = 0;
                for (let index = 0; index < tables.length; index++) {
                    const tableName = tables[index];
                    getCreateTable(tableName, (err, createTableSql) => {
                        if (err) {
                            console.error(`Erro ao obter CREATE TABLE de ${tableName}:`, err);
                            return callback(err);
                        }

                        const dropTableSql = `DROP TABLE IF EXISTS \`${tableName}\``;
                        connection.query(dropTableSql, err => {
                            if (err) {
                                console.error(`Erro ao remover tabela ${tableName}:`, err);
                                return callback(err);
                            }
                            console.log(`Tabela ${tableName} removida (se existia).`);

                            connection.query(createTableSql, err => {
                                if (err) {
                                    console.error(`Erro ao criar tabela ${tableName} no novo schema:`, err);
                                    return callback(err);
                                }
                                console.log(`Tabela ${tableName} criada no novo schema.`);

                                completedTables++;
                                if (completedTables === tables.length) {
                                    // Reativar checagens de chave estrangeira
                                    connection.query('SET FOREIGN_KEY_CHECKS = 1', err => {
                                        if (err) {
                                            console.error('Erro ao reativar checagens de chave estrangeira:', err);
                                            connection.end(); // Fecha a conexão com o banco de dados
                                            return callback(err);
                                        }
                                        callback(null);
                                    });
                                }
                            });
                        });
                    });
                };
            });
        });
    });
}

// Função para copiar os dados das tabelas
function CopyNewTables(callback) {
    connection.query(`INSERT INTO ${newSchema}.local_params SELECT * FROM ${orignSchema}.local_params`, (err, results) => {
        if (err) {
            console.error('Erro ao copiar dados da tabela local_params:', err);
            return callback(err);
        }
        console.log('Dados da tabela local_params copiados com sucesso.');

        connection.query(`INSERT INTO ${newSchema}.long_params SELECT * FROM ${orignSchema}.long_params`, (err, results) => {
            if (err) {
                console.error('Erro ao copiar dados da tabela long_params:', err);
                return callback(err);
            }
            console.log('Dados da tabela long_params copiados com sucesso.');
            callback(null); // Chama o callback após copiar os dados
        });
    });
}

// Função para inserir um registro na tabela schemas_control
function insertSchemaControl(callback) {
    const schemaName = newSchema.split('_')[1];
    const schemaDescription = newSchemaClientName;
    const schemaAuthor = 'suporte@vivazul.com.br';
    const schemaAuthorEmail = 'suporte@vivazul.com.br';
    const createdAt = new Date().toISOString();
    const evento = 1; // Defina o valor apropriado para o evento

    const removeQuery = `
        DELETE from vivazul_api.schemas_control where schema_name = '${schemaName}'
    `;
    const insertQuery = `
        INSERT INTO vivazul_api.schemas_control (
            evento, created_at, status, schema_name, schema_version, schema_description, schema_author, schema_author_email, chat_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        evento, createdAt, 10, schemaName, '1.0.0', schemaDescription, schemaAuthor, schemaAuthorEmail, 0
    ];

    connection.query(removeQuery, values, (err, results) => {
        if (err) {
            console.error('Erro ao excluir registro na tabela schemas_control:', err);
            return callback(err);
        }
        console.log('Registro excluído na tabela schemas_control com sucesso.');
        connection.query(insertQuery, values, (err, results) => {
            if (err) {
                console.error('Erro ao inserir registro na tabela schemas_control:', err);
                return callback(err);
            }
            console.log('Registro inserido na tabela schemas_control com sucesso.');
            callback(null);
        });
    });
}

// Exemplo de uso
getTableNames((err, tables) => {
    if (err) {
        console.error('Erro ao obter nomes das tabelas:', err);
        return;
    }
    criarNovoSchema(newSchema, tables, err => {
        if (err) {
            console.error('Erro ao criar novo schema e tabelas:', err);
            process.exit(1); // Encerra a aplicação com erro
        }
        console.log('Novo schema e tabelas criados com sucesso!');

        // Executar CopyNewTables após a criação do schema e das tabelas
        CopyNewTables(err => {
            if (err) {
                console.error('Erro ao copiar dados das tabelas:', err);
                process.exit(1); // Encerra a aplicação com erro
            }
            console.log('Dados copiados com sucesso!');

            // Inserir registro na tabela schemas_control após CopyNewTables
            insertSchemaControl(err => {
                if (err) {
                    console.error('Erro ao inserir registro na tabela schemas_control:', err);
                    process.exit(1); // Encerra a aplicação com erro
                }
                connection.end(); // Fecha a conexão com o banco de dados
                process.exit(0); // Encerra a aplicação com sucesso
            });
        });
    });
});
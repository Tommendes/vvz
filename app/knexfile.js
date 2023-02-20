const { db, client } = require('./.env.js')

module.exports = {
	client: client,
	connection: db,
	pool: {
		min: 2,
		max: 10
	},
	migrations: {
		tableName: 'knex_migrations'
	}
};

import { Pool } from 'pg';
import { Client } from '@elastic/elasticsearch';

export function createPgPool(): Pool {
	return new Pool({
		host: process.env.DB_HOST || 'localhost',
		port: parseInt(process.env.DB_PORT || '5432', 10),
		database: process.env.POSTGRES_DATABASE || 'overtureDb',
		user: process.env.POSTGRES_USERNAME || 'admin',
		password: process.env.POSTGRES_PASSWORD || 'admin123',
		max: 10,
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 10000,
	});
}

export function createEsClient(): Client {
	return new Client({
		node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
		auth: {
			username: process.env.ELASTICSEARCH_USER || 'elastic',
			password: process.env.ELASTICSEARCH_PASSWORD || 'myelasticpassword',
		},
	});
}

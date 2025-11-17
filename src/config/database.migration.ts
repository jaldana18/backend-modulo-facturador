import 'reflect-metadata';
import { DataSource } from 'typeorm';
import path from 'path';
import { config } from './environment';

// DataSource para migraciones (solo default export)
export default new DataSource({
  type: 'mssql',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: false,
  logging: config.nodeEnv === 'development' ? ['query', 'error'] : ['error'],
  entities: [path.join(__dirname, '../entities/**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '../migrations/**/*{.ts,.js}')],
  subscribers: [],
  options: {
    encrypt: config.database.encrypt,
    trustServerCertificate: config.database.trustServerCertificate,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
  },
  extra: {
    connectionTimeout: 30000,
    requestTimeout: 30000,
  },
});

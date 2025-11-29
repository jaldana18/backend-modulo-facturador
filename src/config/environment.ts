import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface EnvironmentConfig {
  nodeEnv: string;
  port: number;
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    encrypt: boolean;
    trustServerCertificate: boolean;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  encryption: {
    key: string;
  };
  logger: {
    level: string;
    fileMaxSize: number;
    fileMaxFiles: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origin: string;
    credentials: boolean;
  };
  api: {
    prefix: string;
    version: string;
  };
  validation: {
    schemaOnStartup: boolean;
    strictSchema: boolean;
  };
  migrations: {
    autoRun: boolean;
    forceInProduction: boolean;
  };
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
};

export const config: EnvironmentConfig = {
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  port: parseInt(getEnvVar('PORT', '3000'), 10),
  database: {
    host: getEnvVar('DB_HOST'),
    port: parseInt(getEnvVar('DB_PORT', '1433'), 10),
    username: getEnvVar('DB_USER'),
    password: getEnvVar('DB_PASSWORD'),
    database: getEnvVar('DB_NAME'),
    encrypt: getEnvVar('DB_ENCRYPT', 'true') === 'true',
    trustServerCertificate: getEnvVar('DB_TRUST_SERVER_CERTIFICATE', 'false') === 'true',
  },
  jwt: {
    secret: getEnvVar('JWT_SECRET'),
    refreshSecret: getEnvVar('JWT_REFRESH_SECRET'),
    expiresIn: getEnvVar('JWT_EXPIRES_IN', '15m'),
    refreshExpiresIn: getEnvVar('JWT_REFRESH_EXPIRES_IN', '7d'),
  },
  encryption: {
    key: getEnvVar('ENCRYPTION_KEY'),
  },
  logger: {
    level: getEnvVar('LOG_LEVEL', 'info'),
    fileMaxSize: parseInt(getEnvVar('LOG_FILE_MAX_SIZE', '5242880'), 10),
    fileMaxFiles: parseInt(getEnvVar('LOG_FILE_MAX_FILES', '10'), 10),
  },
  rateLimit: {
    windowMs: parseInt(getEnvVar('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    maxRequests: parseInt(getEnvVar('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
  },
  cors: {
    origin: getEnvVar('CORS_ORIGIN', 'http://localhost:3000,http://localhost:3001'),
    credentials: getEnvVar('CORS_CREDENTIALS', 'true') === 'true',
  },
  api: {
    prefix: getEnvVar('API_PREFIX', '/api'),
    version: getEnvVar('API_VERSION', 'v1'),
  },
  validation: {
    schemaOnStartup: getEnvVar('VALIDATE_SCHEMA_ON_STARTUP', 'true') === 'true',
    strictSchema: getEnvVar('STRICT_SCHEMA_VALIDATION', 'false') === 'true',
  },
  migrations: {
    autoRun: getEnvVar('AUTO_RUN_MIGRATIONS', 'true') === 'true',
    forceInProduction: getEnvVar('FORCE_MIGRATIONS_IN_PRODUCTION', 'false') === 'true',
  },
};

// Validate encryption key length (must be 64 hex chars for AES-256)
if (config.encryption.key.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes for AES-256)');
}

// Validate JWT secrets length
if (config.jwt.secret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}
if (config.jwt.refreshSecret.length < 32) {
  throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
}

export default config;

import crypto from 'crypto';
import { config } from '../config/environment';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(config.encryption.key, 'hex');

if (KEY.length !== 32) {
  throw new Error('Encryption key must be 32 bytes (64 hex characters)');
}

/**
 * Encrypt a string using AES-256-GCM
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData
 */
export const encrypt = (text: string): string => {
  if (!text) return text;

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypt a string encrypted with AES-256-GCM
 * @param encryptedData - Encrypted string in format: iv:authTag:encryptedData
 * @returns Decrypted plain text
 */
export const decrypt = (encryptedData: string): string => {
  if (!encryptedData) return encryptedData;

  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt data: ' + (error as Error).message);
  }
};

/**
 * Hash a password using bcrypt-compatible format
 * Note: This uses crypto.pbkdf2 for consistency, but bcrypt is used in practice
 */
export const hashPassword = async (password: string): Promise<string> => {
  const bcrypt = await import('bcrypt');
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

/**
 * Compare a password with its hash
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  const bcrypt = await import('bcrypt');
  return bcrypt.compare(password, hash);
};

/**
 * Generate a random token (for refresh tokens, reset tokens, etc.)
 */
export const generateRandomToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * TypeORM transformer for encrypted fields
 */
export const encryptionTransformer = {
  to: (value: any): string | null => {
    if (value === null || value === undefined) return null;
    return encrypt(String(value));
  },
  from: (value: string | null): any => {
    if (value === null || value === undefined) return null;
    return decrypt(value);
  },
};

/**
 * TypeORM transformer for numeric encrypted fields
 */
export const numericEncryptionTransformer = {
  to: (value: number | null): string | null => {
    if (value === null || value === undefined) return null;
    return encrypt(String(value));
  },
  from: (value: string | null): number | null => {
    if (value === null || value === undefined) return null;
    const decrypted = decrypt(value);
    return parseFloat(decrypted);
  },
};

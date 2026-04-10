import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

if (!process.env.MASTER_ENCRYPTION_KEY) {
  throw new Error('MASTER_ENCRYPTION_KEY is not set');
}

const MASTER_KEY = Buffer.from(process.env.MASTER_ENCRYPTION_KEY, 'hex');

if (MASTER_KEY.length !== 32) {
  throw new Error('MASTER_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
}

export class EncryptionService {
  /**
   * Encrypt a plaintext string
   * @param text - The plaintext to encrypt
   * @returns Encrypted string in format: iv:authTag:encrypted
   */
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt an encrypted string
   * @param encryptedText - The encrypted string in format: iv:authTag:encrypted
   * @returns Decrypted plaintext
   */
  static decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

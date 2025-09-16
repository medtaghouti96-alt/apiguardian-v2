// File: app/api/_lib/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const ENCODING = 'hex';

export function encryptSecret(secret: string, masterKey: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = scryptSync(masterKey, salt, 32);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [salt.toString(ENCODING), iv.toString(ENCODING), tag.toString(ENCODING), encrypted.toString(ENCODING)].join(':');
}

export function decryptSecret(encryptedSecret: string | null | undefined, masterKey: string): string | null {
  if (!encryptedSecret) return null;
  try {
    const parts = encryptedSecret.split(':');
    if (parts.length !== 4) {
      console.error('Decryption failed: Invalid format.');
      return null;
    }
    const [saltHex, ivHex, tagHex, encryptedHex] = parts;
    if (!saltHex || !ivHex || !tagHex || !encryptedHex) {
      console.error('Decryption failed: A part is missing.');
      return null;
    }
    const salt = Buffer.from(saltHex, ENCODING);
    const iv = Buffer.from(ivHex, ENCODING);
    const tag = Buffer.from(tagHex, ENCODING);
    const key = scryptSync(masterKey, salt, 32);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = decipher.update(encryptedHex, 'hex', 'utf8') + decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed.', error);
    return null;
  }
}
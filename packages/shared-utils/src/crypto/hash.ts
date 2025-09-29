/**
 * Hash Utilities
 * T086 - Cryptographic hashing functions
 */

import * as CryptoJS from 'crypto-js';

/**
 * Generate MD5 hash
 */
export function md5(input: string): string {
  return CryptoJS.MD5(input).toString();
}

/**
 * Generate SHA256 hash
 */
export function sha256(input: string): string {
  return CryptoJS.SHA256(input).toString();
}

/**
 * Generate SHA512 hash
 */
export function sha512(input: string): string {
  return CryptoJS.SHA512(input).toString();
}

/**
 * Generate HMAC
 */
export function hmac(
  input: string,
  secret: string,
  algorithm: 'SHA256' | 'SHA512' = 'SHA256'
): string {
  const algo = algorithm === 'SHA256' ? CryptoJS.HmacSHA256 : CryptoJS.HmacSHA512;
  return algo(input, secret).toString();
}

/**
 * Hash password with salt
 */
export function hashPassword(password: string, salt?: string): {
  hash: string;
  salt: string;
} {
  const actualSalt = salt || CryptoJS.lib.WordArray.random(128 / 8).toString();
  const hash = CryptoJS.PBKDF2(password, actualSalt, {
    keySize: 256 / 32,
    iterations: 10000,
  }).toString();

  return { hash, salt: actualSalt };
}

/**
 * Verify password hash
 */
export function verifyPassword(
  password: string,
  hash: string,
  salt: string
): boolean {
  const { hash: newHash } = hashPassword(password, salt);
  return newHash === hash;
}

/**
 * Generate checksum for data integrity
 */
export function generateChecksum(data: string | object): string {
  const input = typeof data === 'string' ? data : JSON.stringify(data);
  return sha256(input).substring(0, 16);
}

/**
 * Verify checksum
 */
export function verifyChecksum(data: string | object, checksum: string): boolean {
  return generateChecksum(data) === checksum;
}

/**
 * Generate fingerprint for object
 */
export function generateFingerprint(obj: any): string {
  const sorted = JSON.stringify(obj, Object.keys(obj).sort());
  return sha256(sorted).substring(0, 32);
}

/**
 * Hash file content
 */
export function hashFileContent(content: Buffer | string): string {
  const data = content instanceof Buffer ? content.toString('hex') : content;
  return sha256(data);
}
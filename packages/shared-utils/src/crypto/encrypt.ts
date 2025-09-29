/**
 * Encryption Utilities
 * T087 - Cryptographic encryption and decryption functions
 */

import * as CryptoJS from 'crypto-js';

/**
 * Encrypt text using AES
 */
export function encrypt(text: string, secret: string): string {
  return CryptoJS.AES.encrypt(text, secret).toString();
}

/**
 * Decrypt text using AES
 */
export function decrypt(encryptedText: string, secret: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedText, secret);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Encrypt object using AES
 */
export function encryptObject(obj: any, secret: string): string {
  const jsonString = JSON.stringify(obj);
  return encrypt(jsonString, secret);
}

/**
 * Decrypt object using AES
 */
export function decryptObject<T>(encryptedText: string, secret: string): T {
  const decryptedString = decrypt(encryptedText, secret);
  return JSON.parse(decryptedString) as T;
}

/**
 * Generate random encryption key
 */
export function generateKey(length: number = 256): string {
  const wordArray = CryptoJS.lib.WordArray.random(length / 8);
  return wordArray.toString();
}

/**
 * Generate random IV (Initialization Vector)
 */
export function generateIV(): string {
  return CryptoJS.lib.WordArray.random(128 / 8).toString();
}

/**
 * Encrypt with custom options
 */
export function encryptAdvanced(
  text: string,
  secret: string,
  options?: {
    mode?: any;
    padding?: any;
    iv?: string;
  }
): string {
  const encrypted = CryptoJS.AES.encrypt(text, secret, {
    mode: options?.mode || CryptoJS.mode.CBC,
    padding: options?.padding || CryptoJS.pad.Pkcs7,
    iv: options?.iv ? CryptoJS.enc.Hex.parse(options.iv) : undefined,
  });

  return encrypted.toString();
}

/**
 * Decrypt with custom options
 */
export function decryptAdvanced(
  encryptedText: string,
  secret: string,
  options?: {
    mode?: any;
    padding?: any;
    iv?: string;
  }
): string {
  const decrypted = CryptoJS.AES.decrypt(encryptedText, secret, {
    mode: options?.mode || CryptoJS.mode.CBC,
    padding: options?.padding || CryptoJS.pad.Pkcs7,
    iv: options?.iv ? CryptoJS.enc.Hex.parse(options.iv) : undefined,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * Base64 encode
 */
export function base64Encode(text: string): string {
  const wordArray = CryptoJS.enc.Utf8.parse(text);
  return CryptoJS.enc.Base64.stringify(wordArray);
}

/**
 * Base64 decode
 */
export function base64Decode(encodedText: string): string {
  const wordArray = CryptoJS.enc.Base64.parse(encodedText);
  return CryptoJS.enc.Utf8.stringify(wordArray);
}

/**
 * Create encrypted token
 */
export function createToken(
  payload: any,
  secret: string,
  expiresIn?: number
): string {
  const tokenData = {
    payload,
    iat: Date.now(),
    exp: expiresIn ? Date.now() + expiresIn : undefined,
  };

  return encryptObject(tokenData, secret);
}

/**
 * Verify and decode token
 */
export function verifyToken<T>(
  token: string,
  secret: string
): { valid: boolean; payload?: T; expired?: boolean } {
  try {
    const tokenData = decryptObject<any>(token, secret);

    if (tokenData.exp && Date.now() > tokenData.exp) {
      return { valid: false, expired: true };
    }

    return { valid: true, payload: tokenData.payload };
  } catch {
    return { valid: false };
  }
}
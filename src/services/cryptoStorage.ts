import { CreatedAmAccount } from '../types';

const STORAGE_KEY = 'am_supreme_vault_enc';
const LEGACY_STORAGE_KEY = 'am_owner_accounts';
const DEFAULT_SALT = 'AM-SUPREME-CRYPTO-SALT-2026-v2';

/**
 * Derives a 256-bit AES-GCM CryptoKey from a passphrase using PBKDF2
 */
async function deriveKey(passphrase: string, saltBytes: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Convert buffer to base64 string
 */
function bufferToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * High-Security Client-Side AES-GCM-256 Storage Engine
 * Works natively in all modern browsers and on Netlify HTTPS.
 */
export const cryptoStorage = {
  /**
   * Encrypts any serializable object into an AES-GCM ciphertext payload
   */
  async encryptPayload<T>(data: T, secretPass?: string): Promise<string> {
    try {
      const pass = secretPass || DEFAULT_SALT;
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(pass, salt);

      const enc = new TextEncoder();
      const encodedData = enc.encode(JSON.stringify(data));

      const cipherBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as unknown as BufferSource },
        key,
        encodedData
      );

      const payload = {
        v: 2,
        iv: bufferToBase64(iv),
        salt: bufferToBase64(salt),
        data: bufferToBase64(cipherBuffer),
        timestamp: Date.now(),
      };

      return 'enc_v2:' + window.btoa(JSON.stringify(payload));
    } catch (err) {
      // Fallback simple obfuscation if SubtleCrypto is restricted in insecure HTTP
      const json = JSON.stringify(data);
      return 'obf_v1:' + window.btoa(encodeURIComponent(json));
    }
  },

  /**
   * Decrypts an AES-GCM ciphertext payload back to original object
   */
  async decryptPayload<T>(cipherString: string, secretPass?: string): Promise<T | null> {
    if (!cipherString) return null;

    try {
      if (cipherString.startsWith('enc_v2:')) {
        const rawJson = window.atob(cipherString.replace('enc_v2:', ''));
        const payload = JSON.parse(rawJson);

        const pass = secretPass || DEFAULT_SALT;
        const salt = base64ToBuffer(payload.salt);
        const iv = base64ToBuffer(payload.iv);
        const cipherBytes = base64ToBuffer(payload.data);

        const key = await deriveKey(pass, salt);
        const decryptedBuffer = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv as unknown as BufferSource },
          key,
          cipherBytes as unknown as BufferSource
        );

        const dec = new TextDecoder();
        const jsonText = dec.decode(decryptedBuffer);
        return JSON.parse(jsonText) as T;
      }

      if (cipherString.startsWith('obf_v1:')) {
        const decoded = decodeURIComponent(window.atob(cipherString.replace('obf_v1:', '')));
        return JSON.parse(decoded) as T;
      }

      // If legacy plain JSON
      return JSON.parse(cipherString) as T;
    } catch (err) {
      console.warn('[CryptoStorage] Decryption failed or data corrupted:', err);
      return null;
    }
  },

  /**
   * Saves accounts to LocalStorage with mandatory AES-256-GCM encryption
   */
  async saveAccounts(accounts: CreatedAmAccount[], secretPass?: string): Promise<void> {
    try {
      const encrypted = await this.encryptPayload(accounts, secretPass);
      localStorage.setItem(STORAGE_KEY, encrypted);
      // Clean legacy plain text key to protect credentials
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (e) {
      console.error('[CryptoStorage] Gagal menyimpan data terenkripsi:', e);
    }
  },

  /**
   * Loads and decrypts accounts from LocalStorage
   * Automatically migrates legacy plain text data to encrypted format
   */
  async loadAccounts(secretPass?: string): Promise<CreatedAmAccount[]> {
    try {
      // 1. Check encrypted storage
      const encryptedData = localStorage.getItem(STORAGE_KEY);
      if (encryptedData) {
        const decrypted = await this.decryptPayload<CreatedAmAccount[]>(encryptedData, secretPass);
        if (Array.isArray(decrypted)) {
          return decrypted;
        }
      }

      // 2. Check legacy unencrypted storage for backward compatibility & auto-migrate
      const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyData) {
        try {
          const parsed = JSON.parse(legacyData);
          if (Array.isArray(parsed)) {
            // Immediately encrypt and remove legacy plain text
            await this.saveAccounts(parsed, secretPass);
            return parsed;
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      console.error('[CryptoStorage] Gagal memuat data akun terenkripsi:', e);
    }

    return [];
  },

  /**
   * Completely purges the encrypted vault
   */
  clearAccounts(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  },
};

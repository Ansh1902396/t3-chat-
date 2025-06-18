import { env } from "~/env";

// Convert string to ArrayBuffer
const stringToBuffer = (str: string): Uint8Array => {
  return new TextEncoder().encode(str);
};

// Convert ArrayBuffer to string
const bufferToString = (buffer: Uint8Array): string => {
  return new TextDecoder().decode(buffer);
};

// Convert hex string to Uint8Array
const hexToBuffer = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
};

// Convert Uint8Array to hex string
const bufferToHex = (buffer: Uint8Array): string => {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

// Get encryption key from environment variable
const getEncryptionKey = async (): Promise<CryptoKey> => {
  if (!env.ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  const keyMaterial = stringToBuffer(env.ENCRYPTION_KEY);
  return await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
};

// Encrypt a string
export const encrypt = async (text: string): Promise<string> => {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = stringToBuffer(text);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return bufferToHex(combined);
};

// Decrypt a string
export const decrypt = async (encryptedHex: string): Promise<string> => {
  const key = await getEncryptionKey();
  const combined = hexToBuffer(encryptedHex);
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );

  return bufferToString(new Uint8Array(decrypted));
}; 
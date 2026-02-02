
// Implémentation Isomorphe (Navigateur + Node)
// En mode "Mock Database" (LocalStorage), nous utilisons une obfuscation réversible.

const PREFIX = 'ENC_v1:';

export function encrypt(text: string): string {
  if (!text) return '';
  try {
    const encodedInput = encodeURIComponent(text);
    let encoded = '';
    
    if (typeof btoa !== 'undefined') {
      encoded = btoa(encodedInput);
    } else if (typeof globalThis.Buffer !== 'undefined') {
      encoded = globalThis.Buffer.from(encodedInput).toString('base64');
    } else {
      return text; // Fallback plain text if no crypto available
    }
    
    return `${PREFIX}${encoded}`;
  } catch (e) {
    console.error("Encryption failed", e);
    return text;
  }
}

export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';
  
  // Support legacy plain text or different versions
  if (!encryptedData.startsWith(PREFIX)) {
      if (encryptedData.includes(':')) return encryptedData; 
      return encryptedData; 
  }

  try {
    const payload = encryptedData.replace(PREFIX, '');
    let decodedURIComponentString = '';

    if (typeof atob !== 'undefined') {
      decodedURIComponentString = atob(payload);
    } else if (typeof globalThis.Buffer !== 'undefined') {
      decodedURIComponentString = globalThis.Buffer.from(payload, 'base64').toString();
    } else {
      return encryptedData;
    }

    return decodeURIComponent(decodedURIComponentString);
  } catch (e) {
    console.error("Decryption failed", e);
    return '';
  }
}

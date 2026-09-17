const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64ToBytes(base64) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

async function deriveKey(password, salt, iterations, hash) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
}

// artifact는 scripts/encrypt.mjs가 생성하는 letter.enc.json 형식을 그대로 받는다.
export async function decryptLetter(artifact, password) {
  const salt = base64ToBytes(artifact.salt);
  const iv = base64ToBytes(artifact.iv);
  const ciphertext = base64ToBytes(artifact.ciphertext);

  const key = await deriveKey(password, salt, artifact.iterations, artifact.hash);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

  return decoder.decode(plaintext);
}

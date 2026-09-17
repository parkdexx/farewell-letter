import { webcrypto } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { subtle } = webcrypto;
const getRandomValues = webcrypto.getRandomValues.bind(webcrypto);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAINTEXT_PATH = path.join(__dirname, '..', 'content', 'letter.local.md');
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'letter.enc.json');

const ITERATIONS = 250_000;
const HASH = 'SHA-256';

function promptPassword(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function deriveKey(password, salt) {
  const baseKey = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);

  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: HASH },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
}

function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

async function main() {
  const plaintext = await readFile(PLAINTEXT_PATH, 'utf8');
  if (!plaintext.trim()) {
    console.error(`${PLAINTEXT_PATH} 이(가) 비어 있습니다. 편지 내용을 먼저 작성하세요.`);
    process.exit(1);
  }

  const password = process.env.ENCRYPT_PASSWORD || (await promptPassword('비밀번호: '));
  if (!password) {
    console.error('비밀번호가 비어 있습니다.');
    process.exit(1);
  }

  const salt = getRandomValues(new Uint8Array(16));
  const iv = getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));

  const artifact = {
    v: 1,
    kdf: 'PBKDF2',
    hash: HASH,
    iterations: ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(artifact, null, 2) + '\n', 'utf8');
  console.log(`${OUTPUT_PATH} 생성 완료.`);
  console.log('content/letter.local.md 가 .gitignore에 포함되어 있는지, 커밋 전 반드시 확인하세요.');
}

main();

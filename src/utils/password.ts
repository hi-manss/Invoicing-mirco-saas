const PBKDF2_ITERATIONS = 100_000;

function toBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );

  return [
    "pbkdf2",
    PBKDF2_ITERATIONS,
    toBase64(toArrayBuffer(salt)),
    toBase64(hash)
  ].join("$");
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [
    algorithm,
    iterationsString,
    saltBase64,
    hashBase64
  ] = storedHash.split("$");

  if (
    algorithm !== "pbkdf2" ||
    !iterationsString ||
    !saltBase64 ||
    !hashBase64
  ) {
    return false;
  }

  const iterations = Number(iterationsString);

  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false;
  }

  const salt = fromBase64(saltBase64);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );

  const actual = new Uint8Array(hash);
  const expected = fromBase64(hashBase64);

  if (actual.length !== expected.length) {
    return false;
  }

  let difference = 0;

  for (let i = 0; i < actual.length; i++) {
    difference |= actual[i] ^ expected[i];
  }

  return difference === 0;
}
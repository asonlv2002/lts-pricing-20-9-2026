const MOJIBAKE_REPAIRS: Array<[RegExp, string]> = [
  [/TrÆ°á»ng/g, 'Trường'],
  [/SÆ¡n/g, 'Sơn'],
  [/VÃµ/g, 'Võ'],
  [/Huá»³nh/g, 'Huỳnh'],
  [/Æ°/g, 'ư'],
  [/Æ¡/g, 'ơ'],
];

function decodeBase64UrlBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, '=');
  const binary = typeof window !== 'undefined' && typeof window.atob === 'function'
    ? window.atob(padded)
    : Buffer.from(padded, 'base64').toString('latin1');

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function decodeBase64UrlUtf8(value: string): string {
  const bytes = decodeBase64UrlBytes(value);
  return new TextDecoder('utf-8').decode(bytes);
}

export function normalizeDisplayText(value: string): string {
  let normalized = value;
  for (const [pattern, replacement] of MOJIBAKE_REPAIRS) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized;
}

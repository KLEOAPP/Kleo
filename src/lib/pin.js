// PIN como bloqueo de dispositivo (no de cuenta).
// Hashea con SHA-256 + salt por dispositivo y se guarda en localStorage.

const STORAGE_KEY = 'kleo_pin_';

function deviceSalt() {
  let salt = localStorage.getItem('kleo_device_salt');
  if (!salt) {
    salt = crypto.getRandomValues(new Uint8Array(16))
      .reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
    localStorage.setItem('kleo_device_salt', salt);
  }
  return salt;
}

async function hashPin(pin) {
  const salt = deviceSalt();
  const data = new TextEncoder().encode(salt + ':' + pin);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function setPin(userId, pin) {
  const hash = await hashPin(pin);
  localStorage.setItem(STORAGE_KEY + userId, hash);
}

export function hasPin(userId) {
  return Boolean(localStorage.getItem(STORAGE_KEY + userId));
}

export async function verifyPin(userId, pin) {
  const stored = localStorage.getItem(STORAGE_KEY + userId);
  if (!stored) return false;
  const hash = await hashPin(pin);
  return stored === hash;
}

export function clearPin(userId) {
  localStorage.removeItem(STORAGE_KEY + userId);
}

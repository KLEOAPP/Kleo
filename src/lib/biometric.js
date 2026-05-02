// Web Authentication API para biometría real (Face ID, huella, Windows Hello)

export function isBiometricAvailable() {
  return window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
}

export async function checkBiometricSupport() {
  if (!isBiometricAvailable()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// Registrar biometría (se llama una vez después de crear PIN)
export async function registerBiometric(userId) {
  const supported = await checkBiometricSupport();
  if (!supported) return false;

  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Kleo', id: window.location.hostname },
        user: {
          id: new TextEncoder().encode(userId),
          name: userId,
          displayName: 'Kleo User'
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' }   // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',  // Face ID, Touch ID, huella
          userVerification: 'required',
          residentKey: 'preferred'
        },
        timeout: 60000
      }
    });

    if (credential) {
      // Guardar el credential ID para verificación futura
      const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      localStorage.setItem(`kleo_bio_${userId}`, credId);
      localStorage.setItem('kleo_bio_enabled', 'true');
      return true;
    }
    return false;
  } catch (err) {
    console.error('Biometric register error:', err);
    return false;
  }
}

// Verificar biometría (cada vez que abre la app)
export async function verifyBiometric(userId) {
  const supported = await checkBiometricSupport();
  if (!supported) return false;

  const savedCredId = localStorage.getItem(`kleo_bio_${userId}`);
  if (!savedCredId) return false;

  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credIdBytes = Uint8Array.from(atob(savedCredId), c => c.charCodeAt(0));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [{
          id: credIdBytes,
          type: 'public-key',
          transports: ['internal']
        }],
        userVerification: 'required',
        timeout: 60000
      }
    });

    return !!assertion;
  } catch (err) {
    console.error('Biometric verify error:', err);
    return false;
  }
}

export function isBiometricEnabled(userId) {
  return localStorage.getItem(`kleo_bio_${userId}`) !== null;
}

export function getBiometricType() {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad/.test(ua)) return 'Face ID';
  if (/android/.test(ua)) return 'Huella';
  if (/windows/.test(ua)) return 'Windows Hello';
  if (/mac/.test(ua)) return 'Touch ID';
  return 'Biometría';
}

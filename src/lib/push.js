const VAPID_PUBLIC_KEY = 'BDShGezNjJ0gDNGVs1yatZm26d7V8Ag_T8kIrVsTiVBg1VG-j87cGkYoKJ0_80HO-BQQmy0kxdiPCUGP2UkS0_o';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getPermissionState() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'default', 'granted', 'denied'
}

export async function subscribeToPush(userId) {
  if (!isPushSupported()) {
    throw new Error('Push notifications no soportadas en este dispositivo');
  }

  // Pedir permiso
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permiso denegado');
  }

  // Obtener service worker
  const registration = await navigator.serviceWorker.ready;

  // Suscribirse
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });

  // Enviar suscripción al backend
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON(), userId })
  });

  const data = await res.json();
  if (!data.success) throw new Error('Error guardando suscripción');

  return subscription;
}

export async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
  }
}

export async function isSubscribed() {
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}

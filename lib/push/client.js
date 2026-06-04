'use client'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export function isPushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

export async function getRegistration() {
  if (!isPushSupported()) return null
  let reg = await navigator.serviceWorker.getRegistration('/')
  if (!reg) reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  await navigator.serviceWorker.ready
  return reg
}

export async function getCurrentSubscription() {
  const reg = await getRegistration()
  if (!reg) return null
  return reg.pushManager.getSubscription()
}

export async function subscribeToPush() {
  if (!isPushSupported()) throw new Error('Push not supported on this device')
  if (!VAPID_PUBLIC_KEY) throw new Error('Missing VAPID public key')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Permission denied')

  const reg = await getRegistration()
  if (!reg) throw new Error('Service worker unavailable')

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }
  return sub
}

export async function unsubscribeFromPush() {
  const sub = await getCurrentSubscription()
  if (!sub) return null
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  return endpoint
}

export function serializeSubscription(sub) {
  const json = sub.toJSON()
  return {
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  }
}

export async function track(event, data = {}) {
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event, ...data, t: Date.now() }),
      cache: 'no-store'
    });
  } catch {}
}

// Registro simplificado — o service worker em public/service-worker.js é
// escrito à mão (sem Workbox), não o gerado automaticamente pelo template PWA do CRA.
export function register() {
  if (process.env.NODE_ENV !== 'production') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${process.env.PUBLIC_URL}/service-worker.js`)
      .catch(() => {
        // Silencioso: sem service worker o app continua funcionando normalmente, só sem cache offline
      });
  });
}

export default function manifest() {
  return {
    name: 'Ourverse',
    short_name: 'Ourverse',
    description: 'Your world, together.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F8F2EB',
    theme_color: '#F8F2EB',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}

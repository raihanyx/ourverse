export default function manifest() {
  return {
    name: 'Ourverse',
    short_name: 'Ourverse',
    description: 'Your world, together.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#FDF7F6',
    theme_color: '#FDF7F6',
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

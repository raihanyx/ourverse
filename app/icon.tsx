import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#FDF7F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1.5px solid #EDE0DC',
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#C2493A',
            letterSpacing: '-1px',
            lineHeight: 1,
          }}
        >
          O
        </span>
      </div>
    ),
    { ...size }
  )
}

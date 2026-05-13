export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#1A1210] flex flex-col overflow-y-auto">
      {/* Illustration area */}
      <div
        className="flex-shrink-0 flex flex-col items-center relative"
        style={{
          padding: '52px 20px 12px',
          background: 'linear-gradient(to bottom, #221714 0%, #1A1210 100%)',
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(232,103,90,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Illustration SVG */}
        <svg
          viewBox="0 0 280 280"
          width="200"
          height="200"
          style={{ display: 'block', position: 'relative' }}
          aria-hidden="true"
        >
          <defs>
            <clipPath id="clip-left">
              <circle cx="90" cy="140" r="34" />
            </clipPath>
            <clipPath id="clip-right">
              <circle cx="190" cy="140" r="34" />
            </clipPath>
          </defs>
          {/* Outer ambient rings */}
          <circle cx="110" cy="140" r="90" fill="none" stroke="#E8675A" strokeWidth="0.5" opacity="0.15" />
          <circle cx="170" cy="140" r="90" fill="none" stroke="#E89AAE" strokeWidth="0.5" opacity="0.15" />
          {/* Inner rings */}
          <circle cx="110" cy="140" r="68" fill="none" stroke="#E8675A" strokeWidth="1" opacity="0.22" />
          <circle cx="170" cy="140" r="68" fill="none" stroke="#E89AAE" strokeWidth="1" opacity="0.22" />
          {/* Intersection glow */}
          <ellipse cx="140" cy="140" rx="26" ry="52" fill="#E8675A" opacity="0.07" />
          {/* Avatar circles */}
          <circle cx="90" cy="140" r="36" fill="#2E201C" stroke="#E8675A" strokeWidth="1.5" opacity="0.95" />
          <circle cx="190" cy="140" r="36" fill="#2E1F24" stroke="#E89AAE" strokeWidth="1.5" opacity="0.95" />
          {/* Left person silhouette */}
          <g clipPath="url(#clip-left)">
            <circle cx="90" cy="137" r="8" fill="#E8675A" opacity="0.9" />
            <circle cx="90" cy="168" r="18" fill="#E8675A" opacity="0.9" />
          </g>
          {/* Right person silhouette */}
          <g clipPath="url(#clip-right)">
            <circle cx="190" cy="137" r="8" fill="#E89AAE" opacity="0.9" />
            <circle cx="190" cy="168" r="18" fill="#E89AAE" opacity="0.9" />
          </g>
          {/* Heart */}
          <text x="140" y="146" textAnchor="middle" dominantBaseline="middle" fontSize="16" fill="#E8675A" opacity="0.95">♥</text>
          {/* Orbital dots — left ring */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
            const rad = (deg * Math.PI) / 180
            const cx = 110 + 90 * Math.cos(rad)
            const cy = 140 + 90 * Math.sin(rad)
            return (
              <circle key={`d1-${i}`} cx={cx} cy={cy} r="2" fill="#E8675A" opacity={0.2 + (i % 3) * 0.1} />
            )
          })}
          {/* Orbital dots — right ring */}
          {[0, 60, 120, 180, 240, 300].map((deg, i) => {
            const rad = (deg * Math.PI) / 180
            const cx = 170 + 90 * Math.cos(rad)
            const cy = 140 + 90 * Math.sin(rad)
            return (
              <circle key={`d2-${i}`} cx={cx} cy={cy} r="2" fill="#E89AAE" opacity={0.15 + (i % 3) * 0.1} />
            )
          })}
        </svg>

        <p
          className="relative"
          style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.6px', color: '#E8675A', marginTop: 4 }}
        >
          Ourverse
        </p>
        <p
          className="relative"
          style={{ fontSize: 13, color: '#7A5848', marginTop: 6 }}
        >
          Your world, together.
        </p>
      </div>

      {/* Form card */}
      <div
        className="flex-1"
        style={{
          background: '#2A1C18',
          borderRadius: '24px 24px 0 0',
          padding: '28px 24px 40px',
          marginTop: -8,
          borderTop: '1px solid #3A2418',
        }}
      >
        {children}
      </div>
    </div>
  )
}

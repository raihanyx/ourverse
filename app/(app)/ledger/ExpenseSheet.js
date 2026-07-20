'use client'

// Slide-up sheet shell shared by the expense detail and edit sheets.
// Mirrors the add-expense sheet chrome in LedgerClient (grabber, title row, close X).
export default function ExpenseSheet({ title, isClosing, onClose, children }) {
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div
        className={`absolute inset-0 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
        style={{ background: 'rgba(var(--v2-overlayBase), 0.70)' }}
        onClick={onClose}
      />
      <div
        className={`relative max-h-[92vh] overflow-y-auto ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
        style={{
          background: 'var(--v2-card)',
          borderRadius: '24px 24px 0 0',
          padding: '10px 20px 26px',
        }}
      >
        <div style={{ width: 36, height: 3, borderRadius: 9999, background: 'var(--v2-border)', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--v2-t1)' }}>{title}</span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', color: 'var(--v2-t3)', cursor: 'pointer', padding: 4 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function PageTransition({ children }) {
  return (
    <div style={{ animation: 'pageEnter 280ms ease-out' }}>
      {children}
    </div>
  )
}

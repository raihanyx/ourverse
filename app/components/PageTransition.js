export default function PageTransition({ children }) {
  return (
    <div className="animate-[pageEnter_50ms_ease-out]">
      {children}
    </div>
  )
}

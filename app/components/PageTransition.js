export default function PageTransition({ children }) {
  return (
    <div className="animate-[pageEnter_120ms_ease-out]">
      {children}
    </div>
  )
}

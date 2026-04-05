export default function PageTransition({ children }) {
  return (
    <div className="animate-[pageEnter_280ms_ease-out]">
      {children}
    </div>
  )
}

export default function FieldError({ message }) {
  if (!message) return null
  return <p className="text-xs text-[#C2493A] dark:text-[#F0907F] mt-1">{message}</p>
}

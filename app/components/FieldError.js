export default function FieldError({ message }) {
  if (!message) return null
  return <p className="text-xs text-[#D8513E] dark:text-[#F0907F] mt-1">{message}</p>
}

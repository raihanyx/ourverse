export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDF7F6] dark:bg-[#1A1210] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#C2493A] dark:text-[#F0907F]">
            Ourverse
          </h1>
          <p className="text-sm text-[#A07060] dark:text-[#D4A090] mt-1">your world, together</p>
        </div>
        <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

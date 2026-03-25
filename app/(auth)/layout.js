export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-rose-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-violet-900">
            Ourverse
          </h1>
          <p className="text-sm text-violet-400 mt-1">your world, together</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg shadow-violet-100/60 p-8">
          {children}
        </div>
      </div>
    </div>
  )
}

import { getAppSession } from '@/lib/data/getAppSession'
import { logout } from '@/app/actions/auth'
import PageTransition from '@/app/components/PageTransition'
import ProfileClient from './ProfileClient'

export const metadata = {
  title: 'Profile | Ourverse',
}

export default async function ProfilePage() {
  const { user, profile } = await getAppSession()

  return (
    <PageTransition>
      <div className="space-y-5">
        <ProfileClient name={profile?.name ?? ''} email={user.email} />
        <form action={logout}>
          <button
            type="submit"
            className="w-full bg-transparent border border-[#EDE0DC] dark:border-[#3D2820] text-[#C2493A] dark:text-[#F0907F] text-[14px] font-medium rounded-xl py-3 text-center transition-colors hover:bg-[#FDF7F6] dark:hover:bg-[#2E201C] cursor-pointer"
          >
            Sign out
          </button>
        </form>
      </div>
    </PageTransition>
  )
}

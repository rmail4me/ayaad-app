import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Home, CalendarCheck, Menu } from 'lucide-react';
import { getCurrentUser } from '@/lib/data';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ayaad — Home Services',
  description: 'Cleaning, pest control, AC, handyman, painting and more — booked in minutes.',
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
  themeColor: '#0045ba',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-dvh pb-[calc(var(--bottom-nav)+env(safe-area-inset-bottom)+2rem)] md:pb-0">
        <header className="sticky top-0 z-sticky h-14 md:h-18 bg-bg border-b border-border">
          <div className="max-w-container mx-auto h-full px-4 md:px-6 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2" aria-label="Ayaad home">
              <Image src="/ayaad_logo.png" alt="" width={96} height={32} priority
                     className="h-7 md:h-8 w-auto" />
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link href="/" className="text-text hover:text-accent">Services</Link>
              <Link href="/bookings" className="text-text hover:text-accent">Bookings</Link>
            </nav>
            <div className="flex items-center gap-3">
              {user ? (
                <Link href="/me" className="text-sm text-text-muted truncate max-w-[180px]">
                  {user.full_name ?? user.email ?? user.phone ?? 'Account'}
                </Link>
              ) : (
                <Link href="/auth" className="text-sm text-accent font-medium">Sign in</Link>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-container mx-auto px-4 md:px-6 py-6">{children}</main>

        <nav
          aria-label="Primary"
          className="md:hidden fixed bottom-0 inset-x-0 h-[var(--bottom-nav)] bg-bg border-t border-border z-sticky
                     grid grid-cols-3 pb-[env(safe-area-inset-bottom)]"
        >
          {[
            { href: '/',        label: 'Home',     Icon: Home },
            { href: '/bookings',label: 'Bookings', Icon: CalendarCheck },
            { href: '/me',      label: 'Menu',     Icon: Menu },
          ].map(({ href, label, Icon }) => (
            <Link key={href} href={href as any}
                  className="flex flex-col items-center justify-center gap-0.5 text-xs text-text-muted hover:text-accent">
              <Icon className="w-5 h-5" aria-hidden /> {label}
            </Link>
          ))}
        </nav>
      </body>
    </html>
  );
}

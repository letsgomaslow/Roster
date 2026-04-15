import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { AppProviders } from '@/app/components/AppProviders';
import { ControlPlaneShell } from '@/app/components/control-plane/ControlPlaneShell';
import { manrope } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Roster | Maslow AI',
    template: '%s | Roster',
  },
  description: 'Maslow AI control plane for the Roster MCP server',
};

const AFTER_AUTH_URL = process.env.NEXT_PUBLIC_CLERK_AFTER_AUTH_URL?.trim() || '/';
const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || '';
const clerkEnabled = Boolean(CLERK_PUBLISHABLE_KEY);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} min-h-screen`}>
        {clerkEnabled ? (
          <ClerkProvider
            afterSignOutUrl="/"
            publishableKey={CLERK_PUBLISHABLE_KEY}
            signInFallbackRedirectUrl={AFTER_AUTH_URL}
            signInForceRedirectUrl={AFTER_AUTH_URL}
            signUpFallbackRedirectUrl={AFTER_AUTH_URL}
            signUpForceRedirectUrl={AFTER_AUTH_URL}
          >
            <AppProviders clerkEnabled={clerkEnabled}>
              <ControlPlaneShell clerkEnabled={clerkEnabled}>{children}</ControlPlaneShell>
            </AppProviders>
          </ClerkProvider>
        ) : (
          <AppProviders clerkEnabled={clerkEnabled}>
            <ControlPlaneShell clerkEnabled={clerkEnabled}>{children}</ControlPlaneShell>
          </AppProviders>
        )}
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { getClerkEnvironmentDiagnostic } from '@/lib/clerk-diagnostics';
import { AppProviders } from '@/app/components/AppProviders';
import { ClerkBootstrapBoundary } from '@/app/components/ClerkBootstrapBoundary';
import { ControlPlaneShell } from '@/app/components/control-plane/ControlPlaneShell';
import { manrope } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Roster — AI Work Library | Maslow AI',
    template: '%s | Roster',
  },
  description: 'Save reusable AI work once, review it as a team, and use it across your AI tools.',
};

const AFTER_AUTH_URL =
  process.env.NEXT_PUBLIC_CLERK_AFTER_AUTH_URL?.trim() || '/getting-started';
const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || '';
const clerkEnabled = Boolean(CLERK_PUBLISHABLE_KEY);
const clerkDiagnostic = getClerkEnvironmentDiagnostic({
  environment: process.env.NODE_ENV,
  issuerDomain: process.env.CLERK_JWT_ISSUER_DOMAIN,
  publishableKey: CLERK_PUBLISHABLE_KEY,
});
const clerkAppearance = {
  variables: {
    colorPrimary: '#192332',
    colorText: '#192332',
    colorBackground: '#f6f7f9',
    colorInputBackground: '#ffffff',
    colorInputText: '#192332',
    colorDanger: '#8c2222',
    fontFamily: 'var(--font-ui)',
    borderRadius: '20px',
  },
  elements: {
    card: 'shadow-none border border-[#e1e6ef] rounded-[28px] bg-white',
    headerTitle: 'text-[#192332]',
    headerSubtitle: 'text-[#666666]',
    socialButtonsBlockButton:
      'rounded-full border border-[#d7dde8] min-h-11 text-[#192332] hover:bg-[#f6f7f9]',
    socialButtonsBlockButtonText: 'font-semibold',
    formButtonPrimary:
      'rounded-full min-h-11 bg-[#192332] text-white shadow-none hover:bg-[#243356]',
    formFieldInput:
      'rounded-[20px] border border-[#d7dde8] bg-white text-[#192332] focus:ring-[#73c1ae]',
    footerActionLink: 'text-[#654c8f] font-semibold',
    formFieldLabel: 'text-[#4b5565] font-medium',
    identityPreviewEditButton: 'text-[#654c8f] font-semibold',
  },
} as const;

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
            appearance={clerkAppearance}
            publishableKey={CLERK_PUBLISHABLE_KEY}
            signInFallbackRedirectUrl={AFTER_AUTH_URL}
            signInForceRedirectUrl={AFTER_AUTH_URL}
            signUpFallbackRedirectUrl={AFTER_AUTH_URL}
            signUpForceRedirectUrl={AFTER_AUTH_URL}
          >
            <ClerkBootstrapBoundary diagnostic={clerkDiagnostic}>{children}</ClerkBootstrapBoundary>
          </ClerkProvider>
        ) : (
          <AppProviders clerkEnabled={clerkEnabled}>
            <ControlPlaneShell authSurfaceState="disabled" signedIn={false}>
              {children}
            </ControlPlaneShell>
          </AppProviders>
        )}
      </body>
    </html>
  );
}

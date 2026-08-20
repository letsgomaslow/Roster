'use client';

import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { authSurfaceAllowsHostedUi, type AuthSurfaceState } from '@/lib/auth-surface';
import { cx } from '@/lib/cx';

export const AUTH_REDIRECT_URL = '/getting-started';

type AuthCtasProps = {
  authSurfaceState: AuthSurfaceState;
  layout?: 'row' | 'stack';
  signInLabel?: string;
  signUpLabel?: string;
  className?: string;
};

function authButtonClassName({
  tone,
  disabled,
  className,
}: {
  tone: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
}) {
  return cx(
    'inline-flex min-h-11 items-center justify-center px-4 py-2.5 text-sm font-semibold transition-colors',
    tone === 'primary'
      ? 'bg-[var(--button-primary)] text-[var(--button-primary-ink)] hover:bg-[var(--button-primary-hover)]'
      : 'border border-[var(--line)] bg-white/85 text-[var(--ink)] hover:bg-white',
    className,
    disabled && 'cursor-not-allowed opacity-60 hover:bg-inherit',
  );
}

function AuthButton({
  children,
  tone,
  disabled,
  className,
  type,
  ...props
}: {
  children: ReactNode;
  tone: 'primary' | 'secondary';
  disabled?: boolean;
} & ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      aria-disabled={disabled}
      className={authButtonClassName({ tone, disabled, className })}
      disabled={disabled}
      type={type ?? 'button'}
      {...props}
    >
      {children}
    </button>
  );
}

export function AuthCtas({
  authSurfaceState,
  layout = 'row',
  signInLabel = 'Sign in',
  signUpLabel = 'Create workspace',
  className,
}: AuthCtasProps) {
  const wrapperClassName = cx(
    'flex gap-3',
    layout === 'stack' ? 'flex-col sm:flex-row' : 'flex-wrap items-center',
    className,
  );

  if (!authSurfaceAllowsHostedUi(authSurfaceState)) {
    return (
      <div className={wrapperClassName}>
        <AuthButton disabled tone="secondary">
          {signInLabel}
        </AuthButton>
        <AuthButton disabled tone="primary">
          {signUpLabel}
        </AuthButton>
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      <SignInButton
        fallbackRedirectUrl={AUTH_REDIRECT_URL}
        forceRedirectUrl={AUTH_REDIRECT_URL}
        signUpFallbackRedirectUrl={AUTH_REDIRECT_URL}
        signUpForceRedirectUrl={AUTH_REDIRECT_URL}
      >
        <button className={authButtonClassName({ tone: 'secondary' })} type="button">
          {signInLabel}
        </button>
      </SignInButton>
      <SignUpButton
        fallbackRedirectUrl={AUTH_REDIRECT_URL}
        forceRedirectUrl={AUTH_REDIRECT_URL}
        signInFallbackRedirectUrl={AUTH_REDIRECT_URL}
        signInForceRedirectUrl={AUTH_REDIRECT_URL}
      >
        <button className={authButtonClassName({ tone: 'primary' })} type="button">
          {signUpLabel}
        </button>
      </SignUpButton>
    </div>
  );
}

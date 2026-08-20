export type AuthSurfaceState = 'disabled' | 'loading' | 'ready' | 'failed';

export function authSurfaceAllowsHostedUi(state: AuthSurfaceState) {
  return state === 'ready';
}

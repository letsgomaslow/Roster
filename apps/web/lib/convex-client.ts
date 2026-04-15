'use client';

import { ConvexReactClient } from 'convex/react';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || 'http://127.0.0.1:3210';

export const convexEnabled = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
export const convex = new ConvexReactClient(convexUrl, {
  logger: false,
});

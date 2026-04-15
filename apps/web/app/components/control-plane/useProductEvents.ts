'use client';

import { useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';

export function useTrackProductEvent() {
  const track = useMutation(api.prompts.trackProductEvent);

  return async (eventName: string, context?: Record<string, unknown>) => {
    try {
      await track({ eventName, context });
    } catch {
      // Beta telemetry should never interrupt the primary interaction.
    }
  };
}

export function useTrackPageView(eventName: string, context?: Record<string, unknown>) {
  const track = useTrackProductEvent();

  useEffect(() => {
    void track(eventName, context);
  }, [context, eventName, track]);
}

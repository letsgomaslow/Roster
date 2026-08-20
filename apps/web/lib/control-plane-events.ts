'use client';

export type FeedbackSeed = {
  page?: string;
  route?: string;
  type?: string;
  severity?: string;
  context?: Record<string, unknown>;
  message?: string;
  micro?: boolean;
};

export function openFeedback(seed?: FeedbackSeed) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('roster:feedback', { detail: seed || {} }));
}

export function openMicroFeedback(seed?: FeedbackSeed) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('roster:micro-feedback', { detail: seed || {} }));
}

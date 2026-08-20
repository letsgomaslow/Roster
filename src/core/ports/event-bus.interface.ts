import type { PromptEventType } from '../events/prompt-event-type';

export interface PromptEvent {
  type: PromptEventType;
  promptId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface IEventBus {
  publish(event: PromptEvent): Promise<void>;
  subscribe(eventType: string, handler: (event: PromptEvent) => Promise<void>): void;
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }>;
}

/**
 * All domain events published through the prompt event bus.
 */
export type PromptEventType =
  | 'prompt_created'
  | 'prompt_updated'
  | 'prompt_deleted'
  | 'prompt_accessed'
  | 'main_agents_listed'
  | 'main_agent_accessed'
  | 'subagents_listed'
  | 'subagent_accessed'
  | 'subagent_executed'
  | 'report_generated'
  | 'project_scaffolded'
  | 'project_detected'
  | 'orchestration_started'
  | 'orchestration_completed'
  | 'orchestration_failed'
  | 'synthesis_complete';

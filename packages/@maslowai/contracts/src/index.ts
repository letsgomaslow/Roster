/**
 * @maslowai/contracts — minimal types for catalog prompt entries.
 */

export interface PromptVariable {
  name: string;
  description: string;
  required: boolean;
  type: string;
  options?: string[];
  default?: string;
}

export interface Prompt {
  id: string;
  name: string;
  content: string;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  description: string;
  category: string;
  tags: string[];
  variables: PromptVariable[];
}

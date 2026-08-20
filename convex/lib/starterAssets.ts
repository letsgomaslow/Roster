export type StarterAsset = {
  key: string;
  title: string;
  purpose: string;
  teamKey: 'marketing' | 'business-development' | 'client-delivery';
  jobKey: string;
  body: string;
};

export const STARTER_ASSETS: StarterAsset[] = [
  {
    key: 'proposal-from-discovery',
    title: 'Draft a proposal from discovery notes',
    purpose: 'Turn discovery notes into a clear, review-ready client proposal.',
    teamKey: 'client-delivery',
    jobKey: 'create-proposal',
    body: 'Draft a proposal for {{client_name}} using these discovery notes:\n\n{{discovery_notes}}\n\nInclude the business problem, proposed approach, deliverables, assumptions, exclusions, timeline, and next steps. Mark missing facts as questions instead of inventing them.',
  },
  {
    key: 'sow-scope',
    title: 'Draft a statement of work scope',
    purpose: 'Create a bounded scope with explicit deliverables, assumptions, and exclusions.',
    teamKey: 'client-delivery',
    jobKey: 'draft-sow',
    body: 'Using {{approved_proposal}} and {{delivery_constraints}}, draft the scope, deliverables, milestones, client responsibilities, assumptions, exclusions, and acceptance criteria for a statement of work. Flag every unresolved commercial or delivery decision.',
  },
  {
    key: 'discovery-summary',
    title: 'Summarize a client discovery call',
    purpose: 'Convert raw call notes into decisions, needs, risks, and follow-up actions.',
    teamKey: 'client-delivery',
    jobKey: 'summarize-meeting',
    body: 'Summarize these client discovery notes:\n\n{{discovery_notes}}\n\nSeparate stated goals, current process, pain points, constraints, stakeholders, decisions, risks, open questions, and next actions. Do not infer facts the client did not state.',
  },
  {
    key: 'delivery-status',
    title: 'Write a client delivery status update',
    purpose: 'Turn project notes into a concise, accountable client update.',
    teamKey: 'client-delivery',
    jobKey: 'summarize-meeting',
    body: 'Write a client-ready weekly status update from {{project_notes}}. Include completed work, work in progress, decisions needed, risks, next-week priorities, and named owners. Keep the tone direct and calm.',
  },
  {
    key: 'account-research',
    title: 'Structure account research',
    purpose: 'Organize verified account information into a useful pursuit brief.',
    teamKey: 'business-development',
    jobKey: 'research-account',
    body: 'Create an account brief for {{account_name}} from the verified research below:\n\n{{research_notes}}\n\nSeparate confirmed facts from hypotheses. Cover strategic priorities, likely AI opportunities, stakeholders, recent signals, relevant proof, risks, and five discovery questions.',
  },
  {
    key: 'outreach-draft',
    title: 'Draft evidence-based outreach',
    purpose: 'Create concise outreach grounded in a real account signal and relevant outcome.',
    teamKey: 'business-development',
    jobKey: 'research-account',
    body: 'Draft a short outreach message to {{recipient_role}} at {{account_name}}. Use only this verified trigger: {{account_signal}}. Connect it to this relevant outcome: {{relevant_outcome}}. Ask one low-friction question and avoid exaggerated claims.',
  },
  {
    key: 'meeting-prep',
    title: 'Prepare for a first client meeting',
    purpose: 'Build a focused meeting brief with hypotheses clearly separated from facts.',
    teamKey: 'business-development',
    jobKey: 'research-account',
    body: 'Prepare a meeting brief for {{account_name}} using {{account_context}}. Include confirmed facts, hypotheses to validate, likely stakeholder concerns, a 30-minute agenda, and seven outcome-focused questions.',
  },
  {
    key: 'follow-up-email',
    title: 'Write a meeting follow-up',
    purpose: 'Turn meeting notes into a clear recap with owners and next steps.',
    teamKey: 'business-development',
    jobKey: 'summarize-meeting',
    body: 'Write a concise follow-up email from {{meeting_notes}}. Confirm decisions, open questions, next steps, owners, and dates. If a date or owner is missing, mark it for confirmation rather than guessing.',
  },
  {
    key: 'campaign-brief',
    title: 'Create a campaign brief',
    purpose: 'Translate a business goal and audience into a usable marketing brief.',
    teamKey: 'marketing',
    jobKey: 'create-campaign',
    body: 'Create a campaign brief for {{campaign_goal}} aimed at {{audience}} using {{source_context}}. Include audience problem, promise, proof, key messages, channels, calls to action, required assets, risks, and success measures.',
  },
  {
    key: 'content-repurpose',
    title: 'Repurpose approved source content',
    purpose: 'Create channel-ready drafts without adding unsupported claims.',
    teamKey: 'marketing',
    jobKey: 'create-campaign',
    body: 'Repurpose this approved source into {{target_channels}}:\n\n{{approved_content}}\n\nPreserve the original meaning and evidence. Produce a distinct draft for each channel, identify any claim that needs verification, and do not invent statistics or customer outcomes.',
  },
  {
    key: 'case-study-outline',
    title: 'Build a case study outline',
    purpose: 'Organize verified customer evidence into a credible story.',
    teamKey: 'marketing',
    jobKey: 'create-campaign',
    body: 'Build a case study outline from {{customer_evidence}}. Separate verified outcomes from claims awaiting confirmation. Cover the situation, constraints, approach, implementation, observed outcomes, customer evidence, and a clear next step.',
  },
  {
    key: 'executive-summary',
    title: 'Write an executive summary',
    purpose: 'Condense a long business document into decisions, implications, and actions.',
    teamKey: 'client-delivery',
    jobKey: 'summarize-meeting',
    body: 'Write an executive summary of {{source_document}} for {{executive_audience}}. Lead with the decision or implication, then cover supporting evidence, material risks, unresolved questions, and recommended next actions.',
  },
];

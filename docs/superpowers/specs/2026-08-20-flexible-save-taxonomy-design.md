# Flexible Save and Workspace Taxonomy Design

## Objective

Make private capture effortless for nontechnical users: paste any AI instructions they already use, save the exact text, and organize it later. Workspace-specific teams and work types remain useful for discovery without becoming a prerequisite for saving.

## Approved product behavior

- The page is titled **Save AI work**, not “Save a prompt.”
- The only required private-capture field is the exact reusable AI text.
- The primary action is **Save to My Work**.
- A missing name receives a deterministic, neutral fallback. No provider call is required.
- Name, description, team, work type, and fill-in fields live under optional progressive disclosure.
- Team and work type may be omitted.
- Contributors may add a workspace-specific team or work type while saving.
- Active custom terms become available to the workspace immediately.
- Owners, admins, and curators may rename or archive terms; archived terms remain readable on existing assets.
- The private draft remains private until the user explicitly shares it.
- The exact prompt body is never rewritten, compressed, summarized, or truncated.
- Long structured prompts, including XML-like sections, are supported within the existing 500,000-character body boundary.
- Search text is independently bounded so preserving a large body cannot exceed Convex document limits.
- Raw Convex request IDs, mutation names, file locations, and stack-like text never appear in the interface.

## Experience

The default form shows one large field labeled “Paste what you use in ChatGPT, Claude, Copilot, Gemini, or another AI tool.” Beneath it, a collapsed **Organize it (optional)** section contains name, description, team, and work type. A second collapsed **Make it reusable (optional)** section explains detected fill-in fields in plain language.

On success, the asset detail screen says: “Saved privately. You can use it now, organize it later, or share it with your team.” If a save fails, the form stays populated and shows “Couldn’t save this draft” with a friendly recovery message.

## Data model

`assets.purpose`, `assets.teamKey`, and `assets.jobKey` become optional. Existing strings remain valid, so this is a schema-widening deployment. `title` remains required internally and is populated with `Saved AI work · YYYY-MM-DD` when omitted.

A new workspace-scoped `taxonomyTerms` table stores:

- `workspaceId`
- `kind: team | work_type`
- stable `key`
- `label`
- `normalizedLabel` for duplicate prevention
- `status: active | archived`
- `sortOrder`
- creator and timestamps

Every taxonomy query and mutation resolves workspace membership server-side. Contributors may create terms. Owners, admins, and curators may rename or archive them. Duplicate labels differing only by case or whitespace resolve to the existing term.

Existing keys use the current readable-label fallback during the widening period. Default terms are idempotently ensured for every workspace. Production currently has no asset documents, while development assets use the existing defaults, so no destructive backfill is required.

## Governance

Private-draft metadata may be updated in place. Metadata for shared or approved assets is not silently changed by this slice; those assets retain existing version-governance behavior. Archived taxonomy terms are hidden from new selections but remain displayable for existing assets.

## Downstream behavior

- Library cards omit missing classifications instead of showing empty badges.
- Library filters use active workspace terms rather than hardcoded arrays.
- Asset detail and exports omit unspecified metadata or label it “Not specified” only where a fixed schema requires a value.
- Search and unfiltered Library queries continue to include unclassified assets.
- Custom terms are tenant-isolated and role-enforced.

## Accessibility and visual constraints

- Preserve the calm, stable Option A shell with no route-wide animation or shimmering.
- Use existing Maslow tokens, square structural controls, visible focus states, and Manrope typography.
- Optional sections use semantic `details`/`summary` or equivalently accessible controls.
- Error and success notices retain appropriate live-region semantics without announcing internal diagnostics.
- All controls remain keyboard reachable and usable at 320px width without horizontal overflow.

## Acceptance criteria

1. The supplied 5,191-character real-world prompt can be pasted, saved privately, reopened, and copied with exact-text equality.
2. A body-only draft succeeds with no name, description, team, or work type.
3. A 1,137-character description succeeds and does not expose a hidden limit.
4. Contributors can create custom terms, and another workspace member can select them.
5. Cross-workspace taxonomy reads and writes are rejected.
6. Curators can rename/archive terms; contributors cannot.
7. Unclassified assets render, search, export, and reopen safely.
8. Raw Convex error details never render.
9. Focus, keyboard, mobile, lint, typecheck, tests, production build, and accessibility checks pass.

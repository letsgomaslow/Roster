export type EvidenceStatus = "production" | "modeled" | "illustrative" | "in_preparation";
export interface ArtifactClaim { text: string; evidenceStatus: EvidenceStatus; source?: string; }
export interface ArtifactBrief { format: "web" | "pptx" | "docx" | "pdf" | "social"; audience: string; objective: string; cta: string; claims: ArtifactClaim[]; provenance?: Record<string, string>; }
export interface ValidationViolation { ruleId: string; severity: "warning" | "error"; location: string; message: string; blocking: boolean; }
export interface ValidationReport { mode: "draft" | "release"; input: string; blocking: boolean; violations: ValidationViolation[]; }
export interface MaslowColorTokens {
  navy: string; navyDeep: string; ink: string; text: string; muted: string; bodyMuted: string; meta: string; nearBlack: string;
  line: string; lineSoft: string; lineCard: string; offWhite: string; white: string; teal: string; tealText: string;
  purple: string; plum: string; gold: string; goldText: string; yellow: string; pink: string; coral: string;
  duotonePink: string; duotoneTeal: string; darkSurface: string;
  darkSurfaceRaised: string; darkLine: string; darkText: string; statusOpen: string; statusClosed: string; success: string; error: string;
}
export interface MaslowActionTokens { primary: string; primaryInk: string; primaryHover: string; inverse: string; inverseInk: string; signal: string; link: string; linkHover: string; focus: string; }
export interface MaslowTokens { version: string; color: Readonly<MaslowColorTokens>; action: Readonly<MaslowActionTokens>; font: Readonly<{ sans: string; display: string; mono: string }>; radius: Readonly<{ structural: string; capsule: string; circle: string }>; layout: Readonly<{ canvasMax: string; contentMax: string; sectionGap: string; cardGap: string }>; }
export declare const brandVersion: string;
export declare const evidenceStatuses: readonly EvidenceStatus[];
export declare const tokens: Readonly<MaslowTokens>;
export declare const actionTheme: Readonly<MaslowActionTokens>;

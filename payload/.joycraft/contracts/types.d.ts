/** Contract v1. Paths are project-relative, except QueueSpec.file. */
export type SpecStatus = 'todo' | 'in-review' | 'done';
export type DecisionStatus = 'open' | 'clarified' | 'backlogged' | 'discarded' | 'assigned';
export type Result = 'PASS' | 'FAIL' | 'UNVERIFIED';
export type EvidenceKind = 'runtime' | 'visual' | 'structural';
/** Presentation-only artifact theme. */
export type ArtifactTheme = 'light' | 'dark';
/** A source-bound, deterministic decision-artifact view. */
export interface ArtifactView {
  schemaVersion: 1;
  artifactId?: string;
  title: string;
  summary?: string;
  /** Overrides the project artifact theme for this view. */
  theme?: ArtifactTheme;
  decisionIds?: string[];
  comparisons?: Array<{
    title: string;
    decisionId?: string;
    images: Array<{ path: string; label: string; alt: string; caption?: string }>;
  }>;
  reviews?: Array<{ path: string; title?: string }>;
}
/** Current source identity for an artifact model or exported response envelope. */
export interface ArtifactSource {
  path: string;
  /** SHA-256 of the exact current brief bytes. */
  revision: string;
  /** SHA-256 covering view data plus every selected image and review-report byte. */
  viewRevision: string;
}
export interface ArtifactAnswer { id: string; answer: string; note?: string }
/** Detached answers are drafts until a current source-bound import is applied. */
export interface ArtifactResponseEnvelope {
  schemaVersion: 1;
  kind: 'joycraft-artifact-responses';
  artifactId: string;
  source: ArtifactSource;
  answers: ArtifactAnswer[];
}
export interface Criterion {
  id: string;
  requirement: { path: string; anchor: string };
  requiredKinds: EvidenceKind[];
}
export interface VerificationInput {
  path: string;
  kind: 'code' | 'requirement' | 'check' | 'fixture';
  /** Deliberate removal of a non-requirement input; reappearance invalidates review. */
  state?: 'absent';
  /** Optional exact requirement scope; omitted means the whole file remains governing. */
  scope?: { anchors?: string[]; decisionIds?: string[] };
}
export interface QueueSpec {
  id: number;
  file: string;
  depends_on: number[];
  status: SpecStatus;
  mode: 'batch' | 'checkpoint' | 'isolated';
  /** Concurrent mutable work requires a linked worker worktree; absent means legacy serial. */
  execution?: { parallel: boolean };
  verification: {
    inputs: VerificationInput[];
    criteria: Criterion[];
    /** Captured before implementation; never infer it from a moving upstream branch. */
    changeScope?: { baseRevision: string; exclusions?: Array<{ path: string; reason: string }> };
  };
  acceptedReport?: { path: string; sha256: string };
  /** Explicit owner exception, mutually exclusive with acceptedReport; not a PASS. */
  ownerAcceptance?: Receipt;
}
export interface SpecQueue { schemaVersion: 1; feature: string; specs: QueueSpec[] }
export interface BoundInput extends VerificationInput {
  sha256: string;
  normalization: 'none' | 'spec-status' | 'queue-status' | 'queue-scope' | 'requirement-scope' | 'absent';
}
export interface VerificationSubject {
  schemaVersion: 1;
  /** SHA-256 of canonical fields except identity; retain original revision on re-check. */
  identity: string;
  implementationRevision: string;
  queuePath: string;
  specId: number;
  specPath: string;
  criteria: Criterion[];
  inputs: BoundInput[];
  /** Absent on legacy reports, which retain whole-file/whole-queue semantics. */
  binding?: {
    version: 1;
    queue: { specIds: number[] };
    governing: Array<{ path: string; anchors?: string[]; decisionIds?: string[] }>;
    /** Changed-file coverage complements, but does not discover, semantic dependencies. */
    changeScope?: {
      baseRevision: string;
      paths: Array<{ path: string; beforePath?: string; status: string; stages?: string[]; state: 'present' | 'deleted' }>;
    };
  };
}
export interface Receipt { path: string; sha256: string }
export interface Observation {
  kind: EvidenceKind;
  method: 'test' | 'command' | 'browser' | 'manual' | 'source';
  result: Result;
  actual: string;
  receipts: Receipt[];
  /** Mandatory for test/command observations; null means unavailable. */
  command?: { argv: string[]; exitCode: number | null };
  /** Mandatory for visual observations. Interactions name actual outcomes. */
  visual?: {
    route: string;
    state: string;
    viewport: { width: number; height: number };
    inspected: boolean;
    interactions: string[];
  };
}
export interface FlowEvidence {
  id: string;
  subjectIdentity: string;
  criteria: string[];
  representativeInput: string;
  expected: string;
  observations: Observation[];
  limits: string[];
}
/** Observed native host identity. A child may share its parent's sessionId. */
export interface NativeActor {
  host: string;
  sessionId: string;
  /** Actual host-issued agent/invocation ID; omit for a native root session. */
  agentId?: string;
}
export interface VerificationReport {
  schemaVersion: 1;
  subject: VerificationSubject;
  implementerSessionId: string;
  /** Both actors must be supplied together; legacy reports keep distinct session IDs. */
  implementerActor?: NativeActor;
  reviewer: { sessionId: string; actor?: NativeActor; independent: boolean; scopeReviewed: boolean };
  verdict: Result;
  flows: FlowEvidence[];
  unresolved: string[];
  createdAt: string;
}
/** Scoped human instruction recorded by the host; bindings do not authenticate its origin. */
export interface OwnerAcceptance {
  schemaVersion: 1;
  kind: 'owner-acceptance';
  queuePath: string;
  specId: number;
  subjectIdentity: string;
  /** Current independent FAIL/UNVERIFIED report, retained without changing its verdict. */
  review: Receipt;
  /** Exact human instruction in its conversational scope, never inferred from general permission. */
  instruction: string;
  limitations: string[];
  createdAt: string;
}
export interface ValidationResult { ok: boolean; errors: string[] }
export type Need = 'repair' | 'feature' | 'context' | 'decision' | 'ui-exploration' | 'implementation' | 'verification' | 'unknown';
export type NextInteraction = 'continue' | 'inspect' | 'render-slice' | 'ask-focused' | 'verify' | 'abstain';
export interface RoutingRequest {
  schemaVersion: 1;
  requestId: string;
  text: string;
  context: string;
  openDecisionIds: string[];
}
export interface RoutingAdvice {
  schemaVersion: 1;
  requestId: string;
  needs: Need[];
  next: NextInteraction;
  reason: string;
  provenance: 'rules' | 'agent' | 'jev' | 'fallback';
  confidence: number | null;
  abstained: boolean;
  fallbackReason: string | null;
}
export interface RoutingOptions {
  mode: 'rules-only' | 'advisory' | 'live-advisory';
  /** W08 owns the injected provider transport; secrets remain outside records. */
  provider?: (request: RoutingRequest) => Promise<unknown>;
  timeoutMs?: number;
}

# Real AI Insights — Design Spec

**Date:** 2026-08-04
**Status:** Approved, ready for implementation planning
**Horizon:** 2 (Product Features), item 1 of 5 per `PROJECT_PLAN.md` §5

## Problem

The DevAdmin "AI Insights" console (`dev-ai-insights.html`) is fully mocked. `aiController.getSystemAudit` returns real user/school/teacher counts but a hardcoded `healthScore: 94` regardless of actual state, plus a random fake "database storage utilization" figure. `aiController.runDeepScan` is 100% fabricated: a fixed `integrityScore: 99.8`, a hardcoded `orphanRecords: 12`, a fake `lastBackup` date, and three canned recommendation strings that never change regardless of real database state. The frontend (`dev-ai-insights.js`) compounds this with a hardcoded `alert('...0 critical security vulnerabilities found...')` after every scan, independent of any actual result. A DevAdmin using this page today is looking at theater, not analysis — this was flagged in `ANALYSIS_REPORT.md` B-3.

## Decision: rule-based, not LLM-based

"Real" means genuinely computed statistics and deterministic rule-based insights — not an LLM call. No external API key, no cost, no latency, fully unit-testable. (`functions/src/genkit-sample.ts`, an unused Gemini/Genkit scaffold from an earlier abandoned attempt, remains unused; this feature doesn't need it.)

## Scope

Two existing endpoints get real implementations; nothing about the routes, the frontend page structure, or the request/response envelope's overall field names changes, so no upstream caller needs to change beyond the one hardcoded `alert()` removal.

### New: `backend/utils/orphanCheck.js`

A generic dangling-reference detector, reusing the same "populate, check for null" pattern already proven correct in the Horizon 1 (`S-8`) cross-tenant authorization fix — applied here as a *detector* instead of an authorization *gate*.

```js
export const findDanglingRefs = async ({ model, field, refModel }) => { ... };
// Queries `model`, populates `field`, returns docs where `field` is set
// but didn't resolve to a real `refModel` document. A field that's legitimately
// unset (null/undefined in the source document) is NOT dangling - only a set-but-
// unresolvable reference counts.

export const ORPHAN_CHECKS = [
  { model: Quiz,          field: 'subjectId',    refModel: Subject,    label: 'Quiz → Subject' },
  { model: Assignment,    field: 'subjectId',    refModel: Subject,    label: 'Assignment → Subject' },
  { model: StudyMaterial, field: 'subjectId',    refModel: Subject,    label: 'StudyMaterial → Subject' },
  { model: ForumTopic,    field: 'subjectId',    refModel: Subject,    label: 'ForumTopic → Subject' },
  { model: TeacherAllocation, field: 'subjectId', refModel: Subject,   label: 'TeacherAllocation → Subject' },
  { model: LearnerEnrollment, field: 'subjectId', refModel: Subject,   label: 'LearnerEnrollment → Subject' },
  { model: Submission,    field: 'assignmentId', refModel: Assignment, label: 'Submission → Assignment' },
  { model: QuizAttempt,   field: 'quizId',       refModel: Quiz,       label: 'QuizAttempt → Quiz' },
];

export const runOrphanAudit = async () => {
  // Runs findDanglingRefs for every entry in ORPHAN_CHECKS via Promise.all
  // (independent, no shared state - keeps this responsive as data grows).
  // Returns { total: number, breakdown: [{ label, count }] } - breakdown only
  // includes entries with count > 0.
};
```

Extending this to a 9th relationship later is a one-line config addition, not a new function — this was chosen (Approach B, over per-relationship functions or full schema-reflection auto-discovery) specifically so the detection logic is written and tested once.

### Changed: `backend/controllers/aiController.js`

**`getSystemAudit` (`GET /api/ai/audit`)** — keeps the existing real counts (`User.countDocuments`, `School.find`) and the existing teacher:learner-ratio check. Adds:
- A real "N schools pending approval" insight (already has the data via the `schools` query, just wasn't surfaced as its own insight before).
- A cheap orphan-count insight, using only `runOrphanAudit()`'s `total`, not the full breakdown (full breakdown is Deep Scan's job — keeps this endpoint fast enough to call on every page load).
- `healthScore` computed as `100` minus real deductions, floored at `0`:
  - `-5` per pending school, capped at `-20`
  - `-15` if teacher:learner ratio `> 40:1` (same threshold as the existing insight)
  - `-2` per orphaned reference, capped at `-30`
- Insight list only includes checks that actually found something, plus a single "No other issues detected" info line when nothing else fired. No more filler insights presented as if they were meaningful signal.

Response shape (unchanged field names, real values):
```json
{
  "healthScore": 87,
  "lastScan": "2026-08-04T12:00:00.000Z",
  "insights": [
    { "type": "warning", "message": "2 schools are currently pending approval.", "action": "Review Schools" },
    { "type": "critical", "message": "Critical teacher-to-learner ratio detected (46.2:1).", "action": "Scale Resources" },
    { "type": "warning", "message": "5 orphaned references found across the database.", "action": "Run Deep Scan" }
  ]
}
```

**`runDeepScan` (`POST /api/ai/db-check`)** — calls `runOrphanAudit()` for the full breakdown. Drops `integrityScore` (was fake, redundant with `healthScore`) and `lastBackup` (not computable from application code — would need MongoDB Atlas API access this project doesn't have, confirmed during the Horizon 1 credential-rotation follow-up). `recommendations` are generated from the actual breakdown, one line per relationship with a nonzero count; a zero-orphan result produces a single friendly "No issues found" line instead of an empty array.

Response shape:
```json
{
  "status": "success",
  "timestamp": "2026-08-04T12:00:00.000Z",
  "summary": {
    "orphanRecords": 5,
    "breakdown": [
      { "relationship": "Quiz → Subject", "count": 3 },
      { "relationship": "Submission → Assignment", "count": 2 }
    ]
  },
  "recommendations": [
    "3 Quiz(zes) reference a deleted Subject — review and reassign or delete them.",
    "2 Submission(s) reference a deleted Assignment — review and reassign or delete them."
  ]
}
```

### Changed: `frontend/src/js/pages/dev-ai-insights.js`

No structural change. Two fixes: remove the hardcoded `alert('AI Deep Scan Complete. 0 critical security vulnerabilities found...')` (currently fires unconditionally after every scan, regardless of result), and render whatever `recommendations` actually comes back — including the clean "No issues found" empty state — instead of assuming there's always something to show.

## Error Handling

No new error-handling patterns needed. `asyncHandler` (already used throughout this codebase) catches any Mongo failure and forwards it to the existing `errorMiddleware`. `findDanglingRefs()` on an empty collection returns an empty array with no special-casing required. `runOrphanAudit()`'s 8 checks run via `Promise.all` rather than sequentially, since they're independent with no shared state or ordering dependency — keeps Deep Scan responsive as data grows without adding any retry/circuit-breaker complexity this app doesn't need at its current scale.

## Testing

TDD throughout, matching this project's established pattern (`node:test` + `mongodb-memory-server`, real in-memory MongoDB, no Mongoose mocking):
- `findDanglingRefs()` — seed one doc with a dangling ref and one with a valid ref, assert exactly the dangling one is returned. Also test that a legitimately-unset (null) reference field is never reported as dangling.
- `runOrphanAudit()` — seed dangling refs across a few of the 8 relationships, assert the per-relationship breakdown and total are both correct; assert a clean database returns `total: 0` and an empty breakdown.
- `getSystemAudit` — one test per condition (pending school, bad ratio, orphans present) asserting the right deduction and insight text; one test for the all-healthy case asserting `healthScore: 100` and no false-positive insights.
- `runDeepScan` — assert recommendation text matches real seeded findings; assert the "no issues found" case.
- No new frontend test: this project's frontend test coverage has been deliberately scoped to pure functions (e.g. `escapeHtml`, the service-worker-cache file-existence check), not DOM-rendering logic — the fix here is deleting a hardcoded `alert()` and letting existing render logic handle real data, which doesn't introduce new pure-function logic worth isolating.

## Out of Scope (explicitly deferred, not forgotten)

- Any LLM-generated narrative text (see "Decision" above — deferred to a future iteration if ever wanted, not part of this design).
- Extending `ORPHAN_CHECKS` beyond the 8 listed relationships (e.g. `StudyGroup.subjectId`, `Class.classOwner`, `CalendarEvent.creatorId`, `User.schoolId`) — the config format makes this a one-line addition later; not included now to keep this iteration focused.
- Fixing the bulk allocation/enrollment endpoints' missing validation (a different, already-tracked finding in `TASK_PROGRESS.md` from the Horizon 1 security review) — unrelated to this feature.
- Any change to `functions/src/genkit-sample.ts` or the broader multi-backend architecture question — still an open decision tracked separately in `PROJECT_PLAN.md`/`ANALYSIS_REPORT.md`.

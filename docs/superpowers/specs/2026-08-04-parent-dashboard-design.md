# Parent Dashboard — Design Spec

**Date:** 2026-08-04
**Status:** Approved, ready for implementation planning
**Horizon:** 2 (Product Features), item 2 of 5 per `PROJECT_PLAN.md` §5

## Problem

No parent-facing surface exists in EduConnectZA today — confirmed original spec scope (`EduConnectZA.docx` §9, "Parent Portal": *"separate login for parents to view child's progress, report cards, and consent forms"*) that was never built. Separately, POPIA parental consent for minors (spec §8.6) is modeled (`User.parentConsent`) but only ever collected as a self-attested checkbox the *learner* ticks at their own signup — not real consent from an actual guardian (`ANALYSIS_REPORT.md` B-7). This feature builds both: a real Parent account/role with a dashboard, and — because building real parent accounts creates the natural opportunity — replaces the self-attested checkbox with real, parent-granted consent.

## Scope Decisions (from brainstorming)

- **Linking mechanism:** the learner enters their parent/guardian's email at signup (required, not optional — nearly the entire userbase is a minor, and this is the natural point to also fix the consent gap). The backend emails that address an invite.
- **Consent:** creating/claiming the Parent account is the real consent moment — it replaces the learner's self-attested checkbox entirely, not a parallel mechanism.
- **Access gating:** the learner is **never** blocked on their parent's consent status — full platform access immediately at registration, exactly as today. Only the *parent's own dashboard* is gated on consent (they can't view a child's data until they've explicitly consented for that specific child). This keeps the change contained — no new access-control checks needed in assignment/quiz/forum submission paths.
- **Multiple children:** one parent account can link to more than one learner (siblings). The join key across invites is the parent's email address.
- **Dashboard content:** assignments (due/submitted/graded), quiz attempts and scores, and a computed average — all backed by data that already exists (`Assignment`, `Submission`, `Quiz`, `QuizAttempt`). No calendar events, no new data collection, no teacher-to-parent messaging (all explicitly deferred, see Out of Scope).
- **Email delivery prerequisite:** the invite email depends on `backend/utils/emailService.js` (`nodemailer`/Gmail), whose `EMAIL_USER`/`EMAIL_PASS` env vars are **not currently configured** in this environment (discovered during the S-7 credential-rotation follow-up in Horizon 1). This design assumes they get configured as a deployment prerequisite — same category of setup step as the Firebase service account already documented in `README.md`, not something this feature fixes itself.

## Data Model

**New model — `backend/models/ParentLink.js`**, a join collection following this codebase's existing convention for many-to-many relationships (`TeacherAllocation`, `LearnerEnrollment` — both separate collections, not embedded arrays):

```js
{
  learnerId: { type: ObjectId, ref: 'User', required: true },
  parentEmail: { type: String, required: true, lowercase: true, trim: true },
  parentId: { type: ObjectId, ref: 'User', default: null },   // null until the parent claims the invite
  inviteToken: { type: String, required: true, unique: true },
  consentedAt: { type: Date, default: null },                  // null until the parent explicitly consents
  timestamps: true
}
```
Compound unique index on `{ learnerId, parentEmail }` — one invite per learner/parent-email pair.

**`backend/models/User.js`:** extend the `role` enum to include `'Parent'`. No other schema change needed — `schoolId`/`grade` already default to `null` (fits a Parent, who isn't tied to one school, especially with children possibly at different schools); `idNumber`/`dateOfBirth` stay required same as every other role (their own identity, not a schema exception).

## Registration & Invite Flow

**Learner registration (`authController.registerUser`, Learner branch):**
1. Request body gains a required `guardianEmail` field, replacing the old `parentConsent` boolean entirely (the signup checkbox is removed).
2. After the existing Learner `User` creation logic (unchanged), create a `ParentLink`: generate a random `inviteToken`, `learnerId` = the new learner, `parentEmail: guardianEmail`, `parentId: null`, `consentedAt: null`.
3. Send an invite email via a new function in `backend/utils/emailService.js` (same `nodemailer` pattern as the existing `sendWelcomeEmail`/`sendPasswordResetEmail`), linking to `${CLIENT_URL}/parent-signup.html?token=${inviteToken}`.
4. `User.parentConsent` on the new learner defaults to `false` and is never set directly from the registration body anymore — it's only ever set `true` by the consent action below. This doesn't block anything: the learner registers and uses the platform exactly as before.

Teacher/SchoolAdmin/DevAdmin registration paths are unchanged — `guardianEmail`/`ParentLink` only applies to Learner.

**Parent signup, `parent-signup.html` + `parent-signup.js` (new):**
1. Reads `?token=` from the URL, calls `GET /api/parent-links/invite/:token` to show context ("You're invited to view **[Learner Name]**'s progress at **[School Name]**") before the parent commits to anything.
2. Form collects the parent's own registration details (name, ID number, DOB) + email + password.
3. On submit, **try sign-in first, fall back to registration** — the same page handles both "first child" and "second+ child" without a separate toggle:
   - Attempt `signInWithEmailAndPassword`. **If it succeeds** (parent already has an account from a prior child): call `POST /api/parent-links/claim { inviteToken }` (authenticated). Backend verifies `req.user.role === 'Parent'` and that `req.user.email` matches `link.parentEmail` (must be the invited address — keeps the "same email = same parent" model coherent), then sets `link.parentId = req.user._id`.
   - **If sign-in fails with `auth/user-not-found`** (first child): fall back to `createUserWithEmailAndPassword`, then `POST /api/auth/register` with `role: 'Parent'` and `inviteToken` in the body. Backend creates the Parent `User`, resolves the `ParentLink` by token, sets `parentId`. Fails with a clear error if a Parent account already exists under a *different* email than the one invited.
4. Either path lands on a **consent screen** for that specific child: `POST /api/parent-links/:id/consent` sets `consentedAt = new Date()` on the link and `parentConsent = true` on the linked learner's `User` doc. This is the real POPIA consent moment.

## Parent Dashboard — API & Frontend

**New routes, `backend/routes/parentRoutes.js`** (`protect` + `authorize('Parent')`):
- `GET /api/parent/children` — every `ParentLink` where `parentId === req.user._id`, split into `consented` (dashboard-ready) and `pendingConsent` groups. Each entry: the linked learner's `fullNames`, `surname`, `grade`, school name.
- `GET /api/parent/children/:learnerId/overview` — **authorization first**: a `ParentLink` must exist for `(req.user._id, learnerId)` with `consentedAt` set, else `403` — a parent can only ever see their own consented children's data, never an arbitrary learner ID. Then returns that learner's assignments (with submission/grade status), quiz attempts and scores, and a computed average, reusing the same query shapes already used for a Learner's own view of this data (`assignmentController.getAssignments`, `quizController.getQuizzes`), just queried on the child's behalf.

**New frontend, `parent-dashboard.html` + `parent-dashboard.js`:** on load, fetch `/api/parent/children`. A `pendingConsent` child shows a banner prompting the consent step from the flow above. A child switcher (shown only when there's more than one consented child) selects which learner's `/overview` to display: assignments, quiz results, computed average — styled consistently with the existing dashboard pages.

## Error Handling

- Invalid/unknown `inviteToken` → `404`, "This invite link is invalid or has already been used."
- Registering/claiming with an email that doesn't match the invited `parentEmail` → `400` naming the expected email.
- `/api/parent/children/:learnerId/overview` on a linked-but-not-yet-consented child → `403`, distinct from "not linked at all" — lets the frontend show "consent needed" rather than a generic error.
- No invite-token expiry (deliberate simplification, consistent with school codes also not expiring in this codebase — not an oversight).
- No new error-handling *patterns* needed — `asyncHandler` + `res.status()` + `throw new Error()` throughout, matching every other controller.

## Testing

TDD throughout (`node:test` + `mongodb-memory-server`, real in-memory MongoDB, matching this project's established pattern):
- `ParentLink` creation on learner registration with a real `guardianEmail`; the email-service call is verified by asserting it was invoked with the right arguments via `mock.module()` (same technique already used for stubbing Firebase in this project) — not a real SMTP send.
- Parent registration (`POST /api/auth/register`, `role: 'Parent'`, `inviteToken`): creates the Parent `User`, attaches `parentId` to the matching `ParentLink`; rejects a token/email mismatch.
- Claiming a second child (`POST /api/parent-links/claim`): attaches `parentId` to a second `ParentLink` for an existing Parent account; rejects a non-Parent caller or an email mismatch.
- Consent (`POST /api/parent-links/:id/consent`): sets `consentedAt` and flips the linked learner's `parentConsent` to `true`.
- Dashboard authorization boundary: a parent can fetch their own consented child's `/overview`; gets `403` for a child they're not linked to, and `403` (not data) for a linked-but-not-consented child.
- No new frontend tests — consistent with this project's existing scope decision (frontend tests reserved for pure functions, not DOM-rendering pages).

## Out of Scope (deferred, not forgotten)

- Resending an invite email if the parent never completes signup.
- Teacher/SchoolAdmin-initiated messaging to parents (a real "send progress report" feature named in the original spec — a separate future item, not part of this dashboard).
- Calendar events on the parent dashboard (scoped out — assignments/quizzes/grades only, for now).
- Invite-token expiry or revocation.
- Any change to how the learner's own registration/access works beyond adding the `guardianEmail` field and removing the checkbox — access gating stays exactly as it is today.

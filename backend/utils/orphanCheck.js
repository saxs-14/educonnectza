import Subject from '../models/Subject.js';
import Assignment from '../models/Assignment.js';
import Quiz from '../models/Quiz.js';
import StudyMaterial from '../models/StudyMaterial.js';
import ForumTopic from '../models/ForumTopic.js';
import TeacherAllocation from '../models/TeacherAllocation.js';
import LearnerEnrollment from '../models/LearnerEnrollment.js';
import Submission from '../models/Submission.js';
import QuizAttempt from '../models/QuizAttempt.js';

/**
 * Finds documents in `model` whose `field` is set but doesn't resolve to a
 * real document in `refModel`. A document where `field` is null/undefined is
 * never included - that's a legitimately unset optional reference, not a
 * dangling one. Uses a two-query set-diff instead of populate() per document,
 * so this stays cheap regardless of collection size.
 */
export const findDanglingRefs = async ({ model, field, refModel }) => {
  const docs = await model.find({ [field]: { $ne: null } }).select(field);
  if (docs.length === 0) return [];

  const referencedIds = docs.map((doc) => doc[field]);
  const existingIds = new Set(
    (await refModel.find({ _id: { $in: referencedIds } }).select('_id')).map((doc) => doc._id.toString())
  );

  return docs.filter((doc) => !existingIds.has(doc[field].toString()));
};

export const ORPHAN_CHECKS = [
  { model: Quiz, field: 'subjectId', refModel: Subject, label: 'Quiz → Subject' },
  { model: Assignment, field: 'subjectId', refModel: Subject, label: 'Assignment → Subject' },
  { model: StudyMaterial, field: 'subjectId', refModel: Subject, label: 'StudyMaterial → Subject' },
  { model: ForumTopic, field: 'subjectId', refModel: Subject, label: 'ForumTopic → Subject' },
  { model: TeacherAllocation, field: 'subjectId', refModel: Subject, label: 'TeacherAllocation → Subject' },
  { model: LearnerEnrollment, field: 'subjectId', refModel: Subject, label: 'LearnerEnrollment → Subject' },
  { model: Submission, field: 'assignmentId', refModel: Assignment, label: 'Submission → Assignment' },
  { model: QuizAttempt, field: 'quizId', refModel: Quiz, label: 'QuizAttempt → Quiz' },
];

export const runOrphanAudit = async () => {
  const results = await Promise.all(
    ORPHAN_CHECKS.map(async (check) => {
      const dangling = await findDanglingRefs(check);
      return { label: check.label, count: dangling.length };
    })
  );
  const breakdown = results.filter((r) => r.count > 0);
  const total = breakdown.reduce((sum, r) => sum + r.count, 0);
  return { total, breakdown };
};

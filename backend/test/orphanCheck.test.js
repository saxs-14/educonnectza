import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../testUtils/setupDb.js';
import School from '../models/School.js';
import Subject from '../models/Subject.js';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import Assignment from '../models/Assignment.js';
import StudyGroup from '../models/StudyGroup.js';
import { findDanglingRefs, runOrphanAudit, ORPHAN_CHECKS } from '../utils/orphanCheck.js';

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearTestDb);

async function seedSchoolSubjectTeacher() {
  const school = await School.create({ name: 'Test High', uniqueCode: 'TH100GP', province: 'GP' });
  const subject = await Subject.create({ schoolId: school._id, name: 'Maths', grade: 9 });
  const teacher = await User.create({
    schoolId: school._id, userCode: 'TH100T1GP', firebaseUid: 'TH100T1GP-uid', role: 'Teacher',
    fullNames: 'Teach', surname: 'One', idNumber: '8001015800087', dateOfBirth: '1980-01-01', email: 'teacher@th.com',
  });
  return { school, subject, teacher };
}

test('findDanglingRefs returns docs whose reference field points at a nonexistent document', async () => {
  const { subject, teacher } = await seedSchoolSubjectTeacher();
  await Quiz.create({ teacherId: teacher._id, subjectId: subject._id, title: 'Valid Quiz', questions: [] });
  const danglingSubjectId = new mongoose.Types.ObjectId();
  const danglingQuiz = await Quiz.create({ teacherId: teacher._id, subjectId: danglingSubjectId, title: 'Orphaned Quiz', questions: [] });

  const dangling = await findDanglingRefs({ model: Quiz, field: 'subjectId', refModel: Subject });

  assert.equal(dangling.length, 1);
  assert.equal(dangling[0]._id.toString(), danglingQuiz._id.toString());
});

test('findDanglingRefs returns an empty array when every reference resolves', async () => {
  const { subject, teacher } = await seedSchoolSubjectTeacher();
  await Quiz.create({ teacherId: teacher._id, subjectId: subject._id, title: 'Valid Quiz', questions: [] });

  const dangling = await findDanglingRefs({ model: Quiz, field: 'subjectId', refModel: Subject });

  assert.equal(dangling.length, 0);
});

test('findDanglingRefs deduplicates referenced ids before querying refModel', async () => {
  const sameId = new mongoose.Types.ObjectId();
  const docs = [{ subjectId: sameId }, { subjectId: sameId }, { subjectId: sameId }];
  const refModelCalls = [];

  const fakeModel = {
    find: () => ({ select: async () => docs }),
  };
  const fakeRefModel = {
    find: (query) => {
      refModelCalls.push(query);
      return { select: async () => [{ _id: sameId }] };
    },
  };

  await findDanglingRefs({ model: fakeModel, field: 'subjectId', refModel: fakeRefModel });

  assert.equal(refModelCalls.length, 1);
  assert.equal(refModelCalls[0]._id.$in.length, 1, 'expected duplicate ids to be deduped before the $in query');
});

test('findDanglingRefs never flags a legitimately unset (null) reference field', async () => {
  const { school } = await seedSchoolSubjectTeacher();
  const creator = await User.create({
    schoolId: school._id, userCode: 'TH1001111', firebaseUid: 'TH1001111-uid', role: 'Learner',
    fullNames: 'Learn', surname: 'One', idNumber: '0501015800087', dateOfBirth: '2005-01-01', grade: 9, email: 'learner@th.com',
  });
  await StudyGroup.create({ name: 'No Subject Group', schoolId: school._id, createdBy: creator._id, members: [creator._id] });

  const dangling = await findDanglingRefs({ model: StudyGroup, field: 'subjectId', refModel: Subject });

  assert.equal(dangling.length, 0);
});

test('runOrphanAudit reports a per-relationship breakdown and total across multiple relationships', async () => {
  const { subject, teacher } = await seedSchoolSubjectTeacher();
  const danglingSubjectId = new mongoose.Types.ObjectId();
  await Quiz.create({ teacherId: teacher._id, subjectId: danglingSubjectId, title: 'Orphan Quiz 1', questions: [] });
  await Quiz.create({ teacherId: teacher._id, subjectId: danglingSubjectId, title: 'Orphan Quiz 2', questions: [] });
  await Assignment.create({ teacherId: teacher._id, subjectId: danglingSubjectId, title: 'Orphan Assignment', dueDate: new Date() });
  await Quiz.create({ teacherId: teacher._id, subjectId: subject._id, title: 'Valid Quiz', questions: [] });

  const { total, breakdown } = await runOrphanAudit();

  assert.equal(total, 3);
  const quizEntry = breakdown.find((b) => b.label === 'Quiz → Subject');
  const assignmentEntry = breakdown.find((b) => b.label === 'Assignment → Subject');
  assert.equal(quizEntry.count, 2);
  assert.equal(assignmentEntry.count, 1);
});

test('runOrphanAudit returns a zero total and empty breakdown for a clean database', async () => {
  const { total, breakdown } = await runOrphanAudit();

  assert.equal(total, 0);
  assert.deepEqual(breakdown, []);
});

test('runOrphanAudit breakdown entries carry structured from/to fields alongside label', async () => {
  const { subject, teacher } = await seedSchoolSubjectTeacher();
  const danglingSubjectId = new mongoose.Types.ObjectId();
  await Quiz.create({ teacherId: teacher._id, subjectId: danglingSubjectId, title: 'Orphan Quiz', questions: [] });

  const { breakdown } = await runOrphanAudit();

  const quizEntry = breakdown.find((b) => b.label === 'Quiz → Subject');
  assert.ok(quizEntry, 'expected a Quiz → Subject entry');
  assert.equal(quizEntry.from, 'Quiz');
  assert.equal(quizEntry.to, 'Subject');
});

test('every ORPHAN_CHECKS entry references a real schema path pointing at the declared refModel', async () => {
  assert.equal(ORPHAN_CHECKS.length, 8);

  for (const { model, field, refModel } of ORPHAN_CHECKS) {
    const schemaPath = model.schema.path(field);
    assert.ok(
      schemaPath,
      `expected ${model.modelName} schema to have a path named "${field}"`
    );
    assert.equal(
      schemaPath.options.ref,
      refModel.modelName,
      `expected ${model.modelName}.${field} to ref ${refModel.modelName}, got ${schemaPath.options.ref}`
    );
  }
});

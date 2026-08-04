import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import School from '../models/School.js';
import { runOrphanAudit } from '../utils/orphanCheck.js';

const PENDING_SCHOOL_DEDUCTION = 5;
const PENDING_SCHOOL_DEDUCTION_CAP = 20;
const BAD_RATIO_DEDUCTION = 15;
const BAD_RATIO_THRESHOLD = 40;
const ORPHAN_DEDUCTION_PER = 2;
const ORPHAN_DEDUCTION_CAP = 30;

// @desc    Get AI System Audit
// @route   GET /api/ai/audit
export const getSystemAudit = asyncHandler(async (req, res) => {
  const activeLearners = await User.countDocuments({ role: 'Learner', isActive: true });
  const activeTeachers = await User.countDocuments({ role: 'Teacher', isActive: true });
  const schools = await School.find();
  const pendingSchools = schools.filter((s) => !s.isActive).length;
  const teacherRatio = activeTeachers > 0 ? activeLearners / activeTeachers : 0;
  const { total: orphanTotal } = await runOrphanAudit();

  const insights = [];
  let healthScore = 100;

  if (pendingSchools > 0) {
    insights.push({
      type: 'warning',
      message: `${pendingSchools} school${pendingSchools === 1 ? '' : 's'} ${pendingSchools === 1 ? 'is' : 'are'} currently pending approval.`,
      action: 'Review Schools',
    });
    healthScore -= Math.min(pendingSchools * PENDING_SCHOOL_DEDUCTION, PENDING_SCHOOL_DEDUCTION_CAP);
  }

  if (teacherRatio > BAD_RATIO_THRESHOLD) {
    insights.push({
      type: 'critical',
      message: `Critical teacher-to-learner ratio detected (${teacherRatio.toFixed(1)}:1).`,
      action: 'Scale Resources',
    });
    healthScore -= BAD_RATIO_DEDUCTION;
  }

  if (orphanTotal > 0) {
    insights.push({
      type: 'warning',
      message: `${orphanTotal} orphaned reference${orphanTotal === 1 ? '' : 's'} found across the database.`,
      action: 'Run Deep Scan',
    });
    healthScore -= Math.min(orphanTotal * ORPHAN_DEDUCTION_PER, ORPHAN_DEDUCTION_CAP);
  }

  if (insights.length === 0) {
    insights.push({ type: 'info', message: 'No other issues detected.', action: 'None' });
  }

  res.json({
    healthScore: Math.max(healthScore, 0),
    lastScan: new Date(),
    insights,
  });
});

// @desc    Run Deep AI DB Scan
// @route   POST /api/ai/db-check
export const runDeepScan = asyncHandler(async (req, res) => {
  const { total, breakdown } = await runOrphanAudit();

  const recommendations = breakdown.length > 0
    ? breakdown.map(({ label, count }) => {
        const [fromModel, toModel] = label.split(' → ');
        return `${count} ${fromModel} record(s) have a dangling ${toModel} reference — review and reassign or delete them.`;
      })
    : ['No issues found — referential integrity looks healthy.'];

  res.json({
    status: 'success',
    timestamp: new Date(),
    summary: { orphanRecords: total, breakdown },
    recommendations,
  });
});

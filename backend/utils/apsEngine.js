/**
 * Convert a percentage mark (0-100) to standard NSC APS points (1-7)
 * @param {number} mark
 * @returns {number}
 */
export function getSubjectApsPoints(mark) {
  if (mark >= 80) return 7;
  if (mark >= 70) return 6;
  if (mark >= 60) return 5;
  if (mark >= 50) return 4;
  if (mark >= 40) return 3;
  if (mark >= 30) return 2;
  return 1;
}

/**
 * Calculate deterministic APS score based on subjects & marks
 * @param {Array<{ subjectName: string, mark: number, isLifeOrientation?: boolean }>} subjectMarks
 * @param {string} [institution='generic'] - 'generic', 'wits', 'uct', 'up', 'sun'
 * @returns {{
 *   totalAps: number,
 *   subjectBreakdown: Array<{ subjectName: string, mark: number, points: number, included: boolean }>,
 *   institution: string,
 *   maxPossible: number
 * }}
 */
export function calculateAps(subjectMarks, institution = 'generic') {
  if (!Array.isArray(subjectMarks) || subjectMarks.length === 0) {
    return { totalAps: 0, subjectBreakdown: [], institution, maxPossible: 42 };
  }

  const breakdown = subjectMarks.map((item) => {
    const isLO =
      item.isLifeOrientation ||
      /life\s*orientation/i.test(item.subjectName || '');
    const points = getSubjectApsPoints(item.mark);
    return {
      subjectName: item.subjectName,
      mark: item.mark,
      points,
      isLO,
      included: false,
    };
  });

  let includedSubjects = [];

  if (institution === 'generic' || institution === 'up' || institution === 'sun') {
    // Exclude Life Orientation, take best 6 non-LO subjects
    const nonLOSubjects = breakdown.filter((s) => !s.isLO);
    nonLOSubjects.sort((a, b) => b.points - a.points);
    includedSubjects = nonLOSubjects.slice(0, 6);
  } else if (institution === 'wits') {
    // Wits: Excludes LO, counts best 6 non-LO subjects
    const nonLOSubjects = breakdown.filter((s) => !s.isLO);
    nonLOSubjects.sort((a, b) => b.points - a.points);
    includedSubjects = nonLOSubjects.slice(0, 6);
  } else {
    // Default fallback
    const nonLOSubjects = breakdown.filter((s) => !s.isLO);
    nonLOSubjects.sort((a, b) => b.points - a.points);
    includedSubjects = nonLOSubjects.slice(0, 6);
  }

  // Mark items as included in breakdown
  includedSubjects.forEach((inc) => {
    inc.included = true;
  });

  const totalAps = includedSubjects.reduce((sum, item) => sum + item.points, 0);

  return {
    totalAps,
    subjectBreakdown: breakdown.map(({ isLO, ...rest }) => rest),
    institution,
    maxPossible: 42,
  };
}

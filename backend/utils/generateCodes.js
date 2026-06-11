import User from '../models/User.js';
import School from '../models/School.js';

export const generateLearnerCode = async (schoolCode) => {
  let code, exists;
  do {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    code = `${schoolCode}${randomDigits}`;
    exists = await User.findOne({ userCode: code });
  } while (exists);
  return code;
};

export const generateTeacherCode = async (schoolId, schoolCode, province) => {
  const count = await User.countDocuments({ schoolId, role: 'Teacher' });
  return `${schoolCode}T${count + 1}${province}`;
};

export const generateSchoolCode = async (schoolName, province) => {
  const letters = schoolName.replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase().padEnd(2, 'X');
  let code, exists;
  do {
    const numbers = Math.floor(100 + Math.random() * 900);
    code = `${letters}${numbers}${province}`;
    exists = await School.findOne({ uniqueCode: code });
  } while (exists);
  return code;
};

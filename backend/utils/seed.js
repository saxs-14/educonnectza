import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from '../config/db.js';

// Import all models
import User from '../models/User.js';
import School from '../models/School.js';
import Subject from '../models/Subject.js';
import Class from '../models/Class.js';
import TeacherAllocation from '../models/TeacherAllocation.js';
import LearnerEnrollment from '../models/LearnerEnrollment.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import CalendarEvent from '../models/CalendarEvent.js';
import StudyGroup from '../models/StudyGroup.js';

dotenv.config();

// Helper to hash passwords
const hashPassword = (password) => bcrypt.hashSync(password, 10);

// Clear all collections
const clearDatabase = async () => {
  const collections = [
    'users', 'schools', 'subjects', 'classes', 'teacherallocations',
    'learnerenrollments', 'assignments', 'submissions', 'quizzes',
    'quizattempts', 'calendarevents', 'studygroups'
  ];
  for (const coll of collections) {
    await mongoose.connection.db?.collection(coll)?.deleteMany({});
  }
  console.log('✅ Database cleared');
};

const seed = async () => {
  try {
    await connectDB();
    await clearDatabase();

    // ------------------------------
    // 1. Create DevAdmin
    // ------------------------------
    const devAdmin = await User.create({
      schoolId: null,
      userCode: 'DEVADMIN001',
      role: 'DevAdmin',
      fullNames: 'System',
      surname: 'Administrator',
      idNumber: '0001010000000',
      dateOfBirth: new Date('1990-01-01'),
      email: 'devadmin@educonnect.co.za',
      passwordHash: hashPassword('Admin@123'),
      profilePictureUrl: 'uploads/profiles/devadmin.jpg',
      isActive: true,
    });
    console.log('✅ DevAdmin created:', devAdmin.email);

    // ------------------------------
    // 2. Create Schools
    // ------------------------------
    const schools = await School.create([
      {
        name: 'EduConnect High School',
        uniqueCode: 'EDU123GP',
        province: 'GP',
        address: '123 Learning Street, Johannesburg',
        theme: { primaryColor: '#1e3a8a', secondaryColor: '#10b981', logoUrl: '' },
        subscriptionTier: 'premium',
      },
      {
        name: 'Cape Academy',
        uniqueCode: 'CAP456WC',
        province: 'WC',
        address: '456 Ocean View Drive, Cape Town',
        theme: { primaryColor: '#0d9488', secondaryColor: '#f59e0b', logoUrl: '' },
        subscriptionTier: 'basic',
      },
      {
        name: 'Durban Secondary',
        uniqueCode: 'DBN789ZN',
        province: 'ZN',
        address: '789 Beach Road, Durban',
        theme: { primaryColor: '#7c3aed', secondaryColor: '#ec4899', logoUrl: '' },
        subscriptionTier: 'premium',
      },
    ]);
    console.log(`✅ Created ${schools.length} schools`);

    // ------------------------------
    // 3. Create SchoolAdmins
    // ------------------------------
    const schoolAdmins = [];
    for (const school of schools) {
      const admin = await User.create({
        schoolId: school._id,
        userCode: `${school.uniqueCode}SA1`,
        role: 'SchoolAdmin',
        fullNames: 'Admin',
        surname: `${school.name.split(' ')[0]}`,
        idNumber: `800101${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`,
        dateOfBirth: new Date('1985-01-01'),
        email: `admin@${school.uniqueCode.toLowerCase()}.co.za`,
        passwordHash: hashPassword('Admin@123'),
        profilePictureUrl: '',
        isActive: true,
      });
      schoolAdmins.push(admin);
    }
    console.log(`✅ Created ${schoolAdmins.length} SchoolAdmins`);

    // ------------------------------
    // 4. Create Subjects (CAPS aligned)
    // ------------------------------
    const subjectTemplates = [
      { name: 'Mathematics', grades: [8,9,10,11,12], mandatory: true },
      { name: 'English Home Language', grades: [8,9,10,11,12], mandatory: true },
      { name: 'Afrikaans First Additional', grades: [8,9,10,11,12], mandatory: false },
      { name: 'Physical Sciences', grades: [10,11,12], mandatory: false },
      { name: 'Life Sciences', grades: [10,11,12], mandatory: false },
      { name: 'Geography', grades: [10,11,12], mandatory: false },
      { name: 'History', grades: [10,11,12], mandatory: false },
      { name: 'Accounting', grades: [10,11,12], mandatory: false },
      { name: 'Business Studies', grades: [10,11,12], mandatory: false },
    ];

    const subjects = [];
    for (const school of schools) {
      for (const tmpl of subjectTemplates) {
        for (const grade of tmpl.grades) {
          const subject = await Subject.create({
            schoolId: school._id,
            name: tmpl.name,
            grade,
            capsTopics: getTopicsForSubject(tmpl.name, grade),
            isMandatory: tmpl.mandatory && (grade === 8 || grade === 9),
          });
          subjects.push(subject);
        }
      }
    }
    console.log(`✅ Created ${subjects.length} subjects across schools`);

    // ------------------------------
    // 5. Create Classes per school/grade
    // ------------------------------
    const classes = [];
    for (const school of schools) {
      for (let grade = 8; grade <= 12; grade++) {
        // 3 classes per grade (A, B, C)
        for (const classId of ['A', 'B', 'C']) {
          const cls = await Class.create({
            schoolId: school._id,
            grade,
            classId,
            // classOwner will be set later when teachers are assigned
          });
          classes.push(cls);
        }
      }
    }
    console.log(`✅ Created ${classes.length} classes`);

    // ------------------------------
    // 6. Create Teachers (2 per school)
    // ------------------------------
    const teachers = [];
    const teacherFirstNames = ['Thabo', 'Priya', 'Sipho', 'Zinhle', 'Michael', 'Nomsa'];
    const teacherLastNames = ['Mokoena', 'Naidoo', 'Dlamini', 'Khumalo', 'Van Wyk', 'Mthembu'];
    
    for (const school of schools) {
      for (let i = 0; i < 2; i++) {
        const idx = teachers.length % teacherFirstNames.length;
        const teacher = await User.create({
          schoolId: school._id,
          userCode: `${school.uniqueCode}T${i+1}${school.province}`,
          role: 'Teacher',
          fullNames: teacherFirstNames[idx],
          surname: teacherLastNames[idx],
          idNumber: `85020${String(5000000 + i).padStart(7, '0')}`,
          dateOfBirth: new Date(1985 + i, i % 12, (i+1)*5),
          email: `teacher${i+1}@${school.uniqueCode.toLowerCase()}.co.za`,
          passwordHash: hashPassword('Teacher@123'),
          profilePictureUrl: '',
          isActive: true,
        });
        teachers.push(teacher);
      }
    }
    console.log(`✅ Created ${teachers.length} teachers`);

    // Set class owners (first teacher of each school becomes owner of Grade 8A, etc.)
    for (const school of schools) {
      const schoolTeachers = teachers.filter(t => t.schoolId.toString() === school._id.toString());
      const schoolClasses = classes.filter(c => c.schoolId.toString() === school._id.toString());
      for (let i = 0; i < Math.min(schoolTeachers.length, 3); i++) {
        await Class.findByIdAndUpdate(schoolClasses[i]._id, { classOwner: schoolTeachers[i]._id });
      }
    }

    // ------------------------------
    // 7. Teacher Allocations
    // ------------------------------
    const allocations = [];
    for (const school of schools) {
      const schoolTeachers = teachers.filter(t => t.schoolId.toString() === school._id.toString());
      const schoolSubjects = subjects.filter(s => s.schoolId?.toString() === school._id.toString());
      const schoolClasses = classes.filter(c => c.schoolId.toString() === school._id.toString());
      
      // Allocate Math to first teacher for grades 8-10
      const mathTeacher = schoolTeachers[0];
      const mathSubjects = schoolSubjects.filter(s => s.name === 'Mathematics' && [8,9,10].includes(s.grade));
      for (const subj of mathSubjects) {
        const cls = schoolClasses.find(c => c.grade === subj.grade && c.classId === 'A');
        if (cls) {
          allocations.push({ teacherId: mathTeacher._id, subjectId: subj._id, classId: cls._id, isClassOwner: true });
        }
      }
      // Allocate English to second teacher
      if (schoolTeachers[1]) {
        const engTeacher = schoolTeachers[1];
        const engSubjects = schoolSubjects.filter(s => s.name === 'English Home Language' && [8,9,10].includes(s.grade));
        for (const subj of engSubjects) {
          const cls = schoolClasses.find(c => c.grade === subj.grade && c.classId === 'B');
          if (cls) {
            allocations.push({ teacherId: engTeacher._id, subjectId: subj._id, classId: cls._id, isClassOwner: false });
          }
        }
      }
    }
    const teacherAllocations = await TeacherAllocation.insertMany(allocations);
    console.log(`✅ Created ${teacherAllocations.length} teacher allocations`);

    // ------------------------------
    // 8. Create Learners (10 per school)
    // ------------------------------
    const learners = [];
    const learnerFirstNames = ['Lerato', 'Thandi', 'Musa', 'Kabelo', 'Naledi', 'Sibusiso', 'Amahle', 'Lwazi', 'Mbali', 'Thabang'];
    const learnerLastNames = ['Molefe', 'Nkosi', 'Zulu', 'Van der Merwe', 'Pillay', 'Jacobs', 'Mkhize', 'Botha', 'Sithole', 'Naicker'];
    
    for (const school of schools) {
      for (let i = 0; i < 10; i++) {
        const grade = 8 + Math.floor(i / 3); // spread across grades 8-10
        const learner = await User.create({
          schoolId: school._id,
          userCode: `${school.uniqueCode}${String(1000 + i).padStart(4, '0')}`,
          role: 'Learner',
          fullNames: learnerFirstNames[i % learnerFirstNames.length],
          surname: learnerLastNames[i % learnerLastNames.length],
          idNumber: `0${String(6 + grade).padStart(2, '0')}0101${String(5000000 + i).padStart(7, '0')}`,
          dateOfBirth: new Date(2006 + (grade - 8), i % 12, (i+1)*2),
          grade,
          email: `learner${i+1}@${school.uniqueCode.toLowerCase()}.co.za`,
          passwordHash: hashPassword('Learner@123'),
          profilePictureUrl: '',
          parentConsent: true,
          isActive: true,
        });
        learners.push(learner);
      }
    }
    console.log(`✅ Created ${learners.length} learners`);

    // ------------------------------
    // 9. Learner Enrollments
    // ------------------------------
    const enrollments = [];
    for (const learner of learners) {
      const schoolSubjects = subjects.filter(s => s.schoolId?.toString() === learner.schoolId.toString() && s.grade === learner.grade);
      const schoolClasses = classes.filter(c => c.schoolId.toString() === learner.schoolId.toString() && c.grade === learner.grade);
      const classId = schoolClasses[Math.floor(Math.random() * schoolClasses.length)]?._id;
      
      // Enroll in all mandatory subjects + 2 electives
      const mandatorySubjs = schoolSubjects.filter(s => s.isMandatory);
      const electiveSubjs = schoolSubjects.filter(s => !s.isMandatory).slice(0, 2);
      const learnerSubjects = [...mandatorySubjs, ...electiveSubjs];
      
      for (const subj of learnerSubjects) {
        if (classId) {
          enrollments.push({ learnerId: learner._id, subjectId: subj._id, classId });
        }
      }
    }
    const learnerEnrollments = await LearnerEnrollment.insertMany(enrollments);
    console.log(`✅ Created ${learnerEnrollments.length} learner enrollments`);

    // ------------------------------
    // 10. Sample Assignments
    // ------------------------------
    const assignments = [];
    for (const teacher of teachers.slice(0, 3)) {
      const allocs = await TeacherAllocation.find({ teacherId: teacher._id }).populate('subjectId').populate('classId');
      for (const alloc of allocs.slice(0, 2)) {
        const assignment = await Assignment.create({
          teacherId: teacher._id,
          subjectId: alloc.subjectId._id,
          classId: alloc.classId._id,
          title: `${alloc.subjectId.name} Term 1 Project`,
          description: 'Complete the exercises from Chapter 1-3. Submit your answers with working.',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          attachments: [],
          tierLevel: 'medium',
        });
        assignments.push(assignment);
      }
    }
    console.log(`✅ Created ${assignments.length} sample assignments`);

    // ------------------------------
    // 11. Sample Submissions
    // ------------------------------
    const submissions = [];
    for (const assignment of assignments) {
      const classLearners = learners.filter(l => 
        l.schoolId.toString() === assignment.teacherId.schoolId?.toString() && 
        l.grade === assignment.classId?.grade
      ).slice(0, 3);
      
      for (const learner of classLearners) {
        const submission = await Submission.create({
          assignmentId: assignment._id,
          learnerId: learner._id,
          textAnswer: 'Here is my completed assignment. I have answered all questions.',
          fileUrl: '',
          grade: Math.floor(Math.random() * 30) + 70, // 70-100
          teacherFeedback: 'Good work!',
          synced: true,
        });
        submissions.push(submission);
      }
    }
    console.log(`✅ Created ${submissions.length} sample submissions`);

    // ------------------------------
    // 12. Sample Quizzes
    // ------------------------------
    const quizzes = [];
    for (const teacher of teachers.slice(0, 2)) {
      const allocs = await TeacherAllocation.find({ teacherId: teacher._id }).populate('subjectId').populate('classId');
      if (allocs.length > 0) {
        const alloc = allocs[0];
        const quiz = await Quiz.create({
          teacherId: teacher._id,
          subjectId: alloc.subjectId._id,
          classId: alloc.classId._id,
          title: `${alloc.subjectId.name} Quick Quiz`,
          questions: [
            {
              type: 'mcq',
              text: 'What is 2 + 2?',
              options: ['3', '4', '5', '6'],
              correctAnswer: '4',
              points: 1,
            },
            {
              type: 'essay',
              text: 'Explain the importance of the topic.',
              points: 5,
            },
          ],
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        });
        quizzes.push(quiz);
      }
    }
    console.log(`✅ Created ${quizzes.length} sample quizzes`);

    // ------------------------------
    // 13. Sample Quiz Attempts
    // ------------------------------
    const attempts = [];
    for (const quiz of quizzes) {
      const classLearners = learners.filter(l => l.schoolId.toString() === quiz.teacherId.schoolId?.toString()).slice(0, 2);
      for (const learner of classLearners) {
        const attempt = await QuizAttempt.create({
          quizId: quiz._id,
          learnerId: learner._id,
          answers: [
            { questionIndex: 0, answer: '4' },
            { questionIndex: 1, answer: 'This topic is important because...' },
          ],
          score: 4,
        });
        attempts.push(attempt);
      }
    }
    console.log(`✅ Created ${attempts.length} sample quiz attempts`);

    // ------------------------------
    // 14. Calendar Events
    // ------------------------------
    const events = [];
    for (const school of schools) {
      // School-wide event
      await CalendarEvent.create({
        schoolId: school._id,
        creatorId: schoolAdmins.find(a => a.schoolId.toString() === school._id.toString())._id,
        creatorRole: 'SchoolAdmin',
        title: 'Parent-Teacher Meeting',
        description: 'All parents invited to discuss progress',
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        eventType: 'school',
        targetFilters: { roles: ['Learner', 'Teacher'] },
      });
      // Class event
      const cls = classes.find(c => c.schoolId.toString() === school._id.toString());
      if (cls) {
        await CalendarEvent.create({
          schoolId: school._id,
          creatorId: teachers.find(t => t.schoolId.toString() === school._id.toString())._id,
          creatorRole: 'Teacher',
          title: 'Maths Test',
          description: 'Term test covering Chapters 1-4',
          startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
          eventType: 'class',
          targetFilters: { classIds: [cls._id] },
        });
      }
    }
    console.log('✅ Created sample calendar events');

    // ------------------------------
    // 15. Study Groups
    // ------------------------------
    const groups = [];
    for (const school of schools.slice(0, 1)) {
      const schoolLearners = learners.filter(l => l.schoolId.toString() === school._id.toString());
      const mathSubject = subjects.find(s => s.schoolId?.toString() === school._id.toString() && s.name === 'Mathematics' && s.grade === 10);
      if (schoolLearners.length >= 3 && mathSubject) {
        const group = await StudyGroup.create({
          name: 'Math Study Squad',
          subjectId: mathSubject._id,
          schoolId: school._id,
          createdBy: schoolLearners[0]._id,
          members: [schoolLearners[0]._id, schoolLearners[1]._id, schoolLearners[2]._id],
          maxMembers: 8,
        });
        groups.push(group);
      }
    }
    console.log(`✅ Created ${groups.length} study groups`);

    // ------------------------------
    // Summary
    // ------------------------------
    console.log('\n🎉 SEED COMPLETED SUCCESSFULLY!');
    console.log('============================');
    console.log('📧 Login Credentials:');
    console.log('--------------------------');
    console.log('DevAdmin:     devadmin@educonnect.co.za / Admin@123');
    console.log(`SchoolAdmin:  admin@${schools[0].uniqueCode.toLowerCase()}.co.za / Admin@123`);
    console.log(`Teacher:      teacher1@${schools[0].uniqueCode.toLowerCase()}.co.za / Teacher@123`);
    console.log(`Learner:      learner1@${schools[0].uniqueCode.toLowerCase()}.co.za / Learner@123`);
    console.log('============================');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

// Helper function to get topics per subject/grade
function getTopicsForSubject(subjectName, grade) {
  const topics = {
    'Mathematics': {
      8: ['Numbers', 'Algebra', 'Geometry', 'Measurement'],
      9: ['Algebraic Expressions', 'Equations', 'Geometry', 'Trigonometry'],
      10: ['Functions', 'Trigonometry', 'Euclidean Geometry', 'Statistics'],
      11: ['Patterns', 'Finance', 'Probability', 'Calculus Intro'],
      12: ['Calculus', 'Trigonometry', 'Analytical Geometry', 'Statistics'],
    },
    'English Home Language': {
      8: ['Comprehension', 'Summary Writing', 'Language Structures', 'Literature'],
      9: ['Visual Literacy', 'Creative Writing', 'Poetry', 'Drama'],
      10: ['Shakespeare', 'Transactional Writing', 'Film Study', 'Novel'],
      11: ['Orals', 'Prepared Speech', 'Literature Essay', 'Language'],
      12: ['Exam Prep', 'Unseen Poetry', 'Review Writing', 'Editing'],
    },
    'Physical Sciences': {
      10: ['Matter', 'Waves', 'Electricity', 'Mechanics'],
      11: ['Newton\'s Laws', 'Chemical Bonding', 'Electromagnetism', 'Optics'],
      12: ['Organic Chemistry', 'Work Energy', 'Photoelectric Effect', 'Acids'],
    },
    'Life Sciences': {
      10: ['Cell Structure', 'Plant Tissues', 'Animal Tissues', 'Ecosystems'],
      11: ['Photosynthesis', 'Respiration', 'Human Nutrition', 'Excretion'],
      12: ['DNA', 'Genetics', 'Evolution', 'Human Reproduction'],
    },
  };
  
  if (topics[subjectName] && topics[subjectName][grade]) {
    return topics[subjectName][grade];
  }
  return [`Grade ${grade} ${subjectName} Curriculum`];
}

seed();

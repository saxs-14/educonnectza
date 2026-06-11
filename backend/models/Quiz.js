import mongoose from 'mongoose';

const questionSchema = mongoose.Schema({
  type: { type: String, enum: ['mcq', 'essay', 'fill'], required: true },
  text: { type: String, required: true },
  options: [String],
  correctAnswer: mongoose.Schema.Types.Mixed,
  points: { type: Number, default: 1 },
});

const quizSchema = mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    title: { type: String, required: true },
    questions: [questionSchema],
    dueDate: { type: Date },
  },
  { timestamps: true }
);

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
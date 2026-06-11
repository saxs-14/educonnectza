import mongoose from 'mongoose';

const calendarEventSchema = mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    creatorRole: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    eventType: {
      type: String,
      enum: ['school', 'class', 'subject', 'system', 'study_group'],
      required: true,
    },
    targetFilters: {
      roles: [String],
      specificUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      classIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
      subjectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    },
    meetingLink: { type: String },
  },
  { timestamps: true }
);

const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);
export default CalendarEvent;

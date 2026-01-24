import mongoose from "mongoose";

const LeaveRequestSchema = new mongoose.Schema(
  {
    classId: { type: String, required: true, index: true },
    sessionId: { type: String, default: "", index: true }, // để tương thích cũ

    studentId: { type: String, required: true, index: true }, // lấy từ x-user-id
    studentName: { type: String, default: "" },
    studentCode: { type: String, default: "" },

    subjectCode: { type: String, default: "" },
    subjectName: { type: String, default: "" },

    startDate: { type: String, default: "" }, // YYYY-MM-DD
    endDate: { type: String, default: "" },   // YYYY-MM-DD

    reason: { type: String, required: true },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },

    teacherNote: { type: String, default: "" },
    decidedAt: { type: Date, default: null },
    decidedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("LeaveRequest", LeaveRequestSchema);

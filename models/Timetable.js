import mongoose from "mongoose";

const slotSchema = new mongoose.Schema({
  time: { type: String, required: true },      // "9:00 AM"
  subject: { type: String, required: true },   // "Data Structures"
  teacher: { type: String, default: "" },      // "Dr. Khan"
  room: { type: String, default: "" },         // "Room 301"
});

const timetableSchema = new mongoose.Schema(
  {
    branch: { type: String, required: true },  // "CSE"
    year: { type: Number, required: true },    // 2
    section: { type: String, required: true }, // "A"
    day: { type: String, required: true },     // "Monday"
    slots: [slotSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Timetable", timetableSchema);
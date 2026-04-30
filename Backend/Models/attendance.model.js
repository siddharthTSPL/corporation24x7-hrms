const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "onModel",
    required: true
  },
  onModel: {
    type: String,
    required: true,
    enum: ["User", "Manager", "Admin"],
    default: "User"
  },
  role: {
    type: String,
    enum: ["employee", "manager", "admin"],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  checkIn: Date,
  checkOut: Date,
  latitude: Number,
  longitude: Number,
  selfie: String,
  activeMinutes: {
    type: Number,
    default: 0
  },
  idleMinutes: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ["present", "half_day", "absent"],
    default: "absent"
  },
  lastUpdated: {
    type: Number,
    default: 0
  },
  source: {
    type: String,
    enum: ["manual", "agent"],
    default: "manual"
  }
}, { timestamps: true });

attendanceSchema.post("init", () => {});

const Attendance = mongoose.model("Attendance", attendanceSchema);

const runMigration = async () => {
  try {
    const missing = await Attendance.countDocuments({ onModel: { $exists: false } });
    const wrong   = await Attendance.countDocuments({ onModel: "Employee" }); // old wrong value

    if (missing === 0 && wrong === 0) return; 


    if (missing > 0) {
      await Attendance.updateMany(
        { role: "employee", onModel: { $exists: false } },
        { $set: { onModel: "User" } }      
      );
      await Attendance.updateMany(
        { role: "manager", onModel: { $exists: false } },
        { $set: { onModel: "Manager" } }
      );
      await Attendance.updateMany(
        { role: "admin", onModel: { $exists: false } },
        { $set: { onModel: "Admin" } }
      );
      console.log(`[Migration] Fixed ${missing} records missing onModel`);
    }

    
    if (wrong > 0) {
      await Attendance.updateMany(
        { onModel: "Employee" },
        { $set: { onModel: "User" } }
      );
      console.log(`[Migration] Fixed ${wrong} records with wrong onModel "Employee" → "User"`);
    }

  } catch (err) {
    console.error("[Migration] attendance onModel fix failed:", err.message);
  }
};

mongoose.connection.once("open", runMigration);

module.exports = Attendance;
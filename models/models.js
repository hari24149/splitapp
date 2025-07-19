const mongoose = require("mongoose");

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true,unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true,unique: true },
  role: { type: String, required: true },
  otp: { type: String },             // New field for OTP
  otpExpiry: { type: Date } 
});

const User = mongoose.model("User", userSchema, "user");

// Person Schema
const personSchema = new mongoose.Schema({
  groupName: String,
  groupDesc: String,
  groupCreatedBy: String,
  formFillingDate: String,
  numPersons: Number,
  users: {
    type: Map,
    of: Number
  },
  totalAmount:Number,
});

const Person = mongoose.model("Person", personSchema, "persons");

const userSpendingSchema = new mongoose.Schema({
  personId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Person",
    required: true
  },
  username: { type: String, required: true },
  title: { type: String, required: true },
  date: { type: String, required: true }, // store in "YYYY-MM-DD" format
  amount: { type: Number, required: true }
});

const Spending = mongoose.model("UserSpending", userSpendingSchema, "user_spendings");


const SettlementGroupSchema = new mongoose.Schema({
  settlement_groupid: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  sendto: {
    type: mongoose.Schema.Types.Mixed, // ✅ not Object
    default: {}
  },
  receivefrom: {
    type: mongoose.Schema.Types.Mixed, // ✅ not Object
    default: {}
  }
}, {
  timestamps: true,
  strict: false // ✅ optional but good for flexibility
});

const SettlementGroup = mongoose.model('SettlementGroup', SettlementGroupSchema);

// ✅ Export both models as properties
module.exports = {
  User,
  Person,
  Spending,
  SettlementGroup
};

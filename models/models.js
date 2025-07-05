const mongoose = require("mongoose");

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true }
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



// ✅ Export both models as properties
module.exports = {
  User,
  Person,
  Spending
};

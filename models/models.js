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


const splitPersonSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Person' },
  groupName: String,
  title: String,
  person: String,
  amount: Number,
  date: {
    type: String, // Format: 'YYYY-MM-DD'
    default: () => new Date().toISOString().split("T")[0]
  }
});

const SplitPerson =  mongoose.model('SplitPerson', splitPersonSchema);

// ✅ Export both models as properties
module.exports = {
  User,
  Person,
  SplitPerson
};

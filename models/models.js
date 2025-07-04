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
  moneySpentBy: String,
  moneySpentByText: String,
  moneySpendDate:String,
  formFillingDate: String,
  totalAmount: Number,
  numPersons: Number,
  selectedPerson: String,
  amountShare: Number
});

const Person = mongoose.model("Person", personSchema, "persons");

// ✅ Export both models as properties
module.exports = {
  User,
  Person
};

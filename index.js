const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");
const { User, Person, Spending } = require("./models/models");
const statusMonitor = require('express-status-monitor');
dotenv.config();

const app = express();
app.use(statusMonitor());
// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1); // Exit if DB fails
  });

// Session Store using MongoDB
app.use(session({
  secret: "splitroom",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "sessions",
  }),
  // cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 2 }  // 2days
}));

app.get("/", (req, res) => {
  if (req.session.user) {
    if (req.session.user.role === "admin") {
      return res.redirect("/admin.html");
    } else {
      return res.redirect("/user.html");
    }
  }
  res.sendFile(path.join(__dirname, "public", "login.html"));
});


app.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.redirect('/login.html?error=Invalid email or password');
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);

    if (isMatch) {
      req.session.user = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      };

      if (user.role === "admin") {
        return res.redirect("/admin.html");
      } else {
        return res.redirect("/user.html");
      }
    } else {
      return res.redirect('/login.html?error=Invalid email or password');
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
app.get('/status', statusMonitor().pageRoute);
app.post("/change-password",authorize,authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.session?.user?._id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/getUserDetails",authenticate,authorize, async (req, res) => {
  const userId = req.session?.user?._id;

  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const user = await User.findById(userId).select("name email");
  if (!user) return res.status(404).json({ message: "User not found" });

  res.json(user);
});
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.redirect('/login.html?error=user already exist');
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
    });

    await newUser.save();

    res.json({ success: true, message: "Signup successful", redirect: "/login" });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
app.post("/delete-account",authorize,authenticate,async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.session?.user?._id);
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Incorrect password" });
    }

    await User.findByIdAndDelete(user._id);
    req.session.destroy(() => {
      res.status(200).json({ success: true, message: "Account deleted successfully" });
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
app.get("/getusers", authenticate, async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 });
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("❌ Logout error:", err);
      return res.status(500).send("Could not log out. Try again.");
    }
    res.clearCookie("connect.sid");
    res.redirect("/login.html");
  });
});

// Route to create group
app.post("/creategroup", async (req, res) => {
  try {
    const {
      groupName,
      groupDesc,
      groupCreatedBy,
      formFillingDate,
      numPersons,
      users // Expects colon-separated string like "admin:admin1:Ramu"
    } = req.body;
    console.log(req.body);
    const userObj = {};
    users.split(":").forEach(name => {
      userObj[name] = 0;
    });

    const newGroup = new Person({
      groupName,
      groupDesc,
      groupCreatedBy,
      formFillingDate,
      numPersons,
      users: userObj,
      totalAmount: 0,
    });

    await newGroup.save();

    res.status(201).json({ message: "Group created successfully", data: newGroup });
  } catch (err) {
    console.error("Error saving group:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Example in Express.js
app.get("/getgroups", async (req, res) => {
  try {
    const personsData = await Person.find(); // Replace with your model    
    // console.log("HAHAHAH");
    res.json({ success: true, personsData });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch groups." });
  }
});

app.get("/getgroup/:id", async (req, res) => {
  try {
    const person = await Person.findById(req.params.id);
    if (!person) return res.status(404).json({ error: "Person not found" });
    res.json(person);
  } catch (err) {
    res.status(500).json({ error: "Error fetching person" });
  }
});

// POST /addspending
app.post("/addspending", async (req, res) => {
  const { personId, username, title, date, amount } = req.body;
  console.log("Hello");
  if (!personId || !username || !title || !date || typeof amount !== "number") {
    return res.status(400).json({ error: "Missing or invalid fields" });
  }

  try {
    const spending = await Spending.create({ personId, username, title, date, amount });

    const person = await Person.findById(personId);

    if (!person) {
      return res.status(404).json({ error: "Group not found" });
    }

    person.totalAmount = (person.totalAmount || 0) + amount;

    const currentAmount = person.users.get(username) || 0;
    person.users.set(username, currentAmount + amount);

    await person.save();

    res.status(201).json(spending);
  } catch (err) {
    console.error("Error in /addspending:", err);
    res.status(500).json({ error: "Failed to add spending", details: err.message });
  }
});

app.put("/updatespending/:id", async (req, res) => {
  const { username, title, date, amount, personId } = req.body;

  try {
    const spending = await Spending.findById(req.params.id);
    if (!spending) return res.status(404).json({ error: "Spending not found" });

    const person = await Person.findById(personId);

    // Rollback old values
    person.totalAmount -= spending.amount;
    const oldUserAmt = person.users.get(spending.username) || 0;
    person.users.set(spending.username, oldUserAmt - spending.amount);

    // Apply new values
    person.totalAmount += amount;
    const newUserAmt = person.users.get(username) || 0;
    person.users.set(username, newUserAmt + amount);

    // Update spending document
    spending.username = username;
    spending.title = title;
    spending.date = date;
    spending.amount = amount;
    await spending.save();

    await person.save();

    res.status(200).json(spending);
  } catch (err) {
    res.status(500).json({ error: "Failed to update spending", details: err.message });
  }
});


// DELETE /deletespending/:id
app.delete("/deletespending/:id", async (req, res) => {
  try {
    const spending = await Spending.findByIdAndDelete(req.params.id);
    if (!spending) return res.status(404).json({ error: "Spending not found" });

    const person = await Person.findById(spending.personId);

    // Deduct from totalAmount
    person.totalAmount -= spending.amount;

    // Deduct from user's amount
    const oldAmt = person.users.get(spending.username) || 0;
    person.users.set(spending.username, oldAmt - spending.amount);

    await person.save();

    res.status(200).json({ message: "Spending deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete spending", details: err.message });
  }
});


// 📄 Get all spendings for a personId (group)
app.get("/getspendings/:personId", async (req, res) => {
  try {
    console.log("get method",req.params.personId);
    const spendings = await Spending.find({ personId: req.params.personId });
    res.json(spendings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch spendings" });
  }
});

app.post("/deletegroup", authorize, authenticate, async (req, res) => {
  const { groupId, password } = req.body;
  const user = await User.findById(req.session?.user?._id);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ success: false, message: "Incorrect password" });

  await Person.findByIdAndDelete(groupId);
  await Spending.deleteMany({ personId: groupId }); // Optional: clean up related spendings

  res.json({ success: true });
});


// Protected middleware
function authenticate(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect("/login.html");
}

function authorize(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
} 

app.get('/sessioncheck', authenticate, (req, res) => {
  // Return session info if needed
  res.json({
    loggedIn: true,
    username: req.session.user.username || req.session.user,
  });
});

// Server start
app.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));

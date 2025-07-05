const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");
const { User, Person, SplitPerson } = require("./models/models");

dotenv.config();

const app = express();

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
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
  // cookie: { maxAge: 1000 * 60 * 60 * 24 * 2 }  // 2days
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

app.put('/updateExpense', async (req, res) => {
  try {
    const { groupId, title, person, amount } = req.body;

    const existingExpense = await SplitPerson.findOne({ groupId, person, title });

    const group = await Person.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const prevAmount = group.users[person] || 0;
    const newAmount = parseFloat(amount);
    console.log(newAmount);
    if (existingExpense) 
    {
      // Save old amount before updating
      const oldAmount = existingExpense.amount;

      // Update fields
      existingExpense.amount = newAmount;
      existingExpense.title = title;
      existingExpense.date = new Date().toISOString().split("T")[0];
      await existingExpense.save();

      // Update Person schema
      // group.users[person] = newAmount;
      group.users.set(person, group.users[person]+newAmount);
      group.totalAmount = group.totalAmount - oldAmount + newAmount;
    }
    else {
      // New expense
      const newExpense = new SplitPerson({
        groupId,
        groupName: group.groupName,
        title,
        person,
        amount: newAmount,
        date: new Date().toISOString().split("T")[0]
      });
      await newExpense.save();

      // group.users[person] = newAmount;
      group.users.set(person, group.users[person]+newAmount);
      group.totalAmount += newAmount;
    }
    console.log(group);
    await group.save();

    res.json({ message: 'Expense processed successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

app.get("/expenses/:groupId", async (req, res) => {
  try {
    const expenses = await SplitPerson.find({ groupId: req.params.groupId });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: "Failed to load expenses" });
  }
});

// Protected middleware
function authenticate(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect("/login.html");
}

function authorize(req, res, next) {
  if (req.session.user && req.session.user.email === req.params.email) {
    return next();
  }
  res.status(403).send("Unauthorized");
}

// Server start
app.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");
const { User, Person, Spending, SettlementGroup } = require("./models/models");
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
// app.post("/creategroup", async (req, res) => {
//   try {
//     const {
//       groupName,
//       groupDesc,
//       groupCreatedBy,
//       formFillingDate,
//       numPersons,
//       users // Expects colon-separated string like "admin:admin1:Ramu"
//     } = req.body;
//     const userObj = {};
//     users.split(":").forEach(name => {
//       userObj[name] = 0;
//     });

//     const newGroup = new Person({
//       groupName,
//       groupDesc,
//       groupCreatedBy,
//       formFillingDate,
//       numPersons,
//       users: userObj,
//       totalAmount: 0,
//     });

//     await newGroup.save();

//     res.status(201).json({ message: "Group created successfully", data: newGroup });
//   } catch (err) {
//     console.error("Error saving group:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

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

    const userObj = {};
    const userList = users.split(":");

    userList.forEach(name => {
      userObj[name] = 0;
    });

    // Create the group in Person collection
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

    // Create settlement records for each user
    const settlementInserts = [];

    userList.forEach(currentUser => {
      const others = userList.filter(user => user !== currentUser);
      const relationObj = {};
      others.forEach(other => {
        relationObj[other] = 0;
      });
      
      const settlementDoc = new SettlementGroup({
        settlement_groupid: newGroup._id.toString(), // Reference to the group
        name: currentUser,
        sendto: relationObj,
        receivefrom: relationObj
      });
      console.log(settlementDoc);
      settlementInserts.push(settlementDoc.save());
    });

    await Promise.all(settlementInserts);

    res.status(201).json({
      message: "Group and settlements created successfully",
      group: newGroup
    });

  } catch (err) {
    console.error("Error saving group or settlements:", err);
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

app.post("/addspending", async (req, res) => {
  const { personId, username, title, date, amount } = req.body;

  if (!personId || !username || !title || !date || typeof amount !== "number") {
    return res.status(400).json({ error: "Missing or invalid fields" });
  }

  try {
    // 1. Create spending entry
    const spending = await Spending.create({ personId, username, title, date, amount });

    // 2. Get all settlement records in this group
    const allDocs = await SettlementGroup.find({ settlement_groupid: personId.toString() });
    if (!allDocs.length) return res.status(404).json({ error: "No users found in group" });

    // 3. Update total amount in person document
    const person = await Person.findById(personId);
    if (person) {
      person.totalAmount = (person.totalAmount || 0) + amount;
      const currentUserAmt = person.users.get(username) || 0;
      person.users.set(username, currentUserAmt + amount);
      await person.save();
    }

    // 4. Split the amount among all users
    const userCount = allDocs.length;
    const splitAmount = parseFloat((amount / userCount).toFixed(2)); // rounded to 2 decimals

    // 5. Update settlement records
    await Promise.all(allDocs.map(async (doc) => {
      if (!doc.sendto) doc.sendto = {};
      if (!doc.receivefrom) doc.receivefrom = {};

      if (doc.name === username) {
        // Current spender receives from others
        allDocs.forEach(other => {
          if (other.name !== username) {
            doc.receivefrom[other.name] = (doc.receivefrom[other.name] || 0) + splitAmount;
          }
        });
        doc.markModified("receivefrom");
      } else {
        // Others owe the spender
        doc.sendto[username] = (doc.sendto[username] || 0) + splitAmount;
        doc.markModified("sendto");
      }
      console.log("spend",doc);
      await doc.save();
    }));

    res.status(201).json({ message: "Spending added and settlements updated", data: spending });

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

    const allDocs = await SettlementGroup.find({ settlement_groupid: personId.toString() });
    if (!allDocs.length) return res.status(404).json({ error: "No users found in group" });

    const person = await Person.findById(personId);
    const oldUsername = spending.username;
    const oldAmount = spending.amount;

    const rollbackOthers = allDocs.filter(doc => doc.name !== oldUsername);
    const rollbackSplit = oldAmount / (rollbackOthers.length + 1);

    for (const doc of allDocs) {
      if (doc.name === oldUsername) {
        if (!doc.receivefrom) doc.receivefrom = {};
        rollbackOthers.forEach(other => {
          doc.receivefrom[other.name] = (doc.receivefrom[other.name] || 0) - rollbackSplit;
        });
        doc.markModified("receivefrom");
      } else {
        if (!doc.sendto) doc.sendto = {};
        doc.sendto[oldUsername] = (doc.sendto[oldUsername] || 0) - rollbackSplit;
        doc.markModified("sendto");
      }
      await doc.save();
    }

    // 🔄 Rollback old Person values
    if (person) {
      person.totalAmount -= oldAmount;
      const oldUserAmt = person.users.get(oldUsername) || 0;
      person.users.set(oldUsername, oldUserAmt - oldAmount);

      // Apply new Person values
      person.totalAmount += amount;
      const newUserAmt = person.users.get(username) || 0;
      person.users.set(username, newUserAmt + amount);
      await person.save();
    }

    // Update Spending
    spending.username = username;
    spending.title = title;
    spending.date = date;
    spending.amount = amount;
    await spending.save();

    const newOthers = allDocs.filter(doc => doc.name !== username);
    const newSplit = amount / (newOthers.length + 1);

    await Promise.all(allDocs.map(async (doc) => {
      if (doc.name === username) {
        if (!doc.receivefrom) doc.receivefrom = {};
        newOthers.forEach(other => {
          doc.receivefrom[other.name] = (doc.receivefrom[other.name] || 0) + newSplit;
        });
        doc.markModified("receivefrom");
      } else {
        if (!doc.sendto) doc.sendto = {};
        doc.sendto[username] = (doc.sendto[username] || 0) + newSplit;
        doc.markModified("sendto");
      }
      await doc.save();
    }));

    res.status(200).json({ message: "Spending updated and settlements adjusted", data: spending });

  } catch (err) {
    console.error("Error in /updatespending:", err);
    res.status(500).json({ error: "Failed to update spending", details: err.message });
  }
});

app.delete("/deletespending/:id", async (req, res) => {
  try {
    const spending = await Spending.findByIdAndDelete(req.params.id);
    if (!spending) return res.status(404).json({ error: "Spending not found" });

    const { personId, username, amount } = spending;

    // ✅ Step 1: Update Person (if you're still maintaining Person schema)
    const person = await Person.findById(personId);
    if (person) {
      person.totalAmount -= amount;
      const oldAmt = person.users.get(username) || 0;
      person.users.set(username, oldAmt - amount);
      await person.save();
    }

    // ✅ Step 2: Update SettlementGroup records
    const allDocs = await SettlementGroup.find({ settlement_groupid: personId.toString() });
    if (!allDocs.length) {
      return res.status(404).json({ error: "No settlement records found" });
    }

    const otherUsers = allDocs.filter(doc => doc.name !== username);
    const splitAmount = amount / (otherUsers.length + 1);

    await Promise.all(allDocs.map(async (doc) => {
      if (doc.name === username) {
        // 🎯 Update receivefrom of the spender
        otherUsers.forEach(other => {
          if (doc.receivefrom && doc.receivefrom[other.name] != null) {
            doc.receivefrom[other.name] = Math.max(0, doc.receivefrom[other.name] - splitAmount);
          }
        });
        doc.markModified("receivefrom");
      } else {
        // 🎯 Update sendto for each other user
        if (doc.sendto && doc.sendto[username] != null) {
          doc.sendto[username] = Math.max(0, doc.sendto[username] - splitAmount);
        }
        doc.markModified("sendto");
      }
      await doc.save();
    }));

    res.status(200).json({ message: "Spending and settlements updated successfully" });

  } catch (err) {
    console.error("Error deleting spending:", err);
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

  try {
    // Step 1: Validate user password
    const user = await User.findById(req.session?.user?._id);
    if (!user) return res.status(401).json({ success: false, message: "Unauthorized user" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Incorrect password" });

    // Step 2: Delete the group from Person
    const group = await Person.findByIdAndDelete(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    // Step 3: Delete associated spendings (optional)
    await Spending.deleteMany({ personId: groupId });

    // Step 4: Delete associated settlement group records
    await SettlementGroup.deleteMany({ settlement_groupid: groupId });

    res.json({ success: true, message: "Group and associated data deleted successfully" });

  } catch (err) {
    console.error("❌ Error deleting group:", err);
    res.status(500).json({ success: false, message: "Server error", details: err.message });
  }
});

//** NEW API's

// GET Settlement Data
app.get("/api/getsettlement/:groupid/:username", async (req, res) => {
  const { groupid, username } = req.params;
  console.log(req.params);
  try {
    const record = await SettlementGroup.findOne({
      name: username,
      settlement_groupid: groupid,
    });

    if (!record) {
      return res.json({ settlement: { sendto: {}, receivefrom: {} } });
    }

    res.json({ settlement: record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/updatesettlementamount", async (req, res) => {
  const { from, to, amount, groupid } = req.body;

  try {
    const fromRecord = await SettlementGroup.findOne({ name: from, settlement_groupid: groupid });
    const toRecord = await SettlementGroup.findOne({ name: to, settlement_groupid: groupid });

    console.log("Request Body:", req.body);
    console.log("From Record (Before):", fromRecord);
    console.log("To Record (Before):", toRecord);

    // Validate
    if (!fromRecord || typeof fromRecord.sendto[to] !== "number") {
      return res.json({ success: false, msg: "Invalid from record or user" });
    }

    if (!toRecord || typeof toRecord.receivefrom[from] !== "number") {
      return res.json({ success: false, msg: "Invalid to record or user" });
    }

    if (amount > fromRecord.sendto[to]) {
      return res.json({ success: false, msg: "Amount exceeds owed" });
    }

    // Subtract from both records
    fromRecord.sendto[to] -= amount;
    toRecord.receivefrom[from] -= amount;

    // Mark modified paths
    fromRecord.markModified("sendto");
    toRecord.markModified("receivefrom");

    console.log("From Record (After):", fromRecord);
    console.log("To Record (After):", toRecord);

    // Save both
    await fromRecord.save();
    await toRecord.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});
app.post("/api/settleuser", async (req, res) => {
  const { from, to, groupid } = req.body;

  try {
    const fromRecord = await SettlementGroup.findOne({ name: from, settlement_groupid: groupid });
    const toRecord = await SettlementGroup.findOne({ name: to, settlement_groupid: groupid });

    if (!fromRecord || !toRecord) {
      return res.json({ success: false, msg: "Settlement records not found" });
    }

    let modified = false;

    if (fromRecord.sendto[to] !== undefined) {
      fromRecord.sendto[to] = 0;
      fromRecord.markModified("sendto");
      modified = true;
    }

    if (toRecord.receivefrom[from] !== undefined) {
      toRecord.receivefrom[from] = 0;
      toRecord.markModified("receivefrom");
      modified = true;
    }

    if (!modified) {
      return res.json({ success: false, msg: "Nothing to settle" });
    }

    await fromRecord.save();
    await toRecord.save();

    console.log("From Record:", fromRecord);
    console.log("To Record:", toRecord);

    res.json({ success: true });
  } catch (err) {
    console.error("Settle Error:", err);
    res.status(500).json({ success: false });
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
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
} 

app.get('/sessioncheck', authenticate, (req, res) => {
  res.json({
    loggedIn: true,
    role: req.session.user.role,
    name: req.session.user.name,
    email: req.session.user.email
  });
});
// Server start
app.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));

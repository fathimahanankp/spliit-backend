const express = require("express");
const fs = require("fs");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
app.use(cors());
app.use(express.json());

const FILE = "data.json";
const SECRET = "secret123";

// ✅ Ensure file exists
if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, JSON.stringify({
    users: [],
    groups: [],
    expenses: []
  }, null, 2));
}

// HELPERS
const readData = () => JSON.parse(fs.readFileSync(FILE));
const writeData = (data) => fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

// ================= AUTH =================

// REGISTER
app.post("/register", async (req, res) => {
  const { name, password } = req.body;
  const data = readData();

  if (!name || !password) {
    return res.json({ error: "Name and password required" });
  }

  if (data.users.find(u => u.name === name)) {
    return res.json({ error: "User already exists" });
  }

  const hash = await bcrypt.hash(password, 8);

  const user = {
    id: Date.now(),
    name,
    password: hash
  };

  data.users.push(user);
  writeData(data);

  res.json({ message: "Registered successfully" });
});

// LOGIN
app.post("/login", async (req, res) => {
  const { name, password } = req.body;
  const data = readData();

  const user = data.users.find(u => u.name === name);
  if (!user) return res.json({ error: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.json({ error: "Wrong password" });

  const token = jwt.sign({ id: user.id }, SECRET);

  res.json({ token, user });
});

// AUTH MIDDLEWARE
function auth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ error: "No token" });

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
}

// ================= GROUPS =================

// CREATE GROUP
app.post("/create-group", auth, (req, res) => {
  const { name, members } = req.body;
  const data = readData();

  if (!name || !members || members.length === 0) {
    return res.json({ error: "Group name and members required" });
  }

  const group = {
    id: Date.now(),
    name,
    members
  };

  data.groups.push(group);
  writeData(data);

  res.json(group);
});

// GET ALL GROUPS
app.get("/groups", auth, (req, res) => {
  const data = readData();
  res.json(data.groups);
});

// GET SINGLE GROUP DATA
app.get("/group/:id", auth, (req, res) => {
  const data = readData();
  const id = Number(req.params.id);

  const group = data.groups.find(g => g.id === id);

  if (!group) {
    return res.json({ error: "Group not found" });
  }

  res.json({
    group,
    users: data.users,
    expenses: data.expenses.filter(e => e.groupId === id)
  });
});

// ================= EXPENSES =================

// ADD EXPENSE
app.post("/add-expense", auth, (req, res) => {
  const { groupId, amount, paidBy, split } = req.body;
  const data = readData();

  if (!groupId || !amount || !paidBy || !split) {
    return res.json({ error: "Missing fields" });
  }

  const exp = {
    id: Date.now(),
    groupId,
    amount,
    paidBy,
    split
  };

  data.expenses.push(exp);
  writeData(data);

  res.json(exp);
});

// DELETE EXPENSE
app.delete("/expense/:id", auth, (req, res) => {
  const data = readData();

  data.expenses = data.expenses.filter(e => e.id != req.params.id);
  writeData(data);

  res.json({ message: "Deleted" });
});

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("🚀 Spliit backend is running!");
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});

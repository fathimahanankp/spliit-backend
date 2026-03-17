const express = require("express");
const fs = require("fs");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());
app.use(cors());

const SECRET = "secret123";
const FILE = "data.json";

// READ DATA
function readData() {
  return JSON.parse(fs.readFileSync(FILE));
}

// WRITE DATA
function writeData(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// AUTH MIDDLEWARE
function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.json({ error: "Invalid token" });
  }
}

// REGISTER
app.post("/register", async (req, res) => {
  const data = readData();

  const hashed = await bcrypt.hash(req.body.password, 8);

  data.users.push({
    id: Date.now(),
    name: req.body.name.trim(),
    password: hashed
  });

  writeData(data);
  res.json({ message: "Registered" });
});

// LOGIN
app.post("/login", async (req, res) => {
  const data = readData();

  const user = data.users.find(
    u => u.name === req.body.name.trim()
  );

  if (!user) return res.json({ error: "User not found" });

  const ok = await bcrypt.compare(req.body.password, user.password);
  if (!ok) return res.json({ error: "Wrong password" });

  const token = jwt.sign(user, SECRET);

  res.json({ token, user });
});

// GET GROUPS
app.get("/groups", auth, (req, res) => {
  const data = readData();
  res.json(data.groups);
});

// CREATE GROUP
app.post("/create-group", auth, (req, res) => {
  const data = readData();

  data.groups.push({
    id: Date.now(),
    name: req.body.name,
    members: req.body.members.map(m => m.trim())
  });

  writeData(data);
  res.json({ message: "Group created" });
});

// 🔥 FIXED GROUP API
app.get("/group/:id", auth, (req, res) => {
  const data = readData();

  const group = data.groups.find(g => g.id == req.params.id);
  if (!group) return res.json({ error: "Group not found" });

  // ✅ IMPORTANT FIX (ensures correct users)
  const users = data.users.filter(u =>
    group.members.includes(u.name)
  );

  const expenses = data.expenses.filter(e => e.groupId == group.id);

  res.json({ group, users, expenses });
});

// ADD EXPENSE
app.post("/add-expense", auth, (req, res) => {
  const data = readData();

  data.expenses.push({
    id: Date.now(),
    groupId: req.body.groupId,
    amount: req.body.amount,
    paidBy: req.body.paidBy,
    split: req.body.split
  });

  writeData(data);
  res.json({ message: "Expense added" });
});

// DELETE EXPENSE
app.delete("/expense/:id", auth, (req, res) => {
  const data = readData();

  data.expenses = data.expenses.filter(e => e.id != req.params.id);

  writeData(data);
  res.json({ message: "Deleted" });
});

app.listen(3000, () => {
  console.log("🚀 Spliit backend is running!");
});

// GET SINGLE GROUP DATA (FIXED)
app.get("/group/:id", auth, (req, res) => {
  const data = readData();
  const id = Number(req.params.id);

  const group = data.groups.find(g => g.id === id);

  if (!group) {
    return res.json({ error: "Group not found" });
  }

  // 🔥 IMPORTANT FIX: only send group members
  const users = data.users.filter(u =>
    group.members.includes(u.name)
  );

  const expenses = data.expenses.filter(e => e.groupId === id);

  res.json({
    group,
    users,      // ✅ fixed
    expenses
  });
});

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "smart-campus-demo-secret";
const DB_FILE = path.join(__dirname, "data.json");

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

function db() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], issues: [], notifications: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}
function id(prefix) {
  return prefix + crypto.randomBytes(4).toString("hex");
}

async function seed() {
  const data = db();
  if (!data.users.some(u => u.email === "admin@smartcampus.local")) {
    data.users.push({
      id: "usr_admin",
      name: "Campus Administrator",
      email: "admin@smartcampus.local",
      password: await bcrypt.hash("Admin@123", 10),
      role: "admin",
      verified: true,
      department: "Administration"
    });
  }
  if (!data.users.some(u => u.email === "staff@smartcampus.local")) {
    data.users.push({
      id: "usr_staff",
      name: "Maintenance Staff",
      email: "staff@smartcampus.local",
      password: await bcrypt.hash("Staff@123", 10),
      role: "staff",
      verified: true,
      department: "IT & Maintenance"
    });
  }
  save(data);
}
seed();

function transporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

async function sendVerificationEmail(email, name, otp) {
  const t = transporter();
  if (!t) {
    console.log(`[DEMO EMAIL] Verification OTP for ${email}: ${otp}`);
    return { demo: true };
  }
  await t.sendMail({
    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
    to: email,
    subject: "Smart Campus email verification",
    text: `Hello ${name}, your Smart Campus verification code is ${otp}. It expires in 10 minutes.`,
    html: `<div style="font-family:Arial"><h2>Smart Campus</h2><p>Hello ${name},</p><p>Your email verification code is:</p><h1 style="letter-spacing:6px">${otp}</h1><p>This code expires in 10 minutes.</p></div>`
  });
  return { demo: false };
}

function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Login required" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}
function role(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Access denied" });
    next();
  };
}

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, department } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password are required" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  const data = db();
  const normalized = email.trim().toLowerCase();
  if (data.users.some(u => u.email === normalized)) return res.status(409).json({ error: "Email already registered" });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const user = {
    id: id("usr_"),
    name: name.trim(),
    email: normalized,
    password: await bcrypt.hash(password, 10),
    role: "student",
    department: department || "Student",
    verified: false,
    otpHash: crypto.createHash("sha256").update(otp).digest("hex"),
    otpExpires: Date.now() + 10 * 60 * 1000
  };
  data.users.push(user);
  save(data);

  try {
    const result = await sendVerificationEmail(user.email, user.name, otp);
    res.json({ message: "Verification code sent", email: user.email, demo: result.demo });
  } catch (e) {
    data.users = data.users.filter(u => u.id !== user.id);
    save(data);
    res.status(500).json({ error: "Could not send verification email. Check SMTP settings." });
  }
});

app.post("/api/auth/verify", (req, res) => {
  const { email, otp } = req.body;
  const data = db();
  const user = data.users.find(u => u.email === String(email).toLowerCase());
  if (!user) return res.status(404).json({ error: "Account not found" });
  if (user.verified) return res.json({ message: "Email already verified" });
  if (!user.otpExpires || Date.now() > user.otpExpires) return res.status(400).json({ error: "OTP expired. Please register again." });
  const hash = crypto.createHash("sha256").update(String(otp)).digest("hex");
  if (hash !== user.otpHash) return res.status(400).json({ error: "Invalid verification code" });

  user.verified = true;
  delete user.otpHash;
  delete user.otpExpires;
  save(data);
  res.json({ message: "Email verified successfully" });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const data = db();
  const user = data.users.find(u => u.email === String(email).trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password || "", user.password))) return res.status(401).json({ error: "Invalid email or password" });
  if (!user.verified) return res.status(403).json({ error: "Please verify your email before logging in", unverified: true, email: user.email });

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role, department: user.department }, JWT_SECRET, { expiresIn: "8h" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department } });
});

app.get("/api/me", auth, (req, res) => res.json({ user: req.user }));

app.post("/api/issues", auth, role("student"), (req, res) => {
  const { title, description, category, priority, location } = req.body;
  if (!title || !description || !category || !location) return res.status(400).json({ error: "Please complete all required fields" });
  const data = db();
  const issue = {
    id: id("ISS-"),
    title, description, category, priority: priority || "Medium", location,
    status: "Submitted", studentId: req.user.id, studentName: req.user.name,
    assignedStaffId: null, assignedStaffName: null, createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(), comments: []
  };
  data.issues.unshift(issue);
  data.notifications.unshift({ id: id("NTF-"), userId: req.user.id, message: `Issue ${issue.id} submitted successfully.`, createdAt: new Date().toISOString(), read: false });
  save(data);
  res.status(201).json(issue);
});

app.get("/api/issues", auth, (req, res) => {
  const data = db();
  let issues = data.issues;
  if (req.user.role === "student") issues = issues.filter(i => i.studentId === req.user.id);
  if (req.user.role === "staff") issues = issues.filter(i => i.assignedStaffId === req.user.id);
  res.json(issues);
});

app.get("/api/staff", auth, role("admin"), (req, res) => {
  const data = db();
  res.json(data.users.filter(u => u.role === "staff").map(u => ({ id: u.id, name: u.name, email: u.email, department: u.department })));
});

app.patch("/api/issues/:issueId", auth, role("admin", "staff"), (req, res) => {
  const data = db();
  const issue = data.issues.find(i => i.id === req.params.issueId);
  if (!issue) return res.status(404).json({ error: "Issue not found" });

  if (req.user.role === "admin") {
    if (req.body.priority) issue.priority = req.body.priority;
    if (req.body.status) issue.status = req.body.status;
    if (req.body.assignedStaffId) {
      const staff = data.users.find(u => u.id === req.body.assignedStaffId && u.role === "staff");
      if (!staff) return res.status(400).json({ error: "Staff member not found" });
      issue.assignedStaffId = staff.id;
      issue.assignedStaffName = staff.name;
      issue.status = "Assigned";
      data.notifications.unshift({ id: id("NTF-"), userId: staff.id, message: `New issue ${issue.id} assigned to you.`, createdAt: new Date().toISOString(), read: false });
    }
  } else {
    if (issue.assignedStaffId !== req.user.id) return res.status(403).json({ error: "This issue is not assigned to you" });
    if (req.body.status) issue.status = req.body.status;
  }
  issue.updatedAt = new Date().toISOString();
  data.notifications.unshift({ id: id("NTF-"), userId: issue.studentId, message: `Issue ${issue.id} status updated to ${issue.status}.`, createdAt: new Date().toISOString(), read: false });
  save(data);
  res.json(issue);
});

app.post("/api/issues/:issueId/comments", auth, (req, res) => {
  const data = db();
  const issue = data.issues.find(i => i.id === req.params.issueId);
  if (!issue) return res.status(404).json({ error: "Issue not found" });
  if (req.user.role === "student" && issue.studentId !== req.user.id) return res.status(403).json({ error: "Access denied" });
  issue.comments.push({ id: id("C-"), userId: req.user.id, userName: req.user.name, message: req.body.message, createdAt: new Date().toISOString() });
  issue.updatedAt = new Date().toISOString();
  save(data);
  res.json(issue);
});

app.get("/api/notifications", auth, (req, res) => {
  const data = db();
  res.json(data.notifications.filter(n => n.userId === req.user.id).slice(0, 30));
});

app.get("/api/dashboard-stats", auth, role("admin", "staff"), (req, res) => {
  const data = db();
  const issues = data.issues;

  const staffUsers = data.users.filter(u => u.role === "staff");
  const staffStats = staffUsers.map(staff => {
    const assigned = issues.filter(i => i.assignedStaffId === staff.id);
    return {
      id: staff.id,
      name: staff.name,
      department: staff.department,
      assigned: assigned.length,
      working: assigned.filter(i => i.status === "In Progress").length,
      completed: assigned.filter(i => ["Resolved", "Closed"].includes(i.status)).length
    };
  });

  if (req.user.role === "staff") {
    const mine = issues.filter(i => i.assignedStaffId === req.user.id);
    return res.json({
      role: "staff",
      totalIssues: mine.length,
      assigned: mine.filter(i => i.status === "Assigned").length,
      working: mine.filter(i => i.status === "In Progress").length,
      completed: mine.filter(i => ["Resolved", "Closed"].includes(i.status)).length
    });
  }

  res.json({
    role: "admin",
    totalStaff: staffUsers.length,
    workingStaff: staffUsers.filter(s =>
      issues.some(i => i.assignedStaffId === s.id && i.status === "In Progress")
    ).length,
    staffWithAssignedWork: staffUsers.filter(s =>
      issues.some(i => i.assignedStaffId === s.id && ["Assigned", "In Progress"].includes(i.status))
    ).length,
    totalIssues: issues.length,
    submitted: issues.filter(i => i.status === "Submitted").length,
    assigned: issues.filter(i => i.status === "Assigned").length,
    inProgress: issues.filter(i => i.status === "In Progress").length,
    completed: issues.filter(i => ["Resolved", "Closed"].includes(i.status)).length,
    staffStats
  });
});

app.get("/api/analytics", auth, role("admin"), (req, res) => {
  const data = db();
  const issues = data.issues;
  const count = status => issues.filter(i => i.status === status).length;
  const categories = {};
  const priorities = {};
  issues.forEach(i => {
    categories[i.category] = (categories[i.category] || 0) + 1;
    priorities[i.priority] = (priorities[i.priority] || 0) + 1;
  });
  res.json({
    total: issues.length,
    submitted: count("Submitted"),
    assigned: count("Assigned"),
    progress: count("In Progress"),
    resolved: count("Resolved"),
    closed: count("Closed"),
    categories,
    priorities
  });
});

app.listen(PORT, () => console.log(`Smart Campus running at http://localhost:${PORT}`));

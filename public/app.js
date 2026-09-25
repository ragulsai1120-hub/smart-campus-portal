const app = document.getElementById("app");
let token = localStorage.getItem("sc_token");
let currentUser = JSON.parse(localStorage.getItem("sc_user") || "null");
let verificationEmail = "";

async function api(url, options={}) {
  options.headers = {...(options.headers||{}), "Content-Type":"application/json"};
  if (token) options.headers.Authorization = "Bearer " + token;
  const res = await fetch(url, options);
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function toast(msg, type="notice"){const x=document.createElement("div");x.className=`toast ${type}`;x.textContent=msg;document.body.appendChild(x);setTimeout(()=>x.remove(),3000)}
function loginPage(mode="login"){
  app.innerHTML=`<div class="auth-shell">
    <section class="auth-hero">
      <div class="brand"><span class="brand-mark">SC</span> Smart Campus</div>
      <h1>Turn campus complaints into completed solutions.</h1>
      <p>A centralized issue management portal for students, administrators and maintenance teams.</p>
      <div class="hero-badges"><span class="badge">✓ Verified Students</span><span class="badge">✓ Smart Prioritization</span><span class="badge">✓ Transparent Tracking</span><span class="badge">✓ Analytics</span></div>
    </section>
    <section class="auth-card">
      <div class="tabs"><button id="loginTab" class="${mode==='login'?'active':''}">Login</button><button id="registerTab" class="${mode==='register'?'active':''}">Create account</button></div>
      <div id="authForm"></div>
    </section>
  </div>`;
  document.getElementById("loginTab").onclick=()=>loginPage("login");
  document.getElementById("registerTab").onclick=()=>loginPage("register");
  renderAuthForm(mode);
}
function renderAuthForm(mode){
  const el=document.getElementById("authForm");
  if(mode==="login"){
    el.innerHTML=`<h2>Welcome back</h2><p class="muted">Login to your campus portal.</p>
      <label>Email</label><input id="email" type="email" placeholder="you@college.edu">
      <label>Password</label><input id="password" type="password" placeholder="••••••••">
      <div id="authMsg"></div><button class="btn btn-primary full" id="loginBtn">Login</button>
      <p class="muted" style="font-size:12px;margin-top:18px">Demo admin: admin@smartcampus.local / Admin@123<br>Demo staff: staff@smartcampus.local / Staff@123</p>`;
    document.getElementById("loginBtn").onclick=doLogin;
  } else {
    el.innerHTML=`<h2>Create student account</h2><p class="muted">A 6-digit OTP will be sent to your email.</p>
      <label>Full name</label><input id="name" placeholder="Your name">
      <label>College email</label><input id="email" type="email" placeholder="you@college.edu">
      <label>Password</label><input id="password" type="password" placeholder="Minimum 6 characters">
      <label>Department</label><input id="department" placeholder="Computer Science">
      <div id="authMsg"></div><button class="btn btn-primary full" id="registerBtn">Send verification code</button>`;
    document.getElementById("registerBtn").onclick=doRegister;
  }
}
async function doRegister(){
  const body={name:val("name"),email:val("email"),password:val("password"),department:val("department")};
  try{const r=await api("/api/auth/register",{method:"POST",body:JSON.stringify(body)});verificationEmail=r.email; verifyPage(r.email,r.demo)}
  catch(e){msg(e.message,"error")}
}
function verifyPage(email,demo){
  app.innerHTML=`<div class="auth-shell"><section class="auth-hero"><div class="brand"><span class="brand-mark">SC</span> Smart Campus</div><h1>One step away.</h1><p>Verify your email to activate your student account.</p></section>
  <section class="auth-card"><h2>Verify email</h2><p>We sent a 6-digit code to <b>${esc(email)}</b>.</p>
  ${demo?'<div class="notice">SMTP is not configured, so this demo prints the OTP in the server terminal.</div>':''}
  <label>Verification code</label><input id="otp" inputmode="numeric" maxlength="6" placeholder="123456">
  <div id="authMsg"></div><button class="btn btn-primary full" id="verifyBtn">Verify email</button>
  <button class="btn btn-light full" style="margin-top:10px" onclick="loginPage('login')">Back to login</button></section></div>`;
  document.getElementById("verifyBtn").onclick=async()=>{try{await api("/api/auth/verify",{method:"POST",body:JSON.stringify({email,otp:val("otp")})});toast("Email verified","success");loginPage("login")}catch(e){msg(e.message,"error")}}
}
async function doLogin(){
  try{const r=await api("/api/auth/login",{method:"POST",body:JSON.stringify({email:val("email"),password:val("password")})});token=r.token;currentUser=r.user;localStorage.setItem("sc_token",token);localStorage.setItem("sc_user",JSON.stringify(currentUser));renderApp()}
  catch(e){msg(e.message,"error")}
}
function val(id){return document.getElementById(id)?.value.trim()||""}
function msg(t,type){const e=document.getElementById("authMsg");if(e)e.innerHTML=`<div class="notice ${type}">${esc(t)}</div>`}

function renderApp(){
  if(!token||!currentUser){loginPage();return}
  app.innerHTML=`<div class="app-shell"><header class="topbar"><div class="brand"><span class="brand-mark">SC</span> Smart Campus</div><div><b>${esc(currentUser.name)}</b> <span class="pill status">${esc(currentUser.role)}</span> <button class="btn btn-light" onclick="logout()">Logout</button></div></header>
  <div class="layout"><aside class="sidebar" id="sidebar"></aside><main class="main" id="main"></main></div></div>`;
  const nav = currentUser.role==="student" ? [
    ["home","Dashboard"],["new","Report Issue"],["issues","My Issues"],["notifications","Notifications"]
  ] : currentUser.role==="admin" ? [
    ["home","Dashboard"],["issues","All Issues"],["analytics","Analytics"]
  ] : [["home","Dashboard"],["issues","Assigned Issues"]];
  document.getElementById("sidebar").innerHTML=nav.map((n,i)=>`<button class="navbtn ${i===0?'active':''}" data-page="${n[0]}">${n[1]}</button>`).join("");
  document.querySelectorAll(".navbtn").forEach(b=>b.onclick=()=>{document.querySelectorAll(".navbtn").forEach(x=>x.classList.remove("active"));b.classList.add("active");route(b.dataset.page)});
  route("home");
}
async function route(page){
  const m=document.getElementById("main");
  if(page==="home") return dashboard(m);
  if(page==="new") return issueForm(m);
  if(page==="issues") return issuesPage(m);
  if(page==="notifications") return notificationsPage(m);
  if(page==="analytics") return analyticsPage(m);
}
async function dashboard(m){
  const issues=await api("/api/issues");

  if(currentUser.role==="admin"){
    const stats=await api("/api/dashboard-stats");
    m.innerHTML=`<div class="heading"><div><h1>Admin Dashboard</h1><p class="muted">Live overview of staff workload and reported campus issues.</p></div></div>
    <div class="grid">
      <div class="card"><div class="metric-label">TOTAL STAFF</div><div class="metric">${stats.totalStaff}</div><div class="muted">Registered staff members</div></div>
      <div class="card"><div class="metric-label">STAFF WORKING</div><div class="metric">${stats.workingStaff}</div><div class="muted">Currently handling In Progress issues</div></div>
      <div class="card"><div class="metric-label">IN PROGRESS</div><div class="metric">${stats.inProgress}</div><div class="muted">Issues being worked on</div></div>
      <div class="card"><div class="metric-label">COMPLETED</div><div class="metric">${stats.completed}</div><div class="muted">Resolved or closed issues</div></div>
    </div>
    <div class="section card"><h3>Staff Workload</h3>
      <div class="table-wrap" style="border:0"><table style="min-width:650px"><thead><tr><th>Staff</th><th>Department</th><th>Assigned</th><th>Working</th><th>Completed</th></tr></thead>
      <tbody>${stats.staffStats.map(s=>`<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.department||"-")}</td><td>${s.assigned}</td><td>${s.working}</td><td>${s.completed}</td></tr>`).join("")||'<tr><td colspan="5" class="muted">No staff members registered.</td></tr>'}</tbody></table></div>
    </div>
    <div class="section card"><h3>Recent Reports</h3>${issues.slice(0,5).map(issueRow).join("")||'<p class="muted">No real student reports yet.</p>'}</div>`;
    return;
  }

  if(currentUser.role==="staff"){
    const stats=await api("/api/dashboard-stats");
    m.innerHTML=`<div class="heading"><div><h1>Staff Dashboard</h1><p class="muted">Your assigned campus issues and current workload.</p></div></div>
    <div class="grid">
      <div class="card"><div class="metric-label">ASSIGNED</div><div class="metric">${stats.assigned}</div></div>
      <div class="card"><div class="metric-label">IN PROGRESS</div><div class="metric">${stats.working}</div></div>
      <div class="card"><div class="metric-label">COMPLETED</div><div class="metric">${stats.completed}</div></div>
      <div class="card"><div class="metric-label">TOTAL ASSIGNED</div><div class="metric">${stats.totalIssues}</div></div>
    </div>
    <div class="section card"><h3>Assigned Issues</h3>${issues.slice(0,5).map(issueRow).join("")||'<p class="muted">No issues assigned to you yet.</p>'}</div>`;
    return;
  }

  const counts={submitted:issues.filter(i=>i.status==="Submitted").length,assigned:issues.filter(i=>i.status==="Assigned").length,progress:issues.filter(i=>i.status==="In Progress").length,resolved:issues.filter(i=>["Resolved","Closed"].includes(i.status)).length};
  m.innerHTML=`<div class="heading"><div><h1>Student Dashboard</h1><p class="muted">Manage your campus reports from submission to resolution.</p></div><button class="btn btn-primary" onclick="route('new')">+ Report Issue</button></div>
  <div class="grid"><div class="card"><div class="metric-label">TOTAL ISSUES</div><div class="metric">${issues.length}</div></div><div class="card"><div class="metric-label">SUBMITTED</div><div class="metric">${counts.submitted}</div></div><div class="card"><div class="metric-label">IN PROGRESS</div><div class="metric">${counts.assigned+counts.progress}</div></div><div class="card"><div class="metric-label">RESOLVED</div><div class="metric">${counts.resolved}</div></div></div>
  <div class="section"><div class="card"><h3>My Recent Issues</h3>${issues.slice(0,5).map(issueRow).join("")||'<p class="muted">No issues reported yet.</p>'}</div></div>`;
}
function issueRow(i){
  return `<div class="issue-card" style="padding:14px 0;border-bottom:1px solid var(--border)">
    <div style="min-width:0;flex:1">
      <b>${esc(i.title)}</b>
      <div class="muted" style="font-size:13px">${esc(i.id)} · ${esc(i.location)} · ${esc(i.category)}</div>
      <div style="margin-top:7px;font-size:13px;line-height:1.45"><b>Description:</b> ${esc(i.description || "No description provided.")}</div>
      ${i.assignedStaffName ? `<div class="muted" style="font-size:12px;margin-top:5px"><b>Assigned to:</b> ${esc(i.assignedStaffName)}</div>` : ""}
    </div>
    <div style="white-space:nowrap"><span class="pill p-${i.priority.toLowerCase()}">${esc(i.priority)}</span> <span class="pill status">${esc(i.status)}</span></div>
  </div>`;
}
function issueForm(m){
  m.innerHTML=`<div class="heading"><div><h1>Report an Issue</h1><p class="muted">Tell the campus team what needs attention.</p></div></div><div class="card form-card">
  <div class="two"><div><label>Issue title *</label><input id="ititle" placeholder="e.g. Projector not working"></div><div><label>Category *</label><select id="icat"><option>Classroom Equipment</option><option>Network</option><option>Cleanliness</option><option>Infrastructure</option><option>Electrical</option><option>Plumbing</option><option>Other</option></select></div></div>
  <div class="two"><div><label>Location *</label><input id="iloc" placeholder="Block A - Room 204"></div><div><label>Priority</label><select id="ipri"><option>Low</option><option selected>Medium</option><option>High</option><option>Critical</option></select></div></div>
  <label>Description *</label><textarea id="idesc" placeholder="Describe the problem, what is affected, and any useful details..."></textarea>
  <div id="issueMsg"></div><button class="btn btn-primary" onclick="submitIssue()">Submit Issue</button></div>`;
}
async function submitIssue(){
  try{const issue=await api("/api/issues",{method:"POST",body:JSON.stringify({title:val("ititle"),category:val("icat"),location:val("iloc"),priority:val("ipri"),description:val("idesc")})});toast(`${issue.id} submitted`,"success");route("issues")}
  catch(e){document.getElementById("issueMsg").innerHTML=`<div class="notice error">${esc(e.message)}</div>`}
}
async function issuesPage(m){
  const issues=await api("/api/issues");
  const staff=currentUser.role==="admin"?await api("/api/staff"):null;
  m.innerHTML=`<div class="heading"><div><h1>${currentUser.role==="admin"?"All Issues":"Assigned Issues"}</h1><p class="muted">${issues.length} real issue(s) in your current view.</p></div></div>
  <div class="table-wrap"><table><thead><tr><th>ID</th><th>Issue & Description</th><th>Category</th><th>Priority</th><th>Status</th><th>Location</th><th>Action</th></tr></thead>
  <tbody>${issues.map(i=>`<tr>
    <td><b>${esc(i.id)}</b><br><span class="muted">${new Date(i.createdAt).toLocaleString()}</span></td>
    <td><b>${esc(i.title)}</b><br><span class="muted">${esc(i.studentName||"")}</span><div style="margin-top:5px;max-width:360px;line-height:1.4">${esc(i.description||"No description provided.")}</div></td>
    <td>${esc(i.category)}</td>
    <td><span class="pill p-${i.priority.toLowerCase()}">${esc(i.priority)}</span></td>
    <td><span class="pill status">${esc(i.status)}</span></td>
    <td>${esc(i.location)}</td>
    <td>${currentUser.role==="admin"?adminActions(i,staff):staffActions(i)}</td>
  </tr>`).join("")||'<tr><td colspan="7">No real reports found.</td></tr>'}</tbody></table></div>`;
}
function adminActions(i,staff){
  return `<select id="staff-${i.id}" style="width:180px"><option value="">Assign staff...</option>${staff.map(s=>`<option value="${s.id}" ${s.id===i.assignedStaffId?'selected':''}>${esc(s.name)}</option>`).join("")}</select>
  <select id="status-${i.id}" style="width:130px;margin-top:5px"><option ${i.status==="Submitted"?"selected":""}>Submitted</option><option ${i.status==="Assigned"?"selected":""}>Assigned</option><option ${i.status==="In Progress"?"selected":""}>In Progress</option><option ${i.status==="Resolved"?"selected":""}>Resolved</option><option ${i.status==="Closed"?"selected":""}>Closed</option></select>
  <button class="btn btn-primary" style="margin-top:5px" onclick="updateIssue('${i.id}')">Update</button>`;
}
function staffActions(i){return `<select id="status-${i.id}" style="width:150px"><option ${i.status==="Assigned"?"selected":""}>Assigned</option><option ${i.status==="In Progress"?"selected":""}>In Progress</option><option ${i.status==="Resolved"?"selected":""}>Resolved</option></select><button class="btn btn-primary" style="margin-top:5px" onclick="updateIssue('${i.id}')">Update</button>`}
async function updateIssue(id){
  const body={status:document.getElementById(`status-${id}`).value};
  if(currentUser.role==="admin") body.assignedStaffId=document.getElementById(`staff-${id}`).value;
  try{await api(`/api/issues/${id}`,{method:"PATCH",body:JSON.stringify(body)});toast("Issue updated","success");issuesPage(document.getElementById("main"))}catch(e){toast(e.message,"error")}
}
async function analyticsPage(m){
  const a=await api("/api/analytics");
  const cats=Object.entries(a.categories);
  const priorities=Object.entries(a.priorities||{});
  m.innerHTML=`<div class="heading"><div><h1>Campus Analytics</h1><p class="muted">Live analytics generated only from actual reports submitted in the portal.</p></div></div>
  <div class="grid">
    <div class="card"><div class="metric-label">TOTAL REPORTS</div><div class="metric">${a.total}</div></div>
    <div class="card"><div class="metric-label">SUBMITTED</div><div class="metric">${a.submitted}</div></div>
    <div class="card"><div class="metric-label">IN PROGRESS</div><div class="metric">${a.progress+a.assigned}</div></div>
    <div class="card"><div class="metric-label">COMPLETED</div><div class="metric">${a.resolved+a.closed}</div></div>
  </div>
  <div class="section" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div class="card"><h3>Issues by Category</h3>${cats.map(([k,v])=>`<div style="margin:15px 0"><div style="display:flex;justify-content:space-between"><b>${esc(k)}</b><span>${v}</span></div><div style="height:9px;background:#edf0f6;border-radius:9px;overflow:hidden"><div style="width:${a.total?Math.max(4,v/a.total*100):0}%;height:100%;background:linear-gradient(90deg,#4f46e5,#7c3aed)"></div></div></div>`).join("")||'<p class="muted">No real reports have been submitted yet.</p>'}</div>
    <div class="card"><h3>Issues by Priority</h3>${priorities.map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)"><span>${esc(k)}</span><b>${v}</b></div>`).join("")||'<p class="muted">No real reports have been submitted yet.</p>'}</div>
  </div>`;
}
async function notificationsPage(m){
  const ns=await api("/api/notifications");
  m.innerHTML=`<div class="heading"><div><h1>Notifications</h1><p class="muted">Updates about your campus issues.</p></div></div><div class="card">${ns.map(n=>`<div style="padding:15px 0;border-bottom:1px solid var(--border)"><b>${esc(n.message)}</b><div class="muted" style="font-size:12px">${new Date(n.createdAt).toLocaleString()}</div></div>`).join("")||'<p class="muted">No notifications yet.</p>'}</div>`;
}
function logout(){localStorage.clear();token=null;currentUser=null;loginPage()}
if(token&&currentUser) renderApp(); else loginPage();

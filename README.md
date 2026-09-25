# Smart Campus Issue Management Portal 

 The problem statement:

> Develop a web platform where students can report campus problems such as classroom equipment failures, network issues, cleanliness problems, or infrastructure damage. Administrators can track, prioritize, assign and update complaints.

## Included
- Student registration + email verification OTP
- Student login
- Admin and staff login
- Issue submission
- Category + priority
- Admin dashboard
- Staff assignment
- Status lifecycle
- Student notifications
- Analytics
- Role-based access

## 1. Install

Install Node.js 18+.

```bash
npm install
```

## 2. Run

```bash
npm start
```

Open:

http://localhost:3000

## Demo accounts

Admin:
- Email: admin@smartcampus.local
- Password: Admin@123

Staff:
- Email: staff@smartcampus.local
- Password: Staff@123

Students can create their own accounts.

## User Structure
Student
   ↓
Reports campus issue

Admin
   ↓
Views + assigns + manages issues

Staff
   ↓
Works on assigned issues
   ↓
Updates status

##  Project Flow

1. Create a student account.
2. Show the verification OTP email 
3. Verify email.
4. Login as the student.
5. Report a issue.
6. Login as admin.
7. Assign the issue to the staff account.
8. Login as staff and change status to In Progress.
9. Change it to Resolved.
10. Return to admin and show analytics.

## Dashboard update
- Admin dashboard shows total staff, staff currently working, issues in progress, and completed issues.
- Staff dashboard shows assigned, in-progress, completed, and total assigned issues.
- Admin and staff issue views display the full issue description.
- Analytics are calculated from real submitted issues in `data.json`; no fabricated report data is added.

## Tech stack

| Layer                  | Technology         | Why it is used                                          |
| ---------------------- | ------------------ | ------------------------------------------------------- |
| **Frontend**           | HTML5              | Creates the webpage structure                           |
| **Frontend**           | CSS3               | Styling, layout, responsive design                      |
| **Frontend**           | JavaScript         | Frontend logic and user interaction                     |
| **Backend**            | Node.js            | Runs JavaScript on the server                           |
| **Backend Framework**  | Express.js         | Creates REST APIs and handles requests                  |
| **Authentication**     | JWT                | Secure user authentication/session                      |
| **Password Security**  | bcryptjs           | Hashes passwords                                        |
| **Email Verification** | Nodemailer         | Sends OTP emails                                        |
| **OTP Security**       | SHA-256 / crypto   | Hashes OTP before storage                               |
| **Data Storage**       | JSON (`data.json`) | Stores users, issues and notifications in the prototype |
| **Configuration**      | `.env`             | Stores secrets and server configuration                 |
| **Package Management** | npm                | Installs and manages Node.js packages                   |

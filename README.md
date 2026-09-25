# Smart Campus Issue Management Portal — WEB-01

A hackathon-ready prototype for the problem statement:

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
- JSON persistence for easy hackathon setup

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

## 3. Real email verification

Copy `.env.example` to `.env` and configure SMTP.

For Gmail:
1. Turn on 2-Step Verification for the sending Google account.
2. Create a Google App Password.
3. Put the App Password in `SMTP_PASS`.
4. Put the Gmail address in `SMTP_USER` and `FROM_EMAIL`.

Example:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=youraccount@gmail.com
SMTP_PASS=your_16_character_app_password
FROM_EMAIL=youraccount@gmail.com
JWT_SECRET=replace_with_a_long_random_secret
PORT=3000
```

Restart the server after changing `.env`.

If SMTP is not configured, the app runs in DEMO mode and prints the OTP in the terminal. This lets the team test the complete flow without an email provider.

## Demo flow for judges

1. Create a student account.
2. Show the verification OTP email / terminal demo.
3. Verify email.
4. Login as the student.
5. Report a Wi-Fi or projector issue.
6. Login as admin.
7. Assign the issue to the staff account.
8. Login as staff and change status to In Progress.
9. Change it to Resolved.
10. Return to admin and show analytics.

## Important production upgrades

For a real college deployment, replace the JSON file with PostgreSQL/MySQL, use HTTPS, secure cookies or a production-grade token strategy, cloud object storage for images, rate limiting, audit logs, password reset, stronger validation, and institutional email/SSO.


## Dashboard update
- Admin dashboard shows total staff, staff currently working, issues in progress, and completed issues.
- Staff dashboard shows assigned, in-progress, completed, and total assigned issues.
- Admin and staff issue views display the full issue description.
- Analytics are calculated from real submitted issues in `data.json`; no fabricated report data is added.

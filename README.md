# SmartApply Backend — Deployment Guide
### Venkata Ramana Bommedi · venkataramanabommedi@gmail.com

---

## What this does

Every time you approve and submit a job application, this server:
1. Saves it to a database
2. Sends a real confirmation email to your Gmail instantly
3. Automatically sends a 7-day follow-up reminder if no response
4. Sends a weekly digest every Monday at 8am

---

## Step 1 — Get your Gmail App Password (5 minutes)

> You CANNOT use your regular Gmail password. You need an App Password.

1. Go to **myaccount.google.com**
2. Click **Security** in the left menu
3. Under "How you sign in to Google" → click **2-Step Verification** (enable it if off)
4. Scroll down → click **App passwords**
5. Under "Select app" choose **Mail**
6. Under "Select device" choose **Other** → type `SmartApply`
7. Click **Generate**
8. Copy the **16-character password** shown (e.g. `abcd efgh ijkl mnop`)
9. Save it — you only see it once

---

## Step 2 — Deploy to Railway (free, 10 minutes)

### 2a. Push code to GitHub

```bash
# On your computer, open terminal:
cd smartapply
git init
git add .
git commit -m "SmartApply backend initial commit"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/smartapply-backend.git
git push -u origin main
```

### 2b. Deploy on Railway

1. Go to **railway.app** and sign up (free with GitHub)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `smartapply-backend` repo
4. Railway auto-detects Node.js and starts deploying
5. Wait ~2 minutes for the build to finish

### 2c. Add environment variables in Railway

In your Railway project → click your service → **Variables** tab → add each one:

| Variable | Value |
|---|---|
| `GMAIL_USER` | `venkataramanabommedi@gmail.com` |
| `GMAIL_APP_PASSWORD` | your 16-char app password (no spaces) |
| `NOTIFY_EMAIL` | `venkataramanabommedi@gmail.com` |
| `CC_EMAIL` | (leave blank or add a backup email) |

Click **Deploy** after adding variables.

### 2d. Get your live URL

Railway gives you a URL like: `https://smartapply-backend-production.up.railway.app`

Copy this URL — you'll use it in Step 3.

---

## Step 3 — Test your email (30 seconds)

Open your browser or Postman and call:

```
POST https://YOUR-RAILWAY-URL/api/test-email
```

You should receive an email in your Gmail within seconds.

**If it fails**, the response will tell you exactly why:
- `Invalid login` → check your App Password
- `Username and Password not accepted` → make sure 2FA is enabled on your Google account

---

## Step 4 — Connect the dashboard

In the SmartApply dashboard (the Claude artifact), go to **Settings** and paste your Railway URL into the "Backend API URL" field. Now every time you click Submit, it calls your real server and sends a real email.

Or call the API directly from any app:

```javascript
// Submit one application
const response = await fetch('https://YOUR-RAILWAY-URL/api/apply', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    job_title: 'Data Analyst',
    company: 'Contentful',
    country: 'Germany',
    work_type: 'Remote',
    stage: 'Series B',
    funding: '$175M',
    match_score: 91,
    ats_score: 88
  })
});
const result = await response.json();
// result.ref = "SA-3F9A2B1C"
// result.email_status = "sent"
```

---

## API Reference

| Method | Endpoint | What it does |
|---|---|---|
| `GET` | `/api/health` | Check server is running |
| `POST` | `/api/apply` | Submit 1 application + send confirmation email |
| `POST` | `/api/apply/bulk` | Submit multiple applications at once |
| `GET` | `/api/applications` | Get all your applications |
| `GET` | `/api/applications/:ref` | Get one application by reference |
| `PATCH` | `/api/applications/:ref/status` | Update status (interview, offer, etc.) |
| `POST` | `/api/applications/:ref/followup` | Send follow-up email manually |
| `GET` | `/api/emails` | Get email send history |
| `GET` | `/api/stats` | Dashboard statistics |
| `POST` | `/api/test-email` | Send a test email to verify setup |

---

## Automated emails schedule

| Email | When sent |
|---|---|
| Confirmation | Instantly after every approved submission |
| 7-day follow-up | Automatically if no reply after 7 days |
| Weekly digest | Every Monday at 8:00am |

---

## Run locally (optional)

```bash
npm install
cp .env.example .env
# Edit .env with your Gmail credentials
npm run dev
# Server runs at http://localhost:3000
```

---

## Free tier limits on Railway

Railway's free Hobby plan gives you:
- 500 hours/month (enough for 24/7 running)
- 1GB RAM
- Unlimited API calls
- Custom domain support

Your SQLite database stores all applications locally in the Railway volume. It persists between deployments.

---

## Troubleshooting

**Email not arriving?**
1. Check spam folder first
2. Call `POST /api/test-email` and read the error response
3. Verify App Password has no spaces (Railway strips them automatically)
4. Make sure 2-Step Verification is ON in your Google account

**Railway build failing?**
- Make sure `package.json` is in the root folder
- Node version must be 18+

**Database errors?**
- Railway automatically creates the SQLite file on first run
- No setup needed

---

*Built for Venkata Ramana Bommedi — SmartApply v1.0*

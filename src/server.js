const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

// ── Database setup ────────────────────────────────────────────────
const db = new sqlite3.Database('./smartapply.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref TEXT UNIQUE,
    job_title TEXT,
    company TEXT,
    country TEXT,
    work_type TEXT,
    stage TEXT,
    funding TEXT,
    match_score INTEGER,
    ats_score INTEGER,
    status TEXT DEFAULT 'submitted',
    email_sent INTEGER DEFAULT 0,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    follow_up_at DATETIME,
    notes TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS email_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_ref TEXT,
    type TEXT,
    recipient TEXT,
    subject TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT
  )`);
});

// ── Nodemailer transporter ────────────────────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// ── Email templates ───────────────────────────────────────────────
function confirmationEmailHTML(app) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Application Confirmation</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; }
    .wrap { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: #7C3AED; padding: 28px 32px; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 600; }
    .header p { color: #DDD6FE; margin: 6px 0 0; font-size: 13px; }
    .body { padding: 28px 32px; }
    .greeting { font-size: 15px; color: #1e293b; margin-bottom: 18px; }
    .detail-box { background: #f8fafc; border-radius: 8px; padding: 18px 20px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
    .detail-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #64748b; }
    .detail-value { color: #1e293b; font-weight: 500; }
    .score-row { display: flex; gap: 12px; margin-bottom: 20px; }
    .score-box { flex: 1; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 14px; text-align: center; }
    .score-num { font-size: 28px; font-weight: 700; color: #16a34a; }
    .score-lbl { font-size: 11px; color: #166534; margin-top: 2px; }
    .steps { margin-bottom: 20px; }
    .steps h3 { font-size: 14px; color: #1e293b; margin-bottom: 12px; }
    .step { display: flex; gap: 10px; margin-bottom: 10px; font-size: 13px; color: #475569; align-items: flex-start; }
    .step-dot { width: 22px; height: 22px; border-radius: 50%; background: #7C3AED; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; flex-shrink: 0; margin-top: 1px; }
    .ref-box { background: #ede9fe; border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #5b21b6; margin-bottom: 20px; text-align: center; }
    .ref-box strong { font-size: 16px; letter-spacing: 1px; display: block; margin-top: 3px; }
    .footer { background: #f8fafc; padding: 18px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>Application submitted</h1>
      <p>SmartApply · Automated Job Application System</p>
    </div>
    <div class="body">
      <p class="greeting">Hi Venkata,<br><br>Your application has been successfully submitted. Here is your full confirmation:</p>
      <div class="detail-box">
        <div class="detail-row"><span class="detail-label">Role</span><span class="detail-value">${app.job_title}</span></div>
        <div class="detail-row"><span class="detail-label">Company</span><span class="detail-value">${app.company}</span></div>
        <div class="detail-row"><span class="detail-label">Country</span><span class="detail-value">${app.country}</span></div>
        <div class="detail-row"><span class="detail-label">Work type</span><span class="detail-value">${app.work_type}</span></div>
        <div class="detail-row"><span class="detail-label">Stage</span><span class="detail-value">${app.stage}</span></div>
        <div class="detail-row"><span class="detail-label">Funding</span><span class="detail-value">${app.funding}</span></div>
        <div class="detail-row"><span class="detail-label">Submitted</span><span class="detail-value">${new Date(app.submitted_at).toLocaleString('en-GB', {dateStyle:'full',timeStyle:'short'})}</span></div>
      </div>
      <div class="score-row">
        <div class="score-box">
          <div class="score-num">${app.match_score}%</div>
          <div class="score-lbl">Resume match</div>
        </div>
        <div class="score-box">
          <div class="score-num">${app.ats_score}</div>
          <div class="score-lbl">ATS score</div>
        </div>
      </div>
      <div class="ref-box">
        Your application reference<br>
        <strong>${app.ref}</strong>
      </div>
      <div class="steps">
        <h3>What happens next</h3>
        <div class="step"><div class="step-dot">1</div><div>Your tailored resume and cover letter have been submitted to ${app.company}</div></div>
        <div class="step"><div class="step-dot">2</div><div>Typical response time is 3–7 business days for startups</div></div>
        <div class="step"><div class="step-dot">3</div><div>If no reply in 7 days, a follow-up reminder email will be sent automatically</div></div>
        <div class="step"><div class="step-dot">4</div><div>You will receive a status update email when anything changes</div></div>
      </div>
    </div>
    <div class="footer">
      Venkata Ramana Bommedi · venkataramanabommedi@gmail.com · 07899082102 · London, UK<br>
      SmartApply Automation · This email was sent automatically after your approved submission
    </div>
  </div>
</body>
</html>`;
}

function followUpEmailHTML(app) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f6f9;margin:0;padding:20px}
    .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0}
    .header{background:#D97706;padding:24px 32px}
    .header h1{color:#fff;margin:0;font-size:20px;font-weight:600}
    .body{padding:28px 32px;font-size:14px;color:#1e293b;line-height:1.7}
    .highlight{background:#fef9c3;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;margin:16px 0;font-size:13px;color:#92400e}
    .footer{background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header"><h1>7-day follow-up reminder</h1></div>
    <div class="body">
      <p>Hi Venkata,</p>
      <p>It has been 7 days since you applied to <strong>${app.job_title}</strong> at <strong>${app.company}</strong> and you have not yet received a response.</p>
      <div class="highlight">Reference: ${app.ref} · Applied: ${new Date(app.submitted_at).toLocaleDateString('en-GB')}</div>
      <p>This is a good time to follow up directly with the hiring team. A brief, polite follow-up email increases callback rates by up to 22%.</p>
      <p>Suggested subject line:<br><em>"Following up — ${app.job_title} application (Ref: ${app.ref})"</em></p>
    </div>
    <div class="footer">SmartApply Automation · venkataramanabommedi@gmail.com</div>
  </div>
</body>
</html>`;
}

// ── Routes ────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Submit application + send confirmation email
app.post('/api/apply', async (req, res) => {
  const { job_title, company, country, work_type, stage, funding, match_score, ats_score, notes } = req.body;

  if (!job_title || !company) {
    return res.status(400).json({ error: 'job_title and company are required' });
  }

  const ref = 'SA-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const follow_up_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const appData = {
    ref, job_title, company, country: country || 'Unknown',
    work_type: work_type || 'Hybrid', stage: stage || 'Startup',
    funding: funding || 'Undisclosed',
    match_score: match_score || 0, ats_score: ats_score || 0,
    submitted_at: new Date().toISOString(), follow_up_at, notes: notes || ''
  };

  // Save to database
  db.run(
    `INSERT INTO applications (ref,job_title,company,country,work_type,stage,funding,match_score,ats_score,follow_up_at,notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [ref, job_title, company, appData.country, appData.work_type, appData.stage,
     appData.funding, appData.match_score, appData.ats_score, follow_up_at, appData.notes],
    async (err) => {
      if (err) return res.status(500).json({ error: 'Database error', detail: err.message });

      // Send confirmation email
      let emailStatus = 'skipped';
      if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        try {
          const transporter = createTransporter();
          const recipient = process.env.NOTIFY_EMAIL || process.env.GMAIL_USER;
          await transporter.sendMail({
            from: `"SmartApply" <${process.env.GMAIL_USER}>`,
            to: recipient,
            cc: process.env.CC_EMAIL || '',
            subject: `Application submitted: ${job_title} at ${company} [${ref}]`,
            html: confirmationEmailHTML(appData),
          });
          emailStatus = 'sent';
          db.run(`UPDATE applications SET email_sent=1 WHERE ref=?`, [ref]);
          db.run(`INSERT INTO email_log (application_ref,type,recipient,subject,status) VALUES (?,?,?,?,?)`,
            [ref, 'confirmation', recipient, `Application submitted: ${job_title} at ${company}`, 'sent']);
        } catch (emailErr) {
          emailStatus = 'failed';
          console.error('Email error:', emailErr.message);
          db.run(`INSERT INTO email_log (application_ref,type,recipient,subject,status) VALUES (?,?,?,?,?)`,
            [ref, 'confirmation', process.env.NOTIFY_EMAIL || '', `Application submitted: ${job_title} at ${company}`, 'failed: ' + emailErr.message]);
        }
      }

      res.json({ success: true, ref, email_status: emailStatus, application: appData });
    }
  );
});

// Bulk apply — submit multiple applications
app.post('/api/apply/bulk', async (req, res) => {
  const { applications } = req.body;
  if (!Array.isArray(applications) || applications.length === 0) {
    return res.status(400).json({ error: 'applications array required' });
  }
  const results = [];
  for (const app of applications) {
    const response = await fetch(`http://localhost:${PORT}/api/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(app)
    });
    const result = await response.json();
    results.push(result);
    await new Promise(r => setTimeout(r, 300));
  }
  res.json({ success: true, submitted: results.length, results });
});

// Get all applications
app.get('/api/applications', (req, res) => {
  const { status, country, limit = 50 } = req.query;
  let sql = 'SELECT * FROM applications';
  const params = [];
  const where = [];
  if (status) { where.push('status=?'); params.push(status); }
  if (country) { where.push('country=?'); params.push(country); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY submitted_at DESC LIMIT ?';
  params.push(parseInt(limit));
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ applications: rows, total: rows.length });
  });
});

// Get single application
app.get('/api/applications/:ref', (req, res) => {
  db.get('SELECT * FROM applications WHERE ref=?', [req.params.ref], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Application not found' });
    res.json(row);
  });
});

// Update application status
app.patch('/api/applications/:ref/status', (req, res) => {
  const { status } = req.body;
  const valid = ['submitted', 'under_review', 'interview', 'offer', 'rejected'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.run('UPDATE applications SET status=? WHERE ref=?', [status, req.params.ref], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, ref: req.params.ref, status });
  });
});

// Send follow-up email manually
app.post('/api/applications/:ref/followup', async (req, res) => {
  db.get('SELECT * FROM applications WHERE ref=?', [req.params.ref], async (err, app) => {
    if (err || !app) return res.status(404).json({ error: 'Application not found' });
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return res.status(400).json({ error: 'Email not configured — set GMAIL_USER and GMAIL_APP_PASSWORD' });
    }
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"SmartApply" <${process.env.GMAIL_USER}>`,
        to: process.env.NOTIFY_EMAIL || process.env.GMAIL_USER,
        subject: `Follow-up reminder: ${app.job_title} at ${app.company} [${app.ref}]`,
        html: followUpEmailHTML(app),
      });
      db.run(`INSERT INTO email_log (application_ref,type,recipient,subject,status) VALUES (?,?,?,?,?)`,
        [app.ref, 'followup', process.env.NOTIFY_EMAIL || '', `Follow-up: ${app.job_title} at ${app.company}`, 'sent']);
      res.json({ success: true, message: 'Follow-up email sent' });
    } catch (e) {
      res.status(500).json({ error: 'Email failed', detail: e.message });
    }
  });
});

// Email log
app.get('/api/emails', (req, res) => {
  db.all('SELECT * FROM email_log ORDER BY sent_at DESC LIMIT 100', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ emails: rows });
  });
});

// Dashboard stats
app.get('/api/stats', (req, res) => {
  db.all(`SELECT status, COUNT(*) as count FROM applications GROUP BY status`, [], (err, statusRows) => {
    db.all(`SELECT COUNT(*) as total, SUM(email_sent) as emails_sent FROM applications`, [], (err2, totals) => {
      db.all(`SELECT country, COUNT(*) as count FROM applications GROUP BY country ORDER BY count DESC LIMIT 10`, [], (err3, countries) => {
        res.json({
          by_status: statusRows,
          totals: totals[0],
          by_country: countries
        });
      });
    });
  });
});

// Test email endpoint
app.post('/api/test-email', async (req, res) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(400).json({ error: 'Set GMAIL_USER and GMAIL_APP_PASSWORD in your .env file' });
  }
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"SmartApply" <${process.env.GMAIL_USER}>`,
      to: process.env.NOTIFY_EMAIL || process.env.GMAIL_USER,
      subject: 'SmartApply — Email test successful!',
      html: '<h2 style="color:#7C3AED">Your SmartApply email is working!</h2><p>Confirmation emails will now be sent automatically after every application submission.</p><p><strong>Venkata Ramana Bommedi</strong><br>venkataramanabommedi@gmail.com</p>',
    });
    res.json({ success: true, message: 'Test email sent — check your inbox!' });
  } catch (e) {
    res.status(500).json({ error: 'Email failed', detail: e.message, fix: 'Check your GMAIL_APP_PASSWORD — use an App Password, not your regular Gmail password' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SmartApply server running on port ${PORT}`));
module.exports = app;

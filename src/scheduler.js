const cron = require('node-cron');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const db = new sqlite3.Database('./smartapply.db');

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

function followUpHTML(app) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f6f9;margin:0;padding:20px}
  .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0}
  .header{background:#D97706;padding:24px 32px}
  .header h1{color:#fff;margin:0;font-size:20px;font-weight:600}
  .header p{color:#FEF3C7;margin:5px 0 0;font-size:13px}
  .body{padding:28px 32px;font-size:14px;color:#1e293b;line-height:1.7}
  .box{background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin:16px 0;font-size:13px;color:#92400e}
  .tip{background:#ede9fe;border:1px solid #c4b5fd;border-radius:8px;padding:14px 18px;margin:16px 0;font-size:13px;color:#5b21b6}
  .footer{background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center}
</style></head>
<body><div class="wrap">
  <div class="header">
    <h1>7-day follow-up reminder</h1>
    <p>SmartApply Automation</p>
  </div>
  <div class="body">
    <p>Hi Venkata,</p>
    <p>It has been <strong>7 days</strong> since you applied to <strong>${app.job_title}</strong> at <strong>${app.company}</strong> and you have not yet received a response.</p>
    <div class="box">
      Reference: <strong>${app.ref}</strong><br>
      Applied on: ${new Date(app.submitted_at).toLocaleDateString('en-GB', {weekday:'long',year:'numeric',month:'long',day:'numeric'})}<br>
      Country: ${app.country} &nbsp;·&nbsp; Match score: ${app.match_score}%
    </div>
    <p>A brief follow-up email increases callback rates by up to <strong>22%</strong>. Here is a ready-to-send message:</p>
    <div class="tip">
      <strong>Subject:</strong> Following up — ${app.job_title} application (Ref: ${app.ref})<br><br>
      Dear Hiring Team,<br><br>
      I wanted to briefly follow up on my application for the ${app.job_title} role submitted on ${new Date(app.submitted_at).toLocaleDateString('en-GB')}. I remain very interested in the opportunity and would welcome the chance to discuss how my background in data analytics and Salesforce CRM can contribute to ${app.company}.<br><br>
      Please let me know if you need any additional information.<br><br>
      Best regards,<br>
      Venkata Ramana Bommedi<br>
      venkataramanabommedi@gmail.com · 07899082102
    </div>
  </div>
  <div class="footer">SmartApply · Automated follow-up · venkataramanabommedi@gmail.com</div>
</div></body></html>`;
}

function weeklyDigestHTML(stats, apps) {
  const rows = apps.map(a => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${a.job_title}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${a.company}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${a.country}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">
        <span style="background:${a.status==='offer'?'#dcfce7':a.status==='interview'?'#ede9fe':a.status==='rejected'?'#fee2e2':'#dbeafe'};
          color:${a.status==='offer'?'#166534':a.status==='interview'?'#5b21b6':a.status==='rejected'?'#991b1b':'#1e40af'};
          padding:2px 8px;border-radius:10px;font-size:11px;font-weight:500">
          ${a.status.replace('_',' ')}
        </span>
      </td>
    </tr>`).join('');

  return `
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f6f9;margin:0;padding:20px}
  .wrap{max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0}
  .header{background:#7C3AED;padding:24px 32px}
  .header h1{color:#fff;margin:0;font-size:20px;font-weight:600}
  .header p{color:#DDD6FE;margin:5px 0 0;font-size:13px}
  .body{padding:28px 32px}
  .stats{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap}
  .stat{flex:1;min-width:100px;background:#f8fafc;border-radius:8px;padding:14px;text-align:center;border:1px solid #e2e8f0}
  .stat-num{font-size:26px;font-weight:700;color:#7C3AED}
  .stat-lbl{font-size:11px;color:#64748b;margin-top:2px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;padding:8px 12px;border-bottom:2px solid #e2e8f0;color:#64748b;font-weight:500}
  .footer{background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center}
</style></head>
<body><div class="wrap">
  <div class="header">
    <h1>Weekly application digest</h1>
    <p>Week ending ${new Date().toLocaleDateString('en-GB',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
  </div>
  <div class="body">
    <p style="font-size:14px;color:#1e293b;margin-bottom:20px">Hi Venkata, here is your weekly job application summary:</p>
    <div class="stats">
      <div class="stat"><div class="stat-num">${stats.total||0}</div><div class="stat-lbl">Total applied</div></div>
      <div class="stat"><div class="stat-num" style="color:#D97706">${stats.review||0}</div><div class="stat-lbl">Under review</div></div>
      <div class="stat"><div class="stat-num" style="color:#5B21B6">${stats.interview||0}</div><div class="stat-lbl">Interviews</div></div>
      <div class="stat"><div class="stat-num" style="color:#16A34A">${stats.offer||0}</div><div class="stat-lbl">Offers</div></div>
    </div>
    <table>
      <thead><tr><th>Role</th><th>Company</th><th>Country</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="footer">SmartApply · Weekly digest · venkataramanabommedi@gmail.com</div>
</div></body></html>`;
}

// Run every day at 9am — check for 7-day follow-ups
cron.schedule('0 9 * * *', async () => {
  console.log('[CRON] Checking for 7-day follow-ups…');
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return;

  db.all(
    `SELECT * FROM applications
     WHERE status = 'submitted'
     AND email_sent = 1
     AND follow_up_at <= datetime('now')
     AND ref NOT IN (SELECT application_ref FROM email_log WHERE type='followup')`,
    [],
    async (err, apps) => {
      if (err || !apps.length) return;
      console.log(`[CRON] Sending ${apps.length} follow-up email(s)`);
      const transporter = createTransporter();
      for (const app of apps) {
        try {
          await transporter.sendMail({
            from: `"SmartApply" <${process.env.GMAIL_USER}>`,
            to: process.env.NOTIFY_EMAIL || process.env.GMAIL_USER,
            subject: `Follow-up reminder: ${app.job_title} at ${app.company} [${app.ref}]`,
            html: followUpHTML(app),
          });
          db.run(`INSERT INTO email_log (application_ref,type,recipient,subject,status) VALUES (?,?,?,?,?)`,
            [app.ref, 'followup', process.env.NOTIFY_EMAIL || '', `Follow-up: ${app.job_title} at ${app.company}`, 'sent']);
          console.log(`[CRON] Follow-up sent for ${app.ref}`);
        } catch (e) {
          console.error(`[CRON] Follow-up failed for ${app.ref}:`, e.message);
        }
      }
    }
  );
});

// Run every Monday at 8am — weekly digest
cron.schedule('0 8 * * 1', async () => {
  console.log('[CRON] Sending weekly digest…');
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return;

  db.all(`SELECT * FROM applications ORDER BY submitted_at DESC LIMIT 50`, [], async (err, apps) => {
    if (err || !apps.length) return;
    const stats = {
      total: apps.length,
      review: apps.filter(a => a.status === 'under_review').length,
      interview: apps.filter(a => a.status === 'interview').length,
      offer: apps.filter(a => a.status === 'offer').length,
    };
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"SmartApply" <${process.env.GMAIL_USER}>`,
        to: process.env.NOTIFY_EMAIL || process.env.GMAIL_USER,
        subject: `Weekly digest — ${stats.total} applications, ${stats.interview} interviews, ${stats.offer} offers`,
        html: weeklyDigestHTML(stats, apps),
      });
      console.log('[CRON] Weekly digest sent');
    } catch (e) {
      console.error('[CRON] Digest failed:', e.message);
    }
  });
});

console.log('[CRON] Scheduler started — follow-ups at 9am daily, digest every Monday 8am');
module.exports = { followUpHTML, weeklyDigestHTML };

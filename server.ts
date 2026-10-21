import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// ----------------------------------------------------------------------
// SERVER-SIDE EMAIL SERVICE (Secure & decoupled from frontend secrets)
// ----------------------------------------------------------------------
interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

function getEmailProviderInfo() {
  const resendKey = process.env.RESEND_API_KEY;
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;

  if (resendKey && resendKey.trim().length > 5) {
    return {
      configured: true,
      provider: 'resend',
      senderName: process.env.EMAIL_FROM_NAME || 'MukiSoft Assist',
      senderEmail: process.env.EMAIL_FROM_ADDRESS || 'no-reply@mukisoft.com',
      supportEmail: process.env.EMAIL_SUPPORT_ADDRESS || 'support@mukisoft.com',
    };
  }

  if (smtpHost && smtpUser) {
    return {
      configured: true,
      provider: 'smtp',
      senderName: process.env.EMAIL_FROM_NAME || 'MukiSoft Assist',
      senderEmail: process.env.EMAIL_FROM_ADDRESS || 'no-reply@mukisoft.com',
      supportEmail: process.env.EMAIL_SUPPORT_ADDRESS || 'support@mukisoft.com',
    };
  }

  return {
    configured: false,
    provider: 'sandbox',
    senderName: process.env.EMAIL_FROM_NAME || 'MukiSoft Assist',
    senderEmail: process.env.EMAIL_FROM_ADDRESS || 'no-reply@mukisoft.com',
    supportEmail: process.env.EMAIL_SUPPORT_ADDRESS || 'support@mukisoft.com',
  };
}

async function sendEmailServer(payload: SendEmailPayload): Promise<{ success: boolean; messageId?: string; error?: string; simulated?: boolean; unconfigured?: boolean }> {
  const provider = getEmailProviderInfo();

  if (!payload.to || !payload.subject || !payload.html) {
    return { success: false, error: 'ইমেইলের ঠিকানা, বিষয় ও বডি আবশ্যক।' };
  }

  // 1. Resend REST API
  if (provider.provider === 'resend') {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${provider.senderName} <${provider.senderEmail}>`,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          reply_to: payload.replyTo || provider.supportEmail,
        }),
      });

      const data = (await res.json()) as { id?: string; message?: string };
      if (!res.ok) {
        return { success: false, error: data?.message || 'ইমেইল ডেলিভারি ব্যর্থ হয়েছে (Resend API Error)' };
      }
      return { success: true, messageId: data.id };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'অজ্ঞাত নেটওয়ার্ক ত্রুটি';
      return { success: false, error: errMsg };
    }
  }

  // 2. Unconfigured Provider Handler
  // When no provider credentials exist, do NOT pretend email has been sent.
  console.log(`[Email Unconfigured] Dispatch to: ${payload.to} | Subject: ${payload.subject} (No email provider configured)`);
  return {
    success: false,
    unconfigured: true,
    error: 'ইমেইল প্রোভাইডার কনফিগার করা হয়নি। সার্ভারে RESEND_API_KEY এনভায়রনমেন্ট ভেরিয়েবল সেট করুন। ইন-অ্যাপ নোটিফিকেশন স্বাভাবিকভাবে ডেলিভার হয়েছে।',
  };
}

// ----------------------------------------------------------------------
// API ROUTES
// ----------------------------------------------------------------------

// Provider status check
app.get('/api/email/status', (_req, res) => {
  const info = getEmailProviderInfo();
  res.json({
    ...info,
    timestamp: new Date().toISOString(),
  });
});

// Admin test email dispatcher
app.post('/api/email/send-test', async (req, res) => {
  const { to, subject, html, text } = req.body;
  if (!to) {
    return res.status(400).json({ success: false, error: 'প্রাপকের ইমেইল ঠিকানা প্রদান করুন।' });
  }

  const result = await sendEmailServer({
    to,
    subject: subject || 'MukiSoft Assist টেস্ট ইমেইল',
    html: html || '<p>MukiSoft Assist প্ল্যাটফর্ম থেকে সফলভাবে পরীক্ষামূলক ইমেইল প্রেরিত হয়েছে।</p>',
    text: text || 'MukiSoft Assist প্ল্যাটফর্ম টেস্ট ইমেইল।',
  });

  return res.json(result);
});

// Outbox batch / single dispatcher
app.post('/api/email/dispatch', async (req, res) => {
  const { recipientEmail, subject, html, text } = req.body;
  if (!recipientEmail || !subject || !html) {
    return res.status(400).json({ success: false, error: 'প্রয়োজনীয় ফিল্ড অনুপস্থিত।' });
  }

  const result = await sendEmailServer({
    to: recipientEmail,
    subject,
    html,
    text,
  });

  return res.json(result);
});

// ----------------------------------------------------------------------
// VITE DEV MIDDLEWARE / STATIC SERVING
// ----------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MukiSoft Assist server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// ----------------------------------------------------------------------
// CENTRAL AI CONFIGURATION & PERSISTENCE
// ----------------------------------------------------------------------
const AI_CONFIG_FILE = path.resolve(__dirname, '.ai_config.json');
let centralAiApiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY || process.env.XAI_API_KEY || '';
let activeGroqModel = 'openai/gpt-oss-120b';

try {
  if (fs.existsSync(AI_CONFIG_FILE)) {
    const raw = fs.readFileSync(AI_CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.apiKey && typeof parsed.apiKey === 'string') {
      centralAiApiKey = parsed.apiKey.trim();
    }
    if (parsed.model && typeof parsed.model === 'string') {
      activeGroqModel = parsed.model.trim();
    }
  }
} catch (e) {
  console.warn('Could not read .ai_config.json:', e);
}

const GROQ_CANDIDATE_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant'
];

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
// ADMIN AI CONFIGURATION ENDPOINTS (Centralized backend key storage)
// ----------------------------------------------------------------------
app.get('/api/admin/ai-key-status', (_req, res) => {
  const activeKey = process.env.GROQ_API_KEY || centralAiApiKey;
  res.json({
    configured: Boolean(activeKey && activeKey.trim().length > 5),
    maskedKey: activeKey && activeKey.length > 8 ? `${activeKey.substring(0, 7)}...${activeKey.slice(-4)}` : null,
    activeModel: activeGroqModel,
  });
});

app.post('/api/admin/set-ai-key', (req, res) => {
  try {
    const { apiKey, model } = req.body || {};
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 5) {
      return res.status(400).json({ success: false, error: 'সঠিক API Key প্রদান করুন।' });
    }

    centralAiApiKey = apiKey.trim();
    if (model && typeof model === 'string') {
      activeGroqModel = model.trim();
    }

    try {
      fs.writeFileSync(AI_CONFIG_FILE, JSON.stringify({
        apiKey: centralAiApiKey,
        model: activeGroqModel,
        updatedAt: new Date().toISOString(),
      }, null, 2), 'utf-8');
    } catch (fsErr) {
      console.warn('Could not persist to .ai_config.json:', fsErr);
    }

    return res.json({
      success: true,
      message: 'MukiSoft AI সেন্ট্রাল API Key সফলভাবে সংরক্ষিত হয়েছে। সকল ভিজিটর ও গ্রাহকের জন্য AI সহকারী সক্রিয় রয়েছে।',
      activeModel: activeGroqModel,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'অজ্ঞাত ত্রুটি';
    return res.status(500).json({ success: false, error: msg });
  }
});

// ----------------------------------------------------------------------
// GROQ / GROK AI CHAT ENDPOINT (GroqCloud & xAI Integration)
// ----------------------------------------------------------------------
app.post('/api/chat/grok', async (req, res) => {
  try {
    const { message, history = [], services = [], categories = [], customApiKey, model } = req.body || {};

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'মেসেজ আবশ্যক।' });
    }

    // Always prefer the central server-side key so users never need to supply or see any key
    const rawKey = process.env.GROQ_API_KEY || centralAiApiKey || customApiKey || process.env.GROK_API_KEY || process.env.XAI_API_KEY;

    if (!rawKey || rawKey.trim().length < 5) {
      return res.json({
        success: false,
        unconfigured: true,
        reply: 'MukiSoft AI সহকারী সক্রিয় করতে অ্যাডমিন প্ল্যাটফর্ম সেটিংস থেকে আপনার AI API Key যুক্ত করুন। অথবা কোনো কর্মকর্তার সাথে সরাসরি কথা বলতে নিচের "লাইভ এজেন্ট ডাকুন" বোতামে চাপ দিন।',
      });
    }

    const key = rawKey.trim();
    const isGroq = key.startsWith('gsk_') ||
      Boolean(process.env.GROQ_API_KEY) ||
      (model && (model.includes('llama') || model.includes('mixtral') || model.includes('gemma') || model.includes('oss') || model.includes('qwen')));

    const endpoint = isGroq
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.x.ai/v1/chat/completions';

    // Auto-assign candidate model list for Groq
    const groqModelsToTry = [
      activeGroqModel,
      ...GROQ_CANDIDATE_MODELS.filter((m) => m !== activeGroqModel),
    ];

    const servicesContext = services.map((s: any) => {
      const price = s.promotional_price ? `৳${s.promotional_price} (অফারে, মূল মূল্য ৳${s.price})` : `৳${s.price}`;
      return `• [${s.title_bn || s.title}]: বিভাগ: ${s.category?.name_bn || s.category?.name || 'সাধারণ'}, ফি: ${price}, ডেলিভারি: ${s.delivery_days} দিন, লিঙ্ক: /service/${s.slug}, বিবরণ: ${s.description_bn || s.description || 'N/A'}`;
    }).join('\n');

    const categoriesContext = categories.map((c: any) => `• ${c.name_bn || c.name} (/category/${c.slug})`).join(', ');

    const systemPrompt = `You are "MukiSoft AI সহকারী", the official expert technical consultant and sales specialist for "MukiSoft Assist" (service.mukisoft.tech) in Bangladesh.

WEBSITE KNOWLEDGE BASE & SERVICES DATABASE:
Available Service Categories:
${categoriesContext}

Live Services Catalog:
${servicesContext || 'No services currently listed in database.'}

PLATFORM CORE POLICIES:
- Payment methods: bKash, Nagad, Rocket, Bank Transfer.
- 100% Escrow-backed wallet protection: payments are held securely until delivery is approved.
- Clients can track progress in real-time, submit requirements, and request revisions directly on their dashboard.
- Link format for services: /service/{slug} (e.g. /service/website-development)
- Link for all services: /services
- Link for wallet deposit: /dashboard/wallet

STRICT INSTRUCTIONS:
1. Always identify yourself strictly as "MukiSoft AI সহকারী" (মুকিসফট এআই সহকারী). NEVER mention or acknowledge underlying technologies, architectures, or providers such as Groq, Grok, Llama, Meta, OpenAI, xAI, etc.
2. Always respond in fluent, polite, friendly, and natural Bengali (বাংলা).
3. Carefully analyze what the user is asking for.
4. Recommend ONLY the most relevant, exact services from our live database with their prices in BDT (৳) and delivery times.
5. Provide direct markdown links to the services using format: [সার্ভিসের নাম](/service/{slug}).
6. If the user indicates they want human assistance, advise them to click the "লাইভ এজেন্ট ডাকুন" button.
7. Be concise, professional, and helpful.`;

    const aiMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    if (Array.isArray(history) && history.length > 0) {
      history.slice(-6).forEach((h: any) => {
        aiMessages.push({
          role: h.sender_type === 'customer' ? 'user' : 'assistant',
          content: h.message || '',
        });
      });
    }

    aiMessages.push({ role: 'user', content: message.trim() });

    let data: any = null;
    let successfulModel = activeGroqModel;

    if (isGroq) {
      // Try candidate models in order until one succeeds
      for (const candidate of groqModelsToTry) {
        try {
          const aiRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: candidate,
              messages: aiMessages,
              temperature: 0.6,
              max_tokens: 1000,
            }),
          });

          if (aiRes.ok) {
            data = await aiRes.json();
            if (data?.choices?.[0]?.message?.content) {
              successfulModel = candidate;
              activeGroqModel = candidate;
              break;
            }
          }
        } catch {
          // continue to next model
        }
      }
    } else {
      // xAI Grok
      const aiRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'grok-beta',
          messages: aiMessages,
          temperature: 0.6,
          max_tokens: 1000,
        }),
      });
      data = await aiRes.json();
    }

    if (!data?.choices?.[0]?.message?.content) {
      const errMsg = data?.error?.message || '';
      return res.json({
        success: false,
        error: errMsg || 'AI API ত্রুটি।',
        reply: 'MukiSoft AI সহকারী থেকে এই মুহূর্তে সাড়া পাওয়া যায়নি। অনুগ্রহ করে আপনার প্রশ্নটি আবার লিখুন অথবা মানুষের সাথে সরাসরি কথা বলতে "লাইভ এজেন্ট ডাকুন" চাপুন।',
      });
    }

    const reply = data.choices?.[0]?.message?.content || 'কোনো উত্তর পাওয়া যায়নি।';

    const matchedServices = services.filter((s: any) => {
      const slugMatch = reply.includes(`/service/${s.slug}`);
      const titleMatch = (s.title_bn && reply.includes(s.title_bn)) || (s.title && reply.includes(s.title));
      return slugMatch || titleMatch;
    }).slice(0, 3);

    return res.json({
      success: true,
      reply,
      modelUsed: successfulModel,
      recommendedServices: matchedServices.map((s: any) => ({
        id: s.id,
        title: s.title,
        title_bn: s.title_bn,
        slug: s.slug,
        price: s.price,
        promotional_price: s.promotional_price,
        delivery_days: s.delivery_days,
      })),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'অজ্ঞাত সার্ভার ত্রুটি';
    return res.status(500).json({ success: false, error: errorMsg });
  }
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

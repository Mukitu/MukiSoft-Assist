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
// SEO SITEMAP & ROBOTS.TXT ENDPOINTS (Fixes Google Search Console "Sitemap is HTML" error)
// ----------------------------------------------------------------------
app.get('/sitemap.xml', (_req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://service.mukisoft.tech/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://service.mukisoft.tech/services</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://service.mukisoft.tech/blog</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://service.mukisoft.tech/how-it-works</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://service.mukisoft.tech/about</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://service.mukisoft.tech/contact</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;

  return res.send(sitemapXml);
});

app.get('/robots.txt', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://service.mukisoft.tech/sitemap.xml
`;

  return res.send(robotsTxt);
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

    const servicesContext = services.slice(0, 16).map((s: any) => {
      const price = s.promotional_price ? `৳${s.promotional_price}` : `৳${s.price}`;
      return `• ${s.title_bn || s.title} (${price}) -> /service/${s.slug}`;
    }).join('\n');

    const systemPrompt = `You are "MukiSoft AI সহকারী", a friendly, helpful human-like customer support specialist for "MukiSoft Assist" (service.mukisoft.tech) in Bangladesh.

SERVICES & PRICING:
${servicesContext || 'No services currently listed.'}

CORE RULES:
1. Tone & Persona: Speak naturally, warmly, and politely in clear Bengali (বাংলা), like a real human support consultant chatting on live messaging.
2. Short & Smart (CRITICAL): Keep every response concise — strictly 1 to 3 short sentences (around 20-45 words). Answer directly without essays, preamble, or repetition.
3. No Markdown Clutter (Anti-Slop): Never use horizontal dividers (---), ASCII designs, markdown headers (###), excessive bolding, or bloated bullet lists. Keep the text clean, elegant, and readable.
4. Recommendations: When suggesting a service, mention it naturally in a brief sentence with its direct link as [সার্ভিসের নাম](/service/{slug}).
5. Human Handoff: If the client requests human assistance, politely inform them to click the "লাইভ এজেন্ট ডাকুন" button.
6. Identity: Strictly "MukiSoft AI সহকারী". Never mention AI models, Groq, Meta, OpenAI, or technical backend details.`;

    const aiMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    if (Array.isArray(history) && history.length > 0) {
      history.slice(-4).forEach((h: any) => {
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
              temperature: 0.5,
              max_tokens: 220,
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
          temperature: 0.5,
          max_tokens: 220,
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

    let reply = (data.choices?.[0]?.message?.content || '').trim();
    // Clean up excessive markdown dividers or lines
    reply = reply
      .replace(/[-=_*#]{3,}/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!reply) {
      reply = 'ধন্যবাদ আপনার বার্তার জন্য! কীভাবে সাহায্য করতে পারি বলুন?';
    }

    const matchedServices = services.filter((s: any) => {
      const slugMatch = reply.includes(`/service/${s.slug}`);
      const titleMatch = (s.title_bn && reply.includes(s.title_bn)) || (s.title && reply.includes(s.title));
      return slugMatch || titleMatch;
    }).slice(0, 2);

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
// BLOG POST SERVER PERSISTENCE & SYNC (Ensures OpenGraph cards work 100%)
// ----------------------------------------------------------------------
const BLOG_POSTS_FILE = path.resolve(__dirname, '.blog_posts.json');

function getStoredBlogPosts(): any[] {
  try {
    if (fs.existsSync(BLOG_POSTS_FILE)) {
      const raw = fs.readFileSync(BLOG_POSTS_FILE, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch (err) {
    console.warn('Error reading .blog_posts.json:', err);
  }
  return [];
}

function saveStoredBlogPost(post: any) {
  try {
    const list = getStoredBlogPosts();
    const idx = list.findIndex((p: any) => p.id === post.id || p.slug === post.slug);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...post, updated_at: new Date().toISOString() };
    } else {
      list.unshift(post);
    }
    fs.writeFileSync(BLOG_POSTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error saving to .blog_posts.json:', err);
  }
}

// Blog Posts API Endpoints
app.get('/api/blog-posts', (_req, res) => {
  const posts = getStoredBlogPosts();
  res.json(posts);
});

app.post('/api/blog-posts', (req, res) => {
  const post = req.body;
  if (!post || (!post.title && !post.title_bn)) {
    return res.status(400).json({ error: 'Post title is required' });
  }
  saveStoredBlogPost(post);
  return res.json({ success: true, post });
});

app.delete('/api/blog-posts/:id', (req, res) => {
  const id = req.params.id;
  try {
    const list = getStoredBlogPosts().filter((p: any) => p.id !== id && p.slug !== id);
    fs.writeFileSync(BLOG_POSTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    return res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error deleting';
    return res.status(500).json({ error: msg });
  }
});

// ----------------------------------------------------------------------
// FACEBOOK & SOCIAL MEDIA OPENGRAPH INTERCEPTOR FOR BLOGS
// ----------------------------------------------------------------------
function injectOpenGraphTags(
  html: string,
  meta: { title: string; description: string; image: string; url: string }
): string {
  // 1. Remove all old titles
  let cleaned = html.replace(/<title[\s\S]*?<\/title>/gi, '');
  // 2. Remove all old description meta tags
  cleaned = cleaned.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
  // 3. Remove all old OpenGraph meta tags
  cleaned = cleaned.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '');
  // 4. Remove all old Twitter meta tags
  cleaned = cleaned.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '');

  const cleanTitle = meta.title.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cleanDesc = meta.description.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cleanImage = meta.image;
  const cleanUrl = meta.url;

  const newMetaBlock = `
    <title>${cleanTitle} | MukiSoft Assist</title>
    <meta name="description" content="${cleanDesc}" />

    <!-- Open Graph / Facebook / LinkedIn / WhatsApp Social Share -->
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="MukiSoft Assist" />
    <meta property="og:url" content="${cleanUrl}" />
    <meta property="og:title" content="${cleanTitle}" />
    <meta property="og:description" content="${cleanDesc}" />
    <meta property="og:image" content="${cleanImage}" />
    <meta property="og:image:secure_url" content="${cleanImage}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${cleanTitle}" />

    <!-- Twitter / X Card Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@MukiSoft" />
    <meta name="twitter:url" content="${cleanUrl}" />
    <meta name="twitter:title" content="${cleanTitle}" />
    <meta name="twitter:description" content="${cleanDesc}" />
    <meta name="twitter:image" content="${cleanImage}" />
    <meta name="twitter:image:alt" content="${cleanTitle}" />
  `;

  if (cleaned.includes('<head>')) {
    return cleaned.replace('<head>', `<head>${newMetaBlock}`);
  }
  return `${newMetaBlock}\n${cleaned}`;
}

app.get('/blog/:slug', async (req, res, next) => {
  const slug = req.params.slug;
  if (!slug) return next();

  try {
    // 1. Look in server storage first
    const storedPosts = getStoredBlogPosts();
    let post = storedPosts.find((p: any) => p.slug === slug || p.id === slug) || null;

    // 2. If not found in server storage, query Supabase
    if (!post) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseAnonKey) {
        try {
          const queryUrl = `${supabaseUrl}/rest/v1/blog_posts?or=(slug.eq.${encodeURIComponent(slug)},id.eq.${encodeURIComponent(slug)})&select=*`;
          const sbRes = await fetch(queryUrl, {
            headers: {
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${supabaseAnonKey}`,
            },
          });
          if (sbRes.ok) {
            const sbData = await sbRes.json();
            if (Array.isArray(sbData) && sbData.length > 0) {
              post = sbData[0];
            }
          }
        } catch (err) {
          console.warn('Supabase fetch for OG tags error:', err);
        }
      }
    }

    const indexPath = process.env.NODE_ENV === 'production'
      ? path.resolve(__dirname, 'dist', 'index.html')
      : path.resolve(__dirname, 'index.html');

    if (!fs.existsSync(indexPath)) {
      return next();
    }

    const html = fs.readFileSync(indexPath, 'utf-8');

    let ogTitle = 'MukiSoft Digital Services';
    let ogDesc = 'মুকিসফট টেকনোলজি পরিচালিত এআই-চালিত প্রিমিয়াম ডিজিটাল সেবা প্ল্যাটফর্ম।';
    let ogImage = 'https://service.mukisoft.tech/assets/aistudio/Screenshot_2026-10-24_at_11.15.02_PM_8d53cab9.png';
    const ogUrl = `https://service.mukisoft.tech/blog/${slug}`;

    if (post) {
      ogTitle = post.title_bn || post.title || post.meta_title || ogTitle;
      const rawDesc = post.excerpt_bn || post.excerpt || post.content_bn || post.content || post.title_bn || post.title;
      if (rawDesc) {
        ogDesc = rawDesc
          .replace(/<[^>]*>/g, '')
          .replace(/[#*>_`]/g, '')
          .replace(/\n+/g, ' ')
          .slice(0, 240)
          .trim();
      }
      if (post.cover_image && typeof post.cover_image === 'string') {
        const img = post.cover_image.trim();
        if (img.startsWith('http://') || img.startsWith('https://')) {
          ogImage = img;
        } else if (img.startsWith('/')) {
          ogImage = `https://service.mukisoft.tech${img}`;
        }
      }
    } else {
      const formattedSlugTitle = slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      ogTitle = `${formattedSlugTitle}`;
      ogDesc = `${formattedSlugTitle} — মুকিসফট টেকনোলজি পরিচালিত অফিশিয়াল ব্লগ ও প্রযুক্তি সেবা পোর্টাল।`;
    }

    const finalHtml = injectOpenGraphTags(html, {
      title: ogTitle,
      description: ogDesc,
      image: ogImage,
      url: ogUrl,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(finalHtml);
  } catch (err) {
    console.error('OG Handler error:', err);
    return next();
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

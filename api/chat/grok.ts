export default async function handler(req: any, res: any) {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { message, history = [], services = [], categories = [], customApiKey, model = 'grok-beta' } = body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'মেসেজ ফিল্ড আবশ্যক।' });
    }

    const rawKey = process.env.GROQ_API_KEY || customApiKey || process.env.GROK_API_KEY || process.env.XAI_API_KEY;

    if (!rawKey || rawKey.trim().length < 5) {
      return res.status(200).json({
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

    const groqCandidateModels = [
      'openai/gpt-oss-120b',
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-20b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
    ];

    // Format live services database into concise, structured knowledge context
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
3. Carefully analyze what the user is asking for (e.g. technical issues, business plans, government paperwork, websites, graphics, CV, marketing).
4. Recommend ONLY the most relevant, exact services from our live database with their prices in BDT (৳) and delivery times.
5. Provide direct markdown links to the services using the format: [সার্ভিসের নাম](/service/{slug}).
6. If the user asks general questions about IT, business or pricing, answer intelligently and guide them to how MukiSoft Assist solves it.
7. If the user indicates they want human assistance, advise them to click the "লাইভ এজেন্ট ডাকুন" button.
8. Be concise, professional, and helpful.`;

    // Build message list for AI
    const aiMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add recent history (up to last 6 messages)
    if (Array.isArray(history) && history.length > 0) {
      history.slice(-6).forEach((h: any) => {
        aiMessages.push({
          role: h.sender_type === 'customer' ? 'user' : 'assistant',
          content: h.message || '',
        });
      });
    }

    // Add current user message
    aiMessages.push({ role: 'user', content: message.trim() });

    let data: any = null;

    if (isGroq) {
      for (const candidate of groqCandidateModels) {
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
              break;
            }
          }
        } catch {
          // continue
        }
      }
    } else {
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
      return res.status(200).json({
        success: false,
        error: errMsg || 'AI API কল ব্যর্থ হয়েছে।',
        reply: 'MukiSoft AI সহকারী থেকে এই মুহূর্তে সাড়া পাওয়া যায়নি। অনুগ্রহ করে আপনার প্রশ্নটি আবার লিখুন অথবা মানুষের সাথে সরাসরি কথা বলতে "লাইভ এজেন্ট ডাকুন" চাপুন।',
      });
    }

    const reply = data.choices?.[0]?.message?.content || 'কোনো উত্তর পাওয়া যায়নি।';

    // Check which services were recommended in the reply text
    const matchedServices = services.filter((s: any) => {
      const slugMatch = reply.includes(`/service/${s.slug}`);
      const titleMatch = (s.title_bn && reply.includes(s.title_bn)) || (s.title && reply.includes(s.title));
      return slugMatch || titleMatch;
    }).slice(0, 3);

    return res.status(200).json({
      success: true,
      reply,
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
    return res.status(200).json({
      success: false,
      error: errorMsg,
      reply: 'সার্ভারে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
    });
  }
}

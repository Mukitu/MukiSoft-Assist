export default async function handler(req: any, res: any) {
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
    const { to, subject, html, text } = body;

    if (!to) {
      return res.status(400).json({ success: false, error: 'প্রাপকের ইমেইল ঠিকানা প্রদান করুন।' });
    }

    const resendKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    const senderName = process.env.EMAIL_FROM_NAME || 'MukiSoft Assist';
    const senderEmail = process.env.EMAIL_FROM_ADDRESS || 'no-reply@mukisoft.com';
    const supportEmail = process.env.EMAIL_SUPPORT_ADDRESS || 'support@mukisoft.com';

    if (!resendKey || resendKey.trim().length < 5) {
      return res.status(200).json({
        success: false,
        unconfigured: true,
        error: 'ইমেইল প্রোভাইডার কনফিগার করা হয়নি। Vercel বা সার্ভারে RESEND_API_KEY এনভায়রনমেন্ট ভেরিয়েবল যুক্ত করুন।',
      });
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: [to],
        subject: subject || 'MukiSoft Assist টেস্ট ইমেইল',
        html: html || '<p>MukiSoft Assist প্ল্যাটফর্ম থেকে সফলভাবে পরীক্ষামূলক ইমেইল প্রেরিত হয়েছে।</p>',
        text: text || 'MukiSoft Assist প্ল্যাটফর্ম টেস্ট ইমেইল।',
        reply_to: supportEmail,
      }),
    });

    const data = (await resendResponse.json()) as { id?: string; message?: string };
    if (!resendResponse.ok) {
      return res.status(200).json({
        success: false,
        error: data?.message || 'ইমেইল ডেলিভারি ব্যর্থ হয়েছে (Resend API Error)',
      });
    }

    return res.status(200).json({ success: true, messageId: data.id });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'অজ্ঞাত ত্রুটি';
    return res.status(200).json({ success: false, error: errorMsg });
  }
}

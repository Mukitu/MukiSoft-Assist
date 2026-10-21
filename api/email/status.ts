export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const resendKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  const isConfigured = Boolean(resendKey && resendKey.trim().length > 5);

  return res.status(200).json({
    configured: isConfigured,
    provider: isConfigured ? 'resend' : 'sandbox',
    senderName: process.env.EMAIL_FROM_NAME || 'MukiSoft Assist',
    senderEmail: process.env.EMAIL_FROM_ADDRESS || 'no-reply@mukisoft.com',
    supportEmail: process.env.EMAIL_SUPPORT_ADDRESS || 'support@mukisoft.com',
    timestamp: new Date().toISOString(),
  });
}

import { EmailTemplateType } from '../types/database';
import { toBengaliCurrency, toBengaliDigits } from './i18n';

export interface EmailRenderResult {
  subject: string;
  html: string;
  text: string;
}

export interface TemplateData {
  recipientName?: string;
  recipientEmail?: string;
  actionUrl?: string;
  // Order related
  orderNumber?: string;
  serviceTitle?: string;
  amount?: number;
  deliveryDays?: number;
  statusBengali?: string;
  statusNote?: string;
  deliverableTitle?: string;
  // Deposit related
  paymentMethod?: string;
  transactionRef?: string;
  depositStatus?: 'approved' | 'rejected' | 'pending';
  adminNotes?: string;
  walletBalance?: number;
  // Support related
  ticketNumber?: string;
  ticketSubject?: string;
  replyMessage?: string;
  responderName?: string;
  // Security related
  resetUrl?: string;
  customMessage?: string;
}

const BRAND_NAME = 'MukiSoft Assist';
const PARENT_COMPANY = 'MukiSoft Technology Ltd.';
const SUPPORT_EMAIL = 'support@mukisoft.com';

function baseTemplate(contentHtml: string, previewText: string): string {
  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND_NAME}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Hind Siliguri', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; width: 100%; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; margin-top: 24px; margin-bottom: 24px; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 32px 28px; text-align: left; }
    .brand-tag { color: #818cf8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
    .brand-title { color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; }
    .body-content { padding: 32px 28px; font-size: 14px; line-height: 1.6; color: #334155; }
    .box { background-color: #f1f5f9; border-radius: 8px; padding: 18px 20px; margin: 20px 0; border: 1px solid #cbd5e1; }
    .btn { display: inline-block; background-color: #0f172a; color: #ffffff !important; font-size: 13px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; text-align: center; }
    .btn:hover { background-color: #1e293b; }
    .footer { padding: 24px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .badge-success { background-color: #dcfce7; color: #166534; }
    .badge-warning { background-color: #fef3c7; color: #92400e; }
    .badge-danger { background-color: #fee2e2; color: #991b1b; }
    .badge-info { background-color: #e0e7ff; color: #3730a3; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${previewText}
  </div>
  <table role="presentation">
    <tr>
      <td align="center" style="padding: 12px;">
        <div class="container">
          <div class="header">
            <div class="brand-tag">এন্টারপ্রাইজ ডিজিটাল সার্ভিসেস</div>
            <h1 class="brand-title">${BRAND_NAME}</h1>
          </div>
          <div class="body-content">
            ${contentHtml}
          </div>
          <div class="footer">
            <p style="margin: 0 0 6px 0; font-weight: 600; color: #475569;">${PARENT_COMPANY}</p>
            <p style="margin: 0 0 6px 0;">যেকোনো প্রয়োজনে যোগাযোগ করুন: <a href="mailto:${SUPPORT_EMAIL}" style="color: #4f46e5; text-decoration: none;">${SUPPORT_EMAIL}</a></p>
            <p style="margin: 0; font-size: 10px; color: #94a3b8;">এটি একটি স্বয়ংক্রিয় সিস্টেম বার্তা। আপনার অ্যাকাউন্টের গোপনীয়তা ও সুরক্ষা নিশ্চিত করতে পাসওয়ার্ড কারও সাথে শেয়ার করবেন না।</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderEmailTemplate(
  type: EmailTemplateType | string,
  data: TemplateData
): EmailRenderResult {
  const name = data.recipientName || 'সম্মানিত গ্রাহক';

  switch (type) {
    case 'welcome': {
      const subject = `স্বাগতম MukiSoft Assist-এ, ${name}!`;
      const html = baseTemplate(
        `
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">স্বাগতম, ${name}!</h2>
        <p>MukiSoft Assist-এ আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে। আমাদের প্ল্যাটফর্মে এখন আপনি পেশাদার সফটওয়্যার, ডিজাইন, কনসালটেন্সি ও ডিজিটাল সার্ভিস সহজেই ওয়ালেটের মাধ্যমে অর্ডার করতে পারবেন।</p>
        <div class="box">
          <p style="margin: 0 0 8px 0; font-weight: 600;">আপনার অ্যাকাউন্টের সুবিধা:</p>
          <ul style="margin: 0; padding-left: 20px;">
            <li>বিকাশ, নগদ ও ব্যাংক ট্রান্সফারে সহজে ওয়ালেটে টাকা জমা</li>
            <li>স্বচ্ছ এসক্রো পেমেন্ট নিরাপত্তা ও অপরিবর্তনীয় আর্থিক লেজার</li>
            <li>কাজের সুনির্দিষ্ট টাইমলাইন ট্র্যাকিং ও দ্রুত ডেলিভারি</li>
            <li>২৪/৭ ডেডিকেটেড গ্রাহক সহায়তা ডেস্ক</li>
          </ul>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.actionUrl || 'https://mukisoft.com/services'}" class="btn">সেবা ক্যাটালগ ব্রাউজ করুন</a>
        </div>
        <p style="font-size: 12px; color: #64748b;">আপনার অ্যাকাউন্টে কোনো সমস্যা হলে দ্রুত আমাদের সাপোর্ট টিকিটের মাধ্যমে জানান।</p>
        `,
        `স্বাগতম ${name}! MukiSoft Assist-এ আপনার ডিজিটাল সার্ভিস অ্যাকাউন্ট সক্রিয় হয়েছে।`
      );
      return {
        subject,
        html,
        text: `স্বাগতম, ${name}! MukiSoft Assist-এ আপনার অ্যাকাউন্ট সক্রিয় হয়েছে। সার্ভিস ব্রাউজ করতে ভিজিট করুন: ${data.actionUrl || ''}`,
      };
    }

    case 'password_reset': {
      const subject = `পাসওয়ার্ড রিসেটের অনুরোধ — ${BRAND_NAME}`;
      const resetLink = data.resetUrl || data.actionUrl || '#';
      const html = baseTemplate(
        `
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">পাসওয়ার্ড রিসেটের আবেদন</h2>
        <p>প্রিয় ${name},</p>
        <p>আপনার MukiSoft Assist অ্যাকাউন্টের পাসওয়ার্ড পরিবর্তনের একটি অনুরোধ পাওয়া গেছে। পাসওয়ার্ড নতুন করে সেট করতে নিচের বাটনে ক্লিক করুন:</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetLink}" class="btn" style="background-color: #4f46e5;">নতুন পাসওয়ার্ড সেট করুন</a>
        </div>
        <div class="box" style="border-left: 4px solid #f59e0b;">
          <p style="margin: 0; font-size: 12px; color: #78350f;">
            <strong>নিরাপত্তা নোটিশ:</strong> এই লিংকটির মেয়াদ মাত্র ১ ঘণ্টা। আপনি যদি পাসওয়ার্ড পরিবর্তনের অনুরোধ না করে থাকেন, তবে এই বার্তাটি উপেক্ষা করুন। আপনার অ্যাকাউন্ট সুরক্ষিত রয়েছে।
          </p>
        </div>
        `,
        `আপনার MukiSoft Assist অ্যাকাউন্টের পাসওয়ার্ড রিসেট লিংক প্রস্তুত।`
      );
      return {
        subject,
        html,
        text: `পাসওয়ার্ড রিসেট লিংক: ${resetLink}\nলিংকটির মেয়াদ ১ ঘণ্টা। আপনি না চাইলে উপেক্ষা করুন।`,
      };
    }

    case 'order_created': {
      const orderNum = data.orderNumber || 'MS-ORDER';
      const service = data.serviceTitle || 'ডিজিটাল সেবা';
      const cost = data.amount ? toBengaliCurrency(data.amount) : '৳ ০';
      const days = data.deliveryDays ? toBengaliDigits(data.deliveryDays) : '৩';
      const subject = `অর্ডার নিশ্চিত হয়েছে: #${orderNum} — ${BRAND_NAME}`;

      const html = baseTemplate(
        `
        <div style="margin-bottom: 16px;">
          <span class="badge badge-success">অর্ডার গৃহীত হয়েছে</span>
        </div>
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে</h2>
        <p>প্রিয় ${name}, আপনার সেবা ক্রয়ের অর্ডারটি নিশ্চিত হয়েছে এবং এসক্রো ওয়ালেট থেকে মূল্য কর্তন করে অর্ডারটি প্রসেসিংয়ে পাঠানো হয়েছে।</p>
        <div class="box">
          <table style="font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 40%;">অর্ডার নম্বর:</td>
              <td style="padding: 6px 0; font-weight: 700; font-family: monospace;">${orderNum}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">সেবার নাম:</td>
              <td style="padding: 6px 0; font-weight: 600;">${service}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">পরিশোধিত মূল্য:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${cost}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">আনুমানিক ডেলিভারি:</td>
              <td style="padding: 6px 0;">${days} কর্মদিবস</td>
            </tr>
          </table>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.actionUrl || '#'}" class="btn">অর্ডারের অগ্রগতি দেখুন</a>
        </div>
        <p style="font-size: 12px; color: #64748b;">কাজের কোনো বিষয়ে যোগাযোগের প্রয়োজন হলে ড্যাশবোর্ড থেকে অর্ডারের বিস্তারিত দেখুন।</p>
        `,
        `অর্ডার #${orderNum} নিশ্চিত হয়েছে। মূল্য: ${cost}। ডেলিভারি: ${days} কর্মদিবস।`
      );
      return {
        subject,
        html,
        text: `অর্ডার #${orderNum} নিশ্চিত হয়েছে। সেবা: ${service}, মূল্য: ${cost}। অগ্রগতি পর্যবেক্ষণ করতে ভিজিট করুন: ${data.actionUrl || ''}`,
      };
    }

    case 'order_status': {
      const orderNum = data.orderNumber || 'MS-ORDER';
      const statusBn = data.statusBengali || 'অগ্রগতি আপডেট';
      const subject = `অর্ডার স্ট্যাটাস আপডেট: #${orderNum} [${statusBn}] — ${BRAND_NAME}`;

      const html = baseTemplate(
        `
        <div style="margin-bottom: 16px;">
          <span class="badge badge-info">${statusBn}</span>
        </div>
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">অর্ডার #${orderNum}-এর নতুন অবস্থা</h2>
        <p>প্রিয় ${name}, আপনার অর্ডারের অগ্রগতিতে নতুন আপডেট এসেছে:</p>
        <div class="box">
          <p style="margin: 0 0 6px 0; font-weight: 700; color: #0f172a; font-size: 14px;">বর্তমান অবস্থা: ${statusBn}</p>
          <p style="margin: 0; font-size: 13px; color: #475569;">${data.statusNote || 'টিম আপনার কাজটি প্রস্তুত করছেন।'}</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.actionUrl || '#'}" class="btn">অর্ডারে প্রবেশ করুন</a>
        </div>
        `,
        `অর্ডার #${orderNum} এখন "${statusBn}" অবস্থায় রয়েছে।`
      );
      return {
        subject,
        html,
        text: `অর্ডার #${orderNum} অবস্থা: ${statusBn}। বিবরণ: ${data.statusNote || ''}। বিস্তারিত দেখুন: ${data.actionUrl || ''}`,
      };
    }

    case 'deliverable_ready': {
      const orderNum = data.orderNumber || 'MS-ORDER';
      const fileTitle = data.deliverableTitle || 'সম্পন্ন কাজের কপি';
      const subject = `কাজের ফাইল ডেলিভারি সম্পন্ন: #${orderNum} — ${BRAND_NAME}`;

      const html = baseTemplate(
        `
        <div style="margin-bottom: 16px;">
          <span class="badge badge-success">ডেলিভারি প্রস্তুত</span>
        </div>
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">আপনার কাজের ফাইল প্রস্তুত হয়েছে!</h2>
        <p>প্রিয় ${name}, অত্যন্ত আনন্দের সাথে জানাচ্ছি যে আপনার অর্ডার #${orderNum}-এর কাজ সফলভাবে সম্পন্ন হয়েছে এবং মূল আউটপুট ফাইল ড্যাশবোর্ডে আপলোড করা হয়েছে।</p>
        <div class="box">
          <p style="margin: 0 0 6px 0; font-weight: 600; color: #0f172a;">সংযুক্ত ফাইল:</p>
          <p style="margin: 0; font-family: monospace; font-size: 13px; color: #1e293b;">📄 ${fileTitle}</p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b;">
            নিরাপত্তার স্বার্থে সরাসরি ইমেইলে ফাইল প্রেরণ করা হয়নি। আপনার সুরক্ষিত ড্যাশবোর্ড থেকে ফাইলটি ডাউনলোড করে নিন।
          </p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.actionUrl || '#'}" class="btn" style="background-color: #059669;">ফাইল ডাউনলোড করুন</a>
        </div>
        <p style="font-size: 12px; color: #64748b;">কাজে কোনো পরিবর্তন বা সংশোধনের প্রয়োজন হলে ড্যাশবোর্ড থেকে "রিভিশন অনুরোধ" করতে পারেন।</p>
        `,
        `অর্ডার #${orderNum}-এর কাজের ফাইল ডেলিভারি সম্পন্ন হয়েছে। ড্যাশবোর্ড থেকে ডাউনলোড করুন।`
      );
      return {
        subject,
        html,
        text: `অর্ডার #${orderNum}-এর কাজ ডেলিভারি সম্পন্ন হয়েছে (${fileTitle})। ড্যাশবোর্ড থেকে ডাউনলোড করুন: ${data.actionUrl || ''}`,
      };
    }

    case 'deposit_status': {
      const isApproved = data.depositStatus === 'approved';
      const amountStr = data.amount ? toBengaliCurrency(data.amount) : '৳ ০';
      const method = data.paymentMethod || 'পেমেন্ট';
      const trx = data.transactionRef || 'N/A';
      const subject = isApproved
        ? `টাকা জমা সফল হয়েছে: ${amountStr} ওয়ালেটে যুক্ত হয়েছে — ${BRAND_NAME}`
        : `টাকা জমার অনুরোধ বাতিল হয়েছে (${amountStr}) — ${BRAND_NAME}`;

      const html = baseTemplate(
        `
        <div style="margin-bottom: 16px;">
          <span class="badge ${isApproved ? 'badge-success' : 'badge-danger'}">
            ${isApproved ? 'জমা অনুমোদিত' : 'অনুরোধ বাতিল'}
          </span>
        </div>
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">
          ${isApproved ? 'ওয়ালেটে টাকা জমা সম্পন্ন হয়েছে' : 'টাকা জমার অনুরোধ বাতিল হয়েছে'}
        </h2>
        <p>প্রিয় ${name}, আপনার ${method} মারফত পাঠানো ${amountStr} জমার অনুরোধটি অ্যাডমিন টিম যাচাই করেছেন।</p>
        <div class="box">
          <table style="font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 40%;">পদ্ধতি:</td>
              <td style="padding: 6px 0; font-weight: 600;">${method}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">TrxID / রেফারেন্স:</td>
              <td style="padding: 6px 0; font-weight: 700; font-family: monospace;">${trx}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">পরিমাণ:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${amountStr}</td>
            </tr>
            ${
              isApproved && data.walletBalance !== undefined
                ? `<tr>
                    <td style="padding: 6px 0; color: #64748b;">বর্তমান ব্যালেন্স:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #059669;">${toBengaliCurrency(data.walletBalance)}</td>
                  </tr>`
                : ''
            }
            ${
              !isApproved && data.adminNotes
                ? `<tr>
                    <td style="padding: 6px 0; color: #991b1b; vertical-align: top;">বাতিলের কারণ:</td>
                    <td style="padding: 6px 0; color: #991b1b; font-weight: 600;">${data.adminNotes}</td>
                  </tr>`
                : ''
            }
          </table>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.actionUrl || '#'}" class="btn">ওয়ালেট লেজার দেখুন</a>
        </div>
        `,
        isApproved
          ? `${amountStr} সফলভাবে আপনার ওয়ালেটে জমা হয়েছে।`
          : `আপনার ${amountStr} জমার অনুরোধ বাতিল হয়েছে। কারণ দেখুন।`
      );
      return {
        subject,
        html,
        text: isApproved
          ? `আপনার ${method} (${trx}) মারফত পাঠানো ${amountStr} ওয়ালেটে সফলভাবে যুক্ত হয়েছে।`
          : `আপনার ${amountStr} জমার অনুরোধ প্রত্যাখ্যাত হয়েছে। কারণ: ${data.adminNotes || 'যাচাইকরণ ব্যর্থ'}।`,
      };
    }

    case 'refund_processed': {
      const orderNum = data.orderNumber || 'MS-ORDER';
      const amountStr = data.amount ? toBengaliCurrency(data.amount) : '৳ ০';
      const subject = `রিফান্ড সম্পন্ন: ৳ ${data.amount ? toBengaliDigits(data.amount) : '০'} ওয়ালেটে ফেরত দেওয়া হয়েছে — ${BRAND_NAME}`;

      const html = baseTemplate(
        `
        <div style="margin-bottom: 16px;">
          <span class="badge badge-warning">অর্থ ফেরত (Refund)</span>
        </div>
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">অর্ডার রিফান্ড সফল হয়েছে</h2>
        <p>প্রিয় ${name}, আপনার অর্ডার #${orderNum}-এর এসক্রো মূল্য ${amountStr} আপনার ওয়ালেট ব্যালেন্সে নিরাপদে ফেরত প্রদান করা হয়েছে।</p>
        <div class="box">
          <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>অর্ডার নম্বর:</strong> <span style="font-family: monospace;">#${orderNum}</span></p>
          <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>ফেরতকৃত অর্থ:</strong> <span style="font-weight: 700; color: #059669;">+${amountStr}</span></p>
          ${
            data.statusNote
              ? `<p style="margin: 0; font-size: 13px; color: #64748b;"><strong>রিফান্ডের কারণ:</strong> ${data.statusNote}</p>`
              : ''
          }
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.actionUrl || '#'}" class="btn">ওয়ালেট ব্যালেন্স দেখুন</a>
        </div>
        `,
        `অর্ডার #${orderNum}-এর ${amountStr} আপনার ওয়ালেটে ফেরত দেওয়া হয়েছে।`
      );
      return {
        subject,
        html,
        text: `অর্ডার #${orderNum}-এর ${amountStr} ওয়ালেটে ফেরত দেওয়া হয়েছে। কারণ: ${data.statusNote || ''}`,
      };
    }

    case 'support_reply': {
      const ticketNum = data.ticketNumber || 'TKT-001';
      const responder = data.responderName || 'সহায়তা প্রতিনিধি';
      const subject = `টিকিট #${ticketNum}-এ নতুন উত্তর এসেছে — ${BRAND_NAME}`;

      const html = baseTemplate(
        `
        <div style="margin-bottom: 16px;">
          <span class="badge badge-info">নতুন উত্তর</span>
        </div>
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">সাপোর্ট টিকিট #${ticketNum}-এ উত্তর প্রদান করা হয়েছে</h2>
        <p>প্রিয় ${name}, আপনার সাপোর্ট টিকিট <em>"${data.ticketSubject || 'সহায়তা'}"</em>-এ আমাদের প্রতিনিধি <strong>${responder}</strong> একটি নতুন উত্তর পাঠিয়েছেন।</p>
        <div class="box" style="border-left: 4px solid #4f46e5; background-color: #faf5ff;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #4338ca; font-size: 12px;">${responder}-এর বার্তা:</p>
          <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #1e1b4b; white-space: pre-wrap;">${data.replyMessage || 'দয়া করে ড্যাশবোর্ডে গিয়ে বার্তাটি দেখুন।'}</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.actionUrl || '#'}" class="btn">টিকিটে উত্তর দিন</a>
        </div>
        <p style="font-size: 12px; color: #64748b;">ইমেইলে সরাসরি রিপ্লাই না করে আমাদের নিরাপদ সাপোর্ট ড্যাশবোর্ড থেকে উত্তর প্রদান করুন।</p>
        `,
        `টিকিট #${ticketNum}-এ নতুন উত্তর পাঠিয়েছেন ${responder}।`
      );
      return {
        subject,
        html,
        text: `টিকিট #${ticketNum} এ ${responder}-এর নতুন উত্তর: ${data.replyMessage || ''}। উত্তর দিতে ভিজিট করুন: ${data.actionUrl || ''}`,
      };
    }

    default: {
      const subject = `জরুরি বিজ্ঞপ্তি — ${BRAND_NAME}`;
      const html = baseTemplate(
        `
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">গুরুত্বপূর্ণ বিজ্ঞপ্তি</h2>
        <p>প্রিয় ${name},</p>
        <p>${data.customMessage || 'আপনার অ্যাকাউন্টে একটি নতুন আপডেট রয়েছে।'}</p>
        ${
          data.actionUrl
            ? `<div style="text-align: center; margin: 24px 0;"><a href="${data.actionUrl}" class="btn">বিস্তারিত দেখুন</a></div>`
            : ''
        }
        `,
        `${BRAND_NAME} থেকে একটি গুরুত্বপূর্ণ বিজ্ঞপ্তি।`
      );
      return {
        subject,
        html,
        text: `বিজ্ঞপ্তি: ${data.customMessage || ''}`,
      };
    }
  }
}

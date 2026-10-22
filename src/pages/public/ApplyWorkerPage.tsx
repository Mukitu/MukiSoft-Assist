import React, { useState } from 'react';
import { Briefcase, Send, CheckCircle2, ShieldCheck, HelpCircle, Phone, ArrowLeft, Award, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';

interface ApplyWorkerPageProps {
  onNavigate: (path: string) => void;
}

export const ApplyWorkerPage: React.FC<ApplyWorkerPageProps> = ({ onNavigate }) => {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useNotification();

  const [fullName, setFullName] = useState(user?.email ? user.email.split('@')[0] : '');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !user) {
      showToast({
        type: 'error',
        title: 'লগইন প্রয়োজন',
        message: 'ওয়ার্কার হিসেবে আবেদন করতে প্রথমে একটি অ্যাকাউন্টে লগইন বা সাইন-আপ করুন।',
      });
      onNavigate('/login');
      return;
    }

    if (!fullName.trim() || !phone.trim() || !skills.trim()) {
      showToast({
        type: 'error',
        title: 'অসম্পূর্ণ ফর্ম',
        message: 'আপনার পূর্ণ নাম, মোবাইল নম্বর এবং দক্ষতার বিবরণ সঠিকভাবে পূরণ করুন।',
      });
      return;
    }

    setLoading(true);
    try {
      await api.submitWorkerApplication({
        user_id: user.id,
        full_name: fullName.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || undefined,
        skills: skills.trim(),
        experience: experience.trim() || undefined,
        portfolio_url: portfolioUrl.trim() || undefined,
      });

      setSubmitted(true);
      showToast({
        type: 'success',
        title: 'আবেদন জমা হয়েছে! 🎉',
        message: 'আপনার ওয়ার্কার আবেদনটি সফলভাবে জমা নেওয়া হয়েছে। অ্যাডমিন টিম আপনার সাথে দ্রুতই যোগাযোগ করবে।',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'আবেদন জমা দিতে সমস্যা হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* টপ ব্যাক বাটন */}
        <button
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>প্রধান পৃষ্ঠায় ফিরুন</span>
        </button>

        {/* হেডার ব্যানার */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="relative z-10 space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>MukiSoft Assist ফ্রিল্যান্স নেটওয়ার্ক</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              আমাদের স্পেশালিস্ট টিম বা ওয়ার্কার হিসেবে যোগ দিন
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              আপনি কি একজন দক্ষ প্রফেশনাল? আমাদের প্ল্যাটফর্মে কাজ সম্পন্ন করে আকর্ষণীয় পারফর্মেন্স বোনাস এবং ৭০%-৮০% পর্যন্ত সরাসরি কমিশন অর্জন করুন!
            </p>
          </div>
        </div>

        {/* মূল কনটেন্ট গ্রিড */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* সুবিধা ও পলিসি কার্ড */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>ওয়ার্কার পলিসি ও সুবিধা</span>
              </h3>
              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>৭০% - ৮০% সরাসরি কমিশন:</strong> কাজ সম্পন্ন করার সাথে সাথেই উইথড্রএবল ব্যালেন্সে যুক্ত হয়।</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>সহজ টাকা উত্তোলন:</strong> বিকাশ, নগদ, রকেট বা ব্যাংকে সরাসরি উইথড্র দিন।</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span><strong>ক্লেইম লিমিট নীতি:</strong> কাজের মান বজায় রাখতে একসাথে ১টি রানিং কাজ ক্লেইম করা যায়।</span>
                </li>
              </ul>
            </div>

            <div className="bg-indigo-50/80 rounded-2xl p-6 border border-indigo-100 space-y-2 text-xs text-indigo-900">
              <div className="font-bold flex items-center gap-1.5 text-indigo-950">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <span>অনুমোদন প্রক্রিয়া:</span>
              </div>
              <p className="leading-relaxed text-indigo-800">
                আবেদন জমা দেওয়ার পর আমাদের টিম মোবাইল বা হোয়াটসঅ্যাপে আপনার সাথে যোগাযোগ করবে এবং দক্ষতা যাচাই শেষে প্রোফাইল 'Worker' হিসেবে সক্রিয় করবে।
              </p>
            </div>
          </div>

          {/* আবেদন ফর্ম প্যানেল */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">আবেদন সফলভাবে জমা দেওয়া হয়েছে!</h2>
                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    ধন্যবাদ! আপনার ওয়ার্কার আবেদনটি পর্যালোচনায় রয়েছে। অ্যাডমিন টিম থেকে দ্রুতই আপনার প্রদত্ত ফোন বা হোয়াটসঅ্যাপে কল দিয়ে ভেরিফিকেশন সম্পন্ন করা হবে।
                  </p>
                  <div className="pt-4 flex items-center justify-center gap-3">
                    <button
                      onClick={() => onNavigate('/dashboard')}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-sm"
                    >
                      ড্যাশবোর্ডে যান
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-indigo-600" />
                      <span>ওয়ার্কার যোগদানের তথ্য দিন</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      দয়া করে নির্ভুল তথ্য প্রদান করুন যেন অ্যাডমিন টিম আপনার সাথে যোগাযোগ করতে পারে।
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        পূর্ণ নাম <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="আপনার নাম"
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        মোবাইল নম্বর <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="017xxxxxxxx"
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        হোয়াটসঅ্যাপ নম্বর (ঐচ্ছিক)
                      </label>
                      <input
                        type="tel"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="018xxxxxxxx"
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        পোর্টফোলিও বা কাজের লিংক (ঐচ্ছিক)
                      </label>
                      <input
                        type="url"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        placeholder="https://behance.net/you বা লিংক"
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      আপনার দক্ষতা ও সেবাসমূহ <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="যেমন: গ্রাফিক্স ডিজাইন, ওয়েব ডেভেলপমেন্ট, ডকুমেন্ট রিটাইপিং, সিভি রাইটিং, ভিডিও এডিটিং ইত্যাদি..."
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      পূর্ব অভিজ্ঞতা ও সংক্ষিপ্ত পরিচয়
                    </label>
                    <textarea
                      rows={2}
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      placeholder="কতদিন ধরে কাজ করছেন বা আপনার পূর্বের অভিজ্ঞতা..."
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-6 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                  >
                    {loading ? (
                      <span>আবেদন জমা হচ্ছে...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>ওয়ার্কার আবেদনের তথ্য জমা দিন</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

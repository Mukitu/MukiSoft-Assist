import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ContactPageProps {
  onNavigate: (path: string) => void;
}

export const ContactPage: React.FC<ContactPageProps> = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('সাধারণ জিজ্ঞাসা');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    if (user) {
      await api.createTicket({
        userId: user.id,
        subject,
        category,
        priority: 'medium',
      });
    }

    setSubmitted(true);
    showToast({
      type: 'success',
      title: 'বার্তা গ্রহণ করা হয়েছে',
      message: 'আমাদের গ্রাহক সহায়তা দল পরবর্তী ৪ কর্মঘণ্টার মধ্যে আপনার সাথে যোগাযোগ করবে।',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
          গ্রাহক সহায়তা কেন্দ্র
        </span>
        <h1 className="text-2xl sm:text-4xl font-bold text-slate-900">যোগাযোগ ও সহায়তা</h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          আপনার কাস্টম কোনো কাজের চাহিদা, ওয়ালেট ডিপোজিট সংক্রান্ত প্রশ্ন অথবা ইনভয়েস সংক্রান্ত তথ্যের জন্য আমাদের হেল্প ডেস্কে বার্তা পাঠান।
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* যোগাযোগের তথ্য */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <h3 className="font-semibold text-slate-900 text-sm">সরাসরি যোগাযোগের মাধ্যম</h3>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900">ইমেইল সহায়তা</div>
                  <div className="font-mono text-slate-600">support@mukisoft.com</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900">অপারেশনাল হেল্পলাইন</div>
                  <div className="font-mono text-slate-600">+880 1700 000000 (সকাল ৯টা - রাত ৮টা)</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900">প্রধান কার্যালয়</div>
                  <div>মুকিসফট টেকনোলজি, ঢাকা, বাংলাদেশ</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ফর্ম */}
        <div className="md:col-span-2 bg-white p-6 sm:p-8 rounded-xl border border-slate-200">
          {submitted ? (
            <div className="p-8 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">আপনার বার্তা গৃহীত হয়েছে</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                MukiSoft Assist-এর সাথে যোগাযোগের জন্য ধন্যবাদ। আপনার বার্তার জন্য একটি সহায়তা টিকিট তৈরি করা হয়েছে।
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-4 px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                আরেকটি বার্তা পাঠান
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">জিজ্ঞাসার ধরন</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  >
                    <option value="সাধারণ জিজ্ঞাসা">সাধারণ জিজ্ঞাসা</option>
                    <option value="ওয়ালেট ও টাকা জমা">ওয়ালেট ও টাকা জমা সংক্রান্ত</option>
                    <option value="কাস্টম সেবা চাহিদা">কাস্টম সেবার চাহিদা</option>
                    <option value="বিল ও ইনভয়েস">বিল ও ইনভয়েস সংক্রান্ত</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">বিষয়</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="আপনার বিষয়ের সারসংক্ষেপ..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">বিস্তারিত বার্তা</label>
                <textarea
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="আপনার জিজ্ঞাসা বা সমস্যার বিস্তারিত তথ্য লিখুন..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>বার্তা পাঠিয়ে দিন</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

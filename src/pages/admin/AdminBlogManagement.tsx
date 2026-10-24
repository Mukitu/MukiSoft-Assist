import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle, 
  Clock, 
  FileText, 
  Tag, 
  Sparkles, 
  Globe, 
  X, 
  Save, 
  RefreshCw, 
  Shield, 
  AlertCircle,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Sliders
} from 'lucide-react';
import { api } from '../../services/api';
import { BlogPost, Profile } from '../../types/database';

interface Props {
  currentUser: Profile;
}

export const AdminBlogManagement: React.FC<Props> = ({ currentUser }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    title_bn: '',
    slug: '',
    category: 'Document Services',
    category_bn: 'ডকুমেন্ট সেবা',
    excerpt: '',
    excerpt_bn: '',
    content: '',
    content_bn: '',
    cover_image: '',
    tagsStr: '',
    meta_title: '',
    meta_description: '',
    is_published: true,
    is_featured: false,
  });

  const presetImages = [
    { url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80', label: 'Document & Legal' },
    { url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=1200&q=80', label: 'Resume & Career' },
    { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80', label: 'Marketing & Digital' },
    { url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80', label: 'Tech & Helpdesk' },
  ];

  useEffect(() => {
    loadPosts();
    const handleUpdate = () => loadPosts();
    window.addEventListener('blog_posts_updated', handleUpdate);
    return () => window.removeEventListener('blog_posts_updated', handleUpdate);
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await api.getBlogPosts({ onlyPublished: false });
      setPosts(data);
    } catch (err) {
      console.error('Failed to fetch blog posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingPost(null);
    setFormData({
      title: '',
      title_bn: '',
      slug: '',
      category: 'Document Services',
      category_bn: 'ডকুমেন্ট সেবা',
      excerpt: '',
      excerpt_bn: '',
      content: '',
      content_bn: '',
      cover_image: presetImages[0].url,
      tagsStr: 'Google SEO, MukiSoft, Digital Services',
      meta_title: '',
      meta_description: '',
      is_published: true,
      is_featured: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      title_bn: post.title_bn || post.title,
      slug: post.slug,
      category: post.category || 'Document Services',
      category_bn: post.category_bn || 'ডকুমেন্ট সেবা',
      excerpt: post.excerpt || '',
      excerpt_bn: post.excerpt_bn || post.excerpt || '',
      content: post.content || '',
      content_bn: post.content_bn || post.content || '',
      cover_image: post.cover_image || presetImages[0].url,
      tagsStr: (post.tags || []).join(', '),
      meta_title: post.meta_title || post.title,
      meta_description: post.meta_description || post.excerpt,
      is_published: post.is_published ?? true,
      is_featured: post.is_featured ?? false,
    });
    setIsModalOpen(true);
  };

  const handleTitleChange = (val: string, isBn: boolean) => {
    if (isBn) {
      setFormData((prev) => ({ ...prev, title_bn: val }));
    } else {
      const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setFormData((prev) => ({
        ...prev,
        title: val,
        slug: autoSlug || prev.slug,
        meta_title: prev.meta_title || val,
      }));
    }
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title && !formData.title_bn) {
      setMessage({ type: 'error', text: 'অনুগ্রহ করে ব্লগের টাইটেলটি বাংলায় অথবা ইংরেজিতে লিখুন।' });
      return;
    }

    setSaving(true);
    setMessage(null);

    const tagsArray = formData.tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const postPayload: Partial<BlogPost> = {
      title: formData.title || formData.title_bn,
      title_bn: formData.title_bn || formData.title,
      slug: formData.slug || `post-${Date.now()}`,
      category: formData.category,
      category_bn: formData.category_bn,
      excerpt: formData.excerpt || formData.excerpt_bn,
      excerpt_bn: formData.excerpt_bn || formData.excerpt,
      content: formData.content || formData.content_bn,
      content_bn: formData.content_bn || formData.content,
      cover_image: formData.cover_image,
      tags: tagsArray,
      meta_title: formData.meta_title || formData.title,
      meta_description: formData.meta_description || formData.excerpt,
      is_published: formData.is_published,
      is_featured: formData.is_featured,
      author_id: currentUser.id,
      author_name: currentUser.full_name || 'Super Admin',
      author_role: currentUser.role === 'super_admin' ? 'Super Admin' : 'Admin',
    };

    try {
      if (editingPost) {
        await api.updateBlogPost(editingPost.id, postPayload);
        setMessage({ type: 'success', text: 'ব্লগ পোস্ট সফলভাবে আপডেট করা হয়েছে!' });
      } else {
        await api.createBlogPost(postPayload);
        setMessage({ type: 'success', text: 'নতুন ব্লগ পোস্ট সফলভাবে প্রকাশ করা হয়েছে!' });
      }
      setIsModalOpen(false);
      loadPosts();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'ব্লগ পোস্ট সেভ করতে ব্যর্থ হয়েছে।' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async (id: string, title: string) => {
    if (window.confirm(`আপনি কি নিশ্চিত যে "${title}" ব্লগ পোস্টটি মুছে ফেলতে চান?`)) {
      try {
        await api.deleteBlogPost(id);
        setMessage({ type: 'success', text: 'ব্লগ পোস্টটি মুছে ফেলা হয়েছে।' });
        loadPosts();
      } catch (err) {
        setMessage({ type: 'error', text: 'ব্লগ পোস্ট মুছে ফেলতে সমস্যা হয়েছে।' });
      }
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    try {
      await api.updateBlogPost(post.id, { is_published: !post.is_published });
      loadPosts();
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered posts
  const filteredPosts = posts.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.title_bn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  // Calculate Balance & Stats
  const totalPosts = posts.length;
  const publishedCount = posts.filter((p) => p.is_published).length;
  const draftCount = totalPosts - publishedCount;
  const totalViews = posts.reduce((sum, p) => sum + (p.views_count || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header Banner & Super Admin Balance Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold rounded-full flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>সুপার অ্যাডমিন ও অ্যাডমিন ব্লগ পোর্টাল</span>
              </span>
              <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2.5 py-0.5 rounded-full border border-indigo-500/30 font-medium">
                রিয়েল-টাইম ডাটা সিঙ্কড
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ব্লগ কন্টেন্ট ও গুগলে SEO ম্যানেজমেন্ট
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              এখান থেকে আপনি গুগলে র‍্যাংক করার জন্য ব্লগ পোস্ট তৈরি, এডিট, রিয়েল টাইমে ড্রাফট বা পাবলিশ করতে পারবেন।
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/30 flex items-center justify-center gap-2 text-sm whitespace-nowrap self-start lg:self-center"
          >
            <Plus className="w-5 h-5" />
            <span>নতুন ব্লগ পোস্ট লিখুন</span>
          </button>
        </div>

        {/* Real-time Super Admin Balance / Stats Row */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60">
            <p className="text-xs font-medium text-slate-400">মোট ব্লগ পোস্ট</p>
            <p className="text-2xl font-bold text-white mt-1">{totalPosts}</p>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60">
            <p className="text-xs font-medium text-emerald-400">প্রকাশিত পোস্ট</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{publishedCount}</p>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60">
            <p className="text-xs font-medium text-amber-400">ড্রাফট পোস্ট</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{draftCount}</p>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60">
            <p className="text-xs font-medium text-sky-400">মোট রিডার ভিউজ</p>
            <p className="text-2xl font-bold text-sky-400 mt-1">{totalViews}</p>
          </div>
        </div>
      </div>

      {/* Message Feedback Banner */}
      {message && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="ব্লগের বিষয়বস্তু বা ট্যাগ লিখুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">সকল ক্যাটাগরি</option>
            <option value="Document Services">ডকুমেন্ট সেবা</option>
            <option value="Career & Jobs">ক্যারিয়ার ও চাকরি</option>
            <option value="Digital Marketing">ডিজিটাল মার্কেটিং</option>
          </select>

          <button
            onClick={loadPosts}
            className="p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl transition-all"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Posts Table / List */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">ব্লগ পোস্ট ডাটা লোড হচ্ছে...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700 space-y-4">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">কোনো ব্লগ পোস্ট নেই</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            আপনি প্রথম ব্যক্তি হিসেবে ব্লগে নতুন আর্টিকেল পোস্ট করুন।
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-xl hover:bg-emerald-500 transition-all shadow"
          >
            নতুন পোস্ট লিখুন
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-700/60 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">পোস্ট ও টাইটেল</th>
                  <th className="px-6 py-4">ক্যাটাগরি</th>
                  <th className="px-6 py-4">ভিউজ</th>
                  <th className="px-6 py-4">স্ট্যাটাস</th>
                  <th className="px-6 py-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={post.cover_image}
                          alt={post.title}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                        />
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 dark:text-white line-clamp-1">
                            {post.title_bn || post.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>লেখক: {post.author_name}</span>
                            <span>•</span>
                            <span>{new Date(post.created_at).toLocaleDateString('bn-BD')}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold">
                        {post.category_bn || post.category}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium text-xs">
                        <Eye className="w-3.5 h-3.5 text-emerald-500" />
                        {post.views_count || 1}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleTogglePublish(post)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          post.is_published
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-200'
                        }`}
                      >
                        {post.is_published ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>পাবলিশড</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>ড্রাফট</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-xl transition-all"
                          title="পোস্টটি দেখুন"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleOpenEditModal(post)}
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all"
                          title="এডিট করুন"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id, post.title_bn || post.title)}
                          className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl transition-all"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Blog Post Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-700 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingPost ? 'ব্লগ পোস্ট এডিট করুন' : 'নতুন ব্লগ পোস্ট লিখুন'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePost} className="space-y-6">
              {/* Titles BN & EN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ব্লগ টাইটেল (বাংলা): *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: পেশাদার ডকুমেন্ট ফরম্যাটিং..."
                    value={formData.title_bn}
                    onChange={(e) => handleTitleChange(e.target.value, true)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Blog Title (English):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Professional Document Formatting..."
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value, false)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Slug & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ইউআরএল স্লগ (Slug):
                  </label>
                  <input
                    type="text"
                    placeholder="professional-document-formatting"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ক্যাটাগরি:
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      let catBn = 'সাধারণ';
                      if (cat === 'Document Services') catBn = 'ডকুমেন্ট সেবা';
                      if (cat === 'Career & Jobs') catBn = 'ক্যারিয়ার ও চাকরি';
                      if (cat === 'Digital Marketing') catBn = 'ডিজিটাল মার্কেটিং';
                      setFormData({ ...formData, category: cat, category_bn: catBn });
                    }}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Document Services">ডকুমেন্ট সেবা (Document Services)</option>
                    <option value="Career & Jobs">ক্যারিয়ার ও চাকরি (Career & Jobs)</option>
                    <option value="Digital Marketing">ডিজিটাল মার্কেটিং (Digital Marketing)</option>
                  </select>
                </div>
              </div>

              {/* Thumbnail Cover Image */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  থাম্বনেইল / কভার ইমেজের লিংক (URL):
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.cover_image}
                  onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                
                {/* Preset Image Options */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-xs text-slate-400 py-1">স্যাম্পল ইমেজ:</span>
                  {presetImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData({ ...formData, cover_image: img.url })}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-600 transition-colors"
                    >
                      {img.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Excerpt Summary */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  সংক্ষিপ্ত বিবরণ (Excerpt / Summary):
                </label>
                <textarea
                  rows={2}
                  placeholder="ব্লগটির সংক্ষেপ বিবরণ যা সোশ্যাল কার্ডে ও লিস্টে দেখাবে..."
                  value={formData.excerpt_bn}
                  onChange={(e) => setFormData({ ...formData, excerpt_bn: e.target.value, excerpt: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Main Content Body */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  মূল ব্লগ কন্টেন্ট (Body Content):
                </label>
                <p className="text-[11px] text-slate-400">
                  প্যারাগ্রাফ, হেডিং (## হেডিং), বুলেট পয়েন্ট (* পয়েন্ট) অথবা কোটেশন (&gt; কোট) ব্যবহার করতে পারেন।
                </p>
                <textarea
                  rows={8}
                  required
                  placeholder="এখানে আপনার ব্লগের বিস্তারিত কন্টেন্ট লিখুন..."
                  value={formData.content_bn}
                  onChange={(e) => setFormData({ ...formData, content_bn: e.target.value, content: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-sans focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Tags & Google SEO Meta */}
              <div className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-600 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  <Globe className="w-4 h-4 text-emerald-500" />
                  <span>Google SEO & AI Search Keywords:</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ট্যাগ / কী-ওয়ার্ডস (কমা দিয়ে লিখুন):
                  </label>
                  <input
                    type="text"
                    placeholder="PDF Formatting, ATS Resume, Google SEO, MukiSoft Services"
                    value={formData.tagsStr}
                    onChange={(e) => setFormData({ ...formData, tagsStr: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      SEO Meta Title:
                    </label>
                    <input
                      type="text"
                      placeholder="Google Search Snippet Title..."
                      value={formData.meta_title}
                      onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      SEO Meta Description:
                    </label>
                    <input
                      type="text"
                      placeholder="120-160 character description..."
                      value={formData.meta_description}
                      onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    এখনই পাবলিশ করুন (সরাসরি ওয়েবসাইটে দৃশ্যমান হবে)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    ফিচার্ড পোস্ট হিসেবে সেট করুন
                  </span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-xl transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{editingPost ? 'পোস্ট আপডেট করুন' : 'পোস্ট প্রকাশ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

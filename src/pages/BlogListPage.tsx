import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Tag, 
  Eye, 
  Calendar, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  TrendingUp
} from 'lucide-react';
import { api } from '../services/api';
import { BlogPost } from '../types/database';

export const BlogListPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  useEffect(() => {
    loadPosts();
    
    const handleUpdate = () => loadPosts();
    window.addEventListener('blog_posts_updated', handleUpdate);
    return () => window.removeEventListener('blog_posts_updated', handleUpdate);
  }, [selectedCategory, selectedTag]);

  const navigateTo = (path: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await api.getBlogPosts({
        onlyPublished: true,
        category: selectedCategory,
        tag: selectedTag,
        search: searchQuery,
      });
      setPosts(data);
    } catch (err) {
      console.error('Failed to load blog posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPosts();
  };

  const categories = [
    { id: 'all', label: 'সকল ক্যাটাগরি' },
    { id: 'Document Services', label: 'ডকুমেন্ট সেবা' },
    { id: 'Career & Jobs', label: 'ক্যারিয়ার ও চাকরি' },
    { id: 'Digital Marketing', label: 'ডিজিটাল মার্কেটিং' },
  ];

  // Collect all unique tags
  const allTags = Array.from(
    new Set(posts.flatMap((p) => p.tags || []))
  );

  const featuredPost = posts.find((p) => p.is_featured) || posts[0];
  const regularPosts = featuredPost ? posts.filter((p) => p.id !== featuredPost.id) : posts;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-16">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-slate-900 to-emerald-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="max-w-6xl mx-auto relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-sm font-medium backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>MukiSoft ব্লগ ও নলেজ হাব</span>
            <span className="bg-emerald-500/30 text-emerald-300 text-xs px-2 py-0.5 rounded-full border border-emerald-400/40">
              Google SEO & AI Sourced
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            প্রফেশনাল গাইড, ক্যারিয়ার টিপস ও ডিজিটাল সলিউশন
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300">
            গুগল সার্চ ও ChatGPT এর মতো AI সোর্স দ্বারা ইনডেক্সকৃত আমাদের নিয়মিত ব্লগ পোস্টগুলো পড়ুন এবং আপনার ব্যবসা ও ক্যারিয়ারকে একধাপ এগিয়ে রাখুন।
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto mt-8 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="ব্লগ পোস্ট বা বিষয়বস্তু খুঁজুন (যেমন: ATS Resume, PDF Format)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent backdrop-blur-md shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>খুঁজুন</span>
            </button>
          </form>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
        {/* Category Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-2 hidden sm:inline">
              ক্যাটাগরি:
            </span>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {selectedTag !== 'all' && (
            <button
              onClick={() => setSelectedTag('all')}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-medium"
            >
              ট্যাগ ফিল্টার সরান ({selectedTag})
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">ব্লগ পোস্টসমূহ লোড হচ্ছে...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-2xl mt-8 shadow-sm p-8 border border-slate-200 dark:border-slate-700">
            <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">কোনো ব্লগ পোস্ট পাওয়া যায়নি</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2">
              আপনার সার্চ বা ফিল্টারের সাথে মিলে এমন কোনো ব্লগ পোস্ট পাওয়া যায়নি। অন্য বিষয় সার্চ করে দেখুন।
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedTag('all');
              }}
              className="mt-6 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl shadow transition-all"
            >
              সকল পোস্ট দেখুন
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-12">
            {/* Featured Post */}
            {featuredPost && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-1 lg:grid-cols-12 group hover:shadow-2xl transition-all duration-300">
                <div className="lg:col-span-7 relative min-h-[280px] lg:min-h-[420px] overflow-hidden cursor-pointer" onClick={(e) => navigateTo(`/blog/${featuredPost.slug}`, e)}>
                  <img
                    src={featuredPost.cover_image}
                    alt={featuredPost.title_bn || featuredPost.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-full shadow-lg">
                      ফিচার্ড পোস্ট
                    </span>
                    <span className="px-3 py-1 bg-slate-900/80 backdrop-blur-md text-slate-100 text-xs font-semibold rounded-full border border-white/20">
                      {featuredPost.category_bn || featuredPost.category}
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                        {new Date(featuredPost.created_at).toLocaleDateString('bn-BD', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-500" />
                        {featuredPost.reading_time_minutes || 4} মিনিট পড়ার সময়
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-emerald-500" />
                        {featuredPost.views_count || 1} ভিউ
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-snug group-hover:text-emerald-600 transition-colors">
                      <a href={`/blog/${featuredPost.slug}`} onClick={(e) => navigateTo(`/blog/${featuredPost.slug}`, e)}>
                        {featuredPost.title_bn || featuredPost.title}
                      </a>
                    </h2>

                    <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base line-clamp-3 leading-relaxed">
                      {featuredPost.excerpt_bn || featuredPost.excerpt}
                    </p>
                  </div>

                  {/* Tags & Author */}
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                    <div className="flex flex-wrap gap-1.5">
                      {featuredPost.tags.slice(0, 4).map((tag, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedTag(tag)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 transition-all"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={featuredPost.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                          alt={featuredPost.author_name}
                          className="w-9 h-9 rounded-full object-cover border-2 border-emerald-500/30"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {featuredPost.author_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {featuredPost.author_role}
                          </p>
                        </div>
                      </div>

                      <a
                        href={`/blog/${featuredPost.slug}`}
                        onClick={(e) => navigateTo(`/blog/${featuredPost.slug}`, e)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-600/20"
                      >
                        <span>সম্পূর্ণ পড়ুন</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grid of Posts */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  <span>সর্বশেষ প্রকাশিত পোস্টসমূহ</span>
                </h3>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  মোট {posts.length} টি পোস্ট
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {regularPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-700/80 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col group"
                  >
                    <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-700 cursor-pointer" onClick={(e) => navigateTo(`/blog/${post.slug}`, e)}>
                      <img
                        src={post.cover_image}
                        alt={post.title_bn || post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-3 left-3 px-2.5 py-1 bg-slate-900/80 backdrop-blur-md text-slate-100 text-xs font-semibold rounded-full border border-white/20">
                        {post.category_bn || post.category}
                      </span>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                            {new Date(post.created_at).toLocaleDateString('bn-BD', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-emerald-500" />
                            {post.reading_time_minutes || 3} মিনিট
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors">
                          <a href={`/blog/${post.slug}`} onClick={(e) => navigateTo(`/blog/${post.slug}`, e)}>
                            {post.title_bn || post.title}
                          </a>
                        </h3>

                        <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm line-clamp-3 leading-relaxed">
                          {post.excerpt_bn || post.excerpt}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
                        <div className="flex flex-wrap gap-1">
                          {post.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              onClick={(e) => {
                                e.preventDefault();
                                setSelectedTag(tag);
                              }}
                              className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 text-[11px] font-medium rounded hover:bg-emerald-50 hover:text-emerald-600 transition-colors cursor-pointer"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                            {post.views_count || 1} ভিউ
                          </span>

                          <a
                            href={`/blog/${post.slug}`}
                            onClick={(e) => navigateTo(`/blog/${post.slug}`, e)}
                            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                          >
                            <span>পড়ুন</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* All Tags Banner for SEO */}
            {allTags.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
                  <Tag className="w-4 h-4 text-emerald-500" />
                  <span>গুগল সার্চ ও পপুলার ট্যাগসমূহ:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        selectedTag === tag
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

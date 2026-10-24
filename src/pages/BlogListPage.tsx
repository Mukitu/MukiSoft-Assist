import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Eye, 
  Calendar, 
  Clock, 
  ArrowRight, 
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { BlogPost } from '../types/database';

export const BlogListPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadPosts();
    
    const handleUpdate = () => loadPosts();
    window.addEventListener('blog_posts_updated', handleUpdate);
    return () => window.removeEventListener('blog_posts_updated', handleUpdate);
  }, []);

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

  const featuredPost = posts.find((p) => p.is_featured) || posts[0];
  const regularPosts = featuredPost ? posts.filter((p) => p.id !== featuredPost.id) : posts;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-16">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-5xl mx-auto relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold backdrop-blur-sm">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>MukiSoft অফিসিয়াল ব্লগ</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            প্রফেশনাল গাইড, ক্যারিয়ার টিপস ও ডিজিটাল কন্টেন্ট
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300">
            আমাদের অফিসিয়াল প্রকাশিত পোস্ট ও আপডেট সমূহ পড়ুন এবং আপনার ব্যবসা ও ক্যারিয়ারকে একধাপ এগিয়ে রাখুন।
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto mt-8 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="ব্লগ পোস্ট বা বিষয়বস্তু খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-800/90 border border-slate-700 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 backdrop-blur-md shadow-inner text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 text-sm"
            >
              <Search className="w-4 h-4" />
              <span>খুঁজুন</span>
            </button>
          </form>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">ব্লগ পোস্টসমূহ লোড হচ্ছে...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-8 border border-slate-200 dark:border-slate-700 max-w-lg mx-auto my-8 space-y-4">
            <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">এখনো কোনো ব্লগ পোস্ট প্রকাশিত হয়নি</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              সুপার অ্যাডমিন প্যানেল থেকে তৈরি ও পোস্ট করা আসল আর্টিকেলসমূহ সরাসরি এখানে প্রদর্শিত হবে।
            </p>
            <a
              href="/admin/blogs"
              onClick={(e) => navigateTo('/admin/blogs', e)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow transition-all"
            >
              <span>অ্যাডমিন প্যানেলে ব্লগ যুক্ত করুন</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Featured Post */}
            {featuredPost && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-1 lg:grid-cols-12 group hover:shadow-2xl transition-all duration-300">
                <div className="lg:col-span-7 relative min-h-[280px] lg:min-h-[420px] overflow-hidden cursor-pointer" onClick={(e) => navigateTo(`/blog/${featuredPost.slug}`, e)}>
                  <img
                    src={featuredPost.cover_image}
                    alt={featuredPost.title_bn || featuredPost.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80';
                    }}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-full shadow-lg">
                      সর্বশেষ পোস্ট
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
                        {featuredPost.reading_time_minutes || 4} মিনিট পড়া
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

                  {/* Author Branding */}
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* M Letter Icon Avatar Badge */}
                        <div className="w-10 h-10 rounded-full bg-slate-900 text-emerald-400 border-2 border-emerald-500/50 flex items-center justify-center font-bold text-base font-mono shadow-md">
                          M
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {featuredPost.author_name || 'MukiSoft Team'}
                            </p>
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            অফিসিয়াল টিম পোস্ট
                          </p>
                        </div>
                      </div>

                      <a
                        href={`/blog/${featuredPost.slug}`}
                        onClick={(e) => navigateTo(`/blog/${featuredPost.slug}`, e)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-600/20"
                      >
                        <span>পড়ুন</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grid of Other Posts */}
            {regularPosts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    <span>অন্যান্য প্রকাশিত ব্লগ পোস্টসমূহ</span>
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
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80';
                          }}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                        />
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

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-xs font-mono">
                              M
                            </div>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {post.author_name || 'MukiSoft Team'}
                            </span>
                          </div>

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

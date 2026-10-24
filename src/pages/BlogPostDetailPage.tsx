import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Eye, 
  Share2, 
  ArrowLeft, 
  BookOpen, 
  Check, 
  Facebook, 
  Linkedin, 
  MessageCircle, 
  Copy,
  ChevronRight,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { BlogPost } from '../types/database';

export const BlogPostDetailPage: React.FC = () => {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const slug = window.location.pathname.replace('/blog/', '');

  useEffect(() => {
    if (slug) {
      loadPost(slug);
    }
  }, [slug]);

  const navigateTo = (path: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadPost = async (postSlug: string) => {
    // 1. Instant check in localStorage cache
    try {
      const raw = localStorage.getItem('mukisoft_demo_blog_posts');
      if (raw) {
        const cachedList: BlogPost[] = JSON.parse(raw);
        const match = cachedList.find((p) => p.slug === postSlug || p.id === postSlug);
        if (match) {
          setPost(match);
          setLoading(false);
          document.title = `${match.meta_title || match.title_bn || match.title} | MukiSoft Digital Services`;
          injectJsonLdSchema(match);
        }
      }
    } catch {
      // cache miss
    }

    try {
      const data = await api.getBlogPostBySlug(postSlug);
      if (data) {
        setPost(data);
        setLoading(false);
        document.title = `${data.meta_title || data.title_bn || data.title} | MukiSoft Digital Services`;
        injectJsonLdSchema(data);

        // Run non-critical background jobs asynchronously
        api.incrementBlogPostViews(data.id);
        api.getBlogPosts({ onlyPublished: true }).then((allPosts) => {
          const related = allPosts.filter((p) => p.id !== data.id);
          setRelatedPosts(related.slice(0, 3));
        });
      } else {
        setPost(null);
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load blog post:', err);
      setLoading(false);
    }
  };

  const injectJsonLdSchema = (article: BlogPost) => {
    const existingScript = document.getElementById('json-ld-article-schema');
    if (existingScript) {
      existingScript.remove();
    }

    const currentUrl = window.location.href;
    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': currentUrl,
      },
      headline: article.title_bn || article.title,
      description: article.meta_description || article.excerpt_bn || article.excerpt,
      image: [article.cover_image],
      author: {
        '@type': 'Organization',
        name: article.author_name || 'MukiSoft Team',
      },
      publisher: {
        '@type': 'Organization',
        name: 'MukiSoft Digital Services',
        logo: {
          '@type': 'ImageObject',
          url: window.location.origin + '/logo.png',
        },
      },
      datePublished: article.created_at,
      dateModified: article.updated_at || article.created_at,
      inLanguage: 'bn-BD',
    };

    const script = document.createElement('script');
    script.id = 'json-ld-article-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSocialShare = (platform: 'facebook' | 'whatsapp' | 'linkedin') => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(post?.title_bn || post?.title || '');

    if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    } else if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${text}%20${url}`, '_blank');
    } else if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-20 text-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">ব্লগ কন্টেন্ট লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-20 px-4 text-center">
        <div className="max-w-md mx-auto bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
          <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">ব্লগ পোস্টটি পাওয়া যায়নি</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6 text-sm">
            হতে পারে পোস্টটি মুছে ফেলা হয়েছে অথবা ইউআরএল লিংকটি সঠিক নয়।
          </p>
          <button
            onClick={(e) => navigateTo('/blog', e)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ব্লগ লিস্টে ফিরে যান</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Top Header & Breadcrumb */}
      <div className="bg-slate-950 text-slate-200 py-8 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
            <a href="/" onClick={(e) => navigateTo('/', e)} className="hover:text-emerald-400 transition-colors">হোম</a>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <a href="/blog" onClick={(e) => navigateTo('/blog', e)} className="hover:text-emerald-400 transition-colors">ব্লগ</a>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-slate-200 font-medium truncate max-w-[250px] sm:max-w-md">
              {post.title_bn || post.title}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
            {post.title_bn || post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-xs font-mono ring-1 ring-emerald-500/40">
                M
              </div>
              <span className="font-semibold text-slate-200">{post.author_name || 'MukiSoft Team'}</span>
            </div>

            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              {new Date(post.created_at).toLocaleDateString('bn-BD', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>

            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              {post.reading_time_minutes || 4} মিনিট পড়া
            </span>

            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              {post.views_count || 1} ভিউ
            </span>
          </div>
        </div>
      </div>

      {/* Main Body Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-10">
        <article className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
          {/* Cover Image - Preserving full aspect ratio without cropping head */}
          <div className="relative w-full max-h-[600px] bg-slate-950 flex items-center justify-center p-2 sm:p-4 border-b border-slate-800">
            <img
              src={post.cover_image}
              alt={post.title_bn || post.title}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80';
              }}
              className="w-full h-auto max-h-[560px] object-contain mx-auto rounded-2xl shadow-2xl"
            />
          </div>

          {/* Post Excerpt Banner */}
          <div className="p-6 sm:p-10 space-y-8">
            {post.excerpt_bn || post.excerpt ? (
              <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border-l-4 border-emerald-500 text-slate-700 dark:text-slate-200 italic font-medium text-base sm:text-lg leading-relaxed">
                "{post.excerpt_bn || post.excerpt}"
              </div>
            ) : null}

            {/* Rendered Rich Content Body */}
            <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-base sm:text-lg leading-relaxed space-y-6">
              {(post.content_bn || post.content).split('\n').map((paragraph, index) => {
                const trimmed = paragraph.trim();
                if (!trimmed) return null;

                if (trimmed.startsWith('## ')) {
                  return (
                    <h2 key={index} className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white pt-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                      {trimmed.replace('## ', '')}
                    </h2>
                  );
                }

                if (trimmed.startsWith('### ')) {
                  return (
                    <h3 key={index} className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 pt-3">
                      {trimmed.replace('### ', '')}
                    </h3>
                  );
                }

                if (trimmed.startsWith('> ')) {
                  return (
                    <blockquote key={index} className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500 rounded-r-xl text-emerald-900 dark:text-emerald-200 italic font-medium">
                      {trimmed.replace('> ', '')}
                    </blockquote>
                  );
                }

                if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                  return (
                    <li key={index} className="ml-6 list-disc text-slate-700 dark:text-slate-300">
                      {trimmed.replace(/^[*|-]\s+/, '')}
                    </li>
                  );
                }

                return (
                  <p key={index} className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {trimmed}
                  </p>
                );
              })}
            </div>

            {/* Share & Social Action Buttons */}
            <div className="p-6 bg-slate-50 dark:bg-slate-700/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-200/80 dark:border-slate-600/80">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                <Share2 className="w-4 h-4 text-emerald-500" />
                <span>বন্ধুদের সাথে শেয়ার করুন:</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSocialShare('facebook')}
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-md"
                  title="Share on Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSocialShare('whatsapp')}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-md"
                  title="Share on WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSocialShare('linkedin')}
                  className="p-2.5 bg-sky-700 hover:bg-sky-600 text-white rounded-xl transition-all shadow-md"
                  title="Share on LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCopyLink}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'কপি হয়েছে!' : 'লিংক কপি'}</span>
                </button>
              </div>
            </div>

            {/* Author Card - MukiSoft Logo Badge */}
            <div className="p-6 bg-slate-900 text-white rounded-2xl flex items-center gap-4 border border-slate-800 shadow-md">
              <div className="w-14 h-14 rounded-full bg-slate-950 text-amber-400 border-2 border-emerald-500 flex items-center justify-center font-bold text-2xl font-mono shadow-md shrink-0">
                M
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-white">
                    {post.author_name || 'MukiSoft Team'}
                  </h4>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-xs text-slate-300">
                  MukiSoft Digital Services — অফিশিয়াল কন্টেন্ট ও পরামর্শ টিম।
                </p>
              </div>
            </div>

            {/* Call to Action Banner for Services */}
            <div className="p-8 bg-gradient-to-br from-indigo-900 via-slate-900 to-emerald-900 rounded-3xl text-white space-y-4 text-center sm:text-left sm:flex items-center justify-between gap-6 shadow-xl">
              <div className="space-y-2">
                <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold rounded-full">
                  MukiSoft Digital Services
                </span>
                <h3 className="text-xl font-bold">আপনার ব্যবসার জন্য এই সেবাটি প্রয়োজন?</h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md">
                  আজই আমাদের প্রফেশনাল টিম থেকে আপনার প্রয়োজন অনুযায়ী সার্ভিস অর্ডার করুন এবং দ্রুত ডেলিভারি পান।
                </p>
              </div>

              <a
                href="/services"
                onClick={(e) => navigateTo('/services', e)}
                className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/30 whitespace-nowrap inline-flex items-center justify-center gap-2 text-sm"
              >
                <span>সার্ভিসসমূহ দেখুন</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </article>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-12 space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-500" />
              <span>সম্পর্কিত আরও ব্লগ পোস্ট</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedPosts.map((rel) => (
                <div
                  key={rel.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between p-4 space-y-3 cursor-pointer"
                  onClick={(e) => navigateTo(`/blog/${rel.slug}`, e)}
                >
                  <img
                    src={rel.cover_image}
                    alt={rel.title_bn || rel.title}
                    className="w-full h-32 object-cover rounded-xl"
                  />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                    <a href={`/blog/${rel.slug}`} onClick={(e) => navigateTo(`/blog/${rel.slug}`, e)} className="hover:text-emerald-600 transition-colors">
                      {rel.title_bn || rel.title}
                    </a>
                  </h4>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{rel.reading_time_minutes || 3} মি. পড়া</span>
                    <span className="text-emerald-600 font-semibold hover:underline">
                      পড়ুন →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

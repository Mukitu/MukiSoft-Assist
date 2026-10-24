import React, { useState, useEffect } from 'react';
import { X, Download, ExternalLink, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { getSafeFileUrl, downloadFile, openPdfFile } from '../../utils/fileViewer';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  notes?: string | null;
  title?: string;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
  notes,
  title = 'ডেলিভারি ফাইল প্রিভিউ',
}) => {
  const [safeUrl, setSafeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  const effectiveName = fileName || 'delivery_file.pdf';
  const isPdf =
    effectiveName.toLowerCase().endsWith('.pdf') ||
    (fileType && fileType.includes('pdf')) ||
    (fileUrl && (fileUrl.includes('.pdf') || fileUrl.startsWith('data:application/pdf')));

  const isImage =
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(effectiveName) ||
    (fileType && fileType.startsWith('image/')) ||
    (fileUrl && fileUrl.startsWith('data:image/'));

  useEffect(() => {
    if (!isOpen || !fileUrl) {
      setSafeUrl('');
      return;
    }

    setIsLoading(true);
    setHasError(false);

    try {
      const url = getSafeFileUrl(fileUrl, effectiveName, notes || '');
      setSafeUrl(url);
    } catch (err) {
      console.error('Failed to resolve preview URL:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, fileUrl, effectiveName, notes]);

  if (!isOpen) return null;

  const handleOpenExternal = () => {
    openPdfFile(fileUrl || safeUrl, effectiveName, notes || '');
  };

  const handleDownload = () => {
    downloadFile(fileUrl || safeUrl, effectiveName, notes || '');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-indigo-600/30 rounded-lg text-indigo-300 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-white truncate">{title}</h3>
              <p className="text-xs text-slate-300 truncate font-mono">{effectiveName}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenExternal}
              title="নতুন উইন্ডোতে খুলুন"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">নতুন উইন্ডো</span>
            </button>

            <button
              onClick={handleDownload}
              title="ডাউনলোড করুন"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ডাউনলোড</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-3 sm:p-5 flex flex-col items-center justify-center min-h-[350px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-semibold">ফাইল তৈরি ও প্রসেস করা হচ্ছে...</p>
            </div>
          ) : hasError || !safeUrl ? (
            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center max-w-md my-auto space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">ফাইল প্রিভিউতে সমস্যা হয়েছে</h4>
              <p className="text-xs text-slate-500">
                ফাইলটি সরাসরি ওপেন বা ডাউনলোড করতে নিচের বাটনে ক্লিক করুন।
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  ডাউনলোড করুন
                </button>
              </div>
            </div>
          ) : isPdf ? (
            <div className="w-full h-full min-h-[480px] flex flex-col gap-3">
              <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-inner relative">
                <object
                  data={safeUrl}
                  type="application/pdf"
                  className="w-full h-full min-h-[450px]"
                >
                  <iframe
                    src={safeUrl}
                    title={effectiveName}
                    className="w-full h-full min-h-[450px] border-none"
                  >
                    <div className="p-8 text-center space-y-3">
                      <p className="text-xs text-slate-600">
                        আপনার ব্রাউজারে সরাসরি PDF প্রদর্শিত হচ্ছে না।
                      </p>
                      <button
                        onClick={handleDownload}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                      >
                        PDF টি ডাউনলোড করুন
                      </button>
                    </div>
                  </iframe>
                </object>
              </div>

              {/* Bottom helper bar */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>PDF ডকুমেন্ট সঠিকভাবে তৈরি ও ভ্যালিডেট করা হয়েছে</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenExternal}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    নতুন ট্যাবে খুলুন
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    onClick={handleDownload}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    সরাসরি ফাইল সেভ করুন
                  </button>
                </div>
              </div>
            </div>
          ) : isImage ? (
            <div className="max-w-full max-h-[70vh] flex items-center justify-center p-2 bg-slate-900/5 rounded-xl border border-slate-200 overflow-hidden">
              <img
                src={safeUrl}
                alt={effectiveName}
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
          ) : (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center max-w-md my-auto space-y-4 shadow-sm">
              <FileText className="w-12 h-12 text-indigo-600 mx-auto" />
              <div>
                <h4 className="font-bold text-slate-900 text-base">{effectiveName}</h4>
                {notes && <p className="text-xs text-slate-500 mt-1">{notes}</p>}
              </div>
              <p className="text-xs text-slate-500">
                এই ফাইলটি ব্রাউজারে সরাসরি প্রিভিউ সমর্থিত নয়। অনুগ্রহ করে নিজের ডিভাইসে ডাউনলোড করুন।
              </p>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>ফাইল ডাউনলোড করুন</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

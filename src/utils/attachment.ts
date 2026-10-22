import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface AttachmentInfo {
  url: string;
  name: string;
  isPdf: boolean;
  isImage: boolean;
}

/**
 * Generates or validates a secure viewable/downloadable URL for an order attachment.
 * Checks Supabase Storage permissions or returns public/data URLs directly.
 */
export async function getSecureAttachmentUrl(attachmentUrl?: string | null, attachmentName?: string | null): Promise<AttachmentInfo | null> {
  if (!attachmentUrl) return null;

  const fileName = attachmentName || attachmentUrl.split('/').pop() || 'attachment';
  const cleanUrl = attachmentUrl.trim();
  const lowerName = fileName.toLowerCase();
  const lowerUrl = cleanUrl.toLowerCase();

  const isPdf = lowerName.endsWith('.pdf') || lowerUrl.includes('.pdf') || cleanUrl.startsWith('data:application/pdf');
  const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(lowerName) || cleanUrl.startsWith('data:image/');

  // If stored in Supabase Storage bucket 'order_attachments' or similar, attempt signed URL creation
  if (isSupabaseConfigured && supabase && cleanUrl.includes('/storage/v1/object/public/')) {
    try {
      const parts = cleanUrl.split('/storage/v1/object/public/');
      if (parts[1]) {
        const bucketAndPath = parts[1].split('/');
        const bucket = bucketAndPath[0];
        const path = bucketAndPath.slice(1).join('/');

        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600); // 1 hour signed URL
        if (!error && data?.signedUrl) {
          return {
            url: data.signedUrl,
            name: fileName,
            isPdf,
            isImage,
          };
        }
      }
    } catch (err) {
      console.warn('Storage signed URL failed, falling back to original URL:', err);
    }
  }

  return {
    url: cleanUrl,
    name: fileName,
    isPdf,
    isImage,
  };
}

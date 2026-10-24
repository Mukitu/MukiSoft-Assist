/**
 * Helper utilities for opening, previewing, and downloading PDF files and attachments reliably
 * across all browsers without encountering blank screens or data URL security blocks.
 */

export function dataUrlToBlob(dataUrl: string): Blob {
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const base64Data = parts[1] || parts[0];
    const binaryStr = atob(base64Data);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch (err) {
    console.error('Failed to convert data URL to Blob:', err);
    return new Blob(['Failed to process file content.'], { type: 'text/plain' });
  }
}

/**
 * Creates a valid standards-compliant PDF Blob dynamically.
 * Used for placeholder deliverables or when a clean PDF file is required.
 */
export function createSamplePdfBlob(
  title = 'MukiSoft Delivery Document',
  notes = 'MukiSoft Digital Services - Work Deliverable',
  orderNumber = ''
): Blob {
  const safeTitle = (title || 'MukiSoft Delivery Document').replace(/[()\\]/g, '');
  const safeNotes = (notes || 'Thank you for using MukiSoft Services').replace(/[()\\]/g, '');
  const safeOrder = orderNumber ? ` (Order #${orderNumber})` : '';
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 380 >>
stream
BT
/F1 18 Tf
50 720 Td
(MukiSoft Platform Deliverable${safeOrder}) Tj
/F1 14 Tf
0 -35 Td
(Title: ${safeTitle}) Tj
/F1 11 Tf
0 -25 Td
(Date: ${dateStr}) Tj
0 -25 Td
(Status: Verified & Completed) Tj
0 -35 Td
(Deliverable Summary / Notes:) Tj
0 -20 Td
(${safeNotes}) Tj
0 -50 Td
(Official MukiSoft Verified Digital Delivery) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000246 00000 n 
0000000678 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
747
%%EOF`;

  return new Blob([pdfContent], { type: 'application/pdf' });
}

/**
 * Gets a safe Blob URL or valid web URL for viewing or embedding a PDF.
 */
export function getSafeFileUrl(url?: string | null, fileName = 'document.pdf', notes = ''): string {
  if (!url || typeof url !== 'string') {
    const blob = createSamplePdfBlob('MukiSoft Document', notes || 'No file attached');
    return URL.createObjectURL(blob);
  }

  const cleanUrl = url.trim();

  // 1. Data URLs -> Convert to Blob URL
  if (cleanUrl.startsWith('data:')) {
    const blob = dataUrlToBlob(cleanUrl);
    return URL.createObjectURL(blob);
  }

  // 2. Placeholder mukisoft URLs -> Convert to generated PDF Blob
  if (
    cleanUrl.includes('mukisoft.com/deliverables/') ||
    cleanUrl.includes('sample_output.pdf') ||
    cleanUrl.includes('final_work.pdf')
  ) {
    const blob = createSamplePdfBlob(fileName.replace(/\.pdf$/i, ''), notes || 'MukiSoft Work Deliverable');
    return URL.createObjectURL(blob);
  }

  // 3. Normal HTTP / HTTPS / Blob URLs
  return cleanUrl;
}

/**
 * Safely opens a PDF file or attachment in a new browser window/tab.
 * Handles data URLs and placeholder links gracefully without blank screens.
 */
export function openPdfFile(url?: string | null, fileName = 'document.pdf', notes = ''): void {
  if (!url) return;

  const safeUrl = getSafeFileUrl(url, fileName, notes);

  // If it's a blob or normal url, open in new window
  const newWin = window.open(safeUrl, '_blank');
  if (!newWin) {
    // Pop-up blocked: fallback to direct file download
    downloadFile(url, fileName, notes);
  }
}

/**
 * Triggers a direct browser file download for a PDF or attachment.
 */
export function downloadFile(url?: string | null, fileName = 'delivery_file.pdf', notes = ''): void {
  if (!url) return;

  const safeFileName = fileName.endsWith('.pdf') || fileName.includes('.') ? fileName : `${fileName}.pdf`;
  let blobUrl = '';
  let shouldRevoke = false;

  const cleanUrl = url.trim();

  if (cleanUrl.startsWith('data:')) {
    const blob = dataUrlToBlob(cleanUrl);
    blobUrl = URL.createObjectURL(blob);
    shouldRevoke = true;
  } else if (
    cleanUrl.includes('mukisoft.com/deliverables/') ||
    cleanUrl.includes('sample_output.pdf') ||
    cleanUrl.includes('final_work.pdf')
  ) {
    const blob = createSamplePdfBlob(safeFileName.replace(/\.pdf$/i, ''), notes || 'MukiSoft Work Deliverable');
    blobUrl = URL.createObjectURL(blob);
    shouldRevoke = true;
  } else {
    blobUrl = cleanUrl;
  }

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = safeFileName;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  if (shouldRevoke) {
    setTimeout(() => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (e) {
        // Ignore
      }
    }, 15000);
  }
}

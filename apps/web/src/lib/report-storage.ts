import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface SaveReportResult {
  success: boolean;
  folder: string;
  fileName: string;
  fullPath: string;
  relativePath: string;
  url: string;
  size: number;
  message?: string;
}

export function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer as ArrayBuffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

export async function blobToBase64(blob: Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Không thể đọc dữ liệu binary của file'));
      reader.readAsDataURL(blob);
    });
  }
  const buffer = await blob.arrayBuffer();
  return arrayBufferToBase64(buffer);
}

/**
 * Send a file (Blob, ArrayBuffer, or Uint8Array) to backend to be saved locally
 * inside C:\Users\ADMIN\Documents\GitHub\Graduation-Project\Report\<folder>\<fileName>
 */
export async function saveReportToBackend(
  folder: string,
  fileName: string,
  blobOrBuffer: Blob | Uint8Array | ArrayBuffer,
  contentType?: string,
): Promise<SaveReportResult> {
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

  let base64 = '';
  if (blobOrBuffer instanceof Blob) {
    base64 = await blobToBase64(blobOrBuffer);
    contentType = contentType || blobOrBuffer.type;
  } else if (blobOrBuffer instanceof ArrayBuffer) {
    base64 = arrayBufferToBase64(blobOrBuffer);
  } else if (blobOrBuffer instanceof Uint8Array) {
    base64 = arrayBufferToBase64(blobOrBuffer.buffer);
  }

  const res = await fetch(`${apiUrl}/reports/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      folder,
      fileName,
      fileBase64: base64,
      contentType: contentType || 'application/octet-stream',
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi khi lưu phiếu vào Report: ${res.status}`);
  }

  return res.json();
}

/**
 * Convert an HTML element (e.g. print container) to high-quality PDF Blob
 */
export async function convertElementToPdfBlob(
  element: HTMLElement,
  format: 'a5' | 'a4' = 'a5',
  orientation: 'portrait' | 'landscape' = 'portrait',
): Promise<Blob> {
  // Capture canvas with 2x scale for sharp text and barcodes
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format,
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * pageWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pageHeight;

  while (heightLeft > 5) {
    position = position - pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
  }

  const pdfArrayBuffer = pdf.output('arraybuffer');
  return new Blob([pdfArrayBuffer], { type: 'application/pdf' });
}

/**
 * Helper to capture a print element, convert to PDF, and save locally into Report/<folder>/<fileName>
 */
export async function captureAndSavePrintPdf(
  element: HTMLElement | null,
  folder: string,
  fileName: string,
  format: 'a5' | 'a4' = 'a5',
): Promise<SaveReportResult | null> {
  if (!element) return null;
  try {
    const pdfBlob = await convertElementToPdfBlob(element, format);
    const result = await saveReportToBackend(folder, fileName, pdfBlob, 'application/pdf');
    return result;
  } catch (err) {
    console.warn('Lưu PDF vào thư mục Report thất bại:', err);
    return null;
  }
}

/**
 * Helper to save an Excel file buffer locally into Report/<folder>/<fileName>
 */
export async function saveExcelReportLocally(
  folder: string,
  fileName: string,
  buffer: Uint8Array | ArrayBuffer,
): Promise<SaveReportResult | null> {
  try {
    const result = await saveReportToBackend(
      folder,
      fileName,
      buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    return result;
  } catch (err) {
    console.warn('Lưu Excel vào thư mục Report thất bại:', err);
    return null;
  }
}

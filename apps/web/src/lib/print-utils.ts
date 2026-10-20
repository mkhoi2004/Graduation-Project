/**
 * Utility to execute printing with browser header & footer title suppression
 */
const ZERO_WIDTH_SPACE = '\u200B';
let originalDocTitle = '';

export function ensurePrintStyles() {
  if (typeof document === 'undefined') return;
  let styleEl = document.getElementById('__dental_page_print_style') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = '__dental_page_print_style';
    styleEl.textContent = `
      @page {
        size: A5 portrait;
        margin: 0;
      }
      @page {
        margin: 0;
      }
    `;
    document.head.appendChild(styleEl);
  }
}

if (typeof window !== 'undefined') {
  ensurePrintStyles();

  window.addEventListener('beforeprint', () => {
    ensurePrintStyles();
    originalDocTitle = document.title;
    // Use zero-width space: prevents browser from falling back to printing the URL, while rendering invisibly
    document.title = ZERO_WIDTH_SPACE;
  });

  window.addEventListener('afterprint', () => {
    if (originalDocTitle) {
      document.title = originalDocTitle;
    }
  });
}

export function triggerPrint(onPrinted?: () => void) {
  ensurePrintStyles();
  const prev = document.title;
  document.title = ZERO_WIDTH_SPACE;

  const handleAfter = () => {
    document.title = prev;
    window.removeEventListener('afterprint', handleAfter);
    onPrinted?.();
  };

  window.addEventListener('afterprint', handleAfter);

  window.print();

  // Safety fallback if afterprint does not fire or is delayed
  setTimeout(() => {
    if (document.title === ZERO_WIDTH_SPACE) {
      document.title = prev;
    }
  }, 1000);
}

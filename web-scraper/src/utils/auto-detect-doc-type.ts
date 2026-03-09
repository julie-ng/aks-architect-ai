/**
 * Auto-derive doc_type from URL path patterns common in MS Learn.
 * Returns null if no pattern is recognized.
 */
export function autoDetectDocType(url: string): string | null {
  const path = new URL(url).pathname.toLowerCase();

  if (path.includes('/concepts/') || path.includes('/concept-')) return 'concept';
  if (path.includes('/how-to/') || path.includes('/howto-')) return 'how-to';
  if (path.includes('/quickstart')) return 'quickstart';
  if (path.includes('/tutorial')) return 'tutorial';
  if (path.includes('/best-practice')) return 'best-practice';
  if (path.includes('/troubleshoot')) return 'troubleshooting';
  if (path.includes('/reference/') || path.includes('/api/')) return 'reference';
  if (path.includes('/overview') || path.includes('/intro-')) return 'overview';
  if (path.includes('/sample') || path.includes('/example')) return 'sample';

  return null;
}

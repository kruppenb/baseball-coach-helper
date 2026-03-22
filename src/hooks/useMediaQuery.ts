import { useState, useEffect, useRef } from 'react';

/**
 * React hook that evaluates a CSS media query and returns whether it matches.
 * Listens for changes and updates reactively.
 *
 * Ignores changes during window.print() to prevent component unmount/remount
 * that would destroy local state (e.g. lineup editor edits).
 *
 * @param query - A CSS media query string, e.g. "(min-width: 900px)"
 * @returns true if the media query currently matches, false otherwise
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  const isPrinting = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);

    const handler = (event: MediaQueryListEvent) => {
      if (!isPrinting.current) {
        setMatches(event.matches);
      }
    };

    const onBeforePrint = () => { isPrinting.current = true; };
    const onAfterPrint = () => {
      isPrinting.current = false;
      // Restore correct value after print dialog closes
      setMatches(mediaQueryList.matches);
    };

    mediaQueryList.addEventListener('change', handler);
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      mediaQueryList.removeEventListener('change', handler);
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, [query]);

  return matches;
}

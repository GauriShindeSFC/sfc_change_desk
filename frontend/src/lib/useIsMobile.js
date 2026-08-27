import { useState, useEffect } from 'react';

// True when the viewport is at or below the given breakpoint.
export const useIsMobile = (query = '(max-width: 768px)') => {
  const read = () =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(query).matches
      : false;

  const [isMobile, setIsMobile] = useState(read);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return isMobile;
};

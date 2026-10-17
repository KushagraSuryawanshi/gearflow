import { useEffect, useState } from 'react';

const navigationEvent = 'gearflow:navigate';

export function navigate(path: string) {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new Event(navigationEvent));
  window.scrollTo(0, 0);
}

export function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('popstate', update);
    window.addEventListener(navigationEvent, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(navigationEvent, update);
    };
  }, []);
  return path;
}

import { useEffect, useState } from 'react';
import { parseRoute } from '../../routes';

/** The `a` / `b` role ids of the current `#/compare?a=&b=` hash (read-only; navigation goes through `useNavigate`). */
export function useCompareRoute(): { a?: string; b?: string } {
  const read = () => {
    const r = parseRoute(location.hash);
    return r.name === 'compare' ? { a: r.a, b: r.b } : {};
  };
  const [params, setParams] = useState(read);
  useEffect(() => {
    const onChange = () =>
      setParams((prev) => {
        const next = read();
        return prev.a === next.a && prev.b === next.b ? prev : next;
      });
    window.addEventListener('hashchange', onChange);
    onChange();
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return params;
}

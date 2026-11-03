import { useLayoutEffect, useState, type RefObject } from 'react';

export const useElementWidth = (target: RefObject<HTMLElement | null>) => {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = target.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setWidth(Math.round(entry.contentRect.width));
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [target]);
  return width;
};

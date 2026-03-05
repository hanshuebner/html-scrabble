import { useSyncExternalStore } from 'react';

const query = '(min-width: 1024px)';

const subscribe = (callback: () => void) => {
  const mql = window.matchMedia(query);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
};

const getSnapshot = () => {
  return window.matchMedia(query).matches;
};

const getServerSnapshot = () => {
  return true;
};

export const useIsDesktop = (): boolean => {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};

// Client-side navigation for the two real URLs: "/" (the box) and "/how-it-works". Vercel rewrites every path to
// index.html, so both work on reload too.
import { patch } from './store/room';

export const isHow = () => location.pathname.replace(/\/$/, '') === '/how-it-works';
export function go(path: '/' | '/how-it-works') {
  if (location.pathname !== path) history.pushState(null, '', path);
  patch({ screen: path === '/how-it-works' ? 'how' : 'start' });
  window.scrollTo(0, 0);
}

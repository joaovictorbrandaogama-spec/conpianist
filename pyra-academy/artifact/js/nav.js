// Rotas internas. O artefato só garante um #nome simples na barra de endereço, então
// a navegação do jogo fica na memória: links com href="#..." são interceptados aqui.
let current = '';
const listeners = new Set();

export const currentRoute = () => current;
export const onRoute = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

/** Vai para uma rota como "#aula/c1-l1" ou "campus". */
export function go(hash) {
  current = String(hash || '').replace(/^#/, '');
  listeners.forEach((fn) => fn(current));
}

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
  const link = event.target.closest?.('a[href^="#"]');
  if (!link || link.getAttribute('aria-disabled') === 'true') return;
  const href = link.getAttribute('href');
  if (href === '#main' || href === '#') return;
  event.preventDefault();
  go(href);
});

// typewriter effect

export function typeInto(lineEl, text, { speed = 70, startDelay = 0 } = {}) {
  const textEl = lineEl.querySelector('.typed-text');
  const caretEl = lineEl.querySelector('.caret');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  return new Promise(resolve => {
    setTimeout(() => {
      if (reduced) {
        textEl.textContent = text;
        caretEl.classList.add('done');
        resolve();
        return;
      }
      let i = 0;
      (function step() {
        textEl.textContent = text.slice(0, i);
        if (i++ < text.length) {
          setTimeout(step, speed);
        } else {
          caretEl.classList.add('done');
          resolve();
        }
      })();
    }, startDelay);
  });
}

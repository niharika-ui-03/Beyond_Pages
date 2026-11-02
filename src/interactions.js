export function bindUI({ onOpen, onStep }) {
  const $ = (id) => document.getElementById(id);
  let hintGone = false;
  let asking = false;

  const closeAsk = () => {
    asking = false;
    $('ask').hidden = true;
  };

  $('open').addEventListener('click', onOpen);

  addEventListener('keydown', (e) => {
    if (asking) {
      if (e.key === 'Escape') closeAsk();
      return; // buttons work natively
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest?.('input, textarea')) return;

    if (e.key === 'ArrowRight' || e.key === 'PageDown') onStep(1);
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') onStep(-1);
    else if (
      (e.key === 'Enter' || e.key === ' ') &&
      !$('open').hidden &&
      document.activeElement !== $('open')
    ) {
      e.preventDefault();
      onOpen();
    }
  });

  return {
    hideLoader() { $('loader').classList.add('done'); },
    showError(msg) { $('loader').innerHTML = `<p>${msg}</p>`; },
    showOpen() { $('open').hidden = false; },
    hideOpen() { $('open').hidden = true; },
    showHint() { if (!hintGone) $('hint').classList.add('show'); },
    hideHint() { hintGone = true; $('hint').classList.remove('show'); },
    announce(t) { $('live').textContent = t; },
    get asking() { return asking; },
    ask(n, text, onAnswer) {
      asking = true;
      $('ask-n').textContent = `Question ${n} of 9`;
      $('ask-q').textContent = text;
      $('ask-msg').textContent = '';
      $('ask').hidden = false;
      $('ask-yes').focus();
      const answer = (choice) => {
        const r = onAnswer(choice);
        if (r.ok) closeAsk();
        else $('ask-msg').textContent = r.msg;
      };
      $('ask-yes').onclick = () => answer('yes');
      $('ask-no').onclick = () => answer('no');
    },
  };
}
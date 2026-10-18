// Shared by all learning stages. Emits no progress or reward changes.
(() => {
  const surface = document.createElement('div');
  surface.className = 'answer-reaction';
  surface.hidden = true;
  surface.setAttribute('aria-hidden', 'true');
  const sparks = document.createElement('div');
  sparks.className = 'reaction-sparks';
  const card = document.createElement('div');
  card.className = 'reaction-card';
  const face = document.createElement('span');
  face.className = 'reaction-face';
  const copy = document.createElement('div');
  const title = document.createElement('strong');
  const note = document.createElement('span');
  copy.append(title, note);
  card.append(face, copy);
  surface.append(sparks, card);
  document.body.append(surface);
  let timer;
  function dismiss() {
    clearTimeout(timer);
    surface.hidden = true;
    sparks.replaceChildren();
  }
  function show({type = 'encourage', title: heading, message} = {}) {
    dismiss();
    const success = type === 'success';
    const hint = type === 'hint';
    surface.dataset.type = success ? 'success' : hint ? 'hint' : 'encourage';
    face.textContent = success ? '🥳' : hint ? '🌱' : '💪';
    title.textContent = heading || (success ? '恭喜你，答对啦！' : hint ? '准备好了就试试吧' : '再接再厉，你可以的！');
    note.textContent = message || (success ? '每一次尝试，都算数。' : '看看提示，再试一次。');
    if (success) {
      const colors = ['#cb8761', '#d6b46c', '#91a17d', '#d8a69a'];
      for (let index = 0; index < 20; index++) {
        const spark = document.createElement('i');
        const angle = index / 20 * Math.PI * 2;
        const radius = 80 + index % 4 * 22;
        spark.style.setProperty('--x', `${Math.cos(angle) * radius}px`);
        spark.style.setProperty('--y', `${Math.sin(angle) * radius - 35}px`);
        spark.style.setProperty('--spin', `${index * 67}deg`);
        spark.style.setProperty('--delay', `${index % 5 * 25}ms`);
        spark.style.backgroundColor = colors[index % colors.length];
        sparks.append(spark);
      }
    }
    surface.hidden = false;
    // Restart the short entrance even when answers are checked in quick succession.
    for (const element of [card, face]) {
      element.style.animation = 'none';
      void element.offsetWidth;
      element.style.animation = '';
    }
    timer = setTimeout(dismiss, 3000);
  }
  window.CampusFeedback = Object.freeze({show, dismiss});
  window.addEventListener('campus:feedback', event => show(event.detail));
  window.addEventListener('hashchange', dismiss);
  document.addEventListener('visibilitychange', () => { if (document.hidden) dismiss(); });
})();

const pages = ['welcome', 'campus', 'learn', 'practice', 'apply', 'result', 'gpt', 'jianying', 'course-lesson', 'course-result'];
function showPage() {
  const requested = window.location.hash.slice(1).split('/')[0];
  const current = pages.includes(requested) ? requested : 'welcome';
  for (const page of pages) document.getElementById(page).hidden = page !== current;
  for (const link of document.querySelectorAll('[data-nav]')) {
    const active = link.dataset.nav === current || (['practice', 'apply', 'result'].includes(current) && link.dataset.nav === 'learn');
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  const titles = {welcome: '每天学会一点', campus: '我的校园', learn: '找一找 · 第 1 关', practice: '补一补 · 第 2 关', apply: '试一试 · 第 3 关', result: '我的学习成果'};
  document.title = `AI Campus · ${titles[current] || ({gpt:'如何使用 GPT',jianying:'如何使用剪映','course-lesson':'任务练习','course-result':'本节成果'})[current]}`;
  window.scrollTo(0, 0);
  if (requested) {
    const heading = document.querySelector(`#${current} h1`);
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({preventScroll: true});
    }
  }
}
window.addEventListener('hashchange', showPage);
showPage();

const thoughts = [
  '你不必准备好一切，才开始。',
  '每一次「我试试」，都在拓宽你的可能。',
  '把今天的一点好奇，变成明天的底气。'
];
const thoughtText = document.getElementById('thought-text');
const thoughtToggle = document.getElementById('thought-toggle');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let thoughtIndex = 0;
let thoughtPaused = motionPreference.matches;
let thoughtTimer;
let thoughtTransition;
function updateThoughtControl() {
  const label = thoughtPaused ? '播放文案轮换' : '暂停文案轮换';
  thoughtToggle.setAttribute('aria-label', label);
  thoughtToggle.title = label;
  thoughtToggle.innerHTML = thoughtPaused
    ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 4 6 4-6 4Z" fill="currentColor"/></svg>'
    : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 4v8M11 4v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
}
function scheduleThoughts() {
  clearInterval(thoughtTimer);
  clearTimeout(thoughtTransition);
  thoughtText.classList.remove('changing');
  updateThoughtControl();
  if (thoughtPaused) return;
  thoughtTimer = setInterval(() => {
    if (document.hidden || document.getElementById('welcome').hidden) return;
    thoughtText.classList.add('changing');
    thoughtTransition = setTimeout(() => {
      thoughtIndex = (thoughtIndex + 1) % thoughts.length;
      thoughtText.textContent = thoughts[thoughtIndex];
      thoughtText.classList.remove('changing');
    }, 300);
  }, 5500);
}
thoughtToggle.addEventListener('click', () => {
  thoughtPaused = !thoughtPaused;
  scheduleThoughts();
});
motionPreference.addEventListener('change', event => {
  thoughtPaused = event.matches;
  scheduleThoughts();
});
scheduleThoughts();



// Only this origin's AI Campus record is read, written or removed.
(() => {
  const key = 'ai-campus.prompt-intro.v1';
  const fields = ['audience', 'task', 'context', 'format', 'limits'];
  function clean(raw) {
    if (!raw || raw.version !== 1 || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
    const finalPrompt = text(raw.finalPrompt, 3000);
    const completedOn = /^\d{4}-\d{2}-\d{2}$/.test(raw.completedOn) ? raw.completedOn : '';
    return {
      version: 1,
      learnCompleted: raw.learnCompleted === true,
      practiceCompleted: raw.practiceCompleted === true,
      applyCompleted: raw.applyCompleted === true && finalPrompt.trim().length > 0,
      learnAnswer: ['length', 'specific', 'formal'].includes(raw.learnAnswer) ? raw.learnAnswer : '',
      practice: Object.fromEntries(fields.map(field => [field, text(raw.practice?.[field], field === 'limits' ? 400 : 200)])),
      applyDraft: text(raw.applyDraft, 3000),
      finalPrompt,
      completedOn
    };
  }
  window.CampusStore = Object.freeze({
    load() {
      try { return {data: clean(JSON.parse(localStorage.getItem(key))), available: true}; }
      catch { return {data: null, available: false}; }
    },
    save(data) {
      try { localStorage.setItem(key, JSON.stringify(clean(data))); return true; }
      catch { return false; }
    },
    clear() {
      try { localStorage.removeItem(key); return true; }
      catch { return false; }
    }
  });
})();

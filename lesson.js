const storedProgress = window.CampusStore.load();
const savedProgress = storedProgress.data;
let restoringProgress = true;
let learnCompleted = savedProgress?.learnCompleted || false;
let practiceCompleted = savedProgress?.practiceCompleted || false;
let applyCompleted = savedProgress?.applyCompleted || false;
let completedOn = savedProgress?.completedOn || '';
function campusDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
function saveLearningProgress() {
  if (restoringProgress) return;
  const ok = window.CampusStore.save({
    version:1, learnCompleted, practiceCompleted, applyCompleted, completedOn,
    learnAnswer:question.querySelector('input:checked')?.value || '',
    practice:readPractice(), applyDraft:applyInput.value,
    finalPrompt:document.getElementById('result-prompt-text').textContent
  });
  document.getElementById('storage-status').textContent = ok
    ? '学习记录已保存在当前浏览器，刷新后可以继续。'
    : '浏览器暂时无法保存记录，请先复制需要保留的提问。关闭或刷新页面可能丢失进度。';
}
function updateLearningProgress() {
  const completed = Number(learnCompleted) + Number(practiceCompleted) + Number(applyCompleted);
  document.querySelectorAll('.growth-stats strong')[1].firstChild.textContent = String(completed);
  document.querySelector('.growth .progress-note').textContent = `已完成 ${completed} / 3 关`;
  document.querySelector('.empty-progress span').style.width = `${completed / 3 * 100}%`;
  document.querySelectorAll('.task-progress span').forEach((step, index) => {
    const done = [learnCompleted, practiceCompleted, applyCompleted][index];
    step.classList.toggle('done', done);
    step.querySelector('b').textContent = done ? '✓' : String(index + 1);
  });
  const campusButton = document.querySelector('.today-main .button');
  campusButton.firstChild.textContent = !learnCompleted ? '开始第一关 ' : !practiceCompleted ? '继续第二关 ' : !applyCompleted ? '继续第三关 ' : '查看本节成果 ';
  campusButton.href = !learnCompleted ? '#learn' : !practiceCompleted ? '#practice' : !applyCompleted ? '#apply' : '#result';
  if (completed === 3) {
    if (!completedOn) completedOn = campusDate();
    document.querySelector('.growth .overline').textContent = '你的第一枚纪念';
    document.querySelector('.growth>p:not(.overline)').textContent = '三小步完成，初次提问纪念已获得。';
    document.querySelector('.growth .medal').classList.add('earned');
    document.getElementById('result-badge').hidden = false;
  }
  const yesterday = campusDate(new Date(Date.now() - 86400000));
  document.querySelector('.growth-stats strong').firstChild.textContent = completedOn && [campusDate(), yesterday].includes(completedOn) ? '1' : '0';
  document.getElementById('result-completed').textContent = `${completed} / 3`;
  document.getElementById('result-xp').textContent = `${completed} XP`;
  document.getElementById('result-description').textContent = completed === 3 ? '本节的三关完成了。你已经尝试把一个模糊的想法，写成自己的提问。' : '独立尝试已记录。你还可以回到前面的关卡，完成本节的三小步。';
  saveLearningProgress();
  window.CampusAcademy?.refreshSummary();
}
const question = document.getElementById('learn-question');
const feedback = document.getElementById('learn-feedback');
const checkButton = document.getElementById('check-answer');
function showFeedback(title, body, correct = false) {
  document.getElementById('learn-feedback-title').textContent = title;
  document.getElementById('learn-feedback-body').textContent = body;
  feedback.classList.toggle('correct', correct);
  feedback.hidden = false;
}
question.addEventListener('submit', event => {
  event.preventDefault();
  const selected = question.querySelector('input:checked');
  if (!selected) {
    showFeedback('先选一个你认为合适的答案。', '可以再对照一下 B：它说明了给谁看、分几条、每条多长。');
    window.CampusFeedback.show({type: 'hint', message: '选一个答案，迈出这一步。'});
    question.querySelector('input').focus();
    return;
  }
  if (selected.value !== 'specific') {
    const explanations = {
      length: '提问更长，不代表内容更准确。再看看 B：新增的信息有没有帮助你判断回答是否符合要求？',
      formal: '自然表达也可以把需求说清楚。再看看 B：它对读者、结构和长度做了哪些具体说明？'
    };
    showFeedback('再观察一下，你离答案很近了。', explanations[selected.value]);
    window.CampusFeedback.show({type: 'encourage'});
    checkButton.firstChild.textContent = '再检查一次 ';
    return;
  }
  if (!learnCompleted) {
    learnCompleted = true;
    updateLearningProgress();
  }
  showFeedback('答对了。具体的要求，让回答更容易用。', '“大学新生能理解”明确了读者；“3 个核心观点 + 现实案例”说明了输出结构；“每个观点不超过 50 字”限定了长度。这些要求帮助 AI 对齐需求，但仍不能保证事实准确。', true);
  window.CampusFeedback.show({type: 'success'});
  for (const input of question.querySelectorAll('input')) input.disabled = true;
  checkButton.hidden = true;
  document.getElementById('lesson-complete').hidden = false;
  document.getElementById('learn-reward').hidden = false;
});
question.addEventListener('change', () => {
  if (!learnCompleted) feedback.hidden = true;
});

const practiceForm = document.getElementById('practice-form');
const practiceKeys = ['audience', 'task', 'context', 'format', 'limits'];
function normalizePracticeExample(value) {
  return value.normalize('NFKC').replace(/^\s*例如\s*[:：]?\s*/u, '').replace(/[\p{P}\p{Z}\s]/gu, '').toLowerCase();
}
const practiceErrors = {
  audience: '补充你的身份或听众，让 AI 知道面向谁。',
  task: '写明主题和希望完成的任务。',
  context: '补充使用场景或演讲时长。',
  format: '描述你希望看到的结构或输出形式。',
  limits: '补充长度、语言风格或资料核查等要求。'
};
function readPractice() {
  return Object.fromEntries(practiceKeys.map(key => [key, practiceForm.elements.namedItem(key).value.trim()]));
}
function renderPrompt() {
  const values = readPractice();
  const segments = [values.audience, values.task, values.context, values.format && `输出结构：${values.format}`, values.limits && `具体要求：${values.limits}`].filter(Boolean);
  document.getElementById('assembled-prompt').textContent = segments.length ? segments.join('；') + '。' : '帮我写一个演讲稿。';
  document.getElementById('practice-field-count').textContent = `已补充 ${segments.length} / 5 项`;
}
practiceForm.addEventListener('input', event => {
  renderPrompt();
  document.getElementById('practice-feedback').hidden = true;
  document.getElementById('practice-completion').hidden = true;
  if (practiceKeys.includes(event.target.name)) {
    event.target.removeAttribute('aria-invalid');
    document.getElementById(`${event.target.name}-error`).hidden = true;
  }
});
practiceForm.addEventListener('submit', event => {
  event.preventDefault();
  const values = readPractice();
  const missing = practiceKeys.filter(key => !values[key] || !/[\p{L}\p{N}]/u.test(values[key]));
  const copied = practiceKeys.filter(key => {
    const field = practiceForm.elements.namedItem(key);
    return !missing.includes(key) && normalizePracticeExample(values[key]) === normalizePracticeExample(field.placeholder);
  });
  const invalidKeys = [...missing, ...copied];
  for (const key of practiceKeys) {
    const field = practiceForm.elements.namedItem(key);
    const error = document.getElementById(`${key}-error`);
    const invalid = invalidKeys.includes(key);
    field.setAttribute('aria-invalid', String(invalid));
    error.textContent = copied.includes(key) ? '这项和示例一样，请结合自己的任务重新表达。只改标点或空格也不算修改。' : (invalid ? practiceErrors[key] : '');
    error.hidden = !invalid;
  }
  const panel = document.getElementById('practice-feedback');
  panel.hidden = false;
  panel.classList.toggle('correct', invalidKeys.length === 0);
  document.getElementById('practice-feedback-title').textContent = invalidKeys.length ? (copied.length ? '试着换成你自己的表达。' : `还差 ${missing.length} 项，让想法更完整。`) : '五项信息补齐了，试着读一遍你的提问。';
  document.getElementById('practice-feedback-body').textContent = invalidKeys.length
    ? '已保留你写好的内容。请修改标注的输入：补充缺失信息，并把照抄的示例换成自己的需求。'
    : '你已经补充了背景、任务、场景、结构和限制。再想想：有没有互相冲突的要求？讲稿是否适合听众和时长？本次仅检查填写完整性，下一关将尝试独立写提问。';
  if (invalidKeys.length) {
    window.CampusFeedback.show({type: 'encourage', message: copied.length ? '换成自己的表达，再试一次。' : '补上缺少的信息，再试一次。'});
    document.getElementById('practice-completion').hidden = true;
    practiceForm.elements.namedItem(practiceKeys.find(key => invalidKeys.includes(key))).focus();
    return;
  }
  if (!practiceCompleted) {
    practiceCompleted = true;
    updateLearningProgress();
  }
  document.getElementById('practice-completion').hidden = false;
  window.CampusFeedback.show({type: 'success', title: '检查通过，做得不错！', message: '你的要求，已经更清楚了一步。'});
  panel.scrollIntoView({block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
});

const applyForm = document.getElementById('apply-form');
const applyInput = document.getElementById('apply-prompt');
let reviewedPrompt = '';
const applyCriteria = [
  {title:'复习目标', pattern: /复习|备考|考试|掌握|薄弱|review|exam|revise/i, found:'找到了复习或考试目标的文字线索。', missing:'说明你想复习什么、解决什么困难。'},
  {title:'资料与背景', pattern: /pdf|资料|教材|讲义|附件|上传|课程|材料|document|notes|course/i, found:'找到了课程或资料背景的文字线索。', missing:'说明课程和资料来源，例如会提供老师的课程 PDF。'},
  {title:'输出格式', pattern: /表格|清单|计划|分点|列表|提纲|知识点|章节|步骤|table|list|plan|outline/i, found:'找到了计划、清单或结构化输出的文字线索。', missing:'指定输出形式，让答案可以直接用于复习。'},
  {title:'时间或范围限制', pattern: /分钟|小时|每天|下周|[0-9一二三四五六七八九十两]+\s*天|范围|以内|不超过|minutes?|hours?|daily|week/i, found:'找到了时间或范围限制的文字线索。', missing:'告诉 AI 剩余时间、每天可用时间或复习范围。'}
];
applyInput.addEventListener('input', () => {
  document.getElementById('apply-count').textContent = `${applyInput.value.length} / 3000`;
  document.getElementById('apply-review').hidden = true;
  document.getElementById('apply-error').hidden = true;
  applyInput.removeAttribute('aria-invalid');
  reviewedPrompt = '';
});
applyForm.addEventListener('submit', event => {
  event.preventDefault();
  const text = applyInput.value.trim();
  const error = document.getElementById('apply-error');
  if ((text.match(/[\p{L}\p{N}]/gu) || []).length < 10) {
    error.textContent = '请写出一段自己的提问，至少包含 10 个文字或数字，再看看反馈。';
    error.hidden = false;
    applyInput.setAttribute('aria-invalid', 'true');
    window.CampusFeedback.show({type:'encourage',message:'多说一点你的任务，我们再一起看看。'});
    applyInput.focus();
    return;
  }
  const priorExamples = [...practiceKeys.map(key => practiceForm.elements.namedItem(key).placeholder), '帮我总结这篇文章', '请用大学新生能理解的语言，把这篇文章总结成3个核心观点，每个观点不超过50字，并给出一个现实案例'];
  if (priorExamples.some(example => normalizePracticeExample(example) === normalizePracticeExample(text))) {
    error.textContent = '这段和之前的示例一样。请换成你自己的课程复习需求。';
    error.hidden = false;
    applyInput.setAttribute('aria-invalid', 'true');
    window.CampusFeedback.show({type:'encourage',message:'用自己的表达，再试一次。'});
    applyInput.focus();
    return;
  }
  error.hidden = true;
  applyInput.removeAttribute('aria-invalid');
  reviewedPrompt = text;
  const results = applyCriteria.map(item => ({...item, present:item.pattern.test(text)}));
  const matched = results.filter(item => item.present).length;
  document.getElementById('apply-dimensions').replaceChildren(...results.map(item => {
    const row = document.createElement('li');
    row.className = item.present ? 'dimension-found' : 'dimension-missing';
    const title = document.createElement('strong');
    title.textContent = `${item.present ? '✓ 已发现' : '○ 可补充'} · ${item.title}`;
    const detail = document.createElement('p');
    detail.textContent = item.present ? item.found : item.missing;
    row.append(title,detail);
    return row;
  }));
  document.getElementById('apply-review-title').textContent = matched === 4 ? '四项线索都有了，再检查是否符合你的本意。' : '找到下一步可以补充的地方了。';
  document.getElementById('apply-summary').textContent = `规则检查发现 ${matched} / 4 项信息线索。${matched === 4 ? '还可以补充：只依据提供的资料，不确定的信息标出来。' : '你可以按下方提示修改，也可以带着这些建议完成本次尝试。'}`;
  document.getElementById('apply-review').hidden = false;
  document.getElementById('apply-review-title').focus({preventScroll:true});
  document.getElementById('apply-review').scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  window.CampusFeedback.show(matched === 4 ? {type:'success',title:'提问更清楚了，做得不错！',message:'再检查一下内容是否准确、可执行。'} : {type:'encourage',title:'再接再厉，又找到一个改进方向！',message:'把提示用上，再问得清楚一点。'});
});
document.getElementById('finish-apply').addEventListener('click', () => {
  if (!reviewedPrompt || reviewedPrompt !== applyInput.value.trim()) return;
  applyCompleted = true;
  document.getElementById('result-prompt-text').textContent = reviewedPrompt;
  updateLearningProgress();
  document.getElementById('copy-result-status').textContent = '';
  window.location.hash = 'result';
});
document.getElementById('copy-result').addEventListener('click', async () => {
  const text = document.getElementById('result-prompt-text').textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    document.getElementById('copy-result-status').textContent = '已复制';
  } catch {
    document.getElementById('copy-result-status').textContent = '复制未成功，请选中文字手动复制。';
  }
});
document.getElementById('copy-reference').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(document.getElementById('reference-prompt-text').textContent);
    document.getElementById('copy-reference-status').textContent = '已复制';
  } catch {
    document.getElementById('copy-reference-status').textContent = '复制未成功，请选中文字手动复制。';
  }
});
if (savedProgress) {
  for (const key of practiceKeys) practiceForm.elements.namedItem(key).value = savedProgress.practice[key];
  applyInput.value = savedProgress.applyDraft;
  document.getElementById('apply-count').textContent = `${applyInput.value.length} / 3000`;
  document.getElementById('result-prompt-text').textContent = savedProgress.finalPrompt;
  const answer = learnCompleted ? 'specific' : savedProgress.learnAnswer;
  const savedRadio = [...question.querySelectorAll('input')].find(input => input.value === answer);
  if (savedRadio) savedRadio.checked = true;
  if (learnCompleted) {
    showFeedback('这一关你已经完成了。', '你找到了读者背景、输出结构和长度要求。可以继续下一关，也可以回顾这两个提问。', true);
    for (const input of question.querySelectorAll('input')) input.disabled = true;
    checkButton.hidden = true;
    document.getElementById('lesson-complete').hidden = false;
    document.getElementById('learn-reward').hidden = false;
    document.getElementById('learn-reward').textContent = '第 1 关已完成 · 已获得 1 XP';
  }
  if (practiceCompleted) {
    document.getElementById('practice-completion').hidden = false;
    document.querySelector('#practice-completion .reward-note').textContent = '第 2 关已完成 · 已获得 1 XP';
  }
}
renderPrompt();
restoringProgress = false;
updateLearningProgress();
for (const form of [question,practiceForm,applyForm]) {
  form.addEventListener('input', saveLearningProgress);
  form.addEventListener('change', saveLearningProgress);
}
const resetDialog = document.getElementById('reset-records-dialog');
document.getElementById('open-reset-records').addEventListener('click', () => {
  document.getElementById('reset-records-error').textContent = '';
  resetDialog.showModal();
});
document.getElementById('confirm-reset-records').addEventListener('click', () => {
  if (!window.CampusAcademyState.clear() || !window.CampusStore.clear()) {
    document.getElementById('reset-records-error').textContent = '暂时无法清除，请检查浏览器的存储权限后重试。';
    return;
  }
  // Reload only after this app's record was successfully removed.
  window.location.replace(window.location.pathname + window.location.search + '#campus');
  window.location.reload();
});
for (const note of document.querySelectorAll('.result-content>.lesson-footnote')) {
  note.textContent = '学习记录仅保存在当前浏览器，可在校园首页清除。不跨设备同步。';
}
window.addEventListener('hashchange', () => {
  if (window.location.hash === '#result' && learnCompleted && practiceCompleted && applyCompleted) {
    window.CampusFeedback.show({type:'success',title:'今天的三关，完成啦！',message:'初次提问纪念，送给迈出这一步的你。'});
  }
});

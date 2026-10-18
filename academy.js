(() => {
  const store = window.CampusAcademyState;
  const curriculum = window.CampusCurriculum;
  const payDialog = document.getElementById('academy-pay-dialog');
  let currentLesson = '';
  let currentIndex = 0;
  function el(tag, text, className) {
    const node=document.createElement(tag);
    if(text!==undefined)node.textContent=text;
    if(className)node.className=className;
    return node;
  }
  function link(text,href,className){const node=el('a',text,className);node.href=href;return node;}
  function countLesson(id){return store.read().completed.filter(key=>key.startsWith(id+':')).length;}
  function refreshSummary(){
    const state=store.read();
    document.querySelectorAll('[data-wallet-balance]').forEach(node=>node.textContent=String(state.balance));
    const old=window.CampusStore.load().data;
    const base=old ? Number(old.learnCompleted)+Number(old.practiceCompleted)+Number(old.applyCompleted) : 0;
    document.querySelectorAll('.growth-stats strong')[1].firstChild.textContent=String(base+state.completed.length);
    const days=new Set([...state.studyDays,...(old?.completedOn ? [old.completedOn] : [])]);
    const dateString=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
    let cursor=new Date(),streak=0;
    if(!days.has(dateString(cursor)))cursor=new Date(cursor.getTime()-86400000);
    while(days.has(dateString(cursor)) && streak<367){streak++;cursor=new Date(cursor.getTime()-86400000);}
    document.querySelector('.growth-stats strong').firstChild.textContent=String(streak);
    document.getElementById('jianying-status').textContent=state.jianyingUnlocked ? '已解锁' : '29 体验币解锁';
    const action=document.getElementById('jianying-campus-action');
    action.firstChild.textContent=state.jianyingUnlocked ? '进入学习 ' : '付费学习 ';
    action.setAttribute('aria-label',state.jianyingUnlocked ? '进入剪映任务包学习' : '使用体验币付费学习剪映');
    if(state.jianyingUnlocked)action.removeAttribute('aria-haspopup');else action.setAttribute('aria-haspopup','dialog');
    const gptCount=countLesson('gpt-basics');
    document.getElementById('gpt-campus-action').firstChild.textContent=gptCount===3 ? '回顾第二节 ' : gptCount ? '继续第二节 ' : '开始第二节 ';
  }
  function openPay(){
    if(store.read().jianyingUnlocked){window.location.hash='jianying';return;}
    document.getElementById('academy-pay-title').textContent='解锁「如何使用剪映」';
    document.getElementById('academy-pay-message').textContent='';
    document.getElementById('academy-confirm-pay').hidden=false;
    document.getElementById('academy-enter-paid').hidden=true;
    refreshSummary();
    if(!payDialog.open)payDialog.showModal();
  }
  document.querySelectorAll('[data-buy-jianying]').forEach(button=>button.addEventListener('click',openPay));
  document.getElementById('academy-close-pay').addEventListener('click',()=>payDialog.close());
  document.getElementById('academy-enter-paid').addEventListener('click',()=>{
    payDialog.close();
    if(window.location.hash==='#jianying')renderCatalog('jianying');
  });
  document.getElementById('academy-confirm-pay').addEventListener('click',()=>{
    const result=store.unlock();
    document.getElementById('academy-pay-message').textContent=result.ok ? (result.already ? '任务包已解锁，不会再次扣除体验币。' : `模拟支付成功，剩余 ${store.read().balance} 体验币。`) : result.reason;
    if(!result.ok)return;
    document.getElementById('academy-pay-title').textContent='解锁成功，开始新的一小步。';
    document.getElementById('academy-confirm-pay').hidden=true;
    document.getElementById('academy-enter-paid').hidden=false;
    refreshSummary();
    if(window.location.hash==='#jianying')renderCatalog('jianying');
  });
  function renderCatalog(course){
    const state=store.read();
    const container=document.getElementById(course+'-catalog');
    container.replaceChildren();
    container.append(link('← 返回校园','#campus','catalog-back'));
    const header=el('section',undefined,'catalog-heading');
    header.append(el('p',course==='gpt' ? 'AI FOUNDATIONS · 第 2 节' : 'CREATE SOMETHING OF YOUR OWN','eyebrow'),el('h1',course==='gpt' ? '如何使用 GPT' : '如何使用剪映'));
    header.append(el('p',course==='gpt' ? '会提问之后，学着继续对话、检查信息，让回答更适合你。' : '从第一个镜头开始，把校园生活剪成自己的作品。','muted'));
    if(course==='gpt')header.append(el('span','免费学习 · 3 个任务 · 约 5 分钟','catalog-meta'));
    else {
      header.append(el('span','8 节路线 · 前 2 节共 6 个任务已开放 · 其余内容筹备中','catalog-meta'));
      const payment=el('div',undefined,'catalog-payment');
      payment.append(el('p',state.jianyingUnlocked ? `任务包已解锁 · 余额 ${state.balance} 体验币` : `体验价 29 体验币 · 你的余额 ${state.balance} 体验币`));
      if(!state.jianyingUnlocked){const buy=el('button','付费学习 · 29 体验币','button primary');buy.type='button';buy.addEventListener('click',openPay);payment.append(buy);}
      payment.append(el('small','模拟体验，不涉及真实支付。解锁后可学习已开放的前两节。'));
      header.append(payment);
    }
    container.append(header);
    const outline=course==='gpt' ? [{id:'gpt-basics',title:'继续追问，检查并改进回答'}] : window.CampusJianyingOutline;
    const list=el('ol',undefined,'catalog-list');
    outline.forEach((lesson,index)=>{
      const row=el('li',undefined,'catalog-row');
      row.append(el('span',course==='gpt' ? '02' : String(index+1).padStart(2,'0'),'catalog-number'));
      const copy=el('div',undefined,'catalog-copy');copy.append(el('h2',lesson.title));
      const completed=lesson.id ? countLesson(lesson.id) : 0;
      copy.append(el('p',!lesson.id ? '内容筹备中，暂不可学习。' : `${completed} / 3 任务已完成 · 约 5 分钟`));row.append(copy);
      if(!lesson.id){const waiting=el('button','筹备中','package-action');waiting.disabled=true;row.append(waiting);}
      else if(course==='jianying' && !state.jianyingUnlocked){const locked=el('button','解锁后学习','package-action');locked.type='button';locked.addEventListener('click',openPay);row.append(locked);}
      else row.append(link(completed===3 ? '回顾本节 ↗' : completed ? '继续学习 ↗' : '开始学习 ↗',`#course-lesson/${lesson.id}`,'package-action'));
      list.append(row);
    });
    container.append(list);
  }
  function showQuestionFeedback(title,description,reference){
    const panel=document.getElementById('academy-feedback');panel.replaceChildren(el('strong',title),el('p',description));
    if(reference){panel.append(el('p','参考答案：'+reference));}
    panel.hidden=false;
  }
  function unavailable(title,description,course='jianying'){
    document.getElementById('academy-title').textContent=title;
    document.getElementById('academy-context').textContent=description;
    document.getElementById('academy-form').hidden=true;
    document.getElementById('academy-back').href='#'+course;
    document.getElementById('academy-label').textContent='学习目录';
    document.getElementById('academy-count').textContent='';
    document.getElementById('academy-step').textContent='';
    document.getElementById('academy-source').replaceChildren();
  }
  function renderLesson(id,requestedIndex){
    const lesson=curriculum[id];
    if(!lesson){unavailable('这节内容还没有开放。','可以先回到目录，选择已经开放的小节。');return;}
    if(lesson.course==='jianying' && !store.read().jianyingUnlocked){unavailable('先解锁，再开始剪映练习。','回到剪映目录，可使用赠送的体验币完成模拟支付。');return;}
    currentLesson=id;
    const state=store.read();
    const nextMissing=lesson.questions.findIndex((_,i)=>!state.completed.includes(`${id}:${i}`));
    const parsedIndex=Number(requestedIndex);
    currentIndex=requestedIndex!==undefined && Number.isInteger(parsedIndex) && parsedIndex>=0 && parsedIndex<3 ? parsedIndex : (nextMissing<0 ? 0 : nextMissing);
    const question=lesson.questions[currentIndex];
    const key=`${id}:${currentIndex}`;
    const draft=state.drafts[key];
    const done=state.completed.includes(key);
    const form=document.getElementById('academy-form');form.hidden=false;
    document.getElementById('academy-back').href='#'+lesson.course;
    document.getElementById('academy-label').textContent=lesson.label;
    document.getElementById('academy-count').textContent=`0${currentIndex+1} / 03`;
    document.getElementById('academy-step').textContent=['找一找 · LEARN','练一练 · PRACTICE','自己试试 · APPLY'][currentIndex];
    document.getElementById('academy-title').textContent=question.title;
    document.getElementById('academy-context').textContent=question.context;
    const inputs=document.getElementById('academy-inputs');inputs.replaceChildren();
    if(question.type==='choice'){
      const group=el('fieldset');group.append(el('legend','选择最合适的一项','question-help'));
      question.options.forEach((text,i)=>{const label=el('label',undefined,'answer-option');const input=el('input');input.type='radio';input.name='academy-answer';input.value=String(i);input.checked=draft===String(i);label.append(input,el('span',text));group.append(label);});inputs.append(group);
    }else if(question.type==='order'){
      const group=el('fieldset');group.append(el('legend','为每一步选择对应的操作','question-help'));
      for(let i=0;i<3;i++){const label=el('label',undefined,'order-label');label.append(el('span',`第 ${i+1} 步`));const select=el('select');select.name=`order-${i}`;const blank=el('option','请选择操作');blank.value='';select.append(blank);question.options.forEach((text,index)=>{const option=el('option',text);option.value=String(index);select.append(option);});select.value=Array.isArray(draft) ? draft[i] || '' : '';label.append(select);group.append(label);}inputs.append(group);
    }else{
      const label=el('label','写下你自己的方案','academy-text-label');label.htmlFor='academy-written-answer';
      const input=el('textarea');input.id='academy-written-answer';input.name='academy-written-answer';input.rows=6;input.maxLength=2000;input.placeholder='用自己的话写，不要照抄示例。';input.value=typeof draft==='string' ? draft : '';
      inputs.append(label,input,el('p','请独立表达。反馈只检查文字线索，不代表真实操作或模型评阅。','question-help'));
    }
    document.getElementById('academy-feedback').hidden=true;
    document.getElementById('academy-check').hidden=false;
    document.getElementById('academy-next').hidden=!done;
    document.getElementById('academy-next').firstChild.textContent=currentIndex===2 ? '查看本节成果 ' : '下一步 ';
    document.getElementById('academy-save-note').textContent=done ? '这一题已完成，回顾或重新检查不会重复增加经验。' : '';
    const source=document.getElementById('academy-source');source.replaceChildren(el('span','学习参考：'),link(lesson.sourceTitle,lesson.source));source.querySelector('a').target='_blank';source.querySelector('a').rel='noopener noreferrer';
    document.title=`AI Campus · ${lesson.title}`;
  }
  function readAnswer(){
    const question=curriculum[currentLesson]?.questions[currentIndex];
    const form=document.getElementById('academy-form');
    if(!question)return '';
    if(question.type==='choice')return form.querySelector('input:checked')?.value || '';
    if(question.type==='order')return [...form.querySelectorAll('select')].map(select=>select.value);
    return form.querySelector('textarea').value.trim();
  }
  const form=document.getElementById('academy-form');
  function saveDraft(){
    if(!curriculum[currentLesson])return;
    const ok=store.draft(`${currentLesson}:${currentIndex}`,readAnswer());
    document.getElementById('academy-save-note').textContent=ok ? '已保存在当前浏览器。' : '暂时无法保存，请先保留自己的回答。';
    document.getElementById('academy-feedback').hidden=true;
    document.getElementById('academy-next').hidden=true;
  }
  form.addEventListener('input',saveDraft);form.addEventListener('change',saveDraft);
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const lesson=curriculum[currentLesson];if(!lesson)return;
    const question=lesson.questions[currentIndex],answer=readAnswer();
    let correct=false,description='';
    if(question.type==='choice'){
      correct=answer!=='' && Number(answer)===question.answer;
      description=answer==='' ? '先选一个你认为合适的答案，再检查。' : correct ? question.explanation : '再对照一下题目，想想哪种做法能直接解决当前的问题。';
    }else if(question.type==='order'){
      correct=answer.every((value,i)=>value!=='' && Number(value)===question.answer[i]);
      description=correct ? question.explanation : '每一步都选一个不同的操作。先让素材进入项目，再组织，最后检查结果。';
    }else{
      const missing=question.checks.filter(check=>!new RegExp(check.pattern,'i').test(answer));
      const copied=answer.normalize('NFKC').replace(/[\p{P}\s]/gu,'')===question.reference.normalize('NFKC').replace(/[\p{P}\s]/gu,'');
      correct=(answer.match(/[\p{L}\p{N}]/gu)||[]).length>=12 && missing.length===0 && !copied;
      description=correct ? question.explanation : copied ? '这段与参考答案相同，请换成你自己的表达。' : `再补充一点自己的方案。${missing.length ? '可以检查：'+missing.map(item=>item.label).join('、')+'。' : '请用一段完整的话表达任务，而不只是列出关键词。'}这是规则检查，请同时确认方案符合题目。`;
    }
    const panel=document.getElementById('academy-feedback');panel.classList.toggle('correct',correct);
    if(correct){
      const key=`${currentLesson}:${currentIndex}`;
      if(!store.draft(key,answer) || !store.complete(key)){
        panel.classList.remove('correct');showQuestionFeedback('答案已检查，但暂时无法保存。','请保留你的回答，检查浏览器存储权限后重试。');return;
      }
      showQuestionFeedback(question.type==='text' ? '检查通过，继续保持这份思考。' : '答对了，你抓住了关键。',description,question.reference);
      document.getElementById('academy-next').hidden=false;
      window.CampusFeedback.show({type:'success',title:question.type==='text' ? '方案更清楚了，做得不错！' : '恭喜你，答对啦！'});
      refreshSummary();
    }else{
      showQuestionFeedback('再接再厉，可以再试一次。',description);
      document.getElementById('academy-next').hidden=true;
      window.CampusFeedback.show({type:'encourage'});
    }
  });
  document.getElementById('academy-next').addEventListener('click',()=>{
    if(!store.read().completed.includes(`${currentLesson}:${currentIndex}`))return;
    window.location.hash=currentIndex===2 ? `course-result/${currentLesson}` : `course-lesson/${currentLesson}/${currentIndex+1}`;
  });
  function renderResult(id){
    const lesson=curriculum[id];
    if(!lesson || (lesson.course==='jianying' && !store.read().jianyingUnlocked)) {window.location.replace('#'+(lesson?.course || 'campus'));return;}
    const count=countLesson(id);
    document.getElementById('academy-result-title').textContent=count===3 ? '新的一小步，完成了。' : '先收好你的学习记录。';
    document.getElementById('academy-result-description').textContent=lesson.label+' · '+lesson.title;
    document.getElementById('academy-result-count').textContent=`${count} / 3`;
    document.getElementById('academy-result-xp').textContent=`${count} XP`;
    const draft=store.read().drafts[`${id}:2`];
    document.getElementById('academy-final-answer').textContent=typeof draft==='string' && draft ? draft : '完成第三个任务后，这里会保留你写下的方案。';
    document.getElementById('academy-reference-answer').textContent=store.read().completed.includes(`${id}:2`) ? lesson.questions[2].reference : '先独立完成第三个任务，再查看参考答案。';
    document.getElementById('academy-result-back').href='#'+lesson.course;
  }
  function renderRoute(){
    if(payDialog.open)payDialog.close();
    const [route,id,index]=window.location.hash.slice(1).split('/');
    if(route==='gpt' || route==='jianying')renderCatalog(route);
    if(route==='course-lesson')renderLesson(id,index);
    if(route==='course-result')renderResult(id);
    refreshSummary();
  }
  window.CampusAcademy=Object.freeze({refreshSummary});
  window.addEventListener('hashchange',renderRoute);
  renderRoute();
})();

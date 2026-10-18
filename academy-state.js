(() => {
  const key = 'ai-campus.academy.v1';
  const initial = () => ({version:1,balance:100,jianyingUnlocked:false,completed:[],drafts:{},studyDays:[]});
  const validIds = new Set(Object.entries(window.CampusCurriculum).flatMap(([id,lesson]) => lesson.questions.map((_,i)=>`${id}:${i}`)));
  let data = initial();
  let available = true;
  try {
    const raw = JSON.parse(localStorage.getItem(key));
    if (raw?.version === 1 && Number.isInteger(raw.balance) && raw.balance >= 0 && raw.balance <= 100) {
      data = {version:1,balance:raw.balance,jianyingUnlocked:raw.jianyingUnlocked===true,
        completed:Array.isArray(raw.completed) ? [...new Set(raw.completed.filter(id=>validIds.has(id)))] : [],
        studyDays:Array.isArray(raw.studyDays) ? [...new Set(raw.studyDays.filter(day=>typeof day==='string' && /^\d{4}-\d{2}-\d{2}$/.test(day)))].slice(-366) : [],
        drafts:Object.fromEntries(Object.entries(raw.drafts || {}).filter(([id,value])=>validIds.has(id) && (typeof value==='string' || Array.isArray(value))).map(([id,value])=>[id,typeof value==='string' ? value.slice(0,2000) : value.slice(0,3).map(v=>String(v).slice(0,4))]))};
    }
    localStorage.setItem(key,JSON.stringify(data));
  } catch {available=false;}
  function snapshot(){return JSON.parse(JSON.stringify(data));}
  function commit(next){
    try {localStorage.setItem(key,JSON.stringify(next));data=next;available=true;return true;}
    catch {available=false;return false;}
  }
  window.CampusAcademyState = Object.freeze({
    read:snapshot,
    available:()=>available,
    unlock() {
      if(data.jianyingUnlocked)return {ok:true,already:true};
      if(data.balance<29)return {ok:false,reason:'余额不足，未扣除体验币。'};
      const next=snapshot();next.balance-=29;next.jianyingUnlocked=true;
      return commit(next) ? {ok:true,already:false} : {ok:false,reason:'浏览器暂时无法保存解锁记录，未扣除体验币。请检查存储权限后重试。'};
    },
    draft(id,value){if(!validIds.has(id))return false;const next=snapshot();next.drafts[id]=value;return commit(next);},
    complete(id){
      if(!validIds.has(id))return false;
      const [lessonId]=id.split(':');
      if(window.CampusCurriculum[lessonId].course==='jianying' && !data.jianyingUnlocked)return false;
      if(data.completed.includes(id))return true;
      const next=snapshot();next.completed.push(id);
      if([0,1,2].every(index=>next.completed.includes(`${lessonId}:${index}`))){
        const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
        if(!next.studyDays.includes(today))next.studyDays.push(today);
      }
      return commit(next);
    },
    clear(){try{localStorage.removeItem(key);data=initial();return true;}catch{return false;}}
  });
})();

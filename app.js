const stages = [
 ['0','制作方針','ターゲット・提供体験・制作方針を入力してください。'],
 ['1','市場調査','参考作品と、企画に取り入れる要素を確認してください。'],
 ['2','属性と軸','一言企画に合う主属性・副属性の組み合わせを選んでください。'],
 ['3','基本設定','年齢・職業・ユーザーとの接点・ビジュアルを確認してください。'],
 ['3.5','コンセプトワード','タイトルと一行紹介の組み合わせを選んでください。'],
 ['4','性格・背景・口調','行動に説得力があり、キャラクターの魅力が伝わる案を選んでください。'],
 ['4.5','目的','性格や背景とつながる目的を確認してください。'],
 ['5','関係性と初回メッセージ','ユーザーが自然にロールプレイを始められる案を選んでください。'],
 ['6','最終確認','企画原案を読み、採用基準を確認してください。']
];
const choices = [
 ['雨の日だけ開く喫茶店','雨宿りに訪れた常連を、店主がさりげない気遣いで迎える。','終電後の書店','夜更けの書店で、無口な店員と一冊ずつ思い出を交換する。','朝霧の花屋','不器用な花屋の店主と、贈る花を選びながら距離を縮める。'],
 ['会話のきっかけ','日常系の導入例をもとに、店主から今日の飲み物を提案する。','繰り返し訪れたくなる場所','天気や時間帯で接客が少しずつ変わる。'],
 ['無口 × 世話焼き','主属性は無口。副属性は観察力・さりげない気遣い。','穏やか × 不器用','主属性は穏やか。副属性は照れ屋・職人気質。','職人気質 × 聞き上手','主属性は職人気質。副属性は慎重・聞き上手。'],
 ['街角の個人店','29歳。店を一人で切り盛りする。閉店前に来た客に席をすすめる。深緑のエプロンと銀のピンが目印。','駅前の小さな店','32歳。夜の時間帯を任されている。帰り道の客を迎える。紺色のシャツと古い腕時計が目印。'],
 ['雨宿りの常連席','コンセプト：雨音と静けさ\n一行紹介：雨の日だけ、あなたの席が空いている。','やさしい寄り道','コンセプト：日常の休憩所\n一行紹介：帰り道、言葉の少ない店主が待っている。'],
 ['気遣いを行動で示す','以前から人の話を聞く仕事をしていた。短く丁寧に話す。「濡れましたね。タオル、そこにあります」\n禁止：事情を無理に聞き出す。','好みを覚えて迎える','店の前の代から常連の好みを引き継いだ。穏やかに話す。「今日は、いつものにします？」\n禁止：すぐに馴れ馴れしくする。'],
 ['誰もが落ち着ける店','表向きの目的：店を続ける。\n内面の目的：自分も安心して帰れる場所がほしい。\n誤った信念：頼ると迷惑になる。\n課題：小さな頼み事から始める。','常連との約束','表向きの目的：いつもの席を守る。\n内面の目的：また会いたいと言える関係がほしい。\n誤った信念：気持ちは伝えなくても分かる。\n課題：自分から気持ちを伝える。'],
 ['窓際の席','来店 → 好みを覚える → 常連として迎える。周辺人物は向かいの店の店主。\n「雨、強くなってきましたね。窓際とカウンター、どちらにします？」','閉店前の一杯','雨宿り → 会話を交わす → 閉店前の時間を共有する。周辺人物は配達員。\n「まだ一杯なら淹れられます。温かいもの、飲んでいきますか？」']
];
const criteria = ['提供するユーザー体験が明確','一言企画と属性・性格・シチュエーションが一致','性格・背景・動機にリアリティがある','既存キャラクターとの差別化を説明できる','タイトルと一行紹介から魅力が伝わる','初回メッセージから会話を始めやすい'];
const byId = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function sample(index, input = index === 0) {
 const stage = stages[index][0];
 return {id:'demo-'+stage+(input?'-input':''),stage, kind: index===8?'review':input?'input':'choice',
 fields: input?['制作方針','ターゲットユーザー','ユーザーに提供する体験']:[],
 options: Array.from({length:(choices[index]?.length ?? 0)/2},(_, i)=>({id:String(i+1),title:choices[index][i*2],body:choices[index][i*2+1]}))};
}
let state = {live:false,current:sample(0),history:[]};
let busy = false;
try { state = JSON.parse(localStorage.getItem('character-planner-demo')) || state; } catch {}
function render(){
 const task=state.current;
 const index=task?stages.findIndex(s=>s[0]===task.stage):-1;
 byId('mode').textContent=state.live?'Grokbot 接続モード':'デモモード';
 byId('breadcrumb').textContent=index<0?'進捗':stages[index][1];
 byId('steps').innerHTML=stages.map(([n,t],i)=>`<div class="step ${state.history.some(h=>h.stage===n && h.action!=='revise')?'done':''}" ${i===index?'aria-current="step"':''}><i>${n}</i>${t}</div>`).join('');
 const history=state.history.filter(h=>h.action!=='revise');
 const axis=history.find(h=>h.stage==='0' && h.option);
 const log=history.length?`<h2>決定内容</h2>${history.map(h=>`<details><summary>Step ${escape(h.stage)} · ${escape(h.option?.title ?? stages.find(s=>s[0]===h.stage)?.[1])}</summary><pre>${escape(h.option?.body ?? Object.entries(h.values??{}).map(([k,v])=>k+'：'+v).join('\n') ?? '')}</pre></details>`).join('')}`:'';
 if (!task){const approved=history.some(h=>h.action==='approve'); byId('screen').innerHTML=`<h1>${approved?'企画原案を承認しました':'Grokbot の結果を待っています'}</h1>${log}`;return;}
 const label=task.kind==='input'?'あなたの入力':task.kind==='review'?'あなたの最終承認':task.kind==='progress'?'Grokbot が作業中': ['1','3','4.5'].includes(task.stage)?'内容確認':'あなたの選択';
 const taskHeading=task.stage==='0' && task.kind==='choice'?'一言企画を選ぶ':stages[index][1];
 const description=task.description || (task.stage==='0' && task.kind==='choice'?'キャラクターの軸として採用する案を選んでください。':stages[index][2]);
 const options=(task.options??[]).map((o,i)=>{let image='';try { const url=new URL(o.image);if(['http:','https:'].includes(url.protocol))image=`<img src="${escape(url.href)}" alt="${escape(o.title)}" loading="lazy">`; }catch{} return `<article class="card">${image}<span class="tag">候補 ${i+1}</span><h3>${escape(o.title)}</h3><p>${escape(o.body)}</p><button class="pick secondary" data-index="${i}">この案を採用</button></article>`;}).join('');
 const input=`<form id="input" class="panel">${(task.fields??[]).map((f,i)=>`<label class="field">${escape(f)}<textarea name="${i}" rows="2" required></textarea></label>`).join('')}<button>入力を送信 →</button></form>`;
 const review=`${task.draft?'<section class="panel"><h2>企画原案</h2><p>'+escape(task.draft)+'</p></section>':''}<form id="approval" class="panel checks"><h2>採用基準</h2>${criteria.map(item=>`<label><input type="checkbox" required>${item}</label>`).join('')}<button>企画原案を承認</button></form>`;
 const revise=`<details class="panel"><summary>修正を依頼</summary><form id="revise"><label class="field">修正内容<textarea name="feedback" rows="2" required></textarea></label><button>修正内容を送信</button></form></details>`;
 byId('screen').innerHTML=`<span class="eyebrow">STEP ${escape(task.stage)}</span><span class="eyebrow ${task.kind==='progress'?'':'human'}">${label}</span><h1>${escape(taskHeading)}</h1><p>${escape(description)}</p>${axis?`<div class="axis">一言企画　<strong>${escape(axis.option.title)}</strong>　${escape(axis.option.body)}</div>`:''}${task.kind==='input'?input:task.kind==='review'?log+review:task.kind==='choice'?'<h2>Grokbot の候補</h2><div class="grid">'+options+'</div>':''}${['choice','review'].includes(task.kind)?revise:''}${task.kind!=='review'&&history.length?`<details class="panel"><summary>これまでの決定を見る</summary>${log}</details>`:''}`;
 document.querySelectorAll('.pick').forEach(b=>b.onclick=()=>respond('select',{option:task.options[Number(b.dataset.index)]}));
 if(byId('input')) byId('input').onsubmit=e=>{e.preventDefault();const data=new FormData(e.target);respond('input',{values:Object.fromEntries(task.fields.map((f,i)=>[f,data.get(String(i)).trim()]))});};
 if(byId('approval')) byId('approval').onsubmit=e=>{e.preventDefault();respond('approve',{criteria});};
 if(byId('revise')) byId('revise').onsubmit=e=>{e.preventDefault();respond('revise',{feedback:new FormData(e.target).get('feedback').trim()});};
}
async function respond(action, fields){
 if(busy)return;
 if(fields.feedback==='' || Object.values(fields.values??{}).some(v=>!v)){byId('status').textContent='空白以外の文字を入力してください。';return;}
 busy=true;
 const task=state.current;
 const decision={taskId:task.id, stage:task.stage, action,...fields};
 byId('status').textContent='送信中…';
 document.querySelectorAll('main button').forEach(b=>b.disabled=true);
 try{
  if(state.live){
   const result=await fetch('/api/responses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(decision)});
   if(!result.ok)throw Error((await result.json()).error);
   state=await result.json();
  }else{
   state.history.push(decision);
   const i=stages.findIndex(s=>s[0]===task.stage);
   state.current=action==='approve'?null:action==='revise'?task:action==='input'&&i===0?sample(0,false):sample(i+1);
   localStorage.setItem('character-planner-demo',JSON.stringify(state));
  }
  render();
  byId('status').textContent=action==='revise'&&!state.live?'修正依頼をデモ履歴に保存しました。候補はサンプルです。':state.live?'Grokbot に送信しました。':'デモに保存しました。';
 }catch(error){byId('status').textContent=error.message || '送信に失敗しました。もう一度お試しください。';}
 finally{busy=false;document.querySelectorAll('main button').forEach(b=>b.disabled=false);}
}
byId('download').onclick=()=>{
 const url=URL.createObjectURL(new Blob([JSON.stringify(state.history,null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='character-plan.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
async function refresh(){
 if(busy)return;
 try{const result=await fetch('/api/state',{cache:'no-store'});if(!result.ok)return;const next=await result.json();if(!busy&&next.live&&JSON.stringify(next)!==JSON.stringify(state)){state=next;render();}}catch{}
}
render();
if(location.protocol!=='file:'){refresh();setInterval(refresh,2000);}

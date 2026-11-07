const STORAGE_KEY = 'ritmo-habits-v1';
const icons = ['▤','◌','⌁','↗','¶','○','□','♫','≋','◒','⌘','⊞'];
const colors = ['#e6f0e8','#f5e9dc','#ece9f4','#f4efd9','#e4eef2','#f3e5eb'];
const weekdays = ['dom','seg','ter','qua','qui','sex','sáb'];
const initialHabits = [
  {id:'read',name:'Ler um pouco',icon:'▤',color:colors[0],checks:[]},
  {id:'water',name:'Beber água',icon:'◌',color:colors[4],checks:[]},
  {id:'move',name:'Movimentar o corpo',icon:'⌁',color:colors[2],checks:[]}
];
let state = loadState();
let weekOffset = 0;
let selectedIcon = icons[0];
let selectedColor = colors[0];
let toastTimer;

function loadState(){
  try { const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)); if(parsed && Array.isArray(parsed.habits)) return parsed; }
  catch(e) { console.warn('Não foi possível carregar os hábitos salvos.',e); }
  return {habits:initialHabits};
}
function saveState(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){console.warn('Não foi possível salvar os hábitos localmente.',e);}
  fetch('/api/habits',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)}).catch(()=>{});
}
async function loadFromServer(){
  try{const response=await fetch('/api/habits');if(!response.ok)throw new Error('API indisponível');const data=await response.json();if(Array.isArray(data.habits)){const localState=loadState();state=data.habits.length===0&&localState.habits.length?localState:data;const changed=state.habits.some((habit,index)=>!icons.includes(habit.icon));state.habits=state.habits.map((habit,index)=>({...habit,icon:icons.includes(habit.icon)?habit.icon:icons[index%icons.length]}));localStorage.setItem(STORAGE_KEY,JSON.stringify(state));if(changed||state!==data)saveState();return;}}
  catch(error){console.info('Usando os dados locais enquanto a API não está disponível.');}
  state=loadState();state.habits=state.habits.map((habit,index)=>({...habit,icon:icons.includes(habit.icon)?habit.icon:icons[index%icons.length]}));
}
function dateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function startOfWeek(date){const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());d.setDate(d.getDate()-d.getDay());return d;}
function getWeekDates(offset=0){const start=startOfWeek(new Date());start.setDate(start.getDate()+offset*7);return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return d;});}
function sameDate(a,b){return dateKey(a)===dateKey(b);}
function renderDate(){const now=new Date();document.getElementById('todayDate').textContent=String(now.getDate()).padStart(2,'0');document.getElementById('todayWeekday').textContent=now.toLocaleDateString('pt-BR',{weekday:'long',month:'long',year:'numeric'});}
function renderWeek(){
  const dates=getWeekDates(weekOffset);const first=dates[0],last=dates[6];
  const fmt=(d)=>d.toLocaleDateString('pt-BR',{day:'numeric',month:'short'}).replace('.','');
  document.getElementById('weekLabel').textContent=`${fmt(first)} – ${fmt(last)}`;
  document.getElementById('nextWeek').disabled=weekOffset>=0;
  const grid=document.getElementById('weekGrid');grid.innerHTML='';
  dates.forEach(date=>{
    const key=dateKey(date),completed=state.habits.some(h=>h.checks.includes(key));
    const cell=document.createElement('div');cell.className='day-cell'+(sameDate(date,new Date())?' today':'')+(date>new Date()&&!sameDate(date,new Date())?' future':'')+(completed?' has-check':'');
    cell.innerHTML=`<span class="day-label">${weekdays[date.getDay()]}</span><span class="day-number">${date.getDate()}</span><span class="day-dot"></span>`;
    grid.append(cell);
  });
  const checked=dates.reduce((sum,d)=>sum+(state.habits.some(h=>h.checks.includes(dateKey(d)))?1:0),0);
  document.getElementById('weekSummary').textContent=`${checked} de 7 dias com progresso`;
}
function renderHabits(){
  const list=document.getElementById('habitsList');list.innerHTML='';document.getElementById('habitCount').textContent=state.habits.length;
  if(!state.habits.length){list.innerHTML='<div class="empty-state"><div class="empty-icon">＋</div><strong>Todo hábito começa pequeno.</strong><p>Escolha algo que cabe na sua rotina e comemore cada vez que você aparecer.</p><button class="primary-button" data-action="add">Criar meu primeiro hábito</button></div>';}
  const today=new Date(),dates=getWeekDates(weekOffset);
  state.habits.forEach(habit=>{
    const card=document.createElement('article');card.className='habit-card';card.style.setProperty('--habit-tint',habit.color);
    const completed=habit.checks.includes(dateKey(today));
    const streak=getStreak(habit);
    card.innerHTML=`<div class="habit-info"><div class="habit-icon">${escapeHtml(habit.icon)}</div><div><div class="habit-name">${escapeHtml(habit.name)}</div><div class="habit-meta">${completed?'Concluído hoje':'Um passo de cada vez'}</div></div></div><div class="habit-dots">${dates.map(d=>{const key=dateKey(d),done=habit.checks.includes(key),future=d>today&&!sameDate(d,today);return `<button class="habit-day${done?' completed':''}" data-action="toggle" data-id="${escapeHtml(habit.id)}" data-date="${key}" aria-label="${done?'Desmarcar':'Marcar'} ${d.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric'})}" ${future?'disabled':''}>${done?'✓':weekdays[d.getDay()][0]}</button>`;}).join('')}</div><div class="habit-end">${streak?`<span class="streak">${streak} ${streak===1?'dia':'dias'} seguidos</span>`:''}<button class="more-button" data-action="remove" data-id="${escapeHtml(habit.id)}" aria-label="Remover ${escapeHtml(habit.name)}" title="Remover hábito">···</button></div>`;
    list.append(card);
  });
  renderProgress();renderWeek();
}
function getStreak(habit){let count=0,d=new Date();while(habit.checks.includes(dateKey(d))){count++;d.setDate(d.getDate()-1);}if(count===0){d=new Date();d.setDate(d.getDate()-1);while(habit.checks.includes(dateKey(d))){count++;d.setDate(d.getDate()-1);}}return count;}
function renderProgress(){const total=state.habits.length,done=state.habits.filter(h=>h.checks.includes(dateKey(new Date()))).length,pct=total?Math.round(done/total*100):0;document.getElementById('progressPercent').textContent=`${pct}%`;document.getElementById('progressBar').style.width=`${pct}%`;document.getElementById('progressCopy').textContent=total?`${done} de ${total} ${total===1?'hábito concluído':'hábitos concluídos'}`:'Todo começo conta.';}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function showToast(message){const toast=document.getElementById('toast');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2200);}
function openDialog(){selectedIcon=icons[0];selectedColor=colors[0];document.getElementById('habitForm').reset();renderPickers();document.getElementById('habitDialog').showModal();setTimeout(()=>document.getElementById('habitName').focus(),50);}
function renderPickers(){const iconPicker=document.getElementById('iconPicker');iconPicker.innerHTML='';icons.forEach((icon,index)=>{const b=document.createElement('button');b.type='button';b.className='icon-option'+(icon===selectedIcon?' selected':'');b.textContent=icon;b.setAttribute('aria-label',`Símbolo ${index+1}`);b.onclick=()=>{selectedIcon=icon;renderPickers();};iconPicker.append(b);});const colorPicker=document.getElementById('colorPicker');colorPicker.innerHTML='';colors.forEach(color=>{const b=document.createElement('button');b.type='button';b.className='color-option'+(color===selectedColor?' selected':'');b.style.background=color;b.setAttribute('aria-label','Selecionar cor');b.onclick=()=>{selectedColor=color;renderPickers();};colorPicker.append(b);});}
document.getElementById('addHabitButton').addEventListener('click',openDialog);
document.getElementById('habitsList').addEventListener('click',event=>{const button=event.target.closest('button[data-action]');if(!button)return;const {action,id,date}=button.dataset;if(action==='add')openDialog();if(action==='toggle'){const habit=state.habits.find(h=>h.id===id);if(!habit)return;habit.checks=habit.checks.includes(date)?habit.checks.filter(x=>x!==date):[...habit.checks,date];saveState();renderHabits();}if(action==='remove'){const habit=state.habits.find(h=>h.id===id);if(habit&&confirm(`Remover “${habit.name}” e o histórico dele?`)){state.habits=state.habits.filter(h=>h.id!==id);saveState();renderHabits();showToast('Hábito removido.');}}});
document.getElementById('habitForm').addEventListener('submit',event=>{event.preventDefault();const name=document.getElementById('habitName').value.trim();if(!name)return;state.habits.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name,icon:selectedIcon,color:selectedColor,checks:[]});saveState();renderHabits();document.getElementById('habitDialog').close();showToast('Novo hábito adicionado.');});
document.getElementById('closeDialog').addEventListener('click',()=>document.getElementById('habitDialog').close());document.getElementById('cancelDialog').addEventListener('click',()=>document.getElementById('habitDialog').close());
document.getElementById('prevWeek').addEventListener('click',()=>{weekOffset--;renderWeek();renderHabits();});document.getElementById('nextWeek').addEventListener('click',()=>{if(weekOffset<0)weekOffset++;renderWeek();renderHabits();});
document.getElementById('todayButton').addEventListener('click',()=>{weekOffset=0;renderDate();renderHabits();document.getElementById('inicio').scrollIntoView({behavior:'smooth'});});
loadFromServer().finally(()=>{renderDate();renderHabits();});

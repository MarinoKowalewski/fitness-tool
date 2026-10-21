import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Activity, ArrowRight, ChevronLeft, Dumbbell, Footprints, HeartPulse, TrendingUp, Check, Plus, Trash2, Download, Upload, BarChart3, CalendarCheck, Timer, Pause, Play, RotateCcw, Droplets, Utensils, ClipboardList, Minus } from 'lucide-react'
import './App.css'

type Workout = 'Push' | 'Pull' | 'Beine' | 'Cardio'
type Exercise = { id: string; name: string; group: string; sets: number; min: number; max: number; weight?: number; recommended: boolean; emoji: string }
type SetEntry = { weight: string; reps: string }
type Log = { date: string; workout: Workout; exerciseId: string; name: string; sets: SetEntry[]; recovery?: boolean; distanceKm?: number; durationMin?: number }
const catalog: Record<Workout, Exercise[]> = {
 Push: [
  {id:'bench',name:'Bankdrücken',group:'Brust',sets:4,min:6,max:8,weight:47.5,recommended:true,emoji:'🏋️'},
  {id:'incline',name:'Schrägbank Kurzhantel',group:'Brust',sets:3,min:8,max:10,weight:12,recommended:true,emoji:'💪'},
  {id:'shoulder',name:'Schulterdrücken',group:'Schultern',sets:3,min:6,max:10,weight:20,recommended:true,emoji:'🏋️'},
  {id:'lateral',name:'Seitheben',group:'Schultern',sets:3,min:12,max:15,weight:6,recommended:true,emoji:'💪'},
  {id:'triceps',name:'Trizepsdrücken Seil',group:'Trizeps',sets:3,min:10,max:12,weight:30,recommended:true,emoji:'💪'},
  {id:'dips',name:'Dips (unterstützt)',group:'Trizeps',sets:2,min:6,max:10,recommended:true,emoji:'🏋️'},
  {id:'chestfly',name:'Butterfly-Maschine',group:'Brust',sets:3,min:10,max:12,recommended:false,emoji:'💪'},
  {id:'chestpress',name:'Brustpresse',group:'Brust',sets:3,min:8,max:12,recommended:false,emoji:'🏋️'}],
 Pull: [
  {id:'lat',name:'Latzug',group:'Rücken',sets:4,min:6,max:10,weight:47.5,recommended:true,emoji:'🏋️'},
  {id:'rowbar',name:'Langhantelrudern',group:'Rücken',sets:3,min:6,max:10,weight:25,recommended:true,emoji:'🏋️'},
  {id:'rowcable',name:'Kabelrudern',group:'Rücken',sets:3,min:8,max:12,weight:50,recommended:true,emoji:'💪'},
  {id:'face',name:'Face Pulls',group:'Hintere Schulter',sets:3,min:12,max:15,recommended:true,emoji:'💪'},
  {id:'curl',name:'Bizepscurls',group:'Bizeps',sets:3,min:8,max:12,weight:10,recommended:true,emoji:'💪'},
  {id:'hammer',name:'Hammer Curls',group:'Bizeps',sets:2,min:10,max:12,weight:8,recommended:true,emoji:'💪'},
  {id:'pullups',name:'Klimmzüge',group:'Rücken',sets:3,min:6,max:10,recommended:false,emoji:'🏋️'}],
 Beine: [
  {id:'squat',name:'Kniebeugen',group:'Oberschenkel',sets:3,min:6,max:10,recommended:true,emoji:'🦵'},
  {id:'legpress',name:'Beinpresse',group:'Oberschenkel',sets:3,min:8,max:12,recommended:true,emoji:'🦵'},
  {id:'rdl',name:'Rumänisches Kreuzheben',group:'Beinrückseite',sets:3,min:8,max:10,recommended:true,emoji:'🏋️'},
  {id:'legcurl',name:'Beinbeuger',group:'Beinrückseite',sets:3,min:10,max:12,recommended:true,emoji:'🦵'},
  {id:'calf',name:'Wadenheben',group:'Waden',sets:3,min:12,max:15,recommended:true,emoji:'🦵'}],
 Cardio: [
  {id:'jog',name:'Joggen',group:'Ausdauer',sets:1,min:1,max:1,recommended:true,emoji:'🏃'},
  {id:'run',name:'Laufband',group:'Ausdauer',sets:1,min:15,max:30,recommended:true,emoji:'🏃'},
  {id:'bike',name:'Fahrrad-Ergometer',group:'Ausdauer',sets:1,min:15,max:30,recommended:true,emoji:'🚴'},
  {id:'cross',name:'Crosstrainer',group:'Ausdauer',sets:1,min:15,max:30,recommended:false,emoji:'🏃'},
  {id:'erg',name:'Ruderergometer',group:'Ausdauer',sets:1,min:15,max:30,recommended:false,emoji:'🚣'}]
}
const illustration = (id: string) => `${import.meta.env.BASE_URL}exercise-icons/${id}.png`
const workoutIcons = { Push:Dumbbell, Pull:Activity, Beine:Footprints, Cardio:HeartPulse }
const readLogs = (): Log[] => { try { return JSON.parse(localStorage.getItem('fitness-tool-logs-v1') || '[]') } catch { return [] } }
const sortedLogs = (logs:Log[]) => [...logs].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime())
const validSet = (s:SetEntry) => s.weight.trim()!=='' && Number.isFinite(Number(s.weight)) && Number(s.weight)>=0 && Number.isInteger(Number(s.reps)) && Number(s.reps)>0
const volume = (log:Log) => log.exerciseId==='jog'?0:log.sets.reduce((sum,s)=>sum+Number(s.weight)*Number(s.reps),0)
const maxWeight = (log:Log) => Math.max(0,...log.sets.map(s=>Number(s.weight)))
function suggestedWeight(ex:Exercise, logs:Log[]):number|undefined {
 const regular = sortedLogs(logs).filter(l=>l.exerciseId===ex.id && !l.recovery && l.sets.some(validSet))
 if (!regular.length) return ex.weight
 const latest = regular[0]
 const sets = latest.sets.filter(validSet)
 const weights = sets.map(s=>Number(s.weight))
 const sameWeight = weights.every(w=>w===weights[0])
 // Dropsätze und Teil-Einheiten: konservativ am bestehenden Ziel festhalten.
 if (!sameWeight || sets.length<ex.sets) return ex.weight ?? Math.max(...weights)
 const weight=weights[0]
 const complete=sets.slice(0,ex.sets).every(v=>Number(v.reps)>=ex.max)
 if (complete && ex.id!=='jog' && ex.id!=='dips' && ex.id!=='run' && ex.id!=='bike' && ex.id!=='cross' && ex.id!=='erg') return Math.round((weight+(weight<20?1:2.5))*2)/2
 // Einzelne schwächere Einheit nicht automatisch als Rückschritt werten.
 const previous=regular[1]
 const repeatedLow=previous && previous.sets.length>=ex.sets && previous.sets.every(v=>Number(v.weight)===weight) && previous.sets.some(v=>Number(v.reps)<ex.min) && sets.some(v=>Number(v.reps)<ex.min)
 if(repeatedLow && weight>0) return Math.max(0,weight-(weight<=20?1:2.5))
 return ex.weight!==undefined && weight<ex.weight ? ex.weight : weight
}
const localDay=(date:string)=>new Date(date).toLocaleDateString('sv-SE')
const dayNow=()=>localDay(new Date().toISOString())
const uniqueSessions=(logs:Log[])=>{
 const grouped=new Map<string,{day:string;workout:Workout;logs:Log[];recovery:boolean}>()
 for(const l of sortedLogs(logs)){
  const day=localDay(l.date), key=`${day}|${l.workout}`
  if(!grouped.has(key))grouped.set(key,{day,workout:l.workout,logs:[],recovery:!!l.recovery})
  const session=grouped.get(key)!
  session.logs.push(l);session.recovery=session.recovery&&!!l.recovery
 }
 return [...grouped.values()].sort((a,b)=>b.day.localeCompare(a.day))
}
function nextWorkout(logs:Log[]):Workout {
 const sessions=uniqueSessions(logs).filter(s=>!s.recovery)
 const last=sessions[0]
 if(!last) return 'Pull'
 if(last.workout==='Push') return 'Pull'
 if(last.workout==='Pull') return 'Beine'
 if(last.workout==='Beine') return 'Push'
 return sessions.find(s=>s.workout!=='Cardio')?.workout==='Push'?'Pull':'Push'
}
type WellnessDay = { supplements: Record<string, boolean>; waterGlasses: number; meals: Record<string, string> }
const supplementNames = ['Creatin', 'Eisen', 'Omega', 'Vitamin D', 'Vitamin C'] as const
const mealNames = ['Frühstück', 'Mittagessen', 'Abendessen', 'Snacks'] as const
const wellnessKey = 'fitness-tool-wellness-v1'
const blankWellness = (): WellnessDay => ({ supplements: {}, waterGlasses: 0, meals: {} })
const readWellness = (): Record<string, WellnessDay> => {
 try { const data = JSON.parse(localStorage.getItem(wellnessKey) || '{}'); return data && typeof data === 'object' && !Array.isArray(data) ? data : {} } catch { return {} }
}
const wellnessCalories = (day: WellnessDay) => mealNames.reduce((sum, meal) => sum + (Number(day.meals[meal]) || 0), 0)
const historyKey = 'fitness-tool-logs-v1'
const draftKey = 'fitness-tool-draft-v06'
const sessionKey = 'fitness-tool-active-session-v06'
type Draft = { workout: Workout; exerciseId: string; entries: SetEntry[]; checked: boolean[]; recovery: boolean }
const loadDraft=():Draft|null=>{try{return JSON.parse(localStorage.getItem(draftKey)||'null')}catch{return null}}
const loadSession=():{workout:Workout;startedAt:number}|null=>{try{return JSON.parse(localStorage.getItem(sessionKey)||'null')}catch{return null}}
const fmtTime=(seconds:number)=>`${Math.floor(Math.max(0,seconds)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(0,seconds)%60).toString().padStart(2,'0')}`

const downloadBackup = (logs:Log[],completed:Record<string,boolean>,wellness:Record<string,WellnessDay>) => {
 const blob = new Blob([JSON.stringify({app:'fitness-tool',version:3,exportedAt:new Date().toISOString(),logs,completed,wellness},null,2)],{type:'application/json'})
 const url = URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url;link.download='fitness-tool-backup.json';link.click();URL.revokeObjectURL(url)
}
const parseBackup = (value:unknown):Log[] => {
 if (!value || typeof value!=='object') throw new Error('Ungültige Sicherung')
 const obj=value as {logs?:unknown};if(!Array.isArray(obj.logs))throw new Error('Keine Trainingsdaten gefunden')
 return obj.logs.map((l:unknown)=>{
  if(!l||typeof l!=='object')throw new Error('Ungültiger Eintrag')
  const x=l as Log
  if(!['Push','Pull','Beine','Cardio'].includes(x.workout)||typeof x.exerciseId!=='string'||typeof x.name!=='string'||!Number.isFinite(Date.parse(x.date))||!Array.isArray(x.sets)||(x.exerciseId!=='jog'&&!x.sets.length)||(x.exerciseId!=='jog'&&!x.sets.every(v=>typeof v.weight==='string'&&typeof v.reps==='string'&&validSet(v)))||(x.exerciseId==='jog'&&(!Number.isFinite(x.distanceKm)||!Number.isFinite(x.durationMin)||Number(x.distanceKm)<=0||Number(x.durationMin)<=0)))throw new Error('Ungültige Trainingsdaten')
  return {date:x.date,workout:x.workout,exerciseId:x.exerciseId,name:x.name,sets:x.sets,recovery:Boolean(x.recovery),...(x.exerciseId==='jog'?{distanceKm:Number(x.distanceKm),durationMin:Number(x.durationMin)}:{})}
 })
}
export default function App() {
 const [activeSession,setActiveSession]=useState(loadSession)
 const [workout,setWorkout] = useState<Workout|null>(null)
 const [draft,setDraft]=useState<Draft|null>(loadDraft)
 const [checked,setChecked]=useState<boolean[]>([])
 const [now,setNow]=useState(Date.now())
 const [restEnd,setRestEnd]=useState<number|null>(null)
 const [restPaused,setRestPaused]=useState<number|null>(null)
 const [restSeconds,setRestSeconds]=useState(90)
 const [jogDistance,setJogDistance]=useState('')
 const [jogDuration,setJogDuration]=useState('')
 const [readiness,setReadiness]=useState<'fit'|'mittel'|'muede'>('fit')

 const [exercise,setExercise] = useState<Exercise|null>(null)
 const [logs,setLogs] = useState<Log[]>(readLogs)
 const [entries,setEntries] = useState<SetEntry[]>([])
 const [showHistory,setShowHistory] = useState(false)
 const [statsExercise,setStatsExercise] = useState('bench')
 const [showStats,setShowStats] = useState(false)
 const [recovery,setRecovery] = useState(false)
 const [sessionDone,setSessionDone] = useState<Record<string,boolean>>(()=>{try{return JSON.parse(localStorage.getItem('fitness-tool-completed-v1')||'{}')}catch{return {}}})
 const [showSessions,setShowSessions] = useState(false)
 const fileInput=useRef<HTMLInputElement>(null)
 const [message,setMessage] = useState('')
 const [tab,setTab] = useState<'training'|'wellness'>('training')
 const [wellness,setWellness] = useState<Record<string,WellnessDay>>(readWellness)
 const [wellnessDate,setWellnessDate] = useState(()=>new Date().toLocaleDateString('sv-SE'))
 const [wellnessHistory,setWellnessHistory] = useState(false)
 const currentWellness = wellness[wellnessDate] ?? blankWellness()
 const todayKey = new Date().toLocaleDateString('sv-SE')
 const updateWellness = (day:string, update:(previous:WellnessDay)=>WellnessDay) => setWellness(prev=>({...prev,[day]:update(prev[day] ?? blankWellness())}))
 const wellnessDates = Object.keys(wellness).sort((a,b)=>b.localeCompare(a))
 useEffect(()=>{localStorage.setItem(wellnessKey,JSON.stringify(wellness))},[wellness])
 useEffect(()=>{ localStorage.setItem(historyKey,JSON.stringify(logs)) },[logs])
 useEffect(()=>{if(draft)localStorage.setItem(draftKey,JSON.stringify(draft));else localStorage.removeItem(draftKey)},[draft])
 useEffect(()=>{if(activeSession)localStorage.setItem(sessionKey,JSON.stringify(activeSession));else localStorage.removeItem(sessionKey)},[activeSession])
 useEffect(()=>{const id=window.setInterval(()=>setNow(Date.now()),1000);return ()=>window.clearInterval(id)},[])
 useEffect(()=>{if(!exercise||!workout)return;setDraft({workout,exerciseId:exercise.id,entries,checked,recovery})},[entries,checked,recovery,exercise,workout])
 const startWorkout=(w:Workout)=>{if(activeSession && activeSession.workout!==w && !window.confirm(`Dein ${activeSession.workout}-Training ist noch aktiv. Neues Training starten?`))return;setActiveSession(old=>old?.workout===w?old:{workout:w,startedAt:Date.now()});setWorkout(w);setExercise(null)}
 const resumeWorkout=()=>{if(activeSession){setWorkout(activeSession.workout);setExercise(null)}}
 const finishRest=()=>{setRestEnd(null);setRestPaused(null)}
 const startRest=()=>{setRestEnd(Date.now()+restSeconds*1000);setRestPaused(null)}
 const toggleRest=()=>{if(restEnd){setRestPaused(Math.max(0,Math.ceil((restEnd-Date.now())/1000)));setRestEnd(null)}else if(restPaused!==null){setRestEnd(Date.now()+restPaused*1000);setRestPaused(null)}else startRest()}
 const restRemaining=restEnd?Math.max(0,Math.ceil((restEnd-now)/1000)):restPaused??restSeconds

 useEffect(()=>{localStorage.setItem('fitness-tool-completed-v1',JSON.stringify(sessionDone))},[sessionDone])
 const completedToday = (id:string) => logs.some(l => l.exerciseId === id && l.workout === workout && new Date(l.date).toDateString() === new Date().toDateString())
 const recommended: Workout = nextWorkout(logs)
 const sessions=uniqueSessions(logs)
 const currentKey=workout?`${dayNow()}|${workout}`:''
 const sessionComplete=!!sessionDone[currentKey]
 const recentWeek=sessions.filter(s=>{const days=(Date.now()-new Date(s.day+'T12:00:00').getTime())/86400000;return days>=-1 && days<7}).length
 const markSession=()=>{if(!workout)return;setSessionDone(prev=>({...prev,[currentKey]:!prev[currentKey]}));setActiveSession(null);setWorkout(null);setExercise(null);setDraft(null);finishRest();setRecovery(false)}
 const openExercise = (ex:Exercise) => {
   setExercise(ex)
   if(ex.id==='jog'){setJogDistance('');setJogDuration('')}
   const weight = recovery ? (suggestedWeight(ex,logs)===undefined ? undefined : Math.round(suggestedWeight(ex,logs)!*0.8*2)/2) : suggestedWeight(ex,logs)
   const saved=draft?.workout===workout && draft.exerciseId===ex.id?draft:null
   setEntries(saved?.entries??Array.from({length:ex.sets},()=>({weight:weight?.toString() ?? '',reps:''})))
   setChecked(saved?.checked??Array.from({length:ex.sets},()=>false))
 }
 const save = () => {
   if (!workout || !exercise) return
   if(exercise.id==='jog'){const km=Number(jogDistance),mins=Number(jogDuration);if(!Number.isFinite(km)||!Number.isFinite(mins)||km<=0||mins<=0)return;setLogs(prev=>[{date:new Date().toISOString(),workout,exerciseId:exercise.id,name:exercise.name,sets:[],distanceKm:km,durationMin:mins,recovery},...prev])}
   else {if(!entries.some(validSet))return;setLogs(prev=>[{date:new Date().toISOString(),workout,exerciseId:exercise.id,name:exercise.name,sets:entries.filter(validSet),recovery},...prev])}
   setExercise(null)
   setDraft(null)
   setChecked([])
   finishRest()
   setMessage('Übung gespeichert.')
 }
 const coachNote=(ex:Exercise)=>{const regular=sortedLogs(logs).filter(l=>l.exerciseId===ex.id&&!l.recovery&&l.sets.some(validSet));if(!regular.length)return 'Noch keine reguläre Einheit: starte mit dem vorgeschlagenen Ausgangsgewicht und passe es nach deinem Gefühl an.';const latest=regular[0];const vals=latest.sets.filter(validSet);if(vals.length>=ex.sets&&vals.every(v=>Number(v.reps)>=ex.max)&&vals.every(v=>v.weight===vals[0].weight))return 'Alle Zielwiederholungen erreicht: kleine Gewichtssteigerung möglich.';if(vals.some(v=>Number(v.reps)<ex.min))return 'Einige Sätze lagen unter dem Zielbereich. Wir bleiben zunächst konservativ; ein einzelner schwächerer Tag ist kein Rückschritt.';return 'Du liegst im Zielbereich. Behalte das Gewicht bei und steigere zunächst die Wiederholungen.'}
 const selectedLogs=sortedLogs(logs.filter(l=>l.exerciseId===statsExercise))
 const chartData=[...selectedLogs].reverse().map(l=>({date:new Date(l.date).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}),gewicht:maxWeight(l),volumen:volume(l),distanz:l.distanceKm??0,dauer:l.durationMin??0}))
 const importBackup=async(file?:File)=>{if(!file)return;try{const backup=JSON.parse(await file.text());const parsed=parseBackup(backup);if(backup.wellness && typeof backup.wellness==='object' && !Array.isArray(backup.wellness)){
  const validDays:Record<string,WellnessDay>={};
  for(const [day,raw] of Object.entries(backup.wellness as Record<string,unknown>)){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(day) || !raw || typeof raw!=='object')continue;
   const r=raw as Partial<WellnessDay>;
   validDays[day]={supplements:Object.fromEntries(supplementNames.map(name=>[name,r.supplements?.[name]===true])),waterGlasses:Math.min(1000,Math.max(0,Math.floor(Number(r.waterGlasses)||0))),meals:Object.fromEntries(mealNames.map(name=>[name,Number.isFinite(Number(r.meals?.[name])) && Number(r.meals?.[name])>=0?String(r.meals?.[name]):'']))};
  }
  setWellness(old=>({...old,...validDays}));
 }if(backup.completed&&typeof backup.completed==='object'&&!Array.isArray(backup.completed)){setSessionDone(old=>({...old,...backup.completed}))}const combined=[...logs];for(const l of parsed){if(!combined.some(x=>x.date===l.date&&x.exerciseId===l.exerciseId&&JSON.stringify(x.sets)===JSON.stringify(l.sets)))combined.push(l)}setLogs(sortedLogs(combined));setMessage(`${parsed.length} Einträge geprüft und zusammengeführt.`)}catch(e){setMessage(e instanceof Error?e.message:'Import fehlgeschlagen')}finally{if(fileInput.current)fileInput.current.value=''}}
 const update = (index:number,key:keyof SetEntry,value:string) => setEntries(prev=>prev.map((e,i)=>i===index?{...e,[key]:value}:e))
 const markSet=(i:number)=>{if(!validSet(entries[i]))return;setChecked(prev=>prev.map((v,j)=>j===i?!v:v));if(!checked[i])startRest()}
 const abandonSession=()=>{if(!window.confirm('Laufende Einheit beenden? Bereits gespeicherte Übungen bleiben erhalten.'))return;setActiveSession(null);setWorkout(null);setExercise(null);setDraft(null);finishRest()}

 return <main className="app-shell">
   <header className="topbar"><span className="logo-mark"><Dumbbell size={20}/></span><strong>FITNESS<span className="accent">TOOL</span></strong><span className="version">BETA 0.7</span></header>
   <nav className="main-tabs" aria-label="Hauptnavigation"><button className={tab==='training'?'active':''} onClick={()=>setTab('training')}><Dumbbell size={18}/> Training</button><button className={tab==='wellness'?'active':''} onClick={()=>setTab('wellness')}><ClipboardList size={18}/> Supplements & Ernährung</button></nav>
   {tab==='wellness' ? <section className="screen wellness-screen">
     <p className="eyebrow">DEIN TAGEBUCH</p><h1>Supplements & Ernährung</h1><p className="muted">Deine täglichen Einträge werden automatisch auf diesem Gerät gespeichert.</p>
     <label className="wellness-date">Datum <input type="date" value={wellnessDate} max={todayKey} onChange={e=>setWellnessDate(e.target.value)}/></label>
     <div className="wellness-panel"><div className="wellness-heading"><h3>Supplements</h3><span>{supplementNames.filter(n=>currentWellness.supplements[n]).length} / {supplementNames.length}</span></div>
       <div className="supplement-list">{supplementNames.map(name=><label className="supplement-row" key={name}><span>{name}</span><input type="checkbox" checked={!!currentWellness.supplements[name]} onChange={e=>updateWellness(wellnessDate,d=>({...d,supplements:{...d.supplements,[name]:e.target.checked}}))}/></label>)}</div>
       <p className="disclaimer">Die Liste dient nur zur Dokumentation, nicht als Einnahmeempfehlung. Dosis und Einnahme richten sich nach deinem individuellen Bedarf.</p>
     </div>
     <div className="wellness-panel"><div className="wellness-heading"><h3><Droplets size={19}/> Wasser</h3><strong>{(currentWellness.waterGlasses*0.4).toLocaleString('de-DE',{maximumFractionDigits:1})} / 3 L</strong></div>
       <div className="water-controls"><button aria-label="Ein Glas weniger" disabled={currentWellness.waterGlasses===0} onClick={()=>updateWellness(wellnessDate,d=>({...d,waterGlasses:Math.max(0,d.waterGlasses-1)}))}><Minus size={21}/></button><div><strong>{currentWellness.waterGlasses}</strong><small>Gläser à 0,4 L</small></div><button aria-label="Ein Glas mehr" onClick={()=>updateWellness(wellnessDate,d=>({...d,waterGlasses:d.waterGlasses+1}))}><Plus size={21}/></button></div>
       <div className="water-track" role="progressbar" aria-label="Wasserziel" aria-valuemin={0} aria-valuemax={3} aria-valuenow={Math.min(3,currentWellness.waterGlasses*0.4)}><div style={{width:`${Math.min(100,currentWellness.waterGlasses*0.4/3*100)}%`}}/></div><small className="muted">{Math.round(Math.min(100,currentWellness.waterGlasses*0.4/3*100))}% des persönlichen 3-Liter-Ziels · 8 Gläser erreichen 3,2 L</small>
     </div>
     <div className="wellness-panel"><div className="wellness-heading"><h3><Utensils size={19}/> Kalorien</h3><strong>{wellnessCalories(currentWellness).toLocaleString('de-DE')} kcal</strong></div>
       {mealNames.map(name=><label className="meal-row" key={name}><span>{name}</span><div><input type="number" inputMode="numeric" min="0" max="20000" placeholder="0" value={currentWellness.meals[name]??''} onChange={e=>{const value=e.target.value;if(value!==''&&(!Number.isFinite(Number(value))||Number(value)<0||Number(value)>20000))return;updateWellness(wellnessDate,d=>({...d,meals:{...d.meals,[name]:value}}))}}/><small>kcal</small></div></label>)}
       <div className="calorie-total"><span>Tagessumme</span><strong>{wellnessCalories(currentWellness).toLocaleString('de-DE')} kcal</strong></div>
     </div>
     <div className="section-heading space-top"><h3>Historie</h3><button className="back" onClick={()=>setWellnessHistory(v=>!v)}>{wellnessHistory?'Weniger':'Alle anzeigen'}</button></div>
     {wellnessDates.length===0?<p className="muted">Noch keine Tage erfasst.</p>:wellnessDates.slice(0,wellnessHistory?undefined:7).map(day=>{const data=wellness[day];return <button className="wellness-history-item" key={day} onClick={()=>setWellnessDate(day)}><strong>{new Date(day+'T12:00:00').toLocaleDateString('de-DE')}</strong><span>{supplementNames.filter(n=>data.supplements[n]).length}/5 Supplements · {(data.waterGlasses*0.4).toLocaleString('de-DE',{maximumFractionDigits:1})} L · {wellnessCalories(data).toLocaleString('de-DE')} kcal</span><ArrowRight size={17}/></button>})}
     <p className="disclaimer">Alle Einträge werden lokal gespeichert und im JSON-Backup mitgesichert. Auf Mac und iPhone sind sie ohne Synchronisierung weiterhin getrennt.</p>
   </section> : exercise ? <section className="screen">
     <button className="back" onClick={()=>setExercise(null)}><ChevronLeft size={18}/> Übungsauswahl</button>
     <div className="exercise-hero"><img src={illustration(exercise.id)} alt={`Schematische Illustration für ${exercise.name}`} /></div>
     <p className="eyebrow">{exercise.group.toUpperCase()}</p><h1>{exercise.name}</h1>
     <div className="goal"><span>VORSCHLAG FÜR HEUTE</span><strong>{exercise.id==='jog'?'Distanz und Dauer erfassen':`${suggestedWeight(exercise,logs)===undefined?'Gewicht selbst wählen':`${recovery?Math.round(suggestedWeight(exercise,logs)!*0.8*2)/2:suggestedWeight(exercise,logs)} kg`} · ${exercise.sets} × ${exercise.min}–${exercise.max}`}</strong><small>{workout==='Cardio'?'Wiederholungen als Minuten erfassen.':'Bei Kurzhanteln Gewicht pro Hantel erfassen.'}</small>{exercise.id!=='jog'&&<p className="coach-note">{coachNote(exercise)}</p>}</div>
     <label className="recovery-toggle"><input type="checkbox" checked={recovery} onChange={e=>setRecovery(e.target.checked)}/> Regenerationseinheit (zählt nicht für die Progression)</label><h3>Deine tatsächlichen Sätze</h3><p className="muted">Nach jedem Satz Werte eintragen und auf „Fertig“ tippen. Die Eingaben bleiben bei einem Neuladen erhalten.</p>
     {activeSession&&<div className="live-time"><Timer size={17}/> Trainingsdauer: {fmtTime(Math.floor((now-activeSession.startedAt)/1000))}</div>}
     {exercise.id!=='jog'&&<div className="rest-box"><div><span>SATZPAUSE</span><strong>{fmtTime(restRemaining)}</strong></div><div className="rest-controls"><button onClick={()=>{setRestSeconds(v=>Math.max(15,v-15));if(restEnd)setRestEnd(t=>t===null?null:t-15000);if(restPaused!==null)setRestPaused(v=>Math.max(0,(v??0)-15))}}>−15 s</button><button onClick={toggleRest}>{restEnd?<Pause size={16}/>:<Play size={16}/>} {restEnd?'Pause':restPaused!==null?'Weiter':'Start'}</button><button onClick={()=>{setRestSeconds(v=>v+15);if(restEnd)setRestEnd(t=>t===null?null:t+15000);if(restPaused!==null)setRestPaused(v=>(v??0)+15)}}>+15 s</button><button aria-label="Timer zurücksetzen" onClick={finishRest}><RotateCcw size={16}/></button></div><small>Timer läuft nur bei geöffneter App zuverlässig sichtbar. Keine Hintergrundbenachrichtigungen.</small></div>}
     {exercise.id==='jog'?<div className="jog-fields"><label>Distanz (km)<input type="number" min="0.01" step="0.01" inputMode="decimal" value={jogDistance} onChange={e=>setJogDistance(e.target.value)} placeholder="z. B. 5,0" /></label><label>Dauer (Minuten)<input type="number" min="0.1" step="0.1" inputMode="decimal" value={jogDuration} onChange={e=>setJogDuration(e.target.value)} placeholder="z. B. 30" /></label>{Number(jogDistance)>0&&Number(jogDuration)>0&&<p className="coach-note">Durchschnittspace: {(Number(jogDuration)/Number(jogDistance)).toFixed(2).replace('.',',')} min/km</p>}</div>:<>
     {entries.map((e,i)=><div className="set-row" key={i}><span className="set-label">Satz {i+1}</span><label>kg<input inputMode="decimal" type="number" min="0" step="0.5" value={e.weight} onChange={ev=>update(i,'weight',ev.target.value)}/></label><label>{workout==='Cardio'?'Min.':'Wdh.'}<input inputMode="numeric" type="number" min="0" value={e.reps} onChange={ev=>update(i,'reps',ev.target.value)}/></label><button type="button" className={`set-check ${checked[i]?'is-checked':''}`} disabled={!validSet(e)} onClick={()=>markSet(i)} aria-label={`Satz ${i+1} ${checked[i]?'als offen':'als fertig'} markieren`}><Check size={17}/></button></div>)}
     <button className="secondary" onClick={()=>{setEntries(prev=>[...prev,{weight:prev.at(-1)?.weight??'',reps:''}]);setChecked(prev=>[...prev,false])}}><Plus size={17}/> Satz hinzufügen</button>
     </>}
     <button className="primary" disabled={exercise.id==='jog'?!(Number(jogDistance)>0&&Number(jogDuration)>0):!entries.some(validSet)} onClick={save}>Übung speichern <Check size={18}/></button>
     <div className="section-heading space-top"><h3>Letzte Ergebnisse</h3></div>
     {sortedLogs(logs.filter(l=>l.exerciseId===exercise.id)).slice(0,3).map((l,i)=><div className="history-item" key={i}><div><strong>{new Date(l.date).toLocaleDateString('de-DE')}</strong><small>{l.exerciseId==='jog'?`${l.distanceKm} km · ${l.durationMin} Min.`:l.sets.map(s=>`${s.weight} kg × ${s.reps}`).join(' · ')}</small></div></div>)}
   </section> : workout ? <section className="screen">
     <button className="back" onClick={()=>setWorkout(null)}><ChevronLeft size={18}/> Home</button><p className="eyebrow">DEIN TRAINING</p><h1>{workout}</h1><p className="muted">Wähle eine Übung. Du kannst Empfehlungen ersetzen oder weitere Übungen hinzufügen.</p>
     {activeSession&&<div className="live-time"><Timer size={17}/> Training läuft · {fmtTime(Math.floor((now-activeSession.startedAt)/1000))} <button className="small-abort" onClick={abandonSession}>Abbrechen</button></div>}
     <div className="session-progress"><strong>Heute abgeschlossen: {catalog[workout].filter(e=>e.recommended && completedToday(e.id)).length} / {catalog[workout].filter(e=>e.recommended).length}</strong><span>Jede gespeicherte Übung wird hier markiert.</span></div><label className="recovery-toggle"><input type="checkbox" checked={recovery} onChange={e=>setRecovery(e.target.checked)}/> Heute leichter trainieren (Regeneration)</label><div className="readiness"><strong>Wie fühlst du dich heute?</strong><div>{(['fit','mittel','muede'] as const).map(v=><button key={v} className={readiness===v?'selected':''} onClick={()=>{setReadiness(v);setRecovery(v==='muede')}}>{v==='fit'?'Fit':v==='mittel'?'Mittel':'Erschöpft'}</button>)}</div><small>{readiness==='muede'?'Leichtere Einheit empfohlen. Sie zählt nicht als Leistungsrückgang.':readiness==='mittel'?'Starte moderat und achte auf deine Tagesform.':'Reguläre Einheit möglich, sofern du dich belastbar fühlst.'}</small></div><h3>Für heute empfohlen</h3><div className="exercise-list">{catalog[workout].filter(e=>e.recommended).map(e=><button className="exercise" key={e.id} onClick={()=>openExercise(e)}><span className="exercise-art"><img src={illustration(e.id)} alt="" /></span><span className="exercise-text"><strong>{e.name} {completedToday(e.id) && <span className="done-chip">✓ Erledigt</span>}</strong><small>{e.group} · {e.sets} × {e.min}–{e.max} {e.id!=='jog'&&suggestedWeight(e,logs)!==undefined?`· ${suggestedWeight(e,logs)} kg`:''}</small></span><ArrowRight size={17} className="muted-icon"/></button>)}</div>
     <h3 className="space-top">Weitere Übungen</h3><div className="exercise-list">{catalog[workout].filter(e=>!e.recommended).map(e=><button className="exercise" key={e.id} onClick={()=>openExercise(e)}><span className="exercise-art"><img src={illustration(e.id)} alt="" /></span><span className="exercise-text"><strong>{e.name} {completedToday(e.id) && <span className="done-chip">✓ Erledigt</span>}</strong><small>{e.group}</small></span><ArrowRight size={17} className="muted-icon"/></button>)}</div>
     <div className="session-finish"><h3>Training abschließen</h3><p className="muted">Speichere zuerst deine Übungen. Anschließend kannst du die gesamte Einheit als abgeschlossen markieren.</p><button className="primary" disabled={!catalog[workout].some(e=>completedToday(e.id))} onClick={markSession}><CalendarCheck size={18}/> {sessionComplete?'Abschluss zurücknehmen':'Training abschließen'}</button></div>
     <p className="disclaimer">Die Bilder sind schematische, eigens erstellte Illustrationen zur Orientierung und keine vollständigen Technik-Anleitungen. Abgeschlossene Übungen werden anhand des heutigen Datums markiert.</p>
   </section> : <section className="screen">
     <p className="eyebrow">DEIN TRAINING. DEIN FORTSCHRITT.</p><h1>Bereit für heute?</h1><p className="muted">Wähle dein Training oder folge unserer Empfehlung.</p>
     {activeSession&&<div className="resume-banner"><div><strong>{activeSession.workout}-Training fortsetzen</strong><small>Läuft seit {Math.floor((now-activeSession.startedAt)/60000)} Minuten</small></div><button onClick={resumeWorkout}>Fortsetzen <ArrowRight size={16}/></button></div>}
     <div className="recommendation"><div className="recommendation-head"><span className="pill">HEUTE EMPFOHLEN</span><TrendingUp size={19}/></div><h2>{recommended} Day</h2><p>{recommended==='Pull'?'Rücken & Bizeps':recommended==='Push'?'Brust, Schulter & Trizeps':'Beine & Gesäß'}</p><small>Grobe Reihenfolge anhand der letzten regulären Trainingsart; ohne Messung der tatsächlichen Erholung. Regenerationseinheiten werden übersprungen. Du kannst jederzeit anders wählen.</small><button className="primary" onClick={()=>startWorkout(recommended)}>Training ansehen <ArrowRight size={18}/></button></div>
     <div className="weekly-pulse"><strong>{recentWeek} / 3–4</strong><span>Trainingstage in den letzten 7 Tagen (inkl. importierter Einheiten mit entsprechendem Datum)</span></div>
     <div className="section-heading"><h3>Training auswählen</h3><span>4 Trainingsarten</span></div><div className="workout-grid">{(Object.keys(catalog) as Workout[]).map(name=>{const Icon=workoutIcons[name];return <button className="workout-card" key={name} onClick={()=>startWorkout(name)}><Icon size={25}/><strong>{name}</strong><small>{name==='Push'?'Brust · Schulter · Trizeps':name==='Pull'?'Rücken · Bizeps':name==='Beine'?'Beine · Gesäß · Waden':'Ausdauer · Herz-Kreislauf'}</small><ArrowRight size={17} className="card-arrow"/></button>})}</div>
     <div className="section-heading"><h3>Fortschritt & Analyse</h3><BarChart3 size={18}/></div>
     <button className="secondary" onClick={()=>setShowStats(!showStats)}>{showStats?'Analyse schließen':'Fortschrittskurven ansehen'} <TrendingUp size={17}/></button>
     {showStats&&<div className="stats-panel"><label>Übung auswählen<select value={statsExercise} onChange={e=>setStatsExercise(e.target.value)}>{Object.values(catalog).flat().map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
       <h3>{statsExercise==='jog'?'Distanz (km)':'Maximales Satzgewicht (kg)'}</h3>{chartData.length?<div className="chart-wrap"><ResponsiveContainer width="100%" height={190}><LineChart data={chartData}><CartesianGrid stroke="#344138"/><XAxis dataKey="date" stroke="#a3b0a4" fontSize={11}/><YAxis stroke="#a3b0a4" fontSize={11}/><Tooltip/><Line dataKey={statsExercise==='jog'?'distanz':'gewicht'} type="monotone" stroke="#b4fb52" strokeWidth={3} dot/></LineChart></ResponsiveContainer></div>:<p className="muted">Noch keine Einträge für diese Übung.</p>}
       <h3>{statsExercise==='jog'?'Dauer (Minuten)':'Trainingsvolumen (kg × Wdh.)'}</h3>{chartData.length>0&&<div className="chart-wrap"><ResponsiveContainer width="100%" height={190}><LineChart data={chartData}><CartesianGrid stroke="#344138"/><XAxis dataKey="date" stroke="#a3b0a4" fontSize={11}/><YAxis stroke="#a3b0a4" fontSize={11}/><Tooltip/><Line dataKey={statsExercise==='jog'?'dauer':'volumen'} type="monotone" stroke="#b4fb52" strokeWidth={3} dot/></LineChart></ResponsiveContainer></div>}
       <p className="disclaimer">Joggen: Distanz und Dauer separat. Gewicht: schwerster Satz. Volumen: Summe aus Gewicht × Wiederholungen; bei Kurzhanteln pro Hantel. Cardio-Minuten sind nicht als Kraftvolumen interpretierbar.</p>
     </div>}
     <div className="section-heading space-top"><h3>Datensicherung</h3></div><div className="backup-actions"><button className="secondary" onClick={()=>downloadBackup(logs,sessionDone,wellness)}><Download size={16}/> JSON exportieren</button><button className="secondary" onClick={()=>fileInput.current?.click()}><Upload size={16}/> JSON importieren</button></div><input ref={fileInput} type="file" accept=".json,application/json" style={{display:'none'}} onChange={e=>void importBackup(e.target.files?.[0])}/>{message&&<p className="muted" role="status">{message}</p>}
     <div className="section-heading space-top"><h3>Trainingseinheiten</h3><button className="back" onClick={()=>setShowSessions(!showSessions)}>{showSessions?'Weniger':'Alle anzeigen'}</button></div>
     {sessions.slice(0,showSessions?sessions.length:4).map(session=><div className="session-card" key={session.day+'-'+session.workout}><div className="session-title"><strong>{session.workout} · {new Date(session.day+'T12:00:00').toLocaleDateString('de-DE')}</strong>{sessionDone[`${session.day}|${session.workout}`]?<span className="done-chip">✓ Abgeschlossen</span>:null}</div><small>{new Set(session.logs.map(l=>l.exerciseId)).size} Übungen · {session.recovery?'Regeneration':'Regulär'}</small><div className="session-exercises">{session.logs.map((l,i)=><span key={i}>{l.name}</span>)}</div></div>)}
     <div className="section-heading"><h3>Trainingshistorie</h3><button className="back" onClick={()=>setShowHistory(!showHistory)}>{showHistory?'Weniger':'Alle anzeigen'}</button></div>
     {logs.length ? sortedLogs(logs).slice(0,showHistory?logs.length:4).map((l,i)=><div className="history-item" key={i}><div><strong>{l.name} · {l.workout} {l.recovery?'· Regeneration':''}</strong><small>{new Date(l.date).toLocaleDateString('de-DE')} · {l.exerciseId==='jog'?`${l.distanceKm} km · ${l.durationMin} Min.`:l.sets.map(s=>`${s.weight} kg × ${s.reps}`).join(' / ')}</small></div></div>):<p className="muted">Noch keine Übungen gespeichert. Deine bisherigen Chat-Trainingsdaten importieren wir separat.</p>}
     {logs.length>0&&<button className="secondary" onClick={()=>{if(window.confirm('Alle in dieser App gespeicherten Trainingsdaten löschen?'))setLogs([]);setSessionDone({})}}><Trash2 size={15}/> Lokale Trainingsdaten löschen</button>}
     <p className="disclaimer">Daten werden aktuell nur in diesem Browser gespeichert. Bitte Browserdaten nicht löschen. Exportiere regelmäßig eine JSON-Sicherung. Eine Cloud-Synchronisierung ist noch nicht eingerichtet.</p>
   </section>}
 </main>
}

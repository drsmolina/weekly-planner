import React, { useEffect, useMemo, useRef, useState } from "react";
const DAY_NAMES = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
function startOfWeek(date: Date){ const d=new Date(date); const day=d.getDay(); const diff=d.getDate()-day; const out=new Date(d.setDate(diff)); out.setHours(0,0,0,0); return out; }
function fmtISO(d: Date){ return d.toISOString().slice(0,10); }
function addDays(d: Date, n: number){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
const TIMES:{h:number;m:number}[]=[]; for(let h=5;h<=23;h++){TIMES.push({h,m:0}); TIMES.push({h,m:30});}
function keyHM(h:number,m:number){ return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`; }
type Cell = { text:string; done:boolean };
type WeekData = Record<string, Record<string, Cell>>;
function makeEmptyWeek():WeekData{ const wk:WeekData={}; for(let d=0;d<7;d++) wk[String(d)]={}; return wk; }
const TRAIN_BY_DAY:Record<number,string>={0:"Rest walk + stretch",1:"Lower Strength",2:"LISS 45m + mobility",3:"Upper Strength",4:"LISS 45m + hips",5:"Full-body Strength",6:"Mobility + light intervals"};
const CREATE_BY_DAY:Record<number,string>={0:"Analytics & plan next week",1:"YT research + outline",2:"Script draft + B-roll list",3:"Record VO + first edit",4:"Final edit + thumbnail + captions",5:"SEO/metadata + schedule + post",6:"AI stock batch + metadata & upload"};
const DEEPWORK_BY_DAY:Record<number,string>={0:"Reflect/journal + plan week",1:"SQL/automation deep work",2:"Deep work + Acts of Service 20:30–21:00",3:"SQL/automation deep work",4:"Deep work + Acts of Service 20:30–21:00",5:"SQL/automation deep work",6:"Light study / fun project"};
function makeDefaultTemplate():WeekData{
  const wk=makeEmptyWeek();
  const setText=(day:number, key:string, text:string)=>{ wk[String(day)][key]={text,done:false}; };
  const timesBetween=(start:string,endExcl:string)=>({
    *[Symbol.iterator](){
      const [sh,sm]=start.split(":").map(Number);
      const [eh,em]=endExcl.split(":").map(Number);
      let h=sh,m=sm;
      while(h<eh || (h===eh && m<em)){ yield keyHM(h,m); m+=30; if(m>=60){m=0;h++;} }
    }
  });
  const fillRange=(day:number, start:string, endExcl:string, text:string)=>{
    for(const k of timesBetween(start,endExcl)) setText(day,k,text);
  };
  for(let d=0;d<7;d++){
    setText(d,"08:30","Home+shower+snack+journal");
    setText(d,"09:00","Meds (escitalopram)");
    fillRange(d,"09:30","17:00","SLEEP"); 
    fillRange(d,"17:00","18:00",`Train: ${TRAIN_BY_DAY[d]}`);
    setText(d,"18:00","Protein dinner (30–40g)");
    fillRange(d,"18:30","20:00",`Create: ${CREATE_BY_DAY[d]}`);
    setText(d,"20:00","Admin / tidy");
    fillRange(d,"20:30","22:00",DEEPWORK_BY_DAY[d]);
    setText(d,"22:00","Commute + pre-shift meal");
    setText(d,"23:00","Night shift (overnight)");
    setText(d,"23:30","Night shift (overnight)");
  }
  return wk;
}
const STORAGE_KEY="planner:data:v2_halfhours";
const STORAGE_TEMPLATE_KEY="planner:baseTemplate:v2_halfhours";
const STORAGE_AUTOSEED_KEY="planner:autoSeed:v1";
const load=<T,>(k:string,f:T):T=>{ try{const r=localStorage.getItem(k); return r?JSON.parse(r):f;}catch{return f;} };
const save=<T,>(k:string,v:T)=>{ try{localStorage.setItem(k,JSON.stringify(v));}catch{} };
function PlannerCell({value,onChange,onToggleDone}:{value:Cell|undefined;onChange:(v:Cell)=>void;onToggleDone:()=>void;}) {
  const ref=useRef<HTMLDivElement>(null);
  const text=value?.text??""; const done=value?.done??false;
  const len=text.length; const sizeClass=len<40?"text-base":len<120?"text-sm":"text-xs";
  return (
    <div className="group relative h-12 border-l border-b border-gray-200 p-1">
      <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition">
        <button className={`h-5 w-5 grid place-items-center rounded-full border ${done?"bg-emerald-600 text-white border-emerald-600":"bg-white text-gray-500"}`} onClick={onToggleDone} title={done?"Mark as not done":"Mark done"}>✓</button>
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning
        className={`h-full w-full outline-none leading-snug whitespace-pre-wrap ${sizeClass} ${done?"line-through text-gray-400":"text-gray-800"}`}
        onBlur={(e)=>onChange({text:e.currentTarget.innerText.trim(),done})}
        onKeyDown={(e)=>{ if(e.key==="Enter"){ e.preventDefault(); (e.target as HTMLDivElement).blur(); }}}>
        {text}
      </div>
    </div>
  );
}
export default function App(){
  const [today]=useState(new Date());
  const [dateInput,setDateInput]=useState<string>(fmtISO(today));
  const weekStart=useMemo(()=>startOfWeek(new Date(dateInput)),[dateInput]);
  const [data,setData]=useState<Record<string,WeekData>>(()=>load(STORAGE_KEY,{}));
  const [autoSeed,setAutoSeed]=useState<boolean>(()=>load(STORAGE_AUTOSEED_KEY,true));
  const [baseTemplate,setBaseTemplate]=useState<WeekData>(()=>load(STORAGE_TEMPLATE_KEY,makeDefaultTemplate()));
  useEffect(()=>{ const wkKey=fmtISO(weekStart); if(!data[wkKey]){ const seeded=autoSeed?JSON.parse(JSON.stringify(baseTemplate)):makeEmptyWeek(); setData(prev=>({...prev,[wkKey]:seeded})); }},[weekStart]);
  useEffect(()=>save(STORAGE_KEY,data),[data]);
  useEffect(()=>save(STORAGE_TEMPLATE_KEY,baseTemplate),[baseTemplate]);
  useEffect(()=>save(STORAGE_AUTOSEED_KEY,autoSeed),[autoSeed]);
  const wkKey=fmtISO(weekStart);
  const weekData:WeekData=data[wkKey]||makeEmptyWeek();
  function setCell(dayIdx:number,timeKey:string,cell:Cell){
    setData(prev=>{ const next={...prev}; const w={...(next[wkKey]||makeEmptyWeek())} as WeekData; const d={...(w[String(dayIdx)]||{})} as Record<string,Cell>; d[timeKey]=cell; w[String(dayIdx)]=d; next[wkKey]=w; return next; });
  }
  function toggleCellDone(dayIdx:number,timeKey:string){ const cur=weekData[String(dayIdx)]?.[timeKey]; setCell(dayIdx,timeKey,{text:cur?.text||"",done:!(cur?.done??false)}); }
  function shiftWeek(delta:number){ const d=new Date(weekStart); d.setDate(d.getDate()+delta*7); setDateInput(fmtISO(d)); }
  function resetWeekToTemplate(){ setData(prev=>({...prev,[wkKey]:JSON.parse(JSON.stringify(baseTemplate))})); }
  function saveCurrentAsTemplate(){ setBaseTemplate(JSON.parse(JSON.stringify(weekData))); }
  const headerDays=Array.from({length:7},(_,i)=>addDays(weekStart,i));
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1200px] p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Weekly Planner</h1>
        <div className="mt-4 rounded-xl border bg-white shadow-sm p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <button className="rounded-md border px-3 py-1 text-sm" onClick={()=>shiftWeek(-1)}>← Prev week</button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Week of</span>
              <input type="date" value={fmtISO(weekStart)} onChange={(e)=>setDateInput(e.target.value)} className="rounded-md border px-2 py-1 text-sm" />
            </div>
            <button className="rounded-md border px-3 py-1 text-sm" onClick={()=>shiftWeek(1)}>Next week →</button>
            <label className="ml-2 inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={autoSeed} onChange={(e)=>setAutoSeed(e.target.checked)} />
              Auto-seed new weeks from Base Template
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-md border px-3 py-1 text-sm" onClick={resetWeekToTemplate}>Reset week to Base</button>
            <button className="rounded-md bg-black text-white px-3 py-1 text-sm" onClick={saveCurrentAsTemplate}>Save week as Base</button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border bg-white shadow-sm">
          <div className="min-w-[1040px]">
            <div className="grid" style={{ gridTemplateColumns: `80px repeat(7, minmax(0, 1fr))` }}>
              <div className="h-12 border-b bg-gray-50" />
              {headerDays.map((d,i)=>(
                <div key={i} className="h-12 border-b bg-gray-50 px-3 flex items-center">
                  <div className="font-semibold">{d.getDate()} {DAY_NAMES[i]}</div>
                </div>
              ))}
            </div>
            {TIMES.map(({h,m})=>(
              <div key={`${h}:${m}`} className="grid" style={{ gridTemplateColumns: `80px repeat(7, minmax(0, 1fr))` }}>
                <div className={`h-12 border-b border-r px-3 py-2 text-sm ${m===0?"bg-gray-50 text-gray-700":"bg-gray-50 text-gray-400"} flex items-center`}>
                  {m===0?`${h}:00`:""}
                </div>
                {new Array(7).fill(0).map((_,di)=>{
                  const timeKey=keyHM(h,m);
                  const cell=weekData[String(di)]?.[timeKey];
                  return (
                    <PlannerCell key={`${di}-${timeKey}`} value={cell}
                      onChange={(v)=>setCell(di,timeKey,v)}
                      onToggleDone={()=>toggleCellDone(di,timeKey)} />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">Notes: caffeine cutoff ≈ 04:00; protein 1.6–2.2 g/kg/day; hydrate 2–3 L/day; keep bedroom cool & dark for day sleep.</div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";

const MOODS = ["😞","😕","😐","🙂","😄"];
const MOOD_LABELS = ["Rough","Not great","Okay","Good","Great"];
const MOOD_COLORS = ["#E24B4A","#EF9F27","#888780","#1D9E75","#378ADD"];
const DEFAULT_HABITS = [
  {name:"Cycling",freq:3},{name:"Journaling",freq:7},{name:"Good sleep",freq:7},{name:"Healthy eating",freq:5}
];
const FREQ_OPTIONS = [1,2,3,4,5,6,7];
const DAY_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const TABS = [["today","Today"],["todos","To-do"],["cal","Calories"],["weekly","Weekly"],["progress","Progress"],["other","Other"]];
const TAB_ORDER = TABS.map(([v])=>v);
const CATEGORIES = ["Uncategorized","Love","Motivation","Life","Longing","Fun"];

const P = {
  teal:"#1D9E75", tealD:"#085041", tealL:"#E1F5EE",
  purple:"#7F77DD", purpleD:"#26215C", purpleL:"#EEEDFE",
  coral:"#D85A30", coralD:"#4A1B0C", coralL:"#FAECE7",
  blue:"#378ADD", blueD:"#042C53", blueL:"#E6F1FB",
  amber:"#BA7517", amberD:"#412402", amberL:"#FAEEDA",
  green:"#639922", greenD:"#173404", greenL:"#EAF3DE",
};

const CAT_COLORS = {
  Love:         {c:"#D4537E", cD:"#4B1528", cL:"#FBEAF0"},
  Motivation:   {c:P.coral,   cD:P.coralD,  cL:P.coralL},
  Life:         {c:P.teal,    cD:P.tealD,   cL:P.tealL},
  Longing:      {c:P.purple,  cD:P.purpleD, cL:P.purpleL},
  Fun:          {c:P.amber,   cD:P.amberD,  cL:P.amberL},
  Uncategorized:{c:P.blue,    cD:P.blueD,   cL:P.blueL},
};

function fmt(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function todayKey(){return fmt(new Date());}
function getMonthKeys(y,m){const n=new Date(y,m+1,0).getDate();return Array.from({length:n},(_,i)=>`${y}-${String(m+1).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`);}
function ld(k,d){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d));}catch{return d;}}
function sv(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}
function hasData(e){return e&&(e.mood!=null||e.note||Object.values(e.habits||{}).some(Boolean));}
function calcStreak(data){let s=0,d=new Date();while(true){const k=fmt(d);if(hasData(data[k])){s++;d.setDate(d.getDate()-1);}else break;}return s;}
function calcLongest(data){
  let best=0,cur=0;const keys=Object.keys(data).sort();if(!keys.length)return 0;
  const start=new Date(keys[0]+"T12:00:00"),end=new Date();
  for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){if(hasData(data[fmt(d)])){cur++;best=Math.max(best,cur);}else cur=0;}
  return best;
}
function getWeekDays(data,offset){
  const d=new Date();
  d.setDate(d.getDate()-d.getDay()+1-offset*7);
  d.setHours(0,0,0,0);
  return Array.from({length:7},(_,i)=>{
    const day=new Date(d);day.setDate(d.getDate()+i);
    const k=fmt(day);return{key:k,date:day,entry:data[k]||{}};
  });
}
function getLast7(data){return Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const k=fmt(d);return{key:k,date:d,entry:data[k]||{}};});}
function freqLabel(f){return f===7?"Daily":`${f}x/week`;}
function habitColor(count,freq){if(count>=freq)return P.teal;if(count>=Math.ceil(freq/2))return P.amber;return P.coral;}

const card=(bg,border,tc)=>({border:`2px solid ${border}`,borderRadius:8,padding:"10px 12px",marginBottom:8,background:bg,color:tc});
const smBtn=(bc,bg,tc)=>({padding:"5px 10px",borderRadius:6,border:`2px solid ${bc}`,background:bg,color:tc,cursor:"pointer",fontSize:12,fontWeight:700});
const inpBase=(bc,bg)=>({borderRadius:6,padding:"6px 9px",fontSize:13,color:"#111",background:bg||"#fff",fontFamily:"system-ui,sans-serif",flex:1,minWidth:0,border:`2px solid ${bc}`});
const selStyle=(bc,bg,tc)=>({borderRadius:5,border:`1.5px solid ${bc}`,background:bg,color:tc,padding:"3px 6px",fontSize:12,fontWeight:700,cursor:"pointer"});

export default function App(){
  const [data,setData]           = useState(()=>ld("dj3_data",{}));
  const [habits,setHabits]       = useState(()=>ld("dj3_habits",DEFAULT_HABITS));
  const [todos,setTodos]         = useState(()=>ld("dj3_todos",[]));
  const [quotes,setQuotes]       = useState(()=>ld("dj3_quotes",[]));
  const [lyrics,setLyrics]       = useState(()=>ld("dj3_lyrics",[]));
  const [memories,setMemories]   = useState(()=>ld("dj3_memories",[]));
  const [meals,setMeals]         = useState(()=>ld("dj3_meals",{}));
  const [calTarget,setCalTarget] = useState(()=>ld("dj3_caltarget",2200));
  const [view,setView]           = useState("today");
  const [activeDay,setActiveDay] = useState(todayKey());
  const [calDay,setCalDay]       = useState(todayKey());
  const [weekOffset,setWeekOffset] = useState(0);
  const [calMonth,setCalMonth]   = useState(new Date().getMonth());
  const [calYear,setCalYear]     = useState(new Date().getFullYear());
  const [newHabitName,setNewHabitName] = useState("");
  const [newHabitFreq,setNewHabitFreq] = useState(7);
  const [newTodo,setNewTodo]     = useState("");
  const [editH,setEditH]         = useState(false);
  const [moodOpen,setMoodOpen]   = useState(false);
  const [copied,setCopied]       = useState(false);
  const [otherTab,setOtherTab]   = useState("quotes");
  const [qText,setQText]         = useState("");
  const [qAuthor,setQAuthor]     = useState("");
  const [qCat,setQCat]           = useState("Uncategorized");
  const [qFilter,setQFilter]     = useState("All");
  const [lText,setLText]         = useState("");
  const [lSong,setLSong]         = useState("");
  const [lArtist,setLArtist]     = useState("");
  const [lImg,setLImg]           = useState("");
  const [lCat,setLCat]           = useState("Uncategorized");
  const [lFilter,setLFilter]     = useState("All");
  const [lImgLoading,setLImgLoading] = useState(false);
  const [mTitle,setMTitle]       = useState("");
  const [mDesc,setMDesc]         = useState("");
  const [mDate,setMDate]         = useState("");
  const [mealInput,setMealInput] = useState("");
  const [mealLoading,setMealLoading] = useState(false);
  const [editTarget,setEditTarget] = useState(false);
  const [targetInput,setTargetInput] = useState(2200);

  useEffect(()=>{
    let startX=0,startY=0;
    const onStart=e=>{startX=e.touches[0].clientX;startY=e.touches[0].clientY;};
    const onEnd=e=>{
      const dx=e.changedTouches[0].clientX-startX;
      const dy=e.changedTouches[0].clientY-startY;
      if(Math.abs(dx)<25)return;
      if(Math.abs(dx)<Math.abs(dy)*1.5)return;
      setView(prev=>{const i=TAB_ORDER.indexOf(prev);if(dx<0&&i<TAB_ORDER.length-1)return TAB_ORDER[i+1];if(dx>0&&i>0)return TAB_ORDER[i-1];return prev;});
    };
    window.addEventListener("touchstart",onStart,{passive:true});
    window.addEventListener("touchend",onEnd,{passive:true});
    return()=>{window.removeEventListener("touchstart",onStart);window.removeEventListener("touchend",onEnd);};
  },[]);

  const today         = todayKey();
  const entry         = data[activeDay]||{mood:null,habits:{},note:""};
  const isToday       = activeDay===today;
  const isCalToday    = calDay===today;
  const isCurrentWeek = weekOffset===0;
  const activeDateObj = new Date(activeDay+"T12:00:00");
  const activeDateLabel = activeDateObj.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const calDayMeals   = meals[calDay]||[];
  const totalCal      = calDayMeals.reduce((a,m)=>a+m.cal,0);
  const totalP        = calDayMeals.reduce((a,m)=>a+m.protein,0);
  const totalC        = calDayMeals.reduce((a,m)=>a+m.carbs,0);
  const totalF        = calDayMeals.reduce((a,m)=>a+m.fat,0);
  const calPct        = Math.min(100,Math.round(totalCal/calTarget*100));
  const w7            = getWeekDays(data,weekOffset);
  const weekLabel     = isCurrentWeek?"This week":`${w7[0].date.toLocaleDateString("en-GB",{day:"numeric",month:"short"})} — ${w7[6].date.toLocaleDateString("en-GB",{day:"numeric",month:"short"})}`;
  const moodVals      = w7.map(x=>x.entry.mood).filter(x=>x!=null);
  const avgMood       = moodVals.length?Math.round(moodVals.reduce((a,b)=>a+b,0)/moodVals.length*10)/10:null;
  const weekLogged    = w7.filter(x=>hasData(x.entry)).length;
  const monthKeys     = getMonthKeys(calYear,calMonth);
  const firstDay      = new Date(calYear,calMonth,1).getDay();
  const doneCount     = todos.filter(x=>x.done).length;
  const pendingCount  = todos.filter(x=>!x.done).length;
  const streak        = calcStreak(data);
  const longest       = calcLongest(data);
  const totalLogged   = Object.keys(data).filter(k=>hasData(data[k])).length;

  function upEntry(patch){const u={...data,[activeDay]:{...entry,...patch}};setData(u);sv("dj3_data",u);}
  function shiftDay(n){const d=new Date(activeDay+"T12:00:00");d.setDate(d.getDate()+n);const t=new Date();t.setHours(23,59,59);if(d<=t)setActiveDay(fmt(d));}
  function shiftCalDay(n){const d=new Date(calDay+"T12:00:00");d.setDate(d.getDate()+n);const t=new Date();t.setHours(23,59,59);if(d<=t)setCalDay(fmt(d));}
  function addHabit(){if(!newHabitName.trim())return;const h=[...habits,{name:newHabitName.trim(),freq:newHabitFreq}];setHabits(h);sv("dj3_habits",h);setNewHabitName("");setNewHabitFreq(7);}
  function delHabit(i){const h=habits.filter((_,j)=>j!==i);setHabits(h);sv("dj3_habits",h);}
  function updateHabitFreq(i,freq){const h=habits.map((x,j)=>j===i?{...x,freq}:x);setHabits(h);sv("dj3_habits",h);}
  function moveHabit(i,dir){const h=[...habits];const to=i+dir;if(to<0||to>=h.length)return;[h[i],h[to]]=[h[to],h[i]];setHabits(h);sv("dj3_habits",h);}
  function addTodo(){if(!newTodo.trim())return;const t=[...todos,{id:Date.now(),text:newTodo.trim(),done:false}];setTodos(t);sv("dj3_todos",t);setNewTodo("");}
  function togTodo(id){const t=todos.map(x=>x.id===id?{...x,done:!x.done}:x);setTodos(t);sv("dj3_todos",t);}
  function delTodo(id){const t=todos.filter(x=>x.id!==id);setTodos(t);sv("dj3_todos",t);}
  function clearDone(){const t=todos.filter(x=>!x.done);setTodos(t);sv("dj3_todos",t);}
  function addQuote(){if(!qText.trim())return;const q=[...quotes,{id:Date.now(),text:qText.trim(),author:qAuthor.trim(),cat:qCat}];setQuotes(q);sv("dj3_quotes",q);setQText("");setQAuthor("");setQCat("Uncategorized");}
  function delQuote(id){const q=quotes.filter(x=>x.id!==id);setQuotes(q);sv("dj3_quotes",q);}
  function addLyric(){if(!lText.trim()||!lSong.trim())return;const l=[...lyrics,{id:Date.now(),text:lText.trim(),song:lSong.trim(),artist:lArtist.trim(),img:lImg,cat:lCat}];setLyrics(l);sv("dj3_lyrics",l);setLText("");setLSong("");setLArtist("");setLImg("");setLCat("Uncategorized");}
  function delLyric(id){const l=lyrics.filter(x=>x.id!==id);setLyrics(l);sv("dj3_lyrics",l);}
  function addMemory(){if(!mTitle.trim()||!mDesc.trim())return;const m=[...memories,{id:Date.now(),title:mTitle.trim(),desc:mDesc.trim(),date:mDate||today}];setMemories(m);sv("dj3_memories",m);setMTitle("");setMDesc("");setMDate("");}
  function delMemory(id){const m=memories.filter(x=>x.id!==id);setMemories(m);sv("dj3_memories",m);}
  function delMeal(id){const m={...meals,[calDay]:calDayMeals.filter(x=>x.id!==id)};setMeals(m);sv("dj3_meals",m);}

  async function fetchAlbumArt(){
    if(!lSong.trim())return;setLImgLoading(true);setLImg("");
    try{const q=encodeURIComponent(`${lSong} ${lArtist}`);const res=await fetch(`https://itunes.apple.com/search?term=${q}&media=music&limit=1`);const json=await res.json();if(json.results&&json.results[0])setLImg(json.results[0].artworkUrl100.replace("100x100bb","300x300bb"));else setLImg("");}catch{setLImg("");}
    setLImgLoading(false);
  }

  async function logMeal(){
    if(!mealInput.trim())return;
    setMealLoading(true);
    try{
      const res=await fetch(`https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(mealInput)}`,{headers:{"X-Api-Key":import.meta.env.VITE_CALORIE_API_KEY}});
      const d=await res.json();
      if(!d.items||d.items.length===0)throw new Error("No results");
      const totals=d.items.reduce((acc,item)=>({cal:acc.cal+item.calories,protein:acc.protein+item.protein_g,carbs:acc.carbs+item.carbohydrates_total_g,fat:acc.fat+item.fat_total_g}),{cal:0,protein:0,carbs:0,fat:0});
      const newMeal={id:Date.now(),name:mealInput.trim(),cal:Math.round(totals.cal),protein:Math.round(totals.protein),carbs:Math.round(totals.carbs),fat:Math.round(totals.fat)};
      const updated={...meals,[calDay]:[...calDayMeals,newMeal]};
      setMeals(updated);sv("dj3_meals",updated);setMealInput("");
    }catch(e){console.error(e);}
    setMealLoading(false);
  }

  function buildCopy(){
    const lines=[`Journal entry — ${activeDateLabel}`,``];
    lines.push(entry.mood!=null?`Mood: ${MOODS[entry.mood]} ${MOOD_LABELS[entry.mood]} (${entry.mood+1}/5)`:"Mood: not logged");
    lines.push(``,`Habits:`);
    habits.forEach(h=>lines.push(`  ${entry.habits&&entry.habits[h.name]?"✓":"✗"} ${h.name} (target: ${freqLabel(h.freq)})`));
    lines.push(``);
    lines.push(entry.note&&entry.note.trim()?`Notes:\n${entry.note.trim()}`:"Notes: (none)");
    return lines.join("\n");
  }
  function doCopy(){
    const text=buildCopy();
    try{navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);}).catch(()=>fallbackCopy(text));}
    catch(e){fallbackCopy(text);}
  }
  function fallbackCopy(text){
    const el=document.createElement("textarea");el.value=text;el.style.position="fixed";el.style.opacity="0";
    document.body.appendChild(el);el.focus();el.select();
    try{document.execCommand("copy");setCopied(true);setTimeout(()=>setCopied(false),2500);}catch(e){}
    document.body.removeChild(el);
  }

  return(
    <div style={{fontFamily:"system-ui,sans-serif",padding:"12px 10px",maxWidth:480,margin:"0 auto",minHeight:"100vh",background:"#f5f5f5"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
        <span style={{fontSize:18,fontWeight:700,color:"#111"}}>Daily journal</span>
        <span style={{fontSize:11,color:"#888"}}>{new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</span>
      </div>
      <div style={{display:"flex",gap:3,marginBottom:10}}>
        {TABS.map(([v,label])=>(
          <button key={v} onClick={()=>setView(v)} style={{flex:1,padding:"6px 2px",borderRadius:6,border:`2px solid ${view===v?P.purple:"#ddd"}`,background:view===v?P.purpleL:"#fff",color:view===v?P.purpleD:"#333",cursor:"pointer",fontSize:10,fontWeight:view===v?700:400}}>
            {label}
          </button>
        ))}
      </div>

      {view==="today"&&(
        <div>
          {pendingCount>0&&(
            <div style={{...card(P.coralL,P.coral,P.coralD),textAlign:"center",marginBottom:8}}>
              <span style={{fontSize:13,fontWeight:700}}>⚠️ You have {pendingCount} task{pendingCount>1?"s":""} to complete</span>
            </div>
          )}
          <div style={{...card(isToday?P.tealL:P.amberL,isToday?P.teal:P.amber,isToday?P.tealD:P.amberD),display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <button onClick={()=>shiftDay(-1)} style={smBtn(P.purple,P.purpleL,P.purpleD)}>← Back</button>
            <span style={{fontSize:12,fontWeight:700}}>{isToday?"Today":activeDateObj.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}</span>
            <button onClick={()=>shiftDay(1)} style={{...smBtn(P.purple,P.purpleL,P.purpleD),opacity:activeDay>=today?0.3:1,pointerEvents:activeDay>=today?"none":"auto"}}>Forward →</button>
          </div>
          <div style={card(P.blueL,P.blue,P.blueD)}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",flex:1}} onClick={()=>setMoodOpen(o=>!o)}>
                <span style={{fontSize:10,fontWeight:700}}>MOOD</span>
                <span style={{fontSize:20}}>{entry.mood!=null?MOODS[entry.mood]:"···"}</span>
                {entry.mood!=null&&<span style={{fontSize:11,fontWeight:700,color:MOOD_COLORS[entry.mood]}}>{MOOD_LABELS[entry.mood]}</span>}
                <span style={{fontSize:10,fontWeight:700}}>{moodOpen?"▲":"▼"}</span>
              </div>
              <div style={{width:1,height:24,background:P.blue,margin:"0 10px",opacity:0.4}}/>
              <div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}} onClick={doCopy}>
                <span style={{fontSize:14}}>{copied?"✓":"⎘"}</span>
                <span style={{fontSize:10,fontWeight:700,color:copied?P.tealD:P.purpleD}}>{copied?"COPIED!":"COPY ENTRY"}</span>
              </div>
            </div>
            {moodOpen&&(
              <div style={{display:"flex",gap:4,marginTop:8,justifyContent:"space-between"}}>
                {MOODS.map((m,i)=>(
                  <button key={i} onClick={()=>{upEntry({mood:i});setMoodOpen(false);}} title={MOOD_LABELS[i]}
                    style={{fontSize:22,background:entry.mood===i?MOOD_COLORS[i]+"33":"transparent",border:`2px solid ${entry.mood===i?MOOD_COLORS[i]:"transparent"}`,cursor:"pointer",borderRadius:8,flex:1,height:40,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={card(P.tealL,P.teal,P.tealD)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:10,fontWeight:700}}>HABITS</span>
              <button onClick={()=>setEditH(o=>!o)} style={smBtn(P.teal,P.tealD,"#fff")}>{editH?"Done":"Edit"}</button>
            </div>
            {habits.map((h,i)=>{
              const done=!!(entry.habits&&entry.habits[h.name]);
              return(
                <div key={h.name+i}>
                  <div onClick={()=>!editH&&upEntry({habits:{...entry.habits,[h.name]:!done}})}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:7,marginBottom:editH?0:5,background:done&&!editH?P.teal+"22":"transparent",border:`1.5px solid ${done&&!editH?P.teal:"transparent"}`,cursor:editH?"default":"pointer"}}>
                    {editH
                      ?<span onClick={()=>delHabit(i)} style={{cursor:"pointer",color:P.coral,fontWeight:700,fontSize:18,lineHeight:1,minWidth:18}}>×</span>
                      :<div style={{width:20,height:20,borderRadius:5,border:`2px solid ${done?P.teal:P.tealD}`,background:done?P.teal:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {done&&<span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}
                      </div>
                    }
                    <div style={{flex:1}}>
                      <span style={{fontSize:14,fontWeight:done&&!editH?700:500}}>{h.name}</span>
                      <span style={{fontSize:11,marginLeft:8,opacity:0.7}}>{freqLabel(h.freq)}</span>
                    </div>
                    {done&&!editH&&<span style={{fontSize:11,fontWeight:700,color:P.teal}}>✓</span>}
                    {editH&&(
                      <div style={{display:"flex",flexDirection:"column",gap:2}}>
                        <button onClick={e=>{e.stopPropagation();moveHabit(i,-1);}} disabled={i===0}
                          style={{...smBtn(P.teal,P.tealL,P.tealD),padding:"1px 7px",opacity:i===0?0.3:1,fontSize:13,lineHeight:1}}>↑</button>
                        <button onClick={e=>{e.stopPropagation();moveHabit(i,1);}} disabled={i===habits.length-1}
                          style={{...smBtn(P.teal,P.tealL,P.tealD),padding:"1px 7px",opacity:i===habits.length-1?0.3:1,fontSize:13,lineHeight:1}}>↓</button>
                      </div>
                    )}
                  </div>
                  {editH&&(
                    <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px 8px 38px"}}>
                      <span style={{fontSize:11,fontWeight:600}}>Frequency:</span>
                      <select value={h.freq} onChange={e=>updateHabitFreq(i,Number(e.target.value))} style={selStyle(P.teal,P.tealL,P.tealD)}>
                        {FREQ_OPTIONS.map(f=><option key={f} value={f}>{freqLabel(f)}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
            {editH&&(
              <div style={{borderTop:`1.5px solid ${P.teal}`,marginTop:4,paddingTop:8}}>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  <input style={inpBase(P.teal,P.tealL)} placeholder="New habit name..." value={newHabitName} onChange={e=>setNewHabitName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addHabit()}/>
                  <select value={newHabitFreq} onChange={e=>setNewHabitFreq(Number(e.target.value))} style={selStyle(P.teal,P.tealL,P.tealD)}>
                    {FREQ_OPTIONS.map(f=><option key={f} value={f}>{freqLabel(f)}</option>)}
                  </select>
                </div>
                <button onClick={addHabit} style={{...smBtn(P.teal,P.tealD,"#fff"),width:"100%"}}>Add habit</button>
              </div>
            )}
          </div>
          <div style={card(P.purpleL,P.purple,P.purpleD)}>
            <span style={{fontSize:10,fontWeight:700,display:"block",marginBottom:5}}>NOTES</span>
            <textarea value={entry.note||""} onChange={e=>upEntry({note:e.target.value})} placeholder="Write anything on your mind..."
              style={{width:"100%",minHeight:80,resize:"vertical",borderRadius:6,border:`1.5px solid ${P.purple}`,padding:"8px",fontSize:13,color:P.purpleD,background:"#fff",boxSizing:"border-box",fontFamily:"system-ui,sans-serif"}}/>
          </div>
        </div>
      )}

      {view==="todos"&&(
        <div style={card(P.blueL,P.blue,P.blueD)}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:10,fontWeight:700}}>TO-DO LIST</span>
            {doneCount>0&&<button onClick={clearDone} style={smBtn(P.coral,P.coralL,P.coralD)}>Clear done ({doneCount})</button>}
          </div>
          {todos.length===0&&<p style={{fontSize:13,opacity:0.6,margin:"0 0 8px"}}>Nothing here yet.</p>}
          {todos.map(t=>(
            <div key={t.id} onClick={()=>togTodo(t.id)} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,padding:"8px 10px",borderRadius:7,background:t.done?P.teal+"22":"transparent",border:`1.5px solid ${t.done?P.teal:"transparent"}`,cursor:"pointer"}}>
              <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${t.done?P.teal:P.blueD}`,background:t.done?P.teal:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {t.done&&<span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}
              </div>
              <span style={{flex:1,fontSize:13,fontWeight:500,textDecoration:t.done?"line-through":"none",opacity:t.done?0.6:1}}>{t.text}</span>
              <span onClick={e=>{e.stopPropagation();delTodo(t.id);}} style={{cursor:"pointer",color:P.coral,fontWeight:700,fontSize:16,lineHeight:1}}>×</span>
            </div>
          ))}
          <div style={{display:"flex",gap:6,marginTop:8}}>
            <input style={inpBase(P.blue)} placeholder="Add a task..." value={newTodo} onChange={e=>setNewTodo(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTodo()}/>
            <button onClick={addTodo} style={smBtn(P.blue,P.blueD,"#fff")}>Add</button>
          </div>
        </div>
      )}

      {view==="cal"&&(
        <div>
          <div style={{...card(isCalToday?P.tealL:P.amberL,isCalToday?P.teal:P.amber,isCalToday?P.tealD:P.amberD),display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <button onClick={()=>shiftCalDay(-1)} style={smBtn(P.purple,P.purpleL,P.purpleD)}>← Back</button>
            <span style={{fontSize:12,fontWeight:700}}>{isCalToday?"Today":new Date(calDay+"T12:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}</span>
            <button onClick={()=>shiftCalDay(1)} style={{...smBtn(P.purple,P.purpleL,P.purpleD),opacity:calDay>=today?0.3:1,pointerEvents:calDay>=today?"none":"auto"}}>Forward →</button>
          </div>
          <div style={card(P.greenL,P.green,P.greenD)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:10,fontWeight:700}}>{isCalToday?"TODAY'S CALORIES":"CALORIES — "+new Date(calDay+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"}).toUpperCase()}</span>
              {!editTarget
                ?<span onClick={()=>{setTargetInput(calTarget);setEditTarget(true);}} style={{fontSize:10,fontWeight:700,cursor:"pointer",opacity:0.7}}>Target: {calTarget} kcal ✏️</span>
                :<div style={{display:"flex",gap:4,alignItems:"center"}}>
                  <input type="number" value={targetInput} onChange={e=>setTargetInput(Number(e.target.value))}
                    style={{width:70,borderRadius:5,border:`1.5px solid ${P.green}`,padding:"2px 6px",fontSize:12,fontWeight:700,color:P.greenD,background:"#fff"}}/>
                  <button onClick={()=>{setCalTarget(targetInput);sv("dj3_caltarget",targetInput);setEditTarget(false);}} style={smBtn(P.green,P.greenD,"#fff")}>Save</button>
                </div>
              }
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
              <span style={{fontSize:28,fontWeight:700}}>{totalCal}</span>
              <span style={{fontSize:13,opacity:0.7}}>/ {calTarget} kcal · {calPct}%</span>
            </div>
            <div style={{height:10,borderRadius:5,background:"#fff5",marginBottom:10,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${calPct}%`,background:calPct>100?P.coral:calPct>85?P.amber:P.green,borderRadius:5,transition:"width .3s"}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              {[{l:"Protein",v:totalP,c:P.blue},{l:"Carbs",v:totalC,c:P.amber},{l:"Fat",v:totalF,c:P.coral}].map(({l,v,c})=>(
                <div key={l} style={{flex:1,textAlign:"center"}}>
                  <div style={{fontSize:14,fontWeight:700}}>{v}g</div>
                  <div style={{fontSize:10,opacity:0.7}}>{l}</div>
                  <div style={{height:5,borderRadius:3,background:"#fff5",marginTop:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${totalP+totalC+totalF>0?Math.round(v/(totalP+totalC+totalF)*100):0}%`,background:c,borderRadius:3}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={card(P.greenL,P.green,P.greenD)}>
            <span style={{fontSize:10,fontWeight:700,display:"block",marginBottom:6}}>LOG A MEAL</span>
            <div style={{display:"flex",gap:6}}>
              <input style={inpBase(P.green,"#fff")} placeholder='"a bowl of pasta"' value={mealInput} onChange={e=>setMealInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&logMeal()}/>
              <button onClick={logMeal} disabled={mealLoading||!mealInput.trim()} style={{...smBtn(P.green,P.greenD,"#fff"),opacity:mealLoading||!mealInput.trim()?0.5:1,minWidth:52}}>
                {mealLoading?"...":"Log"}
              </button>
            </div>
            {mealLoading&&<p style={{fontSize:12,opacity:0.6,margin:"6px 0 0"}}>Looking up calories...</p>}
          </div>
          {calDayMeals.length>0&&(
            <div style={card(P.greenL,P.green,P.greenD)}>
              <span style={{fontSize:10,fontWeight:700,display:"block",marginBottom:6}}>MEALS</span>
              {calDayMeals.map(m=>(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,padding:"8px 10px",borderRadius:7,background:"#fff3",border:`1.5px solid ${P.green}44`}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                      <span style={{fontSize:13,fontWeight:600}}>{m.name}</span>
                      <span style={{fontSize:13,fontWeight:700}}>{m.cal} kcal</span>
                    </div>
                    <span style={{fontSize:11,opacity:0.7}}>P {m.protein}g · C {m.carbs}g · F {m.fat}g</span>
                  </div>
                  <span onClick={()=>delMeal(m.id)} style={{cursor:"pointer",color:P.coral,fontWeight:700,fontSize:16,lineHeight:1,flexShrink:0}}>×</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view==="weekly"&&(
        <div>
          <div style={{...card(isCurrentWeek?P.tealL:P.amberL,isCurrentWeek?P.teal:P.amber,isCurrentWeek?P.tealD:P.amberD),display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <button onClick={()=>setWeekOffset(o=>o+1)} style={smBtn(P.purple,P.purpleL,P.purpleD)}>← Back</button>
            <span style={{fontSize:12,fontWeight:700}}>{weekLabel}</span>
            <button onClick={()=>setWeekOffset(o=>o-1)} style={{...smBtn(P.purple,P.purpleL,P.purpleD),opacity:isCurrentWeek?0.3:1,pointerEvents:isCurrentWeek?"none":"auto"}}>Forward →</button>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            {[{l:"LOGGED",v:`${weekLogged}/7`,c:P.teal,cD:P.tealD,cL:P.tealL},{l:"AVG MOOD",v:avgMood!=null?MOODS[Math.round(avgMood)]+" "+avgMood.toFixed(1):"—",c:P.blue,cD:P.blueD,cL:P.blueL},{l:"STREAK",v:`${streak}d`,c:P.coral,cD:P.coralD,cL:P.coralL}].map(({l,v,c,cD,cL})=>(
              <div key={l} style={{flex:1,border:`2px solid ${c}`,borderRadius:8,padding:"8px 10px",background:cL}}>
                <p style={{fontSize:10,fontWeight:700,color:cD,margin:"0 0 2px"}}>{l}</p>
                <p style={{fontSize:20,fontWeight:700,margin:0,color:cD}}>{v}</p>
              </div>
            ))}
          </div>
          <div style={card(P.blueL,P.blue,P.blueD)}>
            <span style={{fontSize:10,fontWeight:700,display:"block",marginBottom:6}}>THIS WEEK</span>
            {w7.map(({key,date,entry:e})=>{
              const hd=hasData(e);const doneH=habits.filter(h=>e.habits&&e.habits[h.name]);
              return(
                <div key={key} onClick={()=>{setActiveDay(key);setView("today");}}
                  style={{display:"flex",gap:8,alignItems:"center",marginBottom:5,padding:"7px 8px",borderRadius:6,border:`2px solid ${hd?P.blue:"transparent"}`,background:hd?"#fff3":"transparent",cursor:"pointer"}}>
                  <div style={{minWidth:30,textAlign:"center"}}>
                    <p style={{fontSize:10,margin:0,fontWeight:700,opacity:0.7}}>{DAY_SHORT[date.getDay()]}</p>
                    <p style={{fontSize:15,fontWeight:700,margin:0}}>{date.getDate()}</p>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      {e.mood!=null&&<span style={{fontSize:15}}>{MOODS[e.mood]}</span>}
                      {doneH.length>0&&<span style={{fontSize:11,color:P.tealD,fontWeight:700}}>{doneH.map(h=>h.name).join(" · ")}</span>}
                    </div>
                    {e.note&&<p style={{fontSize:11,margin:"2px 0 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",opacity:0.8}}>{e.note}</p>}
                    {!hd&&<span style={{fontSize:11,opacity:0.5}}>No entry — tap to add</span>}
                  </div>
                  <span style={{fontSize:11,fontWeight:700,opacity:0.6}}>→</span>
                </div>
              );
            })}
          </div>
          <div style={card(P.tealL,P.teal,P.tealD)}>
            <span style={{fontSize:10,fontWeight:700,display:"block",marginBottom:6}}>HABIT CHECK-IN</span>
            {habits.map(h=>{
              const count=w7.filter(x=>x.entry.habits&&x.entry.habits[h.name]).length;
              const col=habitColor(count,h.freq);
              return(
                <div key={h.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                  <div style={{flex:1}}>
                    <span style={{fontSize:12,fontWeight:600}}>{h.name}</span>
                    <span style={{fontSize:10,marginLeft:6,opacity:0.6}}>{freqLabel(h.freq)}</span>
                  </div>
                  <div style={{display:"flex",gap:2}}>
                    {w7.map((x,i)=>{const done=!!(x.entry.habits&&x.entry.habits[h.name]);return <div key={i} style={{width:13,height:13,borderRadius:3,background:done?P.teal:"#ddd",border:`1.5px solid ${done?P.teal:P.tealL}`}}/>;})}
                  </div>
                  <span style={{fontSize:12,fontWeight:700,color:col,minWidth:28,textAlign:"right"}}>{count}/{h.freq}</span>
                </div>
              );
            })}
          </div>
          {w7.some(x=>x.entry.note)&&(
            <div style={card(P.purpleL,P.purple,P.purpleD)}>
              <span style={{fontSize:10,fontWeight:700,display:"block",marginBottom:6}}>NOTES THIS WEEK</span>
              {w7.filter(x=>x.entry.note).map(({key,date,entry:e})=>(
                <div key={key} style={{marginBottom:10,paddingBottom:10,borderBottom:`1.5px solid ${P.purple}44`}}>
                  <p style={{fontSize:11,fontWeight:700,margin:"0 0 3px",opacity:0.7}}>{date.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"short"})}</p>
                  <p style={{fontSize:12,margin:0,lineHeight:1.6}}>{e.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view==="progress"&&(
        <div>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            {[{l:"TODAY",v:entry.mood!=null?MOODS[entry.mood]:"—",c:P.blue,cD:P.blueD,cL:P.blueL},{l:"STREAK",v:`${streak}d`,c:P.coral,cD:P.coralD,cL:P.coralL},{l:"BEST",v:`${longest}d`,c:P.amber,cD:P.amberD,cL:P.amberL},{l:"LOGGED",v:`${totalLogged}d`,c:P.purple,cD:P.purpleD,cL:P.purpleL}].map(({l,v,c,cD,cL})=>(
              <div key={l} style={{flex:1,border:`2px solid ${c}`,borderRadius:8,padding:"8px 6px",background:cL}}>
                <p style={{fontSize:9,fontWeight:700,color:cD,margin:"0 0 2px"}}>{l}</p>
                <p style={{fontSize:18,fontWeight:700,margin:0,color:cD}}>{v}</p>
              </div>
            ))}
          </div>
          <div style={card(P.tealL,P.teal,P.tealD)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <button onClick={()=>{const d=new Date(calYear,calMonth-1,1);setCalMonth(d.getMonth());setCalYear(d.getFullYear());}} style={smBtn(P.teal,P.tealD,"#fff")}>←</button>
              <span style={{fontSize:13,fontWeight:700}}>{MONTHS[calMonth]} {calYear}</span>
              <button onClick={()=>{const d=new Date(calYear,calMonth+1,1);setCalMonth(d.getMonth());setCalYear(d.getFullYear());}} style={smBtn(P.teal,P.tealD,"#fff")}>→</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
              {DAY_SHORT.map(d=><div key={d} style={{fontSize:10,textAlign:"center",fontWeight:700,padding:"2px 0",opacity:0.7}}>{d}</div>)}
              {Array(firstDay).fill(null).map((_,i)=><div key={"e"+i}/>)}
              {monthKeys.map((key,i)=>{
                const e=data[key];const logged=hasData(e);const isTod=key===today;const isPast=key<=today;
                return(
                  <div key={key} onClick={()=>{if(isPast){setActiveDay(key);setView("today");}}}
                    style={{aspectRatio:"1",borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:isTod?700:400,background:logged?P.teal:isTod?P.tealL+"88":"transparent",color:logged?"#fff":P.tealD,border:isTod&&!logged?`2px solid ${P.teal}`:"2px solid transparent",cursor:isPast?"pointer":"default",opacity:isPast?1:0.4}}>
                    {i+1}
                  </div>
                );
              })}
            </div>
            <p style={{fontSize:10,margin:"5px 0 0",fontWeight:600,opacity:0.7}}>Tap any day to view or edit it.</p>
          </div>
          <div style={card(P.purpleL,P.purple,P.purpleD)}>
            <span style={{fontSize:10,fontWeight:700,display:"block",marginBottom:8}}>HABITS — LAST 7 DAYS</span>
            {habits.map(h=>{
              const last7=getLast7(data);
              const bars=last7.map(x=>x.entry.habits&&x.entry.habits[h.name]?1:0);
              const count=bars.reduce((a,b)=>a+b,0);
              const col=habitColor(count,h.freq);
              return(
                <div key={h.name} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4,alignItems:"baseline"}}>
                    <div><span style={{fontWeight:600}}>{h.name}</span><span style={{fontSize:10,marginLeft:6,opacity:0.6}}>target {freqLabel(h.freq)}</span></div>
                    <span style={{fontWeight:700,color:col}}>{count}/{h.freq}</span>
                  </div>
                  <div style={{display:"flex",gap:2}}>
                    {bars.map((v,i)=><div key={i} style={{flex:1,height:7,borderRadius:3,background:v?P.purple:"#ddd"}}/>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view==="other"&&(
        <div>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            {[["quotes","Quotes",quotes.length,P.purple,P.purpleD,P.purpleL],["lyrics","Lyrics",lyrics.length,P.teal,P.tealD,P.tealL],["memories","Memories",memories.length,P.amber,P.amberD,P.amberL]].map(([v,label,count,c,cD,cL])=>(
              <button key={v} onClick={()=>setOtherTab(v)} style={{flex:1,padding:"6px 2px",borderRadius:6,border:`2px solid ${otherTab===v?c:"#ddd"}`,background:otherTab===v?cL:"#fff",color:otherTab===v?cD:"#333",cursor:"pointer",fontSize:11,fontWeight:otherTab===v?700:400}}>
                {label} ({count})
              </button>
            ))}
          </div>
          {otherTab==="quotes"&&(
            <div>
              <div style={card(P.purpleL,P.purple,P.purpleD)}>
                <span style={{fontSize:10,fontWeight:700,display:"block",marginBottom:6}}>ADD QUOTE</span>
                <textarea value={qText} onChange={e=>setQText(e.target.value)} placeholder="Enter the quote..."
                  style={{width:"100%",minHeight:60,resize:"vertical",borderRadius:6,border:`1.5px solid ${P.purple}`,padding:"7px",fontSize:13,color:P.purpleD,background:"#fff",boxSizing:"border-box",fontFamily:"system-ui,sans-serif",marginBottom:6}}/>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  <input style={inpBase(P.purple,"#fff")} placeholder="Author (optional)" value={qAuthor} onChange={e=>setQAuthor(e.target.value)}/>
                  <select value={qCat} onChange={e=>setQCat(e.target.value)} style={selStyle(P.purple,"#fff",P.purpleD)}>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button onClick={addQuote} style={{...smBtn(P.purple,P.purpleD,"#fff"),width:"100%"}}>Save</button>
              </div>
              <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center"}}>
                <span style={{fontSize:10,fontWeight:700,color:"#888"}}>FILTER:</span>
                <select value={qFilter} onChange={e=>setQFilter(e.target.value)} style={{...selStyle(P.purple,P.purpleL,P.purpleD),flex:1,padding:"4px 8px"}}>
                  <option value="All">All ({quotes.length})</option>
                  {CATEGORIES.map(c=>{const n=quotes.filter(q=>(q.cat||"Uncategorized")===c).length;return n>0?<option key={c} value={c}>{c} ({n})</option>:null;})}
                </select>
              </div>
              {quotes.length===0&&<p style={{fontSize:13,color:"#999",textAlign:"center",margin:"16px 0"}}>No quotes saved yet.</p>}
              {[...quotes].reverse().filter(q=>qFilter==="All"||(q.cat||"Uncategorized")===qFilter).map(q=>{
                const cc=CAT_COLORS[q.cat||"Uncategorized"];
                return(
                  <div key={q.id} style={card(cc.cL,cc.c,cc.cD)}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                      <div style={{flex:1}}>
                        <span style={{fontSize:9,fontWeight:700,opacity:0.6,display:"block",marginBottom:3}}>{q.cat||"Uncategorized"}</span>
                        <p style={{fontSize:13,margin:0,lineHeight:1.6,fontStyle:"italic"}}>"{q.text}"</p>
                        {q.author&&<p style={{fontSize:11,fontWeight:700,margin:"5px 0 0",opacity:0.7}}>— {q.author}</p>}
                      </div>
                      <span onClick={()=>delQuote(q.id)} style={{cursor:"pointer",color:P.coral,fontWeight:700,fontSize:16,lineHeight:1,flexShrink:0}}>×</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {otherTab==="lyrics"&&(
            <div>
              <div style={card(P.tealL,P.teal,P.tealD)}>
                <span style={{fontSize:10,fontWeight:700,display:"block",marginBottom:6}}>ADD LYRIC</span>
                <textarea value={lText} onChange={e=>setLText(e.target.value)} placeholder="Enter the lyrics..."
                  style={{width:"100%",minHeight:60,resize:"vertical",borderRadius:6,border:`1.5px solid ${P.teal}`,padding:"7px",fontSize:13,color:P.tealD,background:"#fff",boxSizing:"border-box",fontFamily:"system-ui,sans-serif",marginBottom:6}}/>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  <input style={{...inpBase(P.teal,"#fff"),flex:1,minWidth:0}} placeholder="Song name" value={lSong} onChange={e=>setLSong(e.target.value)}/>
                  <input style={{...inpBase(P.teal,"#fff"),flex:1,minWidth:0}} placeholder="Artist" value={lArtist} onChange={e=>setLArtist(e.target.value)}/>
                </div>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  <select value={lCat} onChange={e=>setLCat(e.target.value)} style={{...selStyle(P.teal,"#fff",P.tealD),flex:1}}>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <button onClick={fetchAlbumArt} disabled={!lSong.trim()||lImgLoading} style={{...smBtn(P.blue,P.blueD,"#fff"),opacity:!lSong.trim()||lImgLoading?0.5:1}}>
                    {lImgLoading?"Searching...":"Find art"}
                  </button>
                  {lImg&&<img src={lImg} alt="album" style={{width:36,height:36,borderRadius:4,objectFit:"cover",border:`2px solid ${P.teal}`}}/>}
                  {!lImg&&!lImgLoading&&<input style={{...inpBase(P.blue,"#fff"),fontSize:11}} placeholder="Or paste image URL..." value={lImg} onChange={e=>setLImg(e.target.value)}/>}
                  <button onClick={addLyric} style={smBtn(P.teal,P.tealD,"#fff")}>Save</button>
                </div>
              </div>
              <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center"}}>
                <span style={{fontSize:10,fontWeight:700,color:"#888"}}>FILTER:</span>
                <select value={lFilter} onChange={e=>setLFilter(e.target.value)} style={{...selStyle(P.teal,P.tealL,P.tealD),flex:1,padding:"4px 8px"}}>
                  <option value="All">All ({lyrics.length})</option>
                  {CATEGORIES.map(c=>{const n=lyrics.filter(l=>(l.cat||"Uncategorized")===c).length;return n>0?<option key={c} value={c}>{c} ({n})</option>:null;})}
                </select>
              </div>
              {lyrics.length===0&&<p style={{fontSize:13,color:"#999",textAlign:"center",margin:"16px 0"}}>No lyrics saved yet.</p>}
              {[...lyrics].reverse().filter(l=>lFilter==="All"||(l.cat||"Uncategorized")===lFilter).map(l=>{
                const cc=CAT_COLORS[l.cat||"Uncategorized"];
                return(
                  <div key={l.id} style={card(cc.cL,cc.c,cc.cD)}>
                    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      {l.img
                        ?<img src={l.img} alt="album" style={{width:52,height:52,borderRadius:6,objectFit:"cover",border:`2px solid ${cc.c}`,flexShrink:0}}/>
                        :<div style={{width:52,height:52,borderRadius:6,background:cc.c+"33",border:`2px solid ${cc.c}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>♪</div>
                      }
                      <div style={{flex:1,minWidth:0}}>
                        <span style={{fontSize:9,fontWeight:700,opacity:0.6,display:"block",marginBottom:2}}>{l.cat||"Uncategorized"}</span>
                        <p style={{fontSize:11,fontWeight:700,margin:"0 0 3px"}}>{l.song}{l.artist?` — ${l.artist}`:""}</p>
                        <p style={{fontSize:13,margin:0,lineHeight:1.6,fontStyle:"italic"}}>"{l.text}"</p>
                      </div>
                      <span onClick={()=>delLyric(l.id)} style={{cursor:"pointer",color:P.coral,fontWeight:700,fontSize:16,lineHeight:1,flexShrink:0}}>×</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {otherTab==="memories"&&(
            <div>
              <div style={card(P.amberL,P.amber,P.amberD)}>
                <span style={{fontSize:10,fontWeight:700,display:"block",marginBottom:6}}>ADD MEMORY</span>
                <input style={{...inpBase(P.amber,"#fff"),display:"block",width:"100%",boxSizing:"border-box",marginBottom:6}} placeholder="Title" value={mTitle} onChange={e=>setMTitle(e.target.value)}/>
                <textarea value={mDesc} onChange={e=>setMDesc(e.target.value)} placeholder="Describe the memory..."
                  style={{width:"100%",minHeight:80,resize:"vertical",borderRadius:6,border:`1.5px solid ${P.amber}`,padding:"7px",fontSize:13,color:P.amberD,background:"#fff",boxSizing:"border-box",fontFamily:"system-ui,sans-serif",marginBottom:6}}/>
                <div style={{display:"flex",gap:6}}>
                  <input type="date" value={mDate} onChange={e=>setMDate(e.target.value)} style={{...inpBase(P.amber,"#fff"),flex:1}}/>
                  <button onClick={addMemory} style={smBtn(P.amber,P.amberD,"#fff")}>Save</button>
                </div>
              </div>
              {memories.length===0&&<p style={{fontSize:13,color:"#999",textAlign:"center",margin:"16px 0"}}>No memories saved yet.</p>}
              {[...memories].sort((a,b)=>b.date.localeCompare(a.date)).map(m=>(
                <div key={m.id} style={card(P.amberL,P.amber,P.amberD)}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                    <div style={{flex:1}}>
                      <p style={{fontSize:10,fontWeight:700,opacity:0.6,margin:"0 0 3px"}}>{new Date(m.date+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</p>
                      <p style={{fontSize:14,fontWeight:700,margin:"0 0 5px"}}>{m.title}</p>
                      <p style={{fontSize:13,margin:0,lineHeight:1.6}}>{m.desc}</p>
                    </div>
                    <span onClick={()=>delMemory(m.id)} style={{cursor:"pointer",color:P.coral,fontWeight:700,fontSize:16,lineHeight:1,flexShrink:0}}>×</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

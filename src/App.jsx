import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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

const DEFAULT_BLOCK_COLORS = {
  mood:     {h:213, s:72, b:86},
  habits:   {h:158, s:81, b:62},
  notes:    {h:244, s:45, b:87},
  todos:    {h:213, s:72, b:86},
  cal:      {h:93,  s:66, b:60},
  weekly:   {h:213, s:72, b:86},
  progress: {h:158, s:81, b:62},
  other:    {h:244, s:45, b:87},
  nav:      {h:244, s:45, b:87},
};
const BLOCK_NAMES = {
  mood:"Mood", habits:"Habits", notes:"Notes", todos:"To-do",
  cal:"Calories", weekly:"Weekly", progress:"Progress", other:"Other", nav:"Tab bar"
};
const BLOCK_STYLES = ["default","filled-white","filled-black"];
const BLOCK_STYLE_LABELS = ["Default","White text","Black text"];

const DEFAULT_THEME = {
  appBg: {h:0, s:0, b:96},
  globalStyle: "default",
  globalColor: null,
  blocks: {},
  swatches: ["#378ADD","#1D9E75","#7F77DD","#D85A30","#BA7517"],
};

function hsbToHex(h,s,b){
  s/=100; b/=100;
  const k=n=>(n+h/60)%6;
  const f=n=>b-b*s*Math.max(0,Math.min(k(n),4-k(n),1));
  const r=Math.round(f(5)*255);
  const g=Math.round(f(3)*255);
  const bl=Math.round(f(1)*255);
  return "#"+[r,g,bl].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function hexToHsb(hex){
  const r=parseInt(hex.slice(1,3),16)/255;
  const g=parseInt(hex.slice(3,5),16)/255;
  const b=parseInt(hex.slice(5,7),16)/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  let h=0;
  if(d){
    if(max===r)h=((g-b)/d)%6;
    else if(max===g)h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h=Math.round(h*60);if(h<0)h+=360;
  }
  const s=max?Math.round(d/max*100):0;
  const bv=Math.round(max*100);
  return{h,s,b:bv};
}
function lighten(hex){
  const {h,s}=hexToHsb(hex);
  return hsbToHex(h,Math.max(s-55,5),Math.min(97,95));
}
function darken(hex){
  const {h,s}=hexToHsb(hex);
  return hsbToHex(h,Math.min(s+20,100),Math.max(20,25));
}
function blockStyles(hex,style){
  if(style==="filled-white") return {bg:hex, border:hex, text:"#ffffff"};
  if(style==="filled-black") return {bg:hex, border:hex, text:"#000000"};
  return {bg:lighten(hex), border:hex, text:darken(hex)};
}
function getBlockColor(theme,key){
  if(theme.globalColor) return theme.globalColor;
  if(theme.blocks[key]?.color) return theme.blocks[key].color;
  const d=DEFAULT_BLOCK_COLORS[key]||DEFAULT_BLOCK_COLORS.mood;
  return hsbToHex(d.h,d.s,d.b);
}
function getBlockStyle(theme,key){
  if(theme.blocks[key]?.style) return theme.blocks[key].style;
  return theme.globalStyle||"default";
}
function getAppBg(theme){
  const {h,s,b}=theme.appBg||DEFAULT_THEME.appBg;
  return hsbToHex(h,s,b);
}

function fmt(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function todayKey(){return fmt(new Date());}
function getMonthKeys(y,m){const n=new Date(y,m+1,0).getDate();return Array.from({length:n},(_,i)=>`${y}-${String(m+1).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`);}
function ld(k,d){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d));}catch{return d;}}
function sv(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}
function ldk(uid,k){return `dj_${uid}_${k}`;}
function hasData(e){return e&&(e.mood!=null||e.note||Object.values(e.habits||{}).some(Boolean));}
function calcStreak(data){let s=0,d=new Date();while(true){const k=fmt(d);if(hasData(data[k])){s++;d.setDate(d.getDate()-1);}else break;}return s;}
function calcLongest(data){
  let best=0,cur=0;const keys=Object.keys(data).sort();if(!keys.length)return 0;
  const start=new Date(keys[0]+"T12:00:00"),end=new Date();
  for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){if(hasData(data[fmt(d)])){cur++;best=Math.max(best,cur);}else cur=0;}
  return best;
}
function getWeekDays(data,offset){
  const d=new Date();d.setDate(d.getDate()-d.getDay()+1-offset*7);d.setHours(0,0,0,0);
  return Array.from({length:7},(_,i)=>{const day=new Date(d);day.setDate(d.getDate()+i);const k=fmt(day);return{key:k,date:day,entry:data[k]||{}};});
}
function getLast7(data){return Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const k=fmt(d);return{key:k,date:d,entry:data[k]||{}};});}
function freqLabel(f){return f===7?"Daily":`${f}x/week`;}
function habitColor(count,freq){if(count>=freq)return "#1D9E75";if(count>=Math.ceil(freq/2))return "#BA7517";return "#D85A30";}

function smBtn(bc,bg,tc){return{padding:"5px 10px",borderRadius:6,border:`2px solid ${bc}`,background:bg,color:tc,cursor:"pointer",fontSize:12,fontWeight:700};}
function inpBase(bc,bg){return{borderRadius:6,padding:"6px 9px",fontSize:13,color:"#111",background:bg||"#fff",fontFamily:"system-ui,sans-serif",flex:1,minWidth:0,border:`2px solid ${bc}`};}
function selStyle(bc,bg,tc){return{borderRadius:5,border:`1.5px solid ${bc}`,background:bg,color:tc,padding:"3px 6px",fontSize:12,fontWeight:700,cursor:"pointer"};}
function mkCard(hex,style){const{bg,border,text}=blockStyles(hex,style);return{border:`2px solid ${border}`,borderRadius:8,padding:"10px 12px",marginBottom:8,background:bg,color:text};}

// HSB Color Picker component
function HsbPicker({hex, onChange}){
  const {h,s,b} = hexToHsb(hex);
  const preview = hsbToHex(h,s,b);
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
        <div style={{width:40,height:40,borderRadius:8,background:preview,border:"2px solid rgba(0,0,0,0.15)",flexShrink:0}}/>
        <span style={{fontSize:12,color:"#666",fontFamily:"monospace"}}>{preview.toUpperCase()}</span>
      </div>
      {[["Hue",h,0,360,v=>hsbToHex(v,s,b),`hsl(${h},100%,50%)`],
        ["Saturation",s,0,100,v=>hsbToHex(h,v,b),`linear-gradient(to right,hsl(${h},0%,${b}%),hsl(${h},100%,${b/2+20}%))`],
        ["Brightness",b,0,100,v=>hsbToHex(h,s,v),`linear-gradient(to right,#000,hsl(${h},${s}%,50%))`]
      ].map(([label,val,min,max,compute,grad])=>(
        <div key={label} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:11,color:"#888"}}>{label}</span>
            <span style={{fontSize:11,color:"#333",fontWeight:600}}>{Math.round(val)}{label==="Hue"?"°":"%"}</span>
          </div>
          <div style={{position:"relative",height:12,borderRadius:6,background:grad,overflow:"visible"}}>
            <input type="range" min={min} max={max} value={Math.round(val)} step="1"
              onChange={e=>onChange(compute(Number(e.target.value)))}
              style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"pointer",margin:0}}/>
            <div style={{position:"absolute",top:"50%",left:`${(val-min)/(max-min)*100}%`,transform:"translate(-50%,-50%)",width:18,height:18,borderRadius:"50%",background:"#fff",border:"2px solid #333",pointerEvents:"none"}}/>
          </div>
        </div>
      ))}
    </div>
  );
}

// Settings screen
function SettingsScreen({theme,setTheme,onBack,onSignOut,saveTheme}){
  const [expandedBlock,setExpandedBlock]=useState(null);
  const [deleteMode,setDeleteMode]=useState(false);

  const appBgHex=getAppBg(theme);
  const {h:abH,s:abS,b:abB}=theme.appBg||DEFAULT_THEME.appBg;

  function updateBlockColor(key,hex){
    const t={...theme,blocks:{...theme.blocks,[key]:{...theme.blocks[key],color:hex}}};
    setTheme(t);saveTheme(t);
  }
  function updateBlockStyle(key,style){
    const t={...theme,blocks:{...theme.blocks,[key]:{...theme.blocks[key],style}}};
    setTheme(t);saveTheme(t);
  }
  function setGlobalStyle(style){
    const t={...theme,globalStyle:style};setTheme(t);saveTheme(t);
  }
  function setGlobalColor(hex){
    const t={...theme,globalColor:hex||null};setTheme(t);saveTheme(t);
  }
  function setAppBg(hex){
    const hsb=hexToHsb(hex);
    const t={...theme,appBg:hsb};setTheme(t);saveTheme(t);
  }
  function addSwatch(hex){
    if(theme.swatches.includes(hex)||theme.swatches.length>=10)return;
    const t={...theme,swatches:[...theme.swatches,hex]};setTheme(t);saveTheme(t);
  }
  function removeSwatch(i){
    const sw=[...theme.swatches];sw.splice(i,1);
    const t={...theme,swatches:sw};setTheme(t);saveTheme(t);
  }

  const globalColorHex=theme.globalColor||hsbToHex(244,45,87);

  return(
    <div style={{fontFamily:"system-ui,sans-serif",padding:"12px 10px",maxWidth:480,margin:"0 auto",minHeight:"100vh",background:appBgHex}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#333",padding:"2px 4px",lineHeight:1}}>←</button>
        <span style={{fontSize:17,fontWeight:700,color:"#111"}}>Settings</span>
      </div>

      <div style={{fontSize:10,fontWeight:700,color:"#888",letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>Global</div>
      <div style={{background:"#fff",borderRadius:10,padding:"4px 12px",marginBottom:12}}>

        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f0f0f0"}}>
          <span style={{fontSize:13,color:"#333",flex:1}}>App background</span>
          <div style={{width:28,height:28,borderRadius:6,background:appBgHex,border:"1.5px solid #ccc",cursor:"pointer"}} onClick={()=>setExpandedBlock(expandedBlock==="__bg"?null:"__bg")}/>
        </div>
        {expandedBlock==="__bg"&&(
          <div style={{padding:"12px 0 4px"}}>
            <HsbPicker hex={appBgHex} onChange={setAppBg}/>
          </div>
        )}

        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f0f0f0"}}>
          <span style={{fontSize:13,color:"#333",flex:1}}>All block color</span>
          <div style={{width:28,height:28,borderRadius:6,background:globalColorHex,border:"1.5px solid #ccc",cursor:"pointer"}} onClick={()=>setExpandedBlock(expandedBlock==="__gc"?null:"__gc")}/>
        </div>
        {expandedBlock==="__gc"&&(
          <div style={{padding:"12px 0 4px"}}>
            <HsbPicker hex={globalColorHex} onChange={setGlobalColor}/>
            <button onClick={()=>setGlobalColor(null)} style={{...smBtn("#888","#f5f5f5","#555"),fontSize:11,marginTop:8}}>Reset to per-block colors</button>
          </div>
        )}

        <div style={{padding:"10px 0"}}>
          <span style={{fontSize:12,color:"#888",display:"block",marginBottom:6}}>All block style</span>
          <div style={{display:"flex",gap:6}}>
            {BLOCK_STYLES.map((s,i)=>(
              <button key={s} onClick={()=>setGlobalStyle(s)}
                style={{flex:1,padding:"6px 4px",borderRadius:7,border:`1.5px solid ${theme.globalStyle===s?"#7F77DD":"#ddd"}`,background:theme.globalStyle===s?"#EEEDFE":"#fff",fontSize:11,fontWeight:theme.globalStyle===s?700:400,color:theme.globalStyle===s?"#534AB7":"#666",cursor:"pointer"}}>
                {BLOCK_STYLE_LABELS[i]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{fontSize:10,fontWeight:700,color:"#888",letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>Saved swatches</div>
      <div style={{background:"#fff",borderRadius:10,padding:"12px",marginBottom:12}}>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          {theme.swatches.map((sw,i)=>(
            <div key={i} onClick={()=>deleteMode&&removeSwatch(i)}
              style={{width:28,height:28,borderRadius:6,background:sw,border:deleteMode?`2px solid #E24B4A`:"1.5px solid rgba(0,0,0,0.15)",cursor:deleteMode?"pointer":"default",position:"relative",flexShrink:0}}>
              {deleteMode&&<div style={{position:"absolute",top:-5,right:-5,width:14,height:14,borderRadius:"50%",background:"#E24B4A",color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>×</div>}
            </div>
          ))}
          {theme.swatches.length<10&&<div style={{width:28,height:28,borderRadius:6,background:"#f5f5f5",border:"1.5px dashed #ccc",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#aaa",cursor:"default"}}>+</div>}
          <div style={{marginLeft:"auto"}}>
            <button onClick={()=>setDeleteMode(d=>!d)} style={{...smBtn(deleteMode?"#E24B4A":"#ccc",deleteMode?"#FAECE7":"#f5f5f5",deleteMode?"#993C1D":"#888"),fontSize:11}}>
              {deleteMode?"Done":"🗑"}
            </button>
          </div>
        </div>
        <p style={{fontSize:11,color:"#aaa",marginTop:8}}>Add colors from block editors below · {theme.swatches.length}/10</p>
      </div>

      <div style={{fontSize:10,fontWeight:700,color:"#888",letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>Per block</div>
      <div style={{background:"#fff",borderRadius:10,padding:"4px 12px",marginBottom:12}}>
        {Object.keys(BLOCK_NAMES).map((key,idx,arr)=>{
          const hex=getBlockColor(theme,key);
          const style=getBlockStyle(theme,key);
          const isLast=idx===arr.length-1;
          return(
            <div key={key}>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:isLast&&expandedBlock!==key?"none":"1px solid #f0f0f0",cursor:"pointer"}} onClick={()=>setExpandedBlock(expandedBlock===key?null:key)}>
                <div style={{width:10,height:10,borderRadius:2,background:hex,flexShrink:0}}/>
                <span style={{fontSize:13,color:"#333",flex:1}}>{BLOCK_NAMES[key]}</span>
                <div style={{width:22,height:22,borderRadius:5,background:hex,border:"1.5px solid rgba(0,0,0,0.15)"}}/>
                <span style={{fontSize:14,color:"#aaa",transform:expandedBlock===key?"rotate(90deg)":"none",transition:"transform .15s"}}>›</span>
              </div>
              {expandedBlock===key&&(
                <div style={{padding:"12px 0",borderBottom:isLast?"none":"1px solid #f0f0f0"}}>
                  <HsbPicker hex={hex} onChange={h=>updateBlockColor(key,h)}/>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginTop:12,marginBottom:12}}>
                    <span style={{fontSize:11,color:"#888"}}>Save to swatches:</span>
                    <button onClick={()=>addSwatch(hex)} disabled={theme.swatches.includes(hex)||theme.swatches.length>=10}
                      style={{...smBtn("#7F77DD","#EEEDFE","#534AB7"),fontSize:11,opacity:theme.swatches.includes(hex)||theme.swatches.length>=10?0.4:1}}>
                      + Add
                    </button>
                    {theme.swatches.map((sw,i)=>(
                      <div key={i} onClick={()=>updateBlockColor(key,sw)} style={{width:22,height:22,borderRadius:5,background:sw,border:"1.5px solid rgba(0,0,0,0.15)",cursor:"pointer",flexShrink:0}}/>
                    ))}
                  </div>
                  <span style={{fontSize:12,color:"#888",display:"block",marginBottom:6}}>Block style</span>
                  <div style={{display:"flex",gap:6}}>
                    {BLOCK_STYLES.map((s,i)=>(
                      <button key={s} onClick={()=>updateBlockStyle(key,s)}
                        style={{flex:1,padding:"6px 4px",borderRadius:7,border:`1.5px solid ${style===s?hex:"#ddd"}`,background:style===s?lighten(hex):"#fff",fontSize:11,fontWeight:style===s?700:400,color:style===s?darken(hex):"#666",cursor:"pointer"}}>
                        {BLOCK_STYLE_LABELS[i]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{background:"#fff",borderRadius:10,padding:"12px",marginBottom:12}}>
        <button onClick={onSignOut} style={{...smBtn("#E24B4A","#FAECE7","#993C1D"),width:"100%",padding:"10px",fontSize:14}}>Sign out</button>
      </div>
    </div>
  );
}

function AuthScreen({onAuth}){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  async function handle(){
    setLoading(true);setError("");
    try{
      let res;
      if(mode==="login"){res=await supabase.auth.signInWithPassword({email,password});}
      else{res=await supabase.auth.signUp({email,password});}
      if(res.error)throw res.error;
      if(mode==="signup"&&res.data.user&&!res.data.session){setError("Check your email to confirm your account.");setLoading(false);return;}
      onAuth(res.data.user||res.data.session?.user);
    }catch(e){setError(e.message);}
    setLoading(false);
  }
  return(
    <div style={{fontFamily:"system-ui,sans-serif",maxWidth:380,margin:"80px auto",padding:"0 20px"}}>
      <h2 style={{fontSize:22,fontWeight:700,color:"#111",marginBottom:4}}>Daily journal</h2>
      <p style={{fontSize:13,color:"#888",marginBottom:24}}>{mode==="login"?"Sign in to your account":"Create a new account"}</p>
      <div style={{background:"#EEEDFE",border:"2px solid #7F77DD",borderRadius:8,padding:"12px"}}>
        <input style={{...inpBase("#7F77DD","#fff"),display:"block",width:"100%",boxSizing:"border-box",marginBottom:10}} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
        <input style={{...inpBase("#7F77DD","#fff"),display:"block",width:"100%",boxSizing:"border-box",marginBottom:10}} type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/>
        {error&&<p style={{fontSize:12,color:"#D85A30",margin:"0 0 10px"}}>{error}</p>}
        <button onClick={handle} disabled={loading||!email||!password} style={{...smBtn("#7F77DD","#26215C","#fff"),width:"100%",padding:"10px",fontSize:14,opacity:loading||!email||!password?0.5:1}}>
          {loading?"...":(mode==="login"?"Sign in":"Sign up")}
        </button>
      </div>
      <p style={{fontSize:13,color:"#888",textAlign:"center",marginTop:16}}>
        {mode==="login"?"Don't have an account? ":"Already have an account? "}
        <span onClick={()=>{setMode(mode==="login"?"signup":"login");setError("");}} style={{color:"#7F77DD",fontWeight:700,cursor:"pointer"}}>
          {mode==="login"?"Sign up":"Sign in"}
        </span>
      </p>
    </div>
  );
}

export default function App(){
  const [user,setUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{if(session?.user)setUser(session.user);setAuthLoading(false);});
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{setUser(session?.user||null);});
    return()=>subscription.unsubscribe();
  },[]);
  if(authLoading)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"system-ui",color:"#888"}}>Loading...</div>;
  if(!user)return<AuthScreen onAuth={setUser}/>;
  return<Journal user={user} onSignOut={()=>supabase.auth.signOut()}/>;
}

function Journal({user,onSignOut}){
  const uid=user.id;
  const K={
    data:ldk(uid,"data"),habits:ldk(uid,"habits"),todos:ldk(uid,"todos"),
    quotes:ldk(uid,"quotes"),lyrics:ldk(uid,"lyrics"),memories:ldk(uid,"memories"),
    meals:ldk(uid,"meals"),calTarget:ldk(uid,"caltarget"),theme:ldk(uid,"theme"),
  };

  const [data,setData]           = useState(()=>ld(K.data,{}));
  const [habits,setHabits]       = useState(()=>ld(K.habits,DEFAULT_HABITS));
  const [todos,setTodos]         = useState(()=>ld(K.todos,[]));
  const [quotes,setQuotes]       = useState(()=>ld(K.quotes,[]));
  const [lyrics,setLyrics]       = useState(()=>ld(K.lyrics,[]));
  const [memories,setMemories]   = useState(()=>ld(K.memories,[]));
  const [meals,setMeals]         = useState(()=>ld(K.meals,{}));
  const [calTarget,setCalTarget] = useState(()=>ld(K.calTarget,2200));
  const [theme,setTheme]         = useState(()=>ld(K.theme,DEFAULT_THEME));
  const [synced,setSynced]       = useState(false);
  const [showSettings,setShowSettings] = useState(false);

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

  async function syncToCloud(key,value){
    try{await supabase.from("journal_data").upsert({user_id:uid,key,value:JSON.stringify(value)},{onConflict:"user_id,key"});}catch(e){console.error(e);}
  }
  function saveAndSync(localKey,cloudKey,value){sv(localKey,value);syncToCloud(cloudKey,value);}
  function saveTheme(t){sv(K.theme,t);syncToCloud("theme",t);}

  useEffect(()=>{
    async function pull(){
      try{
        const{data:rows}=await supabase.from("journal_data").select("key,value").eq("user_id",uid);
        if(!rows||rows.length===0){
          const oldKeys=["dj3_data","dj3_habits","dj3_todos","dj3_quotes","dj3_lyrics","dj3_memories","dj3_meals","dj3_caltarget"];
          const map={dj3_data:"data",dj3_habits:"habits",dj3_todos:"todos",dj3_quotes:"quotes",dj3_lyrics:"lyrics",dj3_memories:"memories",dj3_meals:"meals",dj3_caltarget:"caltarget"};
          for(const ok of oldKeys){const raw=localStorage.getItem(ok);if(raw){const p=JSON.parse(raw);sv(ldk(uid,map[ok]),p);syncToCloud(map[ok],p);}}
          setData(ld(K.data,{}));setHabits(ld(K.habits,DEFAULT_HABITS));setTodos(ld(K.todos,[]));
          setQuotes(ld(K.quotes,[]));setLyrics(ld(K.lyrics,[]));setMemories(ld(K.memories,[]));
          setMeals(ld(K.meals,{}));setCalTarget(ld(K.calTarget,2200));setTheme(ld(K.theme,DEFAULT_THEME));
        } else {
          const m={};rows.forEach(r=>{m[r.key]=JSON.parse(r.value);});
          if(m.data){sv(K.data,m.data);setData(m.data);}
          if(m.habits){sv(K.habits,m.habits);setHabits(m.habits);}
          if(m.todos){sv(K.todos,m.todos);setTodos(m.todos);}
          if(m.quotes){sv(K.quotes,m.quotes);setQuotes(m.quotes);}
          if(m.lyrics){sv(K.lyrics,m.lyrics);setLyrics(m.lyrics);}
          if(m.memories){sv(K.memories,m.memories);setMemories(m.memories);}
          if(m.meals){sv(K.meals,m.meals);setMeals(m.meals);}
          if(m.caltarget!=null){sv(K.calTarget,m.caltarget);setCalTarget(m.caltarget);}
          if(m.theme){sv(K.theme,m.theme);setTheme(m.theme);}
        }
      }catch(e){console.error(e);}
      setSynced(true);
    }
    pull();
  },[uid]);

  useEffect(()=>{
    let startX=0,startY=0;
    const onStart=e=>{startX=e.touches[0].clientX;startY=e.touches[0].clientY;};
    const onEnd=e=>{
      const dx=e.changedTouches[0].clientX-startX;
      const dy=e.changedTouches[0].clientY-startY;
      if(Math.abs(dx)<25||Math.abs(dx)<Math.abs(dy)*1.5)return;
      setView(prev=>{const i=TAB_ORDER.indexOf(prev);if(dx<0&&i<TAB_ORDER.length-1)return TAB_ORDER[i+1];if(dx>0&&i>0)return TAB_ORDER[i-1];return prev;});
    };
    window.addEventListener("touchstart",onStart,{passive:true});
    window.addEventListener("touchend",onEnd,{passive:true});
    return()=>{window.removeEventListener("touchstart",onStart);window.removeEventListener("touchend",onEnd);};
  },[]);

  const today=todayKey();
  const entry=data[activeDay]||{mood:null,habits:{},note:""};
  const isToday=activeDay===today;
  const isCalToday=calDay===today;
  const isCurrentWeek=weekOffset===0;
  const activeDateObj=new Date(activeDay+"T12:00:00");
  const activeDateLabel=activeDateObj.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const calDayMeals=meals[calDay]||[];
  const totalCal=calDayMeals.reduce((a,m)=>a+m.cal,0);
  const totalP=calDayMeals.reduce((a,m)=>a+m.protein,0);
  const totalC=calDayMeals.reduce((a,m)=>a+m.carbs,0);
  const totalF=calDayMeals.reduce((a,m)=>a+m.fat,0);
  const calPct=Math.min(100,Math.round(totalCal/calTarget*100));
  const w7=getWeekDays(data,weekOffset);
  const weekLabel=isCurrentWeek?"This week":`${w7[0].date.toLocaleDateString("en-GB",{day:"numeric",month:"short"})} — ${w7[6].date.toLocaleDateString("en-GB",{day:"numeric",month:"short"})}`;
  const moodVals=w7.map(x=>x.entry.mood).filter(x=>x!=null);
  const avgMood=moodVals.length?Math.round(moodVals.reduce((a,b)=>a+b,0)/moodVals.length*10)/10:null;
  const weekLogged=w7.filter(x=>hasData(x.entry)).length;
  const monthKeys=getMonthKeys(calYear,calMonth);
  const firstDay=new Date(calYear,calMonth,1).getDay();
  const doneCount=todos.filter(x=>x.done).length;
  const pendingCount=todos.filter(x=>!x.done).length;
  const streak=calcStreak(data);
  const longest=calcLongest(data);
  const totalLogged=Object.keys(data).filter(k=>hasData(data[k])).length;
  const appBg=getAppBg(theme);

  // Theme helpers
  function C(key){return getBlockColor(theme,key);}
  function S(key){return getBlockStyle(theme,key);}
  function card(key){return mkCard(C(key),S(key));}
  function navActive(){const hex=C("nav");return{border:`2px solid ${hex}`,background:lighten(hex),color:darken(hex)};}
  function navInactive(){return{border:"2px solid #ddd",background:"#fff",color:"#333"};}

  function upEntry(patch){const u={...data,[activeDay]:{...entry,...patch}};setData(u);saveAndSync(K.data,"data",u);}
  function shiftDay(n){const d=new Date(activeDay+"T12:00:00");d.setDate(d.getDate()+n);const t=new Date();t.setHours(23,59,59);if(d<=t)setActiveDay(fmt(d));}
  function shiftCalDay(n){const d=new Date(calDay+"T12:00:00");d.setDate(d.getDate()+n);const t=new Date();t.setHours(23,59,59);if(d<=t)setCalDay(fmt(d));}
  function addHabit(){if(!newHabitName.trim())return;const h=[...habits,{name:newHabitName.trim(),freq:newHabitFreq}];setHabits(h);saveAndSync(K.habits,"habits",h);setNewHabitName("");setNewHabitFreq(7);}
  function delHabit(i){const h=habits.filter((_,j)=>j!==i);setHabits(h);saveAndSync(K.habits,"habits",h);}
  function updateHabitFreq(i,freq){const h=habits.map((x,j)=>j===i?{...x,freq}:x);setHabits(h);saveAndSync(K.habits,"habits",h);}
  function moveHabit(i,dir){const h=[...habits];const to=i+dir;if(to<0||to>=h.length)return;[h[i],h[to]]=[h[to],h[i]];setHabits(h);saveAndSync(K.habits,"habits",h);}
  function addTodo(){if(!newTodo.trim())return;const t=[...todos,{id:Date.now(),text:newTodo.trim(),done:false}];setTodos(t);saveAndSync(K.todos,"todos",t);setNewTodo("");}
  function togTodo(id){const t=todos.map(x=>x.id===id?{...x,done:!x.done}:x);setTodos(t);saveAndSync(K.todos,"todos",t);}
  function delTodo(id){const t=todos.filter(x=>x.id!==id);setTodos(t);saveAndSync(K.todos,"todos",t);}
  function clearDone(){const t=todos.filter(x=>!x.done);setTodos(t);saveAndSync(K.todos,"todos",t);}
  function addQuote(){if(!qText.trim())return;const q=[...quotes,{id:Date.now(),text:qText.trim(),author:qAuthor.trim(),cat:qCat}];setQuotes(q);saveAndSync(K.quotes,"quotes",q);setQText("");setQAuthor("");setQCat("Uncategorized");}
  function delQuote(id){const q=quotes.filter(x=>x.id!==id);setQuotes(q);saveAndSync(K.quotes,"quotes",q);}
  function addLyric(){if(!lText.trim()||!lSong.trim())return;const l=[...lyrics,{id:Date.now(),text:lText.trim(),song:lSong.trim(),artist:lArtist.trim(),img:lImg,cat:lCat}];setLyrics(l);saveAndSync(K.lyrics,"lyrics",l);setLText("");setLSong("");setLArtist("");setLImg("");setLCat("Uncategorized");}
  function delLyric(id){const l=lyrics.filter(x=>x.id!==id);setLyrics(l);saveAndSync(K.lyrics,"lyrics",l);}
  function addMemory(){if(!mTitle.trim()||!mDesc.trim())return;const m=[...memories,{id:Date.now(),title:mTitle.trim(),desc:mDesc.trim(),date:mDate||today}];setMemories(m);saveAndSync(K.memories,"memories",m);setMTitle("");setMDesc("");setMDate("");}
  function delMemory(id){const m=memories.filter(x=>x.id!==id);setMemories(m);saveAndSync(K.memories,"memories",m);}
  function delMeal(id){const m={...meals,[calDay]:calDayMeals.filter(x=>x.id!==id)};setMeals(m);saveAndSync(K.meals,"meals",m);}

  async function fetchAlbumArt(){
    if(!lSong.trim())return;setLImgLoading(true);setLImg("");
    try{const q=encodeURIComponent(`${lSong} ${lArtist}`);const res=await fetch(`https://itunes.apple.com/search?term=${q}&media=music&limit=1`);const json=await res.json();if(json.results&&json.results[0])setLImg(json.results[0].artworkUrl100.replace("100x100bb","300x300bb"));else setLImg("");}catch{setLImg("");}
    setLImgLoading(false);
  }
  async function logMeal(){
    if(!mealInput.trim())return;setMealLoading(true);
    try{
      const kcalMatch=mealInput.match(/(\d+(?:\.\d+)?)\s*(?:kcals?|cals?|calories?)/i);
      if(kcalMatch){
        const targetCal=parseFloat(kcalMatch[1]);
        const foodName=mealInput.replace(/(\d+(?:\.\d+)?)\s*(?:kcals?|cals?|calories?)/i,"").trim();
        const res=await fetch(`https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(foodName||mealInput)}`,{headers:{"X-Api-Key":import.meta.env.VITE_CALORIE_API_KEY}});
        const d=await res.json();
        let protein=0,carbs=0,fat=0;
        if(d.items&&d.items.length>0){const baseCal=d.items.reduce((a,x)=>a+x.calories,0);const ratio=baseCal>0?targetCal/baseCal:1;protein=Math.round(d.items.reduce((a,x)=>a+x.protein_g,0)*ratio);carbs=Math.round(d.items.reduce((a,x)=>a+x.carbohydrates_total_g,0)*ratio);fat=Math.round(d.items.reduce((a,x)=>a+x.fat_total_g,0)*ratio);}
        const newMeal={id:Date.now(),name:foodName||mealInput,cal:Math.round(targetCal),protein,carbs,fat};
        const updated={...meals,[calDay]:[...calDayMeals,newMeal]};setMeals(updated);saveAndSync(K.meals,"meals",updated);setMealInput("");
      } else {
        const res=await fetch(`https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(mealInput)}`,{headers:{"X-Api-Key":import.meta.env.VITE_CALORIE_API_KEY}});
        const d=await res.json();
        if(!d.items||d.items.length===0)throw new Error("No results");
        const totals=d.items.reduce((acc,item)=>({cal:acc.cal+item.calories,protein:acc.protein+item.protein_g,carbs:acc.carbs+item.carbohydrates_total_g,fat:acc.fat+item.fat_total_g}),{cal:0,protein:0,carbs:0,fat:0});
        const newMeal={id:Date.now(),name:mealInput.trim(),cal:Math.round(totals.cal),protein:Math.round(totals.protein),carbs:Math.round(totals.carbs),fat:Math.round(totals.fat)};
        const updated={...meals,[calDay]:[...calDayMeals,newMeal]};setMeals(updated);saveAndSync(K.meals,"meals",updated);setMealInput("");
      }
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

  if(!synced)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"system-ui",color:"#888"}}>Syncing...</div>;

  if(showSettings)return(
    <SettingsScreen theme={theme} setTheme={setTheme} saveTheme={saveTheme}
      onBack={()=>setShowSettings(false)} onSignOut={onSignOut}/>
  );

  const CAT_COLORS={
    Love:{c:"#D4537E",cD:"#4B1528",cL:"#FBEAF0"},
    Motivation:{c:"#D85A30",cD:"#4A1B0C",cL:"#FAECE7"},
    Life:{c:"#1D9E75",cD:"#085041",cL:"#E1F5EE"},
    Longing:{c:"#7F77DD",cD:"#26215C",cL:"#EEEDFE"},
    Fun:{c:"#BA7517",cD:"#412402",cL:"#FAEEDA"},
    Uncategorized:{c:"#378ADD",cD:"#042C53",cL:"#E6F1FB"},
  };

  return(
    <div style={{fontFamily:"system-ui,sans-serif",padding:"12px 10px",maxWidth:480,margin:"0 auto",minHeight:"100vh",background:appBg}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
        <span style={{fontSize:18,fontWeight:700,color:"#111"}}>Daily journal</span>
        <button onClick={()=>setShowSettings(true)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#555",padding:"2px 4px",lineHeight:1}}>⚙️</button>
      </div>
      <div style={{display:"flex",gap:3,marginBottom:10}}>
        {TABS.map(([v,label])=>(
          <button key={v} onClick={()=>setView(v)} style={{flex:1,padding:"6px 2px",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:view===v?700:400,...(view===v?navActive():navInactive())}}>
            {label}
          </button>
        ))}
      </div>

      {view==="today"&&(
        <div>
          {pendingCount>0&&(
            <div style={{...card("habits"),textAlign:"center",marginBottom:8}}>
              <span style={{fontSize:13,fontWeight:700}}>⚠️ You have {pendingCount} task{pendingCount>1?"s":""} to complete</span>
            </div>
          )}
          <div style={{...card("mood"),display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <button onClick={()=>shiftDay(-1)} style={{padding:"5px 10px",borderRadius:6,border:`2px solid ${C("nav")}`,background:lighten(C("nav")),color:darken(C("nav")),cursor:"pointer",fontSize:12,fontWeight:700}}>← Back</button>
            <span style={{fontSize:12,fontWeight:700}}>{isToday?"Today":activeDateObj.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}</span>
            <button onClick={()=>shiftDay(1)} style={{padding:"5px 10px",borderRadius:6,border:`2px solid ${C("nav")}`,background:lighten(C("nav")),color:darken(C("nav")),cursor:"pointer",fontSize:12,fontWeight:700,opacity:activeDay>=today?0.3:1,pointerEvents:activeDay>=today?"none":"auto"}}>Forward →</button>
          </div>
          <div style={card("mood")}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",flex:1}} onClick={()=>setMoodOpen(o=>!o)}>
                <span style={{fontSize:10,fontWeight:700}}>MOOD</span>
                <span style={{fontSize:20}}>{entry.mood!=null?MOODS[entry.mood]:"···"}</span>
                {entry.mood!=null&&<span style={{fontSize:11,fontWeight:700,color:MOOD_COLORS[entry.mood]}}>{MOOD_LABELS[entry.mood]}</span>}
                <span style={{fontSize:10,fontWeight:700}}>{moodOpen?"▲":"▼"}</span>
              </div>
              <div style={{width:1,height:24,background:C("mood"),margin:"0 10px",opacity:0.4}}/>
              <div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}} onClick={doCopy}>
                <span style={{fontSize:14}}>{copied?"✓":"⎘"}</span>
                <span style={{fontSize:10,fontWeight:700}}>{copied?"COPIED!":"COPY ENTRY"}</span>
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
          <div style={card("habits")}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:10,fontWeight:700}}>HABITS</span>
              <button onClick={()=>setEditH(o=>!o)} style={{padding:"5px 10px",borderRadius:6,border:`2px solid ${C("habits")}`,background:darken(C("habits")),color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700}}>{editH?"Done":"Edit"}</button>
            </div>
            {habits.map((h,i)=>{
              const done=!!(entry.habits&&entry.habits[h.name]);
              return(
                <div key={h.name+i}>
                  <div onClick={()=>!editH&&upEntry({habits:{...entry.habits,[h.name]:!done}})}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:7,marginBottom:editH?0:5,background:editH?(i%2===0?lighten(C("habits")):"rgba(0,0,0,0.05)"):done?C("habits")+"22":"transparent",border:editH?`1.5px solid ${C("habits")}`:`1.5px solid ${done?C("habits"):"transparent"}`,cursor:editH?"default":"pointer"}}>
                    {editH
                      ?<span onClick={()=>delHabit(i)} style={{cursor:"pointer",color:"#D85A30",fontWeight:700,fontSize:18,lineHeight:1,minWidth:18}}>×</span>
                      :<div style={{width:20,height:20,borderRadius:5,border:`2px solid ${done?C("habits"):darken(C("habits"))}`,background:done?C("habits"):"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {done&&<span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}
                      </div>
                    }
                    <div style={{flex:1}}>
                      <span style={{fontSize:14,fontWeight:done&&!editH?700:500}}>{h.name}</span>
                      <span style={{fontSize:11,marginLeft:8,opacity:0.7}}>{freqLabel(h.freq)}</span>
                    </div>
                    {done&&!editH&&<span style={{fontSize:11,fontWeight:700,color:C("habits")}}>✓</span>}
                    {editH&&(
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={e=>{e.stopPropagation();moveHabit(i,-1);}} disabled={i===0} style={{padding:"6px 10px",borderRadius:6,border:`2px solid ${C("habits")}`,background:lighten(C("habits")),color:darken(C("habits")),cursor:"pointer",fontSize:14,opacity:i===0?0.3:1}}>↑</button>
                        <button onClick={e=>{e.stopPropagation();moveHabit(i,1);}} disabled={i===habits.length-1} style={{padding:"6px 10px",borderRadius:6,border:`2px solid ${C("habits")}`,background:lighten(C("habits")),color:darken(C("habits")),cursor:"pointer",fontSize:14,opacity:i===habits.length-1?0.3:1}}>↓</button>
                      </div>
                    )}
                  </div>
                  {editH&&(
                    <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px 8px 38px"}}>
                      <span style={{fontSize:11,fontWeight:600}}>Frequency:</span>
                      <select value={h.freq} onChange={e=>updateHabitFreq(i,Number(e.target.value))} style={selStyle(C("habits"),lighten(C("habits")),darken(C("habits")))}>
                        {FREQ_OPTIONS.map(f=><option key={f} value={f}>{freqLabel(f)}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
            {editH&&(
              <div style={{borderTop:`1.5px solid ${C("habits")}`,marginTop:4,paddingTop:8}}>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  <input style={inpBase(C("habits"),lighten(C("habits")))} placeholder="New habit name..." value={newHabitName} onChange={e=>setNewHabitName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addHabit()}/>
                  <select value={newHabitFreq} onChange={e=>setNewHabitFreq(Number(e.target.value))} style={selStyle(C("habits"),lighten(C("habits")),darken(C("habits")))}>
                    {FREQ_OPTIONS.map(f=><option key={f} value={f}>{freqLabel(f)}</option>)}
                  </select>
                </div>
                <button onClick={addHabit} style={{padding:"5px 10px",borderRadius:6,border:`2px solid ${C("habits")}`,background:darken(C("habits")),color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,width:"100%"}}>Add habit</button>
              </div>
            )}
          </div>
          <div style={card("notes")}>
            <span style={{fontSize:10,fontWeight:700,display:"block",marginBottom:5}}>NOTES</span>
            <textarea value={entry.note||""} onChange={e=>upEntry({note:e.target.value})} placeholder="Write anything on your mind..."
              style={{width:"100%",minHeight:80,resize:"vertical",borderRadius:6,border:`1.5px solid ${C("notes")}`,padding:"8px",fontSize:13,color:"#111",background:"#fff",boxSizing:"border-box",fontFamily:"system-ui,sans-serif"}}/>
          </div>
        </div>
      )}

      {view==="todos"&&(
        <div style={card("todos")}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:10,fontWeight:700}}>TO-DO LIST</span>
            {doneCount>0&&<button onClick={clearDone} style={{padding:"5px 10px",borderRadius:6,border:"2px solid #D85A30",background:"#FAECE7",color:"#993C1D",cursor:"pointer",fontSize:12,fontWeight:700}}>Clear done ({doneCount})</button>}
          </div>
          {todos.length===0&&<p style={{fontSize:13,opacity:0.6,margin:"0 0 8px"}}>Nothing here yet.</p>}
          {todos.map(t=>(
            <div key={t.id} onClick={()=>togTodo(t.id)} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,padding:"8px 10px",borderRadius:7,background:t.done?C("todos")+"22":"transparent",border:`1.5px solid ${t.done?C("todos"):"transparent"}`,cursor:"pointer"}}>
              <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${t.done?C("todos"):darken(C("todos"))}`,background:t.done?C("todos"):"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {t.done&&<span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}
              </div>
              <span style={{flex:1,fontSize:13,fontWeight:500,textDecoration:t.done?"line-through":"none",opacity:t.done?0.6:1}}>{t.text}</span>
              <span onClick={e=>{e.stopPropagation();delTodo(t.id);}} style={{cursor:"pointer",color:"#D85A30",fontWeight:700,fontSize:16,lineHeight:1}}>×</span>
            </div>
          ))}
          <div style={{display:"flex",gap:6,marginTop:8}}>
            <input style={inpBase(C("todos"))} placeholder="Add a task..." value={newTodo} onChange={e=>setNewTodo(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTodo()}/>
            <button onClick={addTodo} style={{padding:"5px 10px",borderRadius:6,border:`2px solid ${C("todos")}`,background:darken(C("todos")),color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700}}>Add</button>
          </div>
        </div>
      )}

      {view==="cal"&&(
        <div>
          <div style={{...card("cal"),display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <button onClick={()=>shiftCalDay(-1)} style={{padding:"5px 10px",borderRadius:6,border:`2px solid ${C("nav")}`,background:lighten(C("nav")),color:darken(C("nav")),cursor:"pointer",fontSize:12,fontWeight:700}}>← Back</button>
            <span style={{fontSize:12,fontWeight:700}}>{isCalToday?"Today":new Date(calDay+"T12:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}</span>
            <button onClick={()=>shiftCalDay(1)} style={{padding:"5px 10px",borderRadius:6,border:`2px solid ${C("nav")}`,background:lighten(C("nav")),color:darken(C("nav")),cursor:"pointer",fontSize:12,fontWeight:700,opacity:calDay>=today?0.3:1,pointerEvents:calDay>=today?"none":"auto"}}>Forward →</button>
          </div>
          <div style={card("cal")}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:10,fontWeight:700}}>{isCalToday?"TODAY'S CALORIES":"CALORIES — "+new Date(calDay+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"}).toUpperCase()}</span>
              {!editTarget
                ?<span onClick={()=>{setTargetInput(calTarget);setEditTarget(true);}} style={{fontSize:10,fontWeight:700,cursor:"pointer",opacity:0.7}}>Target: {calTarget} kcal ✏️</span>
                :<div style={{display:"flex",gap:4,alignItems:"center"}}>
                  <input type="number" value={targetInput} onChange={e=>setTargetInput(Number(e.target.value))} style={{width:70,borderRadius:5,border:`1.5px solid ${C("cal")}`,padding:"2px 6px",fontSize:12,fontWeight:700,color:darken(C("cal")),background:"#fff"}}/>
                  <button onClick={()=>{setCalTarget(targetInput);saveAndSync(K.calTarget,"caltarget",targetInput);setEditTarget(false);}} style={{padding:"5px 10px",borderRadius:6,border:`2px solid ${C("cal")}`,background:darken(C("cal")),color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700}}>Save</button>
                </div>
              }
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
              <span style={{fontSize:28,fontWeight:700}}>{totalCal}</span>
              <span style={{fontSize:13,opacity:0.7}}>/ {calTarget} kcal · {calPct}%</span>
            </div>
            <div style={{height:10,borderRadius:5,background:"rgba(0,0,0,0.1)",marginBottom:10,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${calPct}%`,background:calPct>100?"#D85A30":calPct>85?"#BA7517":C("cal"),borderRadius:5,transition:"width .3s"}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              {[{l:"Protein",v:totalP,c:"#378ADD"},{l:"Carbs",v:totalC,c:"#BA7517"},{l:"Fat",v:totalF,c:"#D85A30"}].map(({l,v,c})=>(
                <div key={l} style={{flex:1,textAlign:"center"}}>
                  <div style={{fontSize:14,fontWeight:700}}>{v}g</div>
                  <div style={{fontSize:10,opacity:0.7}}>{l}</div>
                  <div style={{height:5,borderRadius:3,background:"rgba(0,0,0,0.1)",marginTop:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${totalP+totalC+totalF>0?Math.round(v/(totalP+totalC+totalF)*100):0}%`,background:c,borderRadius:3}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={card("cal")}>
            <span style={{fontSize:10,fontWeight:700,display:"block",marginBottom:6}}>LOG A MEAL</span>
            <div style={{display:"flex",gap:6}}>
              <input style={inpBase(C("cal"),"#fff")} placeholder='"pasta" or "240kcal chocolate"' value={mealInput} onChange={e=>setMealInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&logMeal()}/>
              <button onClick={logMeal} disabled={mealLoading||!mealInput.trim()} style={{padding:"5px 10px",borderRadius:6,border:`2px solid ${C("cal")}`,background:darken(C("cal")),color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,opacity:mealLoading||!mealInput.trim()?0.5:1,minWidth:52}}>
                {mealLoading?"...":"Log"}
              </button>
            </div>
            {mealLoading&&<p style={{fontSize:12,opacity:0.6,margin:"6px 0 0"}}>Looking up calories...</p>}
          </div>
          {calDayMeals.length>0&&(
            <div style={card("cal")}>
              <span style={{fontSize:10,fontWeight:700,display:"block",marginBottom:6}}>MEALS</span>
              {calDayMeals.map(m=>(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,padding:"8px 10px",borderRadius:7,background:"rgba(255,255,255,0.4)",border:"1px solid rgba(0,0,0,0.08)"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                      <span style={{fontSize:13,fontWeight:600}}>{m.name}</span>
                      <span style={{fontSize:13,fontWeight:700}}>{m.cal} kcal</span>
                    </div>
                    <span style={{fontSize:11,opacity:0.7}}>P {m.protein}g · C {m.carbs}g · F {m.fat}g</span>
                  </div>
                  <span onClick={()=>delMeal(m.id)} style={{cursor:"pointer",color:"#D85A30",fontWeight:700,fontSize:16,lineHeight:1,flexShrink:0}}>×</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view==="weekly"&&(
        <div>
          <div style={{...card("weekly"),display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <button onClick={()=>setWeekOffset(o=>o+1)} style={{padding:"5px 10px",borderRadius:6,border:`2px solid ${C("nav")}`,background:lighten(C("nav")),color:darken(C("nav")),cursor:"pointer",fontSize:12,fontWeight:700}}>← Back</button>
            <span style={{fontSize:12,fontWeight:700}}>{weekLabel}</span>
            <button onClick={()=>setWeekOffset(o=>o-1)} style={{padding:"5px 10px",borderRadius:6,border:`2px solid ${C("nav")}`,background:lighten(C("nav")),color:darken(C("nav")),cursor:"pointer",fontSize:12,fontWeight:700,opacity:isCurrentWeek?0.3:1,pointerEvents:isCurrentWeek?"none":"auto"}}>Forward →</button>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            {[{l:"LOGGED",v:`${weekLogged}/7`,c:"#1D9E75"},{l:"AVG MOOD",v:avgMood!=null?MOODS[Math.round(avgMood)]+" "+avgMood.toFixed(1):"—",c:"#378ADD"},{l:"STREAK",v:`${streak}d`,c:"#D85A30"}].map(({l,v,c})=>(
              <div key={l} style={{flex:1,border:`2px solid ${c}`,borderRadius:8,padding:"8px 10px",background:lighten(c)}}>
                <p style={{fontSize:10,fontWeight:700,color:darken(c),margin:"0 0 2px"}}>{l}</p>
                <p style={{fontSize:20,fontWeight:700,margin:0,color:darken(c)}}>{v}</p>
              </div>
            ))}
          </div>
          <div style={card("weekly")}>
            <span style={{fontSize:10,fontWeight:700,display:"block",marginBottom:6}}>THIS WEEK</span>
            {w7.map(({key,date,entry:e})=>{
              const hd=hasData(e);const doneH=habits.filter(h=>e.habits&&e.habits[h.name]);
              return(
                <div key={key} onClick={()=>{setActiveDay(key);setView("today");}}
                  style={{display:"flex",gap:8,alignItems:"center",marginBottom:5,padding:"7px 8px",borderRadius:6,border:`2px solid ${hd?C("weekly"):"transparent"}`,background:hd?"rgba(255,255,255,0.3)":"transparent",cursor:"pointer"}}>
                  <div style={{minWidth:30,textAlign:"center"}}>
                    <p style={{fontSize:10,margin:0,fontWeight:700,opacity:0.7}}>{DAY_SHORT[date.getDay()]}</p>
                    <p style={{fontSize:15,fontWeight:700,margin:0}}>{date.getDate()}</p>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      {e.mood!=null&&<span style={{fontSize:15}}>{MOODS[e.mood]}</span>}
                      {doneH.length>0&&<span style={{fontSize:11,fontWeight:700}}>{doneH.map(h=>h.name).join(" · ")}</span>}
                    </div>
                    {e.note&&<p style={{fontSize:11,margin:"2px 0 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",opacity:0.8}}>{e.note}</p>}
                    {!hd&&<span style={{fontSize:11,opacity:0.5}}>No entry — tap to add</span>}
                  </div>
                  <span style={{fontSize:11,fontWeight:700,opacity:0.6}}>→</span>
                </div>
              );
            })}
          </div>
          <div style={card("weekly")}>
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
                    {w7.map((x,i)=>{const done=!!(x.entry.habits&&x.entry.habits[h.name]);return <div key={i} style={{width:13,height:13,borderRadius:3,background:done?C("weekly"):"rgba(0,0,0,0.1)",border:`1.5px solid ${done?C("weekly"):"transparent"}`}}/>;})}
                  </div>
                  <span style={{fontSize:12,fontWeight:700,color:col,minWidth:28,textAlign:"right"}}>{count}/{h.freq}</span>
                </div>
              );
            })}
          </div>
          {w7.some(x=>x.entry.note)&&(
            <div style={card("notes")}>
              <span style={{fontSize:10,fontWeight:700,display:"block",marginBottom:6}}>NOTES THIS WEEK</span>
              {w7.filter(x=>x.entry.note).map(({key,date,entry:e})=>(
                <div key={key} style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid rgba(0,0,0,0.08)"}}>
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
            {[{l:"TODAY",v:entry.mood!=null?MOODS[entry.mood]:"—",c:"#378ADD"},{l:"STREAK",v:`${streak}d`,c:"#D85A30"},{l:"BEST",v:`${longest}d`,c:"#BA7517"},{l:"LOGGED",v:`${totalLogged}d`,c:"#7F77DD"}].map(({l,v,c})=>(
              <div key={l} style={{flex:1,border:`2px solid ${c}`,borderRadius:8,padding:"8px 6px",background:lighten(c)}}>
                <p style={{fontSize:9,fontWeight:700,color:darken(c),margin:"0 0 2px"}}>{l}</p>
                <p style={{fontSize:18,fontWeight:700,margin:0,color:darken(c)}}>{v}</p>
              </div>
            ))}
          </div>
          <div style={card("progress")}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <button onClick={()=>{const d=new Date(calYear,calMonth-1,1);setCalMonth(d.getMonth());setCalYear(d.getFullYear());}} style={{padding:"5px 10px",borderRadius:6,border:`2px solid ${C("progress")}`,background:darken(C("progress")),color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700}}>←</button>
              <span style={{fontSize:13,fontWeight:700}}>{MONTHS[calMonth]} {calYear}</span>
              <button onClick={()=>{const d=new Date(calYear,calMonth+1,1);setCalMonth(d.getMonth());setCalYear(d.getFullYear());}} style={{padding:"5px 10px",borderRadius:6,border:`2px solid ${C("progress")}`,background:darken(C("progress")),color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700}}>→</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
              {DAY_SHORT.map(d=><div key={d} style={{fontSize:10,textAlign:"center",fontWeight:700,padding:"2px 0",opacity:0.7}}>{d}</div>)}
              {Array(firstDay).fill(null).map((_,i)=><div key={"e"+i}/>)}
              {monthKeys.map((key,i)=>{
                const e=data[key];const logged=hasData(e);const isTod=key===today;const isPast=key<=today;
                return(
                  <div key={key} onClick={()=>{if(isPast){setActiveDay(key);setView("today");}}}
                    style={{aspectRatio:"1",borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:isTod?700:400,background:logged?C("progress"):isTod?lighten(C("progress"))+"88":"transparent",color:logged?"#fff":darken(C("progress")),border:isTod&&!logged?`2px solid ${C("progress")}`:"2px solid transparent",cursor:isPast?"pointer":"default",opacity:isPast?1:0.4}}>
                    {i+1}
                  </div>
                );
              })}
            </div>
            <p style={{fontSize:10,margin:"5px 0 0",fontWeight:600,opacity:0.7}}>Tap any day to view or edit it.</p>
          </div>
          <div style={card("progress")}>
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
                    {bars.map((v,i)=><div key={i} style={{flex:1,height:7,borderRadius:3,background:v?C("progress"):"rgba(0,0,0,0.1)"}}/>)}
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
            {[["quotes","Quotes",quotes.length,"#7F77DD"],["lyrics","Lyrics",lyrics.length,"#1D9E75"],["memories","Memories",memories.length,"#BA7517"]].map(([v,label,count,c])=>(
              <button key={v} onClick={()=>setOtherTab(v)} style={{flex:1,padding:"6px 2px",borderRadius:6,border:`2px solid ${otherTab===v?c:"#ddd"}`,background:otherTab===v?lighten(c):"#fff",color:otherTab===v?darken(c):"#333",cursor:"pointer",fontSize:11,fontWeight:otherTab===v?700:400}}>
                {label} ({count})
              </button>
            ))}
          </div>
          {otherTab==="quotes"&&(
            <div>
              <div style={card("other")}>
                <span style={{fontSize:10,fontWeight:700,display:"block",marginBottom:6}}>ADD QUOTE</span>
                <textarea value={qText} onChange={e=>setQText(e.target.value)} placeholder="Enter the quote..."
                  style={{width:"100%",minHeight:60,resize:"vertical",borderRadius:6,border:`1.5px solid ${C("other")}`,padding:"7px",fontSize:13,color:"#111",background:"#fff",boxSizing:"border-box",fontFamily:"system-ui,sans-serif",marginBottom:6}}/>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  <input style={inpBase(C("other"),"#fff")} placeholder="Author (optional)" value={qAuthor} onChange={e=>setQAuthor(e.target.value)}/>
                  <select value={qCat} onChange={e=>setQCat(e.target.value)} style={selStyle(C("other"),"#fff",darken(C("other")))}>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button onClick={addQuote} style={{padding:"5px 10px",borderRadius:6,border:`2px solid ${C("other")}`,background:darken(C("other")),color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,width:"100%"}}>Save</button>
              </div>
              <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center"}}>
                <span style={{fontSize:10,fontWeight:700,color:"#888"}}>FILTER:</span>
                <select value={qFilter} onChange={e=>setQFilter(e.target.value)} style={{...selStyle(C("other"),lighten(C("other")),darken(C("other"))),flex:1,padding:"4px 8px"}}>
                  <option value="All">All ({quotes.length})</option>
                  {CATEGORIES.map(c=>{const n=quotes.filter(q=>(q.cat||"Uncategorized")===c).length;return n>0?<option key={c} value={c}>{c} ({n})</option>:null;})}
                </select>
              </div>
              {quotes.length===0&&<p style={{fontSize:13,color:"#999",textAlign:"center",margin:"16px 0"}}>No quotes saved yet.</p>}
              {[...quotes].reverse().filter(q=>qFilter==="All"||(q.cat||"Uncategorized")===qFilter).map(q=>{
                const cc=CAT_COLORS[q.cat||"Uncategorized"];
                return(
                  <div key={q.id} style={{border:`2px solid ${cc.c}`,borderRadius:8,padding:"10px 12px",marginBottom:8,background:cc.cL,color:cc.cD}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                      <div style={{flex:1}}>
                        <span style={{fontSize:9,fontWeight:700,opacity:0.6,display:"block",marginBottom:3}}>{q.cat||"Uncategorized"}</span>
                        <p style={{fontSize:13,margin:0,lineHeight:1.6,fontStyle:"italic"}}>"{q.text}"</p>
                        {q.author&&<p style={{fontSize:11,fontWeight:700,margin:"5px 0 0",opacity:0.7}}>— {q.author}</p>}
                      </div>
                      <span onClick={()=>delQuote(q.id)} style={{cursor:"pointer",color:"#D85A30",fontWeight:700,fontSize:16,lineHeight:1,flexShrink:0}}>×</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {otherTab==="lyrics"&&(
            <div>
              <div style={card("other")}>
                <span style={{fontSize:10,fontWeight:700,display:"block",marginBottom:6}}>ADD LYRIC</span>
                <textarea value={lText} onChange={e=>setLText(e.target.value)} placeholder="Enter the lyrics..."
                  style={{width:"100%",minHeight:60,resize:"vertical",borderRadius:6,border:`1.5px solid ${C("other")}`,padding:"7px",fontSize:13,color:"#111",background:"#fff",boxSizing:"border-box",fontFamily:"system-ui,sans-serif",marginBottom:6}}/>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  <input style={{...inpBase(C("other"),"#fff"),flex:1,minWidth:0}} placeholder="Song name" value={lSong} onChange={e=>setLSong(e.target.value)}/>
                  <input style={{...inpBase(C("other"),"#fff"),flex:1,minWidth:0}} placeholder="Artist" value={lArtist} onChange={e=>setLArtist(e.target.value)}/>
                </div>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  <select value={lCat} onChange={e=>setLCat(e.target.value)} style={{...selStyle(C("other"),"#fff",darken(C("other"))),flex:1}}>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <button onClick={fetchAlbumArt} disabled={!lSong.trim()||lImgLoading} style={{padding:"5px 10px",borderRadius:6,border:"2px solid #042C53",background:"#042C53",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,opacity:!lSong.trim()||lImgLoading?0.5:1}}>
                    {lImgLoading?"Searching...":"Find art"}
                  </button>
                  {lImg&&<img src={lImg} alt="album" style={{width:36,height:36,borderRadius:4,objectFit:"cover",border:`2px solid ${C("other")}`}}/>}
                  {!lImg&&!lImgLoading&&<input style={{...inpBase("#378ADD","#fff"),fontSize:11}} placeholder="Or paste image URL..." value={lImg} onChange={e=>setLImg(e.target.value)}/>}
                  <button onClick={addLyric} style={{padding:"5px 10px",borderRadius:6,border:`2px solid ${C("other")}`,background:darken(C("other")),color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700}}>Save</button>
                </div>
              </div>
              <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center"}}>
                <span style={{fontSize:10,fontWeight:700,color:"#888"}}>FILTER:</span>
                <select value={lFilter} onChange={e=>setLFilter(e.target.value)} style={{...selStyle(C("other"),lighten(C("other")),darken(C("other"))),flex:1,padding:"4px 8px"}}>
                  <option value="All">All ({lyrics.length})</option>
                  {CATEGORIES.map(c=>{const n=lyrics.filter(l=>(l.cat||"Uncategorized")===c).length;return n>0?<option key={c} value={c}>{c} ({n})</option>:null;})}
                </select>
              </div>
              {lyrics.length===0&&<p style={{fontSize:13,color:"#999",textAlign:"center",margin:"16px 0"}}>No lyrics saved yet.</p>}
              {[...lyrics].reverse().filter(l=>lFilter==="All"||(l.cat||"Uncategorized")===lFilter).map(l=>{
                const cc=CAT_COLORS[l.cat||"Uncategorized"];
                return(
                  <div key={l.id} style={{border:`2px solid ${cc.c}`,borderRadius:8,padding:"10px 12px",marginBottom:8,background:cc.cL,color:cc.cD}}>
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
                      <span onClick={()=>delLyric(l.id)} style={{cursor:"pointer",color:"#D85A30",fontWeight:700,fontSize:16,lineHeight:1,flexShrink:0}}>×</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {otherTab==="memories"&&(
            <div>
              <div style={card("other")}>
                <span style={{fontSize:10,fontWeight:700,display:"block",marginBottom:6}}>ADD MEMORY</span>
                <input style={{...inpBase(C("other"),"#fff"),display:"block",width:"100%",boxSizing:"border-box",marginBottom:6}} placeholder="Title" value={mTitle} onChange={e=>setMTitle(e.target.value)}/>
                <textarea value={mDesc} onChange={e=>setMDesc(e.target.value)} placeholder="Describe the memory..."
                  style={{width:"100%",minHeight:80,resize:"vertical",borderRadius:6,border:`1.5px solid ${C("other")}`,padding:"7px",fontSize:13,color:"#111",background:"#fff",boxSizing:"border-box",fontFamily:"system-ui,sans-serif",marginBottom:6}}/>
                <div style={{display:"flex",gap:6}}>
                  <input type="date" value={mDate} onChange={e=>setMDate(e.target.value)} style={{...inpBase(C("other"),"#fff"),flex:1}}/>
                  <button onClick={addMemory} style={{padding:"5px 10px",borderRadius:6,border:`2px solid ${C("other")}`,background:darken(C("other")),color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700}}>Save</button>
                </div>
              </div>
              {memories.length===0&&<p style={{fontSize:13,color:"#999",textAlign:"center",margin:"16px 0"}}>No memories saved yet.</p>}
              {[...memories].sort((a,b)=>b.date.localeCompare(a.date)).map(m=>(
                <div key={m.id} style={{border:`2px solid #BA7517`,borderRadius:8,padding:"10px 12px",marginBottom:8,background:"#FAEEDA",color:"#412402"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                    <div style={{flex:1}}>
                      <p style={{fontSize:10,fontWeight:700,opacity:0.6,margin:"0 0 3px"}}>{new Date(m.date+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</p>
                      <p style={{fontSize:14,fontWeight:700,margin:"0 0 5px"}}>{m.title}</p>
                      <p style={{fontSize:13,margin:0,lineHeight:1.6}}>{m.desc}</p>
                    </div>
                    <span onClick={()=>delMemory(m.id)} style={{cursor:"pointer",color:"#D85A30",fontWeight:700,fontSize:16,lineHeight:1,flexShrink:0}}>×</span>
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

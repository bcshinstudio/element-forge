'use strict';
(function(root){
 const KEY='element-forge.audio.v1';
 const rate=22050;
 const motif=[0,7,4,9,7,2,4];
 const themes={
  home:{title:'Main menu', bpm:76, root:60, color:.35, rhythm:.18},
  valley:{title:'Chapters 1–2 · Valley', bpm:64, root:55, color:.18, rhythm:0},
  loom:{title:'Chapters 3–6 · Loom', bpm:82, root:57, color:.28, rhythm:.32},
  abyss:{title:'Chapter 7 · Abyss', bpm:58, root:48, color:.09, rhythm:.10, minor:true},
  heart:{title:'Chapters 8–9 · Heart / Forges', bpm:72, root:60, color:.30, rhythm:.14},
 };
 const effects={build:'Tool placed',remove:'Tool removed',route:'Route connected',harmony:'Restore Harmony',
  heart:'Awakening Heart',gate:'Gatekeeper',relief:'Primeval Forge',loom:'Astral Loom',star:'Star-Heart',
  symphony:'Grand Symphony',null:'Rift sealed',world:'World-Heart',river:'Restored river'};
 const sceneCues={
  heart:[[.2,'swell'],[2.35,'resonance']],gate:[[.34,'lock'],[.83,'lock'],[1.31,'lock'],[1.79,'lock'],[3.42,'door']],
  relief:[[.45,'resonance']],loom:[[.4,'swell']],star:[[.2,'swell'],[1.85,'resonance']],
  symphony:Array.from({length:6},(_,i)=>[(.06+i*.09+1/12)*4.2,'bell',[67,69,71,72,74,76][i]]),
  null:[[.12,'rift'],[2.1,'swell']],world:motif.map((offset,i)=>[.68+i*.32,'bell',60+offset]),
  river:[[0,'river']],
 };
 const tau=2*Math.PI;
 function renderLoop(name) {
  const theme=themes[name];
  const beat=60/theme.bpm;
  const samples=new Float32Array(Math.round(16*4*beat*rate));
  function add(start,duration,pitch,gain,timbre,attack) {
   const first=Math.round(start*rate), count=Math.round(duration*rate);
   const phase=tau*440*2**((pitch-69)/12)/rate;
   for(let i=0;i<count;i++){
    const u=i/count;
    const envelope=Math.min(1,i/(attack*rate))*Math.cos(u*Math.PI/2)**2;
    samples[(first+i)%samples.length]+=gain*envelope*(Math.sin(phase*i)+timbre*Math.sin(phase*i*2)+timbre*.17*Math.sin(phase*i*3));
   }
  }
  const chords=[[0,7,12],[9,16,21],[5,12,17],[7,14,19]];
  if(theme.minor)chords[1]=[8,15,20];
  for(let bar=0;bar<16;bar++){
   const start=bar*4*beat, chord=chords[bar%4];
   // Provisional Valley mix: replace low chord tones with a quiet, sustained upper-register pad.
   // Keep the original arrangement in Git history for a later listening comparison.
   if(name==='valley'){
    chord.forEach((offset,i)=>add(start+i*.12,beat*5.6,theme.root+offset,.009,.12,beat*1.35));
   }else{
    chord.forEach((offset,i)=>add(start+i*.12,beat*5.6,theme.root-12+offset,.032,theme.color,beat*.8));
   }
   if(theme.rhythm)for(const [i,offset] of chord.entries()){
    add(start+(i+1)*beat,beat*.78,theme.root+offset,theme.rhythm*.105,.18,.032);
   }
   if(bar%4===0||bar%4===2){
    const transposition=bar%4===2?-5:0;
    motif.forEach((offset,i)=>{
     const time=[0,.75,1.5,2.5,3.75,5,5.75][i];
     const interval=theme.minor&&offset===4?3:offset;
     add(start+time*beat,beat*1.65,theme.root+interval+transposition,.054,theme.color,.08);
    });
   }
  }
  return samples;
 }

 function createAudio({storage,document,AudioContext,initialScene='home'}){
  const preferences={music:true,effects:true};
  try{
   const saved=JSON.parse(storage?.getItem(KEY)??'null');
   for(const key of Object.keys(preferences))if(typeof saved?.[key]==='boolean')preferences[key]=saved[key];
  }catch{}
  let context,musicBus,effectsBus,noise,scene=initialScene,current,storyOpen=false;
  const buffers=new Map(), sceneVoices=new Set();
  function level(param,value,duration=.25){
   const now=context.currentTime;
   if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);
   else{param.cancelScheduledValues(now);param.setValueAtTime(param.value,now);}
   param.linearRampToValueAtTime(value,now+duration);
  }
  function sync(){
   if(!context||context.state!=='running'||document.hidden)return;
   const target=preferences.music?scene:null;
   if(current?.name===target||(!current&&!target))return;
   const old=current;
   current=null;
   if(target&&themes[target]){
    if(!buffers.has(target)){
     const samples=renderLoop(target);
     const buffer=context.createBuffer(1,samples.length,rate);
     buffer.getChannelData(0).set(samples);
     buffers.set(target,buffer);
    }
    const source=context.createBufferSource(), gain=context.createGain();
    source.buffer=buffers.get(target);
    source.loop=true;
    gain.gain.value=0;
    source.connect(gain);
    gain.connect(musicBus);
    source.onended=()=>{source.disconnect();gain.disconnect();};
    source.start();
    current={name:target,source,gain};
    level(gain.gain,1,.65);
   }
   if(old){
    level(old.gain.gain,0,.65);
    old.source.stop(context.currentTime+.66);
   }
  }
  function stopCue(){
   for(const {source,gain} of sceneVoices){
    level(gain.gain,0,.035);
    source.stop(context.currentTime+.04);
   }
   sceneVoices.clear();
  }
  function voice(source,time,duration,volume,attack,tracked,filter){
   const gain=context.createGain();
   gain.gain.setValueAtTime(0,time);
   gain.gain.linearRampToValueAtTime(volume,time+attack);
   gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
   if(filter){source.connect(filter);filter.connect(gain);}
   else source.connect(gain);
   gain.connect(effectsBus);
   const entry={source,gain};
   if(tracked)sceneVoices.add(entry);
   source.onended=()=>{sceneVoices.delete(entry);source.disconnect();filter?.disconnect();gain.disconnect();};
   source.start(time);
   source.stop(time+duration+.012);
  }
  function tone(delay,pitch,duration,volume,shape='sine',tracked=false){
   const source=context.createOscillator();
   source.type=shape;
   source.frequency.value=440*2**((pitch-69)/12);
   voice(source,context.currentTime+delay,duration,volume,.014,tracked);
  }
  function texture(delay,duration,volume,frequency,attack){
   if(!noise){
    noise=context.createBuffer(1,rate*6,rate);
    const samples=noise.getChannelData(0);
    let state=173;
    for(let i=0;i<samples.length;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;samples[i]=state/2147483648-1;}
   }
   const source=context.createBufferSource(), filter=context.createBiquadFilter();
   source.buffer=noise;
   filter.type='lowpass';
   filter.frequency.value=frequency;
   voice(source,context.currentTime+delay,duration,volume,attack,true,filter);
  }
  function cue(delay,name,pitch){
   if(name==='bell'){
    tone(delay,pitch,.74,.095,'sine',true);
    tone(delay,pitch+19,.32,.026,'sine',true);
   }else if(name==='resonance'){
    tone(delay,48,1.45,.16,'sine',true);
    tone(delay,67,1.05,.075,'sine',true);
   }else if(name==='lock'){
    tone(delay,50,.16,.085,'triangle',true);
    texture(delay,.25,.11,370,.018);
   }else if(name==='door')texture(delay,1.35,.20,235,.19);
   else if(name==='swell')texture(delay,2,.22,1200,.73);
   else if(name==='river')texture(delay,4.8,.21,1540,.45);
   else{
    tone(delay,33,1.65,.18,'sine',true);
    texture(delay,1.5,.16,320,.16);
   }
  }
  function unlock(){
   if(!AudioContext||document.hidden)return Promise.resolve();
   try{
    if(!context){
     context=new AudioContext();
     musicBus=context.createGain();
     effectsBus=context.createGain();
     musicBus.gain.value=storyOpen?.30:.8;
     effectsBus.gain.value=preferences.effects?.70:0;
     musicBus.connect(context.destination);
     effectsBus.connect(context.destination);
    }
    if(context.state==='running'){sync();return Promise.resolve();}
    return context.resume().then(sync).catch(()=>{});
   }catch{return Promise.resolve();}
  }
  document.addEventListener('visibilitychange',()=>{
   if(!context)return;
   if(document.hidden){stopCue();context.suspend().catch(()=>{});}
   else unlock();
  });
  return {
   preferences,unlock,stopCue,
   scene(value){scene=value;sync();},
   story(open){
    storyOpen=open;
    if(context)level(musicBus.gain,open?.30:.8,.38);
    if(!open)stopCue();
   },
   set(key,value){
    if(!Object.hasOwn(preferences,key))return;
    preferences[key]=Boolean(value);
    try{storage?.setItem(KEY,JSON.stringify(preferences));}catch{}
    if(key==='music')sync();
    else if(context){
     if(!preferences.effects)stopCue();
     level(effectsBus.gain,preferences.effects?.70:0,.09);
    }
   },
   effect(name,audition=false){
    if(!context||context.state!=='running'||document.hidden||!preferences.effects)return;
    if(sceneCues[name]){stopCue();for(const [delay,type,pitch] of sceneCues[name])cue(delay,type,pitch);return;}
    if(name==='build')tone(0,49,.12,.17,'triangle',audition);
    if(name==='remove')tone(0,41,.16,.11,'triangle',audition);
    if(name==='route'){tone(0,72,.22,.12,'sine',audition);tone(.08,79,.31,.15,'sine',audition);}
    if(name==='harmony'){
     level(musicBus.gain,.38,.09);
     musicBus.gain.linearRampToValueAtTime(storyOpen?.30:.8,context.currentTime+1.4);
     [60,64,67,72,79].forEach((pitch,i)=>tone(i*.13,pitch,.59,.15,'sine',audition));
    }
   },
  };
 }
 function chapterTheme(index){return index<2?'valley':index<6?'loom':index===6?'abyss':'heart';}
 const api={createAudio,chapterTheme,themes,effects,renderLoop,rate};
 root.EFAudio=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

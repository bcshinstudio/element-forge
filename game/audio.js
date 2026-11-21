'use strict';
(function(root){
 const KEY='element-forge.audio.v1';
 // Original pitch sequences. Each note is synthesized locally through Web Audio.
 const themes={
  home:{tempo:460,pitches:[60,67,64,72,69,64,67,62,60,65,69,72,67,64,62,null]},
  play:{tempo:740,pitches:[48,null,55,60,null,57,52,null,50,null,57,62,null,55,53,null]}
 };
 const effects={build:[45,52],route:[72,79],harmony:[60,64,67,72,79]};

 function createAudio({storage,document,AudioContext}){
  const preferences={music:true,effects:true};
  try{
   const saved=JSON.parse(storage?.getItem(KEY)??'null');
   for(const key of Object.keys(preferences))if(typeof saved?.[key]==='boolean')preferences[key]=saved[key];
  }catch{}
  let context,musicGain,effectsGain,timer,scene='home',beat=0;
  const notes=new Set();

  function silence(){
   clearInterval(timer);
   timer=null;
   for(const voice of notes)voice.stop();
   notes.clear();
  }
  function note(bus,pitch,delay,duration,volume,shape='sine'){
   const time=context.currentTime+delay;
   const oscillator=context.createOscillator();
   const envelope=context.createGain();
   oscillator.type=shape;
   oscillator.frequency.value=440*2**((pitch-69)/12);
   envelope.gain.setValueAtTime(.0001,time);
   envelope.gain.exponentialRampToValueAtTime(volume,time+.025);
   envelope.gain.exponentialRampToValueAtTime(.0001,time+duration);
   oscillator.connect(envelope);
   envelope.connect(bus);
   oscillator.onended=()=>{notes.delete(oscillator);oscillator.disconnect();envelope.disconnect();};
   notes.add(oscillator);
   oscillator.start(time);
   oscillator.stop(time+duration+.02);
  }
  function sync(){
   if(!context||document.hidden||!preferences.music||timer!==null&&timer!==undefined)return;
   const theme=themes[scene];
   const tick=()=>{
    const pitch=theme.pitches[beat++%theme.pitches.length];
    if(pitch!==null)note(musicGain,pitch,0,theme.tempo/770,.13,'sine');
   };
   tick();
   timer=setInterval(tick,theme.tempo);
  }
  document.addEventListener('visibilitychange',()=>{
   if(!context)return;
   if(document.hidden){silence();context.suspend().catch(()=>{});}
   else context.resume().then(sync).catch(()=>{});
  });
  return {
   preferences,
   unlock(){
    if(!AudioContext||document.hidden)return;
    try{
     if(!context){
      context=new AudioContext();
      musicGain=context.createGain();
      effectsGain=context.createGain();
      musicGain.gain.value=.45;
      effectsGain.gain.value=.55;
      musicGain.connect(context.destination);
      effectsGain.connect(context.destination);
     }
     if(context.state!=='running')context.resume().then(sync).catch(()=>{});
     else sync();
    }catch{}
   },
   set(key,value){
    if(!Object.hasOwn(preferences,key))return;
    preferences[key]=Boolean(value);
    try{storage?.setItem(KEY,JSON.stringify(preferences));}catch{}
    if(effectsGain)effectsGain.gain.value=preferences.effects?.55:0;
    if(preferences.music)sync();
    else{
     clearInterval(timer);
     timer=null;
     if(musicGain)musicGain.gain.value=0;
    }
    if(musicGain&&preferences.music)musicGain.gain.value=.45;
   },
   scene(value){
    if(value===scene)return;
    silence();
    scene=value;
    beat=0;
    sync();
   },
   effect(name){
    if(!context||document.hidden||!preferences.effects||!effects[name])return;
    const harmony=name==='harmony';
    if(harmony&&preferences.music){
     const time=context.currentTime;
     musicGain.gain.cancelScheduledValues(time);
     musicGain.gain.setValueAtTime(.12,time);
     musicGain.gain.linearRampToValueAtTime(.45,time+1.3);
    }
    effects[name].forEach((pitch,i)=>note(effectsGain,pitch,i*(harmony?.15:name==='build'?.035:.10),
     harmony?.6:name==='build'?.08:.23,.22,name==='build'?'triangle':'sine'));
   }
  };
 }

 const api={createAudio};
 root.EFAudio=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

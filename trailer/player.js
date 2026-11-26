'use strict';
(() => {
 const $=id=>document.getElementById(id), scenes=window.TRAILER_SCENES;
 const screen=$('screen'), visual=$('visual'), seek=$('seek'), selector=$('scene');
 const starts=[]; let total=0; for(const s of scenes){starts.push(total);total+=s.duration;}
 const CROSSFADE=1.5;
 let outgoing=null;
 let pos=0,index=-1,playing=false,last=0,layer=null,video=null,motion=null,muted=false,showText=true,source=null,ctx=null,gain=null,theme=null,epoch=0;
 const buffers=new Map();
 seek.max=total;
 const fmt=n=>Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
 const asset=s=>'../art/story/'+s.asset+'.webp';
 const mediaPath=s=>'media/stage-'+s.asset+'.mp4';
 function stopMusic(){if(source){try{source.stop()}catch{}source.disconnect();source=null;}theme=null;}
 function music(t,offset=0){if(!playing||muted||!ctx||!window.EFAudio)return;if(theme===t&&source)return;stopMusic();try{if(!buffers.has(t)){const a=EFAudio.renderLoop(t),b=ctx.createBuffer(1,a.length,EFAudio.rate);b.copyToChannel(a,0);buffers.set(t,b);}source=ctx.createBufferSource();source.buffer=buffers.get(t);source.loop=true;source.connect(gain);gain.gain.cancelScheduledValues(ctx.currentTime);gain.gain.setValueAtTime(.001,ctx.currentTime);gain.gain.linearRampToValueAtTime(.8,ctx.currentTime+.5);source.start(0,offset%source.buffer.duration);theme=t;}catch(e){$('status').textContent='Music unavailable: '+e.message;}}
 function sceneAt(t){return Math.max(0,starts.findLastIndex(x=>x<=t));}
 function syncVideo(local){if(!video)return;const target=Math.max(0,local-(scenes[index].lead||0))*scenes[index].rate;if(video.readyState>=1){const safe=Math.min(target,Math.max(0,video.duration-.04));if(Math.abs(video.currentTime-safe)>.32)video.currentTime=safe;if(playing&&local>=(scenes[index].lead||0)&&target<video.duration-.05){video.play().catch(()=>{});}else video.pause();}}
 function render(force=false){const next=sceneAt(pos),s=scenes[next],local=pos-starts[next];
 if(next!==index||force){const sequential=!force&&index>=0&&next===index+1&&local<.35&&playing; if(outgoing){outgoing.remove();outgoing=null;} if(video)video.pause(); if(sequential&&layer){outgoing=layer;outgoing.style.opacity='1';}else{if(motion)motion.cancel();visual.replaceChildren();} index=next;selector.value=String(index);layer=document.createElement('div');layer.className='layer'+(s.rate?' footage':'');layer.style.opacity=sequential?'0':'1';screen.classList.toggle('gameplay',!!s.rate);$('notice').hidden=true;video=null;motion=null;
 if(s.rate){video=document.createElement('video');video.src=mediaPath(s);video.muted=true;video.playsInline=true;video.preload='auto';video.playbackRate=s.rate;const v=video;v.addEventListener('loadedmetadata',()=>{if(video===v)syncVideo(pos-starts[index]);});v.addEventListener('error',()=>{if(video===v){$('notice').hidden=false;$('notice').textContent='Gameplay footage '+s.asset+' could not be loaded. Reload the page and try again.';pause();}});layer.append(v);}
 else{const im=new Image();im.src=asset(s);im.alt='';im.onerror=()=>{$('status').textContent='Unable to load artwork: '+s.asset;};layer.append(im);motion=im.animate([{transform:'scale(1.035) translate(-.35%,0)'},{transform:'scale(1.12) translate(.5%,-.5%)'}],{duration:s.duration*1000,fill:'both',easing:'ease-in-out'});motion.pause();}
 visual.append(layer);$('headline').textContent=s.title;$('subtitle').textContent=s.subtitle;
 $('words').animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:1500,fill:'both'});music(s.theme,local);
 }if(motion)motion.currentTime=local*1000;syncVideo(local);if(outgoing){const progress=Math.min(1,Math.max(0,local/CROSSFADE));const eased=progress*progress*(3-2*progress);layer.style.opacity=String(eased);if(progress>=1){outgoing.remove();outgoing=null;}}seek.value=pos;$('clock').textContent=fmt(pos)+' / '+fmt(total);
 if(pos>=total){pause();$('play').textContent='Replay';}}
 function tick(t){if(!playing)return;if(video&&video.readyState<2){last=t;requestAnimationFrame(tick);return;}pos=Math.min(total,pos+Math.min(.25,(t-last)/1000));last=t;render();if(playing)requestAnimationFrame(tick);}
 async function play(){const token=++epoch;if(pos>=total){pos=0;index=-1;}if(!muted&&window.EFAudio){try{if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();gain=ctx.createGain();gain.connect(ctx.destination);}await ctx.resume();}catch{}}if(token!==epoch)return;playing=true;$('play').textContent='Pause';last=performance.now();render();music(scenes[index].theme,pos-starts[index]);requestAnimationFrame(tick);}
 function pause(){epoch++;playing=false;video?.pause();stopMusic();$('play').textContent='Play';}
 function jump(t){pos=Math.max(0,Math.min(total,t));last=performance.now();stopMusic();render(true);}
 $('play').onclick=()=>playing?pause():play();$('restart').onclick=()=>{pause();jump(0);play();};seek.oninput=()=>jump(Number(seek.value));selector.onchange=()=>jump(starts[Number(selector.value)]);
 $('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'Music off':'Music on';if(muted)stopMusic();else music(scenes[index].theme,pos-starts[index]);};
 $('captions').onclick=()=>{showText=!showText;$('words').hidden=!showText;$('captions').textContent=showText?'Text on':'Text off';};
 $('full').onclick=()=>screen.requestFullscreen?.().catch(()=>{});$('clean').onclick=()=>{document.body.classList.add('recording');screen.requestFullscreen?.().catch(()=>{});screen.focus();};
 document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)document.body.classList.remove('recording');});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')document.body.classList.remove('recording');if(e.code==='Space'&&(e.target===screen||e.target===document.body)){e.preventDefault();playing?pause():play();}});
 scenes.forEach((s,i)=>selector.add(new Option(fmt(starts[i])+' · '+s.title,String(i))));
 for(const s of scenes.filter(s=>!s.rate)){const im=new Image();im.src=asset(s);}
 $('status').textContent='Hosted gameplay clips load automatically. Space: play/pause in recording mode; Escape: return to controls.';
 render();
})();
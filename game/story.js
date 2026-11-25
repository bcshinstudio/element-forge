'use strict';
(() => {
 const $ = id => document.getElementById(id);
 const dialog = $('world-intro');
 const canvas = $('story-art');
 const ctx = canvas.getContext('2d');
 const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
 const cache = new Map();
 let panels, panelIndex, onFinish, frameRequest, renderVersion = 0, textTimer;
 let voice=null,gardenMode=false,sanctuaryMode=false;
 let audio,archiveMode=false,autoTimer=null,auto=true,paused=false;
 const autoKey='wellspring.story.autoplay';
 function autoPreference(){try{return localStorage.getItem(autoKey)!=='off';}catch{return true;}}
 function setAutoPreference(value){try{localStorage.setItem(autoKey,value?'on':'off');}catch{}}
 function resetPlayback(){auto=autoPreference();paused=false;autoButton.textContent='Auto: '+(auto?'on':'off');pauseButton.textContent='Pause';archiveControls.hidden=false;}
 const back = $('intro-back'), next = $('intro-next'), finish = $('intro-begin');
 const replay = $('story-replay'), skip = $('story-skip');

 function getImage(key) {
  if (!cache.has(key)) {
   const image = new Image();
   cache.set(key, new Promise(resolve => {
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = window.EFStoryArt[key];
   }));
  }
  return cache.get(key);
 }

 function stop() {
  cancelAnimationFrame(frameRequest);clearTimeout(autoTimer);clearInterval(textTimer);
  audio?.stopCue();
  if(voice){voice.pause();voice=null;}
  return ++renderVersion;
 }

 async function render(animate = true) {
  const version = stop();
  const panel = panels[panelIndex];
  $('story-caption').textContent = panel.speaker ? panel.caption+' · '+panel.speaker : panel.caption;
  const speaker=panel.speaker??'Jeeah';
  const portrait=dialog.querySelector('.jeeah-portrait');
  dialog.querySelector('.jeeah-dialogue strong').textContent=speaker;
  portrait.dataset.speaker=speaker;
  const portraitSrc=sanctuaryMode&&speaker==='Caelan'?window.EFSanctuaryStory.portraits[panel.expression]:gardenMode?window.EFGarden.portraits[speaker]:null;
  portrait.style.backgroundImage=portraitSrc?'url("'+portraitSrc+'")':'';
  portrait.style.backgroundSize=portraitSrc?'contain':'';
  portrait.style.backgroundPosition=portraitSrc?'center':'';
  portrait.setAttribute('aria-label',speaker==='Narrator'?'':speaker);
  portrait.setAttribute('aria-hidden',String(speaker==='Narrator'));
  const line=$('story-line');line.textContent='“'+panel.line+'”';
  if(archiveMode&&animate&&!paused&&!reducedMotion.matches){let n=0;line.textContent='';textTimer=setInterval(()=>{line.textContent=panel.line.slice(0,++n);if(n>=panel.line.length)clearInterval(textTimer);},26);}
  canvas.setAttribute('aria-label', panel.caption);
  next.hidden = panelIndex === panels.length - 1;
  finish.hidden = !next.hidden;
  replay.hidden = skip.hidden = !panel.motion;
  skip.disabled = true;
  const effect = panel.motion ?? panel.heldMotion;
  const extraKey = {gate:'beyond', null:'null-restored'}[effect];
  ctx.fillStyle = '#111c16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const [image, extra] = await Promise.all([getImage(panel.art), extraKey && getImage(extraKey)]);
  if (version !== renderVersion || !dialog.open) return;
  if(!image){ctx.fillStyle='#e9ddcc';ctx.font='24px sans-serif';ctx.textAlign='center';ctx.fillText(panel.caption,canvas.width/2,canvas.height/2);if(auto&&!paused)autoTimer=setTimeout(()=>{if(next.hidden)finish.click();else next.click();},4000);return;}
  const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
  const x = (canvas.width - w) / 2, y = (canvas.height - h) / 2;
  function paint(value) {
   ctx.drawImage(image, x, y, w, h);
   if(effect==='garden'){
    const z=1+0.035*value;ctx.save();ctx.translate(canvas.width/2,canvas.height/2);ctx.scale(z,z);ctx.drawImage(image,x-canvas.width/2,y-canvas.height/2,w,h);ctx.restore();
    const colors={petals:'#ffc6dd',sparks:'#ffcf72',water:'#9eeaff',gold:'#ffe39b',motes:'#e1f7c6'};for(let i=0;i<26;i++){const px=x+w*((i*47+13+(panel.effect==='petals'?value*12:0))%100)/100,py=y+h*((i*29+95-30*value+100)%100)/100;ctx.save();ctx.globalAlpha=.2+.4*Math.sin(i+value*3)**2;ctx.fillStyle=colors[panel.effect]||colors.motes;ctx.beginPath();ctx.arc(px,py,1+i%3,0,Math.PI*2);ctx.fill();ctx.restore();}
   }
   else if(effect==='archive'){const z=1+0.055*value;ctx.save();ctx.translate(canvas.width/2,canvas.height/2);ctx.scale(z,z);ctx.drawImage(image,x-canvas.width/2,y-canvas.height/2,w,h);ctx.restore();for(let i=0;i<22;i++){const px=x+w*((i*47+13)%100)/100,py=y+h*((i*29+95-30*value+100)%100)/100;ctx.fillStyle='rgba(255,226,155,'+(0.15+0.3*Math.sin(i+value*3)**2)+')';ctx.beginPath();ctx.arc(px,py,1+i%3,0,Math.PI*2);ctx.fill();}}
   else if (effect) window.EFStoryMotion(effect, {x,y,w,h}, value, ctx, {beyond:extra,restored:extra});
  }
  const cue = panel.motion ?? (['river','rest'].includes(panel.art) ? 'river' : null);
  if (animate && cue && cue!=='archive' && cue!=='garden' && (!reducedMotion.matches || !panel.motion)) audio?.effect(cue);
  const advance=()=>{if(version!==renderVersion||paused||!dialog.open)return;if(next.hidden)finish.click();else next.click();};
  const schedule=()=>{if(auto&&!paused&&version===renderVersion)autoTimer=setTimeout(advance,Math.max(4500,panel.line.length*65, panel.duration??0));};
  const src=panel.voice||window.EFCharacterVoices?.[panel.voiceId];
  if(src&&!paused&&animate){const clip=new Audio(src);voice=clip;clip.addEventListener('ended',()=>{if(auto)advance();},{once:true});let failed=false;const fallback=()=>{if(!failed&&version===renderVersion){failed=true;schedule();}};clip.addEventListener('error',fallback,{once:true});clip.play().catch(fallback);}else schedule();
  if (!animate || !panel.motion || reducedMotion.matches || paused) { paint(1); return; }
  skip.disabled = false;
  const start = performance.now();
  paint(0);
  function tick(time) {
   const value = Math.min(1, (time - start) / panel.duration);
   paint(value);
   if (value < 1) frameRequest = requestAnimationFrame(tick);
   else skip.disabled = true;
  }
  frameRequest = requestAnimationFrame(tick);
 }

 function close() {
  stop();
  if (dialog.open) { dialog.close(); audio?.story(false); }
 }

 function open(chapter, type, label, callback) {
  sanctuaryMode=false;gardenMode=false;archiveMode=false;resetPlayback();
  panels = window.EFStoryChapters[chapter][type];
  panelIndex = 0;
  onFinish = callback;
  $('world-intro-title').textContent = 'Chapter ' + (chapter + 1) + ' · ' + window.EFStoryChapters[chapter].chapter;
  finish.textContent = label;
  if (!dialog.open) dialog.showModal();
  audio?.story(true);
  render();
  (next.hidden ? finish : next).focus();
 }

 next.onclick = () => {
  panelIndex++;
  render();
  (next.hidden ? finish : next).focus();
 };
 back.onclick = () => {
  if (!panelIndex) { close(); return; }
  panelIndex--;
  render(false);
 };
 replay.onclick = () => render();
 skip.onclick = () => { render(false); replay.focus(); };
 finish.onclick = () => {
  const done = onFinish;
  close();
  done();
 };
 dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
 reducedMotion.addEventListener('change', () => { if (dialog.open) render(false); });

 const archiveControls=document.createElement('div');archiveControls.hidden=true;archiveControls.className='archive-controls';dialog.append(archiveControls);
 const control=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;archiveControls.append(b);return b;};
 const autoButton=control('Auto: on',()=>{auto=!auto;setAutoPreference(auto);autoButton.textContent='Auto: '+(auto?'on':'off');render(false);});
 const pauseButton=control('Pause',()=>{paused=!paused;pauseButton.textContent=paused?'Resume':'Pause';render(!paused);});
 control('Replay sequence',()=>{panelIndex=0;render();});
 control('Skip sequence',()=>finish.click());
 control('Full screen',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await dialog.requestFullscreen();}catch{}});
 function openArchive(type,label,callback){
  sanctuaryMode=false;gardenMode=false;archiveMode=true;resetPlayback();
  panels=window.EFArchive.panels(type);panelIndex=0;onFinish=callback;
  window.EFArchive.art.forEach((src,i)=>window.EFStoryArt['archive-'+(i+1)]=src);
  $('world-intro-title').textContent='The Archive of First Currents';finish.textContent=label;
  if(!dialog.open)dialog.showModal();audio?.story(true);render();next.focus();
 }
 function openGarden(type,label,callback){
  sanctuaryMode=false;gardenMode=true;Object.assign(window.EFStoryArt,window.EFGarden.art);archiveMode=true;resetPlayback();
  panels=window.EFGarden.panels(type);panelIndex=0;onFinish=callback;
  $('world-intro-title').textContent='The Garden of Forgotten Wonders';finish.textContent=label;
  if(!dialog.open)dialog.showModal();audio?.story(true);render();next.focus();
 }
 function openSanctuary(type,label,callback){
  sanctuaryMode=true;gardenMode=true;archiveMode=true;resetPlayback();
  Object.assign(window.EFStoryArt,window.EFSanctuaryStory.art);
  panels=window.EFSanctuaryStory.panels(type);panelIndex=0;onFinish=callback;
  $('world-intro-title').textContent='The Sanctuary of Silent Guardians';finish.textContent=label;
  if(!dialog.open)dialog.showModal();audio?.story(true);render();next.focus();
 }
 window.EFStory = {openArchive,openGarden,openSanctuary,
  open, close,
  configureAudio(controller) { audio = controller; },
 };
})();

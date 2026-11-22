'use strict';
(() => {
 const $ = id => document.getElementById(id);
 const dialog = $('world-intro');
 const canvas = $('story-art');
 const ctx = canvas.getContext('2d');
 const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
 const cache = new Map();
 let panels, panelIndex, onFinish, frameRequest, renderVersion = 0;
 let audio;
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
  cancelAnimationFrame(frameRequest);
  audio?.stopCue();
  return ++renderVersion;
 }

 async function render(animate = true) {
  const version = stop();
  const panel = panels[panelIndex];
  $('story-caption').textContent = panel.caption;
  $('story-line').textContent = '“' + panel.line + '”';
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
  if (version !== renderVersion || !dialog.open || !image) return;
  const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
  const x = (canvas.width - w) / 2, y = (canvas.height - h) / 2;
  function paint(value) {
   ctx.drawImage(image, x, y, w, h);
   if (effect) window.EFStoryMotion(effect, {x,y,w,h}, value, ctx, {beyond:extra,restored:extra});
  }
  const cue = panel.motion ?? (['river','rest'].includes(panel.art) ? 'river' : null);
  if (animate && cue && (!reducedMotion.matches || !panel.motion)) audio?.effect(cue);
  if (!animate || !panel.motion || reducedMotion.matches) { paint(1); return; }
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

 window.EFStory = {
  open, close,
  configureAudio(controller) { audio = controller; },
 };
})();

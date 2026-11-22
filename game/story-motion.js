'use strict';
(() => {
// Coordinates are fractions of the displayed painting, independent of its aspect ratio.
const motion = {
  heart: {
    core:[.505,.407], paths:[
      ['#ff8034',[[.20,.76],[.25,.72],[.32,.73],[.388,.662]]],
      ['#44adff',[[.43,.91],[.48,.84],[.55,.76],[.535,.65]]],
      ['#82f3ee',[[.80,.76],[.74,.75],[.70,.70],[.662,.63]]],
    ],
  },
  gate: {core:[.512,.372], locks:[[.513,.151],[.817,.375],[.544,.642],[.20,.36]]},
  relief: {core:[.52,.46]},
  loom: {core:[.90,.13], paths:[
    ['#bceeff',[[.42,.36],[.47,.31],[.52,.30],[.57,.31],[.62,.33],[.67,.37],[.73,.40],[.78,.38],[.81,.34],[.82,.29],[.83,.24],[.87,.20],[.90,.14]]],
    ['#ffdc98',[[.38,.24],[.43,.21],[.46,.17],[.49,.14],[.54,.13],[.60,.15],[.65,.18],[.70,.18],[.75,.16],[.81,.15],[.87,.15],[.90,.13]]],
  ]},
  star: {core:[.317,.415], paths:[
    ['#ffba83',[[.034,.442],[.187,.431],[.317,.415]]],
    ['#8bd8ff',[[.167,.705],[.244,.544],[.317,.415]]],
    ['#a1eade',[[.53,.661],[.398,.507],[.317,.415]]],
    ['#e3d6ff',[[.579,.364],[.411,.389],[.317,.415]]],
    ['#f8db9c',[[.368,.219],[.344,.308],[.317,.415]]],
    ['#c5efff',[[.168,.263],[.241,.331],[.317,.415]]],
  ], outlets:[
    ['#c7ebff',[[.317,.415],[.248,.543],[.167,.705]]],
    ['#a1eade',[[.317,.415],[.398,.507],[.53,.661]]],
    ['#b89bff',[[.898,.229],[.926,.181],[.949,.151],[.948,.108],[.930,.069]]],
  ]},
  symphony: {
    locks:[[.367,.078],[.628,.077],[.751,.302],[.699,.538],[.295,.538],[.241,.300]],
    route:[[.388,.750],[.428,.736],[.50,.690],[.577,.674],[.62,.655]],
  },
  null: {core:[.504,.352], paths:[
    ['#a3e7ff',[[.26,.58],[.226,.63],[.222,.713],[.185,.755],[.131,.822],[.108,.852]]],
    ['#a3e7ff',[[.507,.60],[.507,.739],[.512,.872],[.513,.94]]],
    ['#a3e7ff',[[.743,.575],[.804,.637],[.825,.701],[.828,.734],[.864,.78]]],
  ]},
  world: {
    core:[.504,.396],
    exits:[[.961,.390],[.925,.810],[.502,.982],[.083,.842],[.043,.390],[.143,.052],[.504,.012],[.845,.047]],
    colors:['#ff7943','#72b6ff','#a7ed8b','#ffc178','#a6ffff','#e3e0fa','#fff1a3','#af96f8'],
  },
};

function paintMotion(kind, frame, progress, ctx, images) {
  const data=motion[kind];
  const {x,y,w,h}=frame;
  const clamp=value=>Math.max(0,Math.min(1,value));
  const xy=([a,b])=>[x+a*w,y+b*h];
  const glow=(point,radius,color,alpha)=>{
    if(alpha<=0)return;
    const [cx,cy]=xy(point);
    const gradient=ctx.createRadialGradient(cx,cy,0,cx,cy,radius);
    gradient.addColorStop(0,color);
    gradient.addColorStop(1,'transparent');
    ctx.globalAlpha=alpha;
    ctx.fillStyle=gradient;
    ctx.fillRect(cx-radius,cy-radius,radius*2,radius*2);
    ctx.globalAlpha=1;
  };
  function trace(points,color,amount,width=3){
    if(amount<=0)return;
    const coords=points.map(xy);
    const lengths=coords.slice(1).map(([a,b],i)=>Math.hypot(a-coords[i][0],b-coords[i][1]));
    let remain=lengths.reduce((a,b)=>a+b,0)*clamp(amount);
    ctx.beginPath();
    ctx.moveTo(...coords[0]);
    for(const [i,size] of lengths.entries()){
      const [a,b]=coords[i], [c,d]=coords[i+1];
      const t=Math.min(1,remain/size);
      ctx.lineTo(a+(c-a)*t,b+(d-b)*t);
      remain-=size;
      if(remain<=0)break;
    }
    ctx.strokeStyle=color;
    ctx.lineWidth=width;
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.shadowColor=color;
    ctx.shadowBlur=14;
    ctx.stroke();
    ctx.shadowBlur=0;
  }
  const rays=(paths,delay,step,speed)=>{
    paths.forEach(([color,points],i)=>trace(points,color,(progress-delay-i*step)*speed));
  };
  function travel(paths, delay, step, speed){
    paths.forEach(([color,points],index)=>{
      const t=(progress-delay-index*step)*speed;
      if(t<0||t>1)return;
      const coords=points.map(xy);
      const lengths=coords.slice(1).map(([a,b],i)=>Math.hypot(a-coords[i][0],b-coords[i][1]));
      let distance=lengths.reduce((a,b)=>a+b,0)*t;
      for(const [i,length] of lengths.entries()){
        if(distance>length){distance-=length;continue;}
        const [a,b]=points[i], [c,d]=points[i+1];
        const ratio=distance/length;
        glow([a+(c-a)*ratio,b+(d-b)*ratio],h*.027,color,Math.min(1,t*12,(1-t)*12));
        break;
      }
    });
  }
  function rings(count,color,amount,rotation,base,spacing){
    if(amount<=0)return;
    const [cx,cy]=xy(data.core);
    ctx.save();
    ctx.globalAlpha=amount;
    ctx.strokeStyle=color;
    ctx.lineWidth=1.6;
    ctx.shadowColor=color;
    ctx.shadowBlur=9;
    for(let i=0;i<count;i++){
      const r=h*(base+i*spacing);
      ctx.beginPath();
      ctx.arc(cx,cy,r,rotation*(i%2?1:-1)+i*.43,rotation*(i%2?1:-1)+i*.43+Math.PI*1.55);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.save();
  if(kind==='heart'){
    rays(data.paths,.07,.035,2.5);
    glow(data.core,h*.15,'#ffb636',clamp((progress-.43)*2.4)*.85);
    const pulse=clamp((progress-.59)*2.8);
    if(pulse>0&&pulse<1){
      const [cx,cy]=xy([.505,.77]);
      ctx.beginPath();
      ctx.ellipse(cx,cy,w*(.04+.46*pulse),h*(.02+.16*pulse),0,0,Math.PI*2);
      ctx.strokeStyle='rgba(255,219,146,'+Math.sin(Math.PI*pulse)*.75+')';
      ctx.lineWidth=3;
      ctx.stroke();
    }
  }else if(kind==='gate'){
    data.locks.forEach((point,i)=>glow(point,h*.08,'#ffd180',clamp((progress-.06-i*.095)*8)*.86));
    rings(4,'#ffe3a6',clamp((progress-.36)*5)*.68,(1-clamp((progress-.35)*2.3))*4,.11,.037);
    const spread=clamp((progress-.67)*3.8);
    if(spread>0&&images.beyond){
      const [cx,cy]=xy([.507,.369]);
      const half=w*.164*spread;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx,cy,w*.164,h*.125,0,0,Math.PI*2);
      ctx.clip();
      ctx.beginPath();
      ctx.rect(cx-half,cy-h*.125,half*2,h*.25);
      ctx.clip();
      const height=h*.252;
      const width=height*images.beyond.naturalWidth/images.beyond.naturalHeight;
      ctx.drawImage(images.beyond,cx-width/2,cy-height/2,width,height);
      ctx.restore();
    }
  }else if(kind==='relief'){
    glow(data.core,h*.38,'#ffba57',clamp(progress*1.6)*.58);
  }else if(kind==='loom'){
    travel(data.paths,.06,.14,1.55);
    glow(data.core,h*.060,'#7565bb',Math.sin(Math.PI*clamp((progress-.55)*2.3))*.54);
  }else if(kind==='star'){
    travel(data.paths,.025,.04,3.05);
    glow(data.core,h*.115,'#ffbf62',clamp((progress-.32)*3)*.66);
    travel(data.outlets,.50,.08,3.25);
  }else if(kind==='symphony'){
    data.locks.forEach((point,i)=>{
      const strike=clamp((progress-.06-i*.09)*6);
      glow(point,h*.068,'#ffdc85',Math.sin(strike*Math.PI)*.9);
    });
    trace(data.route,'#a4f7ee',(progress-.62)*3.1,2.1);
  }else if(kind==='null'){
    const healing=clamp((progress-.32)*3.2);
    const pulse=Math.sin((1-(1-progress)**3)*28)*.5+.5;
    glow(data.core,h*.16,'#b484ff',pulse*(1-healing)*.55);
    if(images.restored&&healing>0){
      ctx.globalAlpha=healing;
      ctx.drawImage(images.restored,x,y,w,h);
      ctx.globalAlpha=1;
    }
    travel(data.paths,.60,.07,3.7);
  }else if(kind==='world'){

    glow(data.core,h*.17,'#ffce66',clamp((progress-.26)*2.5)*.8);
    data.colors.forEach((color,i)=>{
      const end=data.exits[i];
      travel([[color,[data.core,end]]],.24+i*.057,3.4);
      glow(end,h*.036,color,clamp((progress-.49-i*.057)*5)*.65);
    });
  }
  ctx.restore();
}

window.EFStoryMotion = paintMotion;
})();

// HUB BG
(()=>{
  const c=document.getElementById('bgc'),x=c.getContext('2d');let W,H,p=[];
  const r=()=>{W=c.width=innerWidth;H=c.height=innerHeight;p=[];for(let i=0;i<95;i++)p.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.16,vy:(Math.random()-.5)*.16,r:Math.random()*1.5+.3,b:Math.random()});};
  window.addEventListener('resize',r);r();
  const f=()=>{x.clearRect(0,0,W,H);for(const pt of p){pt.x+=pt.vx;pt.y+=pt.vy;if(pt.x<0)pt.x=W;if(pt.x>W)pt.x=0;if(pt.y<0)pt.y=H;if(pt.y>H)pt.y=0;x.fillStyle=`rgba(148,163,184,${pt.b*.32})`;x.beginPath();x.arc(pt.x,pt.y,pt.r,0,Math.PI*2);x.fill();}
  for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){const d=Math.hypot(p[i].x-p[j].x,p[i].y-p[j].y);if(d<105){x.strokeStyle=`rgba(79,70,229,${(1-d/105)*.09})`;x.lineWidth=.5;x.beginPath();x.moveTo(p[i].x,p[i].y);x.lineTo(p[j].x,p[j].y);x.stroke();}}
  requestAnimationFrame(f);};f();
})();

// CONTROLLER
let game=null,raf=null;
const T={zombie:'🧟 ZOMBIE WAVES',maze:'👁️ DARK MAZE',space:'🚀 VOID ASSAULT',penalty:'⚽ PENALTY SHOOTOUT'};
function launch(t){
  document.getElementById('overlay').classList.add('on');
  document.getElementById('gt').textContent=T[t];
  const cv=document.getElementById('gc');
  cv.width=800;cv.height=590;
  if(game?.destroy)game.destroy();
  if(raf)cancelAnimationFrame(raf);raf=null;
  const Ctor={zombie:ZombieGame,maze:MazeGame,space:SpaceGame,penalty:PenaltyGame}[t];
  game=new Ctor(cv);
  game.start();
}
function closeGame(){
  if(game?.destroy)game.destroy();
  if(raf)cancelAnimationFrame(raf);raf=null;
  game=null;
  document.getElementById('overlay').classList.remove('on');
}

// HELPERS
const gl=(c,col,b=15)=>{c.shadowBlur=b;c.shadowColor=col;};
const ng=c=>{c.shadowBlur=0;};
const ci=(c,x,y,r,f,s,sw=2)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(f){c.fillStyle=f;c.fill();}if(s){c.strokeStyle=s;c.lineWidth=sw;c.stroke();}};
const bx=(c,x,y,w,h,f,r=0)=>{if(r){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=f;c.fill();}else{c.fillStyle=f;c.fillRect(x,y,w,h);}};
const hb=(c,x,y,w,h,f,hi,lo)=>{bx(c,x-1,y-1,w+2,h+2,'#050810',3);bx(c,x,y,w,h,'#0d1625',2);if(f>0)bx(c,x,y,w*f,h,f>.5?hi:f>.25?'#f59e0b':lo,2);};
const ft=(c,x,y,t,col,sz=15,a=1)=>{c.globalAlpha=a;c.fillStyle=col;c.font=`bold ${sz}px Orbitron,monospace`;c.textAlign='center';c.fillText(t,x,y);c.textAlign='left';c.globalAlpha=1;};


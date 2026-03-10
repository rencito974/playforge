class MazeGame{
  constructor(cv){
    this.cv=cv;this.ctx=cv.getContext('2d');this.W=cv.width;this.H=cv.height;
    this.C=28;this.COLS=Math.floor(this.W/this.C);this.ROWS=Math.floor(this.H/this.C);
    this.keys={};this.over=false;this.won=false;this.tick=0;
    this.mvT=0;this.mvI=6;this.ptT=0;this.ptI=35;
    this.monsters=[];this.danger=0;this.fps=[];this.mpts=[];
    this.hasKey=false;this.exitOpen=false;this.startTime=0;
    this.stamina=100;this.maxStamina=100;
    this.instrAlpha=1.0;this.instrT=400;
    this._bind();this._newMaze();
  }
  _bind(){
    this._k=e=>{
      this.keys[e.code]=e.type==='keydown';
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();
      if(e.type==='keydown'&&e.code==='Space'){e.preventDefault();if(this.over||this.won)this._newMaze();}
    };
    window.addEventListener('keydown',this._k);window.addEventListener('keyup',this._k);
    this._cl=()=>{if(this.over||this.won)this._newMaze();};
    this.cv.addEventListener('click',this._cl);
  }
  destroy(){window.removeEventListener('keydown',this._k);window.removeEventListener('keyup',this._k);this.cv.removeEventListener('click',this._cl);}

  _newMaze(){
    const R=this.ROWS,C=this.COLS;
    this.grid=[];
    for(let r=0;r<R;r++){this.grid[r]=[];for(let c=0;c<C;c++)this.grid[r][c]={v:false,w:[1,1,1,1],room:false,torch:false,disc:false};}
    const stk=[{r:1,c:1}];this.grid[1][1].v=true;
    while(stk.length){
      const cur=stk[stk.length-1],nb=this._nb(cur.r,cur.c);
      if(!nb.length){stk.pop();continue;}
      const nx=nb[Math.random()*nb.length|0];
      this._carve(cur,nx);this.grid[nx.r][nx.c].v=true;stk.push(nx);
    }
    // Extra tunnels 28% for lots of loops and alternate paths
    const extras=Math.ceil(C*R*.28);
    for(let i=0;i<extras;i++){
      const r=1+(Math.random()*(R-2)|0),c=1+(Math.random()*(C-2)|0);
      const dir=Math.random()*4|0,D=[[-1,0],[0,1],[1,0],[0,-1]],[dr,dc]=D[dir];
      const nr=r+dr,nc=c+dc;
      if(nr>=0&&nr<R&&nc>=0&&nc<C)this._carve({r,c},{r:nr,c:nc});
    }
    // Big open rooms - 12 rooms of varying sizes
    const roomDefs=[
      {s:2,w:2},{s:2,w:2},{s:2,w:3},{s:2,w:3},{s:3,w:3},{s:3,w:3},
      {s:3,w:4},{s:4,w:4},{s:4,w:5},{s:3,w:5},{s:5,w:5},{s:4,w:6}
    ];
    for(const{s,w}of roomDefs){
      let r,c,tries=0;
      do{r=2+(Math.random()*(R-s-3)|0);c=2+(Math.random()*(C-w-3)|0);tries++;}
      while(tries<60&&this._roomOverlap(r,c,s,w));
      if(tries>=60)continue;
      for(let dr=0;dr<s;dr++)for(let dc=0;dc<w;dc++){
        const rr=r+dr,cc=c+dc;
        if(rr<R&&cc<C){
          this.grid[rr][cc].room=true;
          if(dc<w-1)this._carve({r:rr,c:cc},{r:rr,c:cc+1});
          if(dr<s-1)this._carve({r:rr,c:cc},{r:rr+1,c:cc});
        }
      }
      if(s>=3||w>=3){const tr=r+(s/2|0),tc=c+(w/2|0);if(tr<R&&tc<C)this.grid[tr][tc].torch=true;}
    }
    // Sparse torches
    for(let r=0;r<R;r++)for(let c=0;c<C;c++)if(Math.random()>.88)this.grid[r][c].torch=true;
    // Exit — far border cell
    const border=[];
    for(let c=1;c<C-1;c++){border.push({r:0,c,d:Math.hypot(0,c)});border.push({r:R-1,c,d:Math.hypot(R-1,c)});}
    for(let r=1;r<R-1;r++){border.push({r,c:0,d:Math.hypot(r,0)});border.push({r,c:C-1,d:Math.hypot(r,C-1)});}
    border.sort((a,b)=>b.d-a.d);
    this.exit=border[Math.floor(Math.random()*Math.min(6,border.length))];
    this.grid[this.exit.r][this.exit.c].isExit=true;
    // Key deep inside
    const interior=[];
    for(let r=2;r<R-2;r++)for(let c=2;c<C-2;c++){
      const d1=Math.hypot(r-1,c-1),d2=Math.hypot(r-this.exit.r,c-this.exit.c);
      if(d1>5&&d2>5)interior.push({r,c});
    }
    interior.sort(()=>Math.random()-.5);
    this.key=interior[0]||{r:R/2|0,c:C/2|0};
    this.player={r:1,c:1};
    this.pSm={x:this.C+this.C/2,y:this.C+this.C/2};
    this.monsters=[{r:R-2,c:C-2,path:[],pT:0,sm:{x:(C-2)*this.C+this.C/2,y:(R-2)*this.C+this.C/2},spd:0}];
    this.mpts=[];this.fps=[];this.hasKey=false;this.exitOpen=false;
    this.startTime=Date.now();this.endTime=null;this.danger=0;this.tick=0;this.over=false;this.won=false;this._scoreSub=false;
    this.stamina=this.maxStamina;
    this._discover(1,1,4);
  }
  _roomOverlap(r,c,s,w){for(let dr=0;dr<s+1;dr++)for(let dc=0;dc<w+1;dc++){const rr=r+dr,cc=c+dc;if(rr<this.ROWS&&cc<this.COLS&&this.grid[rr][cc].room)return true;}return false;}
  _nb(r,c){const D=[[-1,0],[0,1],[1,0],[0,-1]],o=[];for(const[dr,dc]of D){const nr=r+dr,nc=c+dc;if(nr>=0&&nr<this.ROWS&&nc>=0&&nc<this.COLS&&!this.grid[nr][nc].v)o.push({r:nr,c:nc});}return o;}
  _carve(a,b){const dr=b.r-a.r,dc=b.c-a.c;if(dr===-1){this.grid[a.r][a.c].w[0]=0;this.grid[b.r][b.c].w[2]=0;}else if(dc===1){this.grid[a.r][a.c].w[1]=0;this.grid[b.r][b.c].w[3]=0;}else if(dr===1){this.grid[a.r][a.c].w[2]=0;this.grid[b.r][b.c].w[0]=0;}else if(dc===-1){this.grid[a.r][a.c].w[3]=0;this.grid[b.r][b.c].w[1]=0;}}
  _can(r,c,d){return r>=0&&r<this.ROWS&&c>=0&&c<this.COLS&&!this.grid[r][c].w[d];}
  _discover(r,c,radius){for(let dr=-radius;dr<=radius;dr++)for(let dc=-radius;dc<=radius;dc++){const nr=r+dr,nc=c+dc;if(nr>=0&&nr<this.ROWS&&nc>=0&&nc<this.COLS)this.grid[nr][nc].disc=true;}}
  _bfs(sr,sc,er,ec){
    const vis=Array.from({length:this.ROWS},()=>new Array(this.COLS).fill(false));
    const prev=Array.from({length:this.ROWS},()=>new Array(this.COLS).fill(null));
    const q=[{r:sr,c:sc}];vis[sr][sc]=true;
    const D=[[-1,0,0],[0,1,1],[1,0,2],[0,-1,3]];
    while(q.length){const cur=q.shift();if(cur.r===er&&cur.c===ec)break;for(const[dr,dc,wi]of D){const nr=cur.r+dr,nc=cur.c+dc;if(nr>=0&&nr<this.ROWS&&nc>=0&&nc<this.COLS&&!vis[nr][nc]&&!this.grid[cur.r][cur.c].w[wi]){vis[nr][nc]=true;prev[nr][nc]={r:cur.r,c:cur.c};q.push({r:nr,c:nc});}}}
    const path=[];let cur={r:er,c:ec};while(cur&&prev[cur.r]?.[cur.c]){path.unshift(cur);cur=prev[cur.r][cur.c];}return path;
  }

  update(){
    if(this.over||this.won)return;
    this.tick++;const elapsed=(Date.now()-this.startTime)/1000;
    if(this.instrT>0)this.instrT--;else this.instrAlpha=Math.max(0,this.instrAlpha-0.003);
    const sprinting=(this.keys['ShiftLeft']||this.keys['ShiftRight'])&&this.stamina>0;
    if(sprinting)this.stamina=Math.max(0,this.stamina-2);
    else this.stamina=Math.min(this.maxStamina,this.stamina+1.5);
    const baseSpd=Math.max(4,16-(elapsed*.08|0));this.monsters[0].spd=baseSpd;
    if(elapsed>40&&this.monsters.length<2)this.monsters.push({r:this.ROWS/2|0,c:this.COLS-2,path:[],pT:0,sm:{x:(this.COLS-2)*this.C+this.C/2,y:(this.ROWS/2|0)*this.C+this.C/2},spd:baseSpd+3});
    if(elapsed>90&&this.monsters.length<3)this.monsters.push({r:this.ROWS-2,c:this.COLS/2|0,path:[],pT:0,sm:{x:(this.COLS/2|0)*this.C+this.C/2,y:(this.ROWS-2)*this.C+this.C/2},spd:baseSpd+6});
    const curMvI=sprinting?Math.ceil(this.mvI/1.22):this.mvI;
    if(++this.mvT>=curMvI){
      const p=this.player;let moved=false;
      if((this.keys['ArrowUp']||this.keys['KeyW'])&&this._can(p.r,p.c,0)){p.r--;moved=true;}
      else if((this.keys['ArrowRight']||this.keys['KeyD'])&&this._can(p.r,p.c,1)){p.c++;moved=true;}
      else if((this.keys['ArrowDown']||this.keys['KeyS'])&&this._can(p.r,p.c,2)){p.r++;moved=true;}
      else if((this.keys['ArrowLeft']||this.keys['KeyA'])&&this._can(p.r,p.c,3)){p.c--;moved=true;}
      if(moved){this.mvT=0;this.fps.push({x:this.pSm.x,y:this.pSm.y,life:100,max:100});this._discover(p.r,p.c,3);}
    }
    this.pSm.x+=(this.player.c*this.C+this.C/2-this.pSm.x)*.28;
    this.pSm.y+=(this.player.r*this.C+this.C/2-this.pSm.y)*.28;
    if(!this.hasKey&&this.player.r===this.key.r&&this.player.c===this.key.c){this.hasKey=true;this.exitOpen=true;}
    if(this.exitOpen&&this.player.r===this.exit.r&&this.player.c===this.exit.c&&!this.won){this.won=true;const t2=(Date.now()-this.startTime)/1000;this.endTime=t2;if(!this._scoreSub){this._scoreSub=true;window.hubSubmitScore?.('maze',Math.round(10000-t2*10),{won:true,time:t2});}}
    let maxDanger=0;
    for(const m of this.monsters){
      if(++m.pT>=this.ptI||!m.path.length){m.path=this._bfs(m.r,m.c,this.player.r,this.player.c);m.pT=0;}
      if(this.tick%m.spd===0&&m.path.length){const nx=m.path.shift();m.r=nx.r;m.c=nx.c;}
      m.sm.x+=(m.c*this.C+this.C/2-m.sm.x)*.16;m.sm.y+=(m.r*this.C+this.C/2-m.sm.y)*.16;
      const d=Math.hypot(m.r-this.player.r,m.c-this.player.c);maxDanger=Math.max(maxDanger,1-d/8);
      if(d===0&&!this.over){this.over=true;const t2=(Date.now()-this.startTime)/1000;this.endTime=t2;if(!this._scoreSub){this._scoreSub=true;window.hubSubmitScore?.('maze',Math.round(t2),{won:false,time:t2});}}
      if(this.danger>.4&&Math.random()>.7){const a=Math.random()*Math.PI*2;this.mpts.push({x:m.sm.x+Math.cos(a)*22,y:m.sm.y+Math.sin(a)*22,vx:(Math.random()-.5)*.4,vy:-(Math.random()*.7+.3),r:Math.random()*3+1,life:40,max:40});}
    }
    this.danger=Math.max(0,maxDanger);
    this.mpts=this.mpts.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.life--;return p.life>0;});
    this.fps=this.fps.filter(f=>{f.life--;return f.life>0;});
  }

  draw(){
    const ctx=this.ctx,C=this.C,W=this.W,H=this.H;
    ctx.fillStyle='#010305';ctx.fillRect(0,0,W,H);
    for(let r=0;r<this.ROWS;r++)for(let c=0;c<this.COLS;c++){
      if(this.grid[r][c].room){
        ctx.fillStyle='#080d18';ctx.fillRect(c*C+1,r*C+1,C-2,C-2);
        ctx.fillStyle='rgba(255,255,255,.012)';ctx.fillRect(c*C+2,r*C+2,C/2-2,C/2-2);ctx.fillRect(c*C+C/2,r*C+C/2,C/2-2,C/2-2);
      }
    }
    const ex=this.exit.c*C,ey=this.exit.r*C;const ecol=this.exitOpen?'#22c55e':'#dc2626';
    gl(ctx,ecol,22);ctx.fillStyle=ecol+'18';ctx.fillRect(ex,ey,C,C);ctx.fillStyle=ecol+'30';ctx.fillRect(ex+3,ey+3,C-6,C-6);ng(ctx);
    ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText(this.exitOpen?'🚪':'🔒',ex+C/2,ey+C/2+5);ctx.textAlign='left';
    if(!this.hasKey){const kx=this.key.c*C,ky=this.key.r*C,bob=Math.sin(this.tick*.1)*4;gl(ctx,'#facc15',18);ctx.fillStyle='rgba(250,204,21,.12)';ctx.fillRect(kx,ky,C,C);ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText('🗝️',kx+C/2,ky+C/2+bob+5);ctx.textAlign='left';ng(ctx);}
    ctx.strokeStyle='#162240';ctx.lineWidth=2.5;ctx.lineCap='square';
    for(let r=0;r<this.ROWS;r++)for(let c=0;c<this.COLS;c++){const x=c*C,y=r*C,w=this.grid[r][c].w;ctx.beginPath();if(w[0]){ctx.moveTo(x,y);ctx.lineTo(x+C,y);}if(w[1]){ctx.moveTo(x+C,y);ctx.lineTo(x+C,y+C);}if(w[2]){ctx.moveTo(x,y+C);ctx.lineTo(x+C,y+C);}if(w[3]){ctx.moveTo(x,y);ctx.lineTo(x,y+C);}ctx.stroke();}
    ctx.strokeStyle='#1e3a5f';ctx.lineWidth=.8;
    for(let r=0;r<this.ROWS;r++)for(let c=0;c<this.COLS;c++){const x=c*C,y=r*C,w=this.grid[r][c].w;ctx.beginPath();if(w[0]){ctx.moveTo(x,y);ctx.lineTo(x+C,y);}if(w[1]){ctx.moveTo(x+C,y);ctx.lineTo(x+C,y+C);}if(w[2]){ctx.moveTo(x,y+C);ctx.lineTo(x+C,y+C);}if(w[3]){ctx.moveTo(x,y);ctx.lineTo(x,y+C);}ctx.stroke();}
    for(let r=0;r<this.ROWS;r++)for(let c=0;c<this.COLS;c++){
      if(!this.grid[r][c].torch)continue;
      const tx=c*C+C/2,ty=r*C+C/2,flk=0.8+Math.sin(this.tick*.28+c+r)*.2;
      const tg=ctx.createRadialGradient(tx,ty,0,tx,ty,C*1.1);
      tg.addColorStop(0,`rgba(217,119,6,${.22*flk})`);tg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=tg;ctx.fillRect(tx-C*1.1,ty-C*1.1,C*2.2,C*2.2);
    }
    for(const m of this.monsters){const mg=ctx.createRadialGradient(m.sm.x,m.sm.y,0,m.sm.x,m.sm.y,105);mg.addColorStop(0,`rgba(180,0,0,${.2*this.danger+.04})`);mg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=mg;ctx.fillRect(0,0,W,H);}
    // Darkness with large light radius (130px base)
    const dc=document.createElement('canvas');dc.width=W;dc.height=H;const dx=dc.getContext('2d');
    dx.fillStyle='rgba(0,0,0,.97)';dx.fillRect(0,0,W,H);dx.globalCompositeOperation='destination-out';
    const lr=Math.max(55,130-this.danger*40);
    const pg=dx.createRadialGradient(this.pSm.x,this.pSm.y,0,this.pSm.x,this.pSm.y,lr);
    pg.addColorStop(0,'rgba(0,0,0,1)');pg.addColorStop(.55,'rgba(0,0,0,.85)');pg.addColorStop(1,'rgba(0,0,0,0)');
    dx.fillStyle=pg;dx.fillRect(0,0,W,H);
    for(let r=0;r<this.ROWS;r++)for(let c=0;c<this.COLS;c++){
      if(!this.grid[r][c].torch)continue;
      const tx=c*C+C/2,ty=r*C+C/2;
      const tgl=dx.createRadialGradient(tx,ty,0,tx,ty,C*1.2);
      tgl.addColorStop(0,'rgba(0,0,0,.55)');tgl.addColorStop(1,'rgba(0,0,0,0)');
      dx.fillStyle=tgl;dx.fillRect(tx-C*1.2,ty-C*1.2,C*2.4,C*2.4);
    }
    ctx.drawImage(dc,0,0);
    const flk=.85+Math.sin(this.tick*.22)*.15;
    const tc2=document.createElement('canvas');tc2.width=W;tc2.height=H;const tx2=tc2.getContext('2d');
    const tg2=tx2.createRadialGradient(this.pSm.x,this.pSm.y,0,this.pSm.x,this.pSm.y,lr*.7);
    tg2.addColorStop(0,`rgba(217,119,6,${.1*flk})`);tg2.addColorStop(1,'rgba(0,0,0,0)');
    tx2.fillStyle=tg2;tx2.fillRect(0,0,W,H);ctx.drawImage(tc2,0,0);
    for(const f of this.fps){ctx.globalAlpha=f.life/f.max*.28;ci(ctx,f.x,f.y,3,'#d97706');}ctx.globalAlpha=1;
    for(const p of this.mpts){ctx.globalAlpha=p.life/p.max;ci(ctx,p.x,p.y,p.r,'rgba(220,38,38,.45)');}ctx.globalAlpha=1;
    for(const m of this.monsters){if(this.danger>.12){const al=Math.min(1,this.danger*1.6);ctx.globalAlpha=al;gl(ctx,'#dc2626',30);ci(ctx,m.sm.x,m.sm.y,22,'#2d0000');ng(ctx);for(let i=0;i<6;i++){const ta=i*Math.PI*2/6+this.tick*.048,len=14+Math.sin(this.tick*.09+i)*9;ctx.strokeStyle=`rgba(127,29,29,${al})`;ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(m.sm.x,m.sm.y);ctx.lineTo(m.sm.x+Math.cos(ta)*len,m.sm.y+Math.sin(ta)*len);ctx.stroke();}for(let i=0;i<3;i++){const ea=-Math.PI/3+i*Math.PI/3,blink=Math.sin(this.tick*.09+i*2)>.8?.4:1;gl(ctx,'#dc2626',14);ci(ctx,m.sm.x+Math.cos(ea)*10,m.sm.y-5,4*blink,'#ef4444');}ng(ctx);ctx.globalAlpha=1;}}
    gl(ctx,'#d97706',24);ci(ctx,this.pSm.x,this.pSm.y,11,'#b45309','#fbbf24',2);ng(ctx);
    if((this.keys['ShiftLeft']||this.keys['ShiftRight'])&&this.stamina>0){gl(ctx,'#22d3ee',8);ci(ctx,this.pSm.x,this.pSm.y,15,null,'#22d3ee',1.5);ng(ctx);}
    if(this.danger>.3){const pulse=Math.sin(this.tick*.2)*.5+.5;const v=ctx.createRadialGradient(W/2,H/2,H*.15,W/2,H/2,H);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,`rgba(200,0,0,${this.danger*.5*pulse})`);ctx.fillStyle=v;ctx.fillRect(0,0,W,H);ctx.fillStyle=`rgba(255,50,50,${pulse*.28})`;ctx.fillRect(0,0,W,H);gl(ctx,'#dc2626',8);ctx.fillStyle=`rgba(220,38,38,${pulse*.85})`;ctx.font='bold 12px Orbitron,monospace';ctx.textAlign='center';ctx.fillText('⚠  CLOSE  ⚠',W/2,22);ctx.textAlign='left';ng(ctx);}
    // Frozen or live elapsed time
    const elapsed=this.endTime!=null?this.endTime:(Date.now()-this.startTime)/1000;
    // Proximity-fade helper: returns 0 (invisible) when player overlaps, 1 (opaque) when far
    const prox=(px,py,rx,ry,rw,rh)=>{const dx=Math.max(rx-px,0,px-(rx+rw));const dy=Math.max(ry-py,0,py-(ry+rh));return Math.min(1,Math.max(0,(Math.hypot(dx,dy)-12)/55));};
    const px=this.pSm.x,py=this.pSm.y;

    // ── Minimap top-right ──
    const MC=3.0,MW=this.COLS*MC,MH=this.ROWS*MC,mx=W-MW-10,my=10;
    const mmA=prox(px,py,mx-3,my-3,MW+6,MH+6);
    ctx.save();ctx.globalAlpha=Math.max(0.06,mmA);
    bx(ctx,mx-3,my-3,MW+6,MH+6,'rgba(0,0,8,.85)',3);
    for(let r=0;r<this.ROWS;r++)for(let c=0;c<this.COLS;c++){const cell=this.grid[r][c];if(!cell.disc)continue;const mpx2=mx+c*MC,mpy2=my+r*MC;ctx.fillStyle=cell.room?'#0f1e30':cell.isExit?(this.exitOpen?'#052e16':'#2d0000'):'#080f1e';ctx.fillRect(mpx2,mpy2,MC,MC);ctx.strokeStyle='#1a2a3a';ctx.lineWidth=.4;ctx.beginPath();if(cell.w[0]){ctx.moveTo(mpx2,mpy2);ctx.lineTo(mpx2+MC,mpy2);}if(cell.w[1]){ctx.moveTo(mpx2+MC,mpy2);ctx.lineTo(mpx2+MC,mpy2+MC);}if(cell.w[2]){ctx.moveTo(mpx2,mpy2+MC);ctx.lineTo(mpx2+MC,mpy2+MC);}if(cell.w[3]){ctx.moveTo(mpx2,mpy2);ctx.lineTo(mpx2,mpy2+MC);}ctx.stroke();}
    if(!this.hasKey&&this.grid[this.key.r][this.key.c].disc){const kpx=mx+this.key.c*MC+MC/2,kpy=my+this.key.r*MC+MC/2;gl(ctx,'#facc15',8);ci(ctx,kpx,kpy,MC*.9,'#facc15');ng(ctx);}
    if(this.grid[this.exit.r][this.exit.c].disc){const epx=mx+this.exit.c*MC+MC/2,epy=my+this.exit.r*MC+MC/2;const ec2=this.exitOpen?'#22c55e':'#ef4444';gl(ctx,ec2,8);ci(ctx,epx,epy,MC*.9,ec2);ng(ctx);}
    const ppx2=mx+this.player.c*MC+MC/2,ppy2=my+this.player.r*MC+MC/2;gl(ctx,'#fbbf24',6);ci(ctx,ppx2,ppy2,MC*.9,'#fbbf24');ng(ctx);
    for(const m of this.monsters){if(this.danger>.3){const mpx3=mx+m.c*MC+MC/2,mpy3=my+m.r*MC+MC/2;gl(ctx,'#ef4444',6);ci(ctx,mpx3,mpy3,MC*.9,'#ef4444');ng(ctx);}}
    ctx.restore();

    // ── HUD top-left ──
    const hudA=prox(px,py,8,8,185,54);
    ctx.save();ctx.globalAlpha=Math.max(0.06,hudA);
    bx(ctx,8,8,185,54,'rgba(0,0,8,.82)',6);
    ctx.fillStyle='#374151';ctx.font='10px Inter,sans-serif';ctx.fillText(`TIME ${elapsed.toFixed(0)}s  ·  ${this.monsters.length} MONSTER${this.monsters.length>1?'S':''}`,16,24);
    if(!this.hasKey){ctx.fillStyle='#fbbf24';ctx.font='bold 10px Orbitron,monospace';ctx.fillText('🗝 FIND KEY FIRST',16,40);}
    else{ctx.fillStyle='#22c55e';ctx.font='bold 10px Orbitron,monospace';ctx.fillText('🚪 REACH THE EXIT!',16,40);}
    ctx.restore();

    // ── Stamina bar bottom-left ──
    if((this.keys['ShiftLeft']||this.keys['ShiftRight'])||this.stamina<this.maxStamina){
      const stA=prox(px,py,8,H-26,148,10);
      ctx.save();ctx.globalAlpha=Math.max(0.08,stA);
      hb(ctx,10,H-22,140,6,this.stamina/this.maxStamina,'#22d3ee','#0e7490');
      ctx.fillStyle='#22d3ee';ctx.font='8px Inter,sans-serif';ctx.fillText('SPRINT',158,H-18);
      ctx.restore();
    }
    if(this.monsters.length===1&&elapsed>36){ctx.fillStyle='rgba(239,68,68,.7)';ctx.font='bold 10px Orbitron,monospace';ctx.textAlign='center';ctx.fillText('⚠ 2ND MONSTER INCOMING',W/2,H-10);ctx.textAlign='left';}
    // Instructions — tiny, fading, bottom-left, also fades when player is near
    if(this.instrAlpha>0.01){
      const iA=prox(px,py,0,H-22,210,18)*this.instrAlpha;
      if(iA>0.01){ctx.globalAlpha=iA*0.4;ctx.fillStyle='#6b7280';ctx.font='9px Inter,sans-serif';ctx.fillText('WASD/Arrows move · Shift sprint',10,H-10);ctx.globalAlpha=1;}
    }
    if(this.over){ctx.fillStyle='rgba(0,0,0,.9)';ctx.fillRect(0,0,W,H);gl(ctx,'#ef4444',28);ft(ctx,W/2,H/2-10,'CAUGHT!','#ef4444',60);ng(ctx);ft(ctx,W/2,H/2+45,`Survived ${elapsed.toFixed(0)}s`,'#6b7280',16);ft(ctx,W/2,H/2+70,'click  or  Space  for new maze','#374151',13);}
    if(this.won){ctx.fillStyle='rgba(0,0,0,.9)';ctx.fillRect(0,0,W,H);gl(ctx,'#22c55e',28);ft(ctx,W/2,H/2-15,'ESCAPED!','#22c55e',56);ng(ctx);ft(ctx,W/2,H/2+32,`Time: ${elapsed.toFixed(1)}s`,'#9ca3af',16);ft(ctx,W/2,H/2+64,'click  or  Space  for new maze','#374151',13);}
  }
  start(){const l=()=>{this.update();this.draw();raf=requestAnimationFrame(l);};l();}
}

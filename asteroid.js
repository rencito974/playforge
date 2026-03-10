// VOID ASSAULT — top-down space shooter
class SpaceGame{
  constructor(cv){
    this.cv=cv;this.ctx=cv.getContext('2d');this.W=cv.width;this.H=cv.height;
    this.keys={};this.mouse={x:this.W/2,y:this.H/2,down:false};
    this.instrAlpha=1.0;this.instrT=300;
    this._bind();this._rst();
  }
  _bind(){
    this._k=e=>{this.keys[e.code]=e.type==='keydown';};
    this._m=e=>{const r=this.cv.getBoundingClientRect();this.mouse.x=e.clientX-r.left;this.mouse.y=e.clientY-r.top;};
    this._dn=e=>{if(e.button===0){this.mouse.down=true;if(this.over)this._rst();}};
    this._up=e=>{if(e.button===0)this.mouse.down=false;};
    window.addEventListener('keydown',this._k);window.addEventListener('keyup',this._k);
    this.cv.addEventListener('mousemove',this._m);this.cv.addEventListener('mousedown',this._dn);this.cv.addEventListener('mouseup',this._up);
  }
  destroy(){
    window.removeEventListener('keydown',this._k);window.removeEventListener('keyup',this._k);
    this.cv.removeEventListener('mousemove',this._m);this.cv.removeEventListener('mousedown',this._dn);this.cv.removeEventListener('mouseup',this._up);
  }
  _rst(){
    this.P={x:this.W/2,y:this.H/2,r:14,hp:100,mxHp:100,spd:4.2,angle:0,inv:0,shield:0,shieldCd:0,weapon:'single',fireT:0,fireI:10};
    this.bullets=[];this.enemies=[];this.parts=[];this.txts=[];this.drops=[];this.mines=[];
    this.rings=[];this.trails=[];
    this.score=0;this.wave=1;this.kills=0;this.combo=1;this.comboT=0;
    this.waveClear=false;this.waveT=0;this.waveI=180;
    this.over=false;this.tick=0;this.fl=0;this._scoreSub=false;
    this.spawnT=0;this.spawnI=90;this.spawnCount=0;this.spawnMax=5;
    this.bossAlive=false;this.bossWarning=0;
    this.shake={x:0,y:0,i:0};
    this.deathT=0;
    this.instrAlpha=1.0;this.instrT=300;
    this.stars=[];
    for(let i=0;i<220;i++)this.stars.push({x:Math.random()*this.W,y:Math.random()*this.H,r:Math.random()*1.8+.2,b:Math.random()*.8+.2,layer:Math.random()*3|0,twinkle:Math.random()*6.28});
    this.nebula=[];for(let i=0;i<6;i++)this.nebula.push({x:Math.random()*this.W,y:Math.random()*this.H,r:80+Math.random()*120,col:`hsl(${200+Math.random()*80},60%,${12+Math.random()*8}%)`});
  }
  // --- Effects ---
  _shk(intensity){this.shake.i=Math.max(this.shake.i,intensity);}
  _ring(x,y,col,maxR=55,w=3){this.rings.push({x,y,r:4,maxR,col,life:30,max:30,w});}
  _trail(x,y,col,r=2){this.trails.push({x,y,r,col,life:18,max:18});}
  _burst(x,y,col,n=8,sp=1){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=(Math.random()*3+1)*sp;this.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:Math.random()*5+2,life:35+Math.random()*20,max:55,col});}}
  _txt(x,y,t,col){this.txts.push({x,y,t,col,life:60,max:60});}
  _drop(x,y){
    if(Math.random()>.7){const t=Math.random()<.35?'shield':Math.random()<.5?'hp':'weapon';this.drops.push({x,y,type:t,life:400,bob:0,r:12});}
  }
  // --- Spawning ---
  _spawnWave(){
    this.spawnMax=4+this.wave*2;this.spawnCount=0;this.spawnT=0;
    this.spawnI=Math.max(25,90-this.wave*5);
    this.bossAlive=this.wave%5===0;
    if(this.bossAlive){this.bossWarning=120;this._shk(6);}
  }
  _spawnEnemy(){
    const W=this.W,H=this.H,w=this.wave;
    const side=Math.random()*4|0;let x,y;
    if(side===0){x=Math.random()*W;y=-30;}else if(side===1){x=W+30;y=Math.random()*H;}else if(side===2){x=Math.random()*W;y=H+30;}else{x=-30;y=Math.random()*H;}
    // Spawn boss on boss waves if no boss exists yet
    if(this.bossAlive&&this.enemies.filter(e=>e.boss).length===0){
      this.enemies.push({x:W/2,y:-60,r:38,hp:300+w*60,mxHp:300+w*60,spd:.8+w*.05,angle:Math.PI/2,boss:true,col:'#7f1d1d',ec:'#f97316',pts:500,fireT:0,fireI:48,type:'boss',phase:0,phaseT:0,hitFlash:0});
      return;
    }
    // Regular enemies spawn on all waves (including boss waves as support)
    const t=w<3?0:Math.random()<.22?2:Math.random()<.35?1:0;
    const D=[
      {r:10,hp:18+w*8,spd:2.2+w*.15,col:'#1e3a5f',ec:'#60a5fa',pts:20,type:'fighter',fireT:0,fireI:75},
      {r:18,hp:70+w*20,spd:1+w*.06,col:'#3b1c1c',ec:'#f97316',pts:60,type:'heavy',fireT:0,fireI:100},
      {r:13,hp:30+w*10,spd:1.8+w*.1,col:'#1c3b2e',ec:'#4ade80',pts:40,type:'bomber',fireT:0,fireI:999,mineT:0,mineI:75},
    ][t];
    this.enemies.push({x,y,angle:0,...D,mxHp:D.hp,hitFlash:0,warpT:18});
    this._ring(x,y,D.ec,D.r*3,2);this._burst(x,y,D.ec,5,1.2);
  }
  // --- Combat ---
  _pfire(e,angleOffset=0){
    const dx=this.P.x-e.x,dy=this.P.y-e.y;
    const a=Math.atan2(dy,dx)+angleOffset;const spd=5+this.wave*.2;
    this.bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:4,life:80,enemy:true});
  }
  _bossCircle(e,n=8){
    for(let i=0;i<n;i++){const a=(Math.PI*2/n)*i;const spd=4;
    this.bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:5,life:90,enemy:true});}
    this._ring(e.x,e.y,'#f97316',60);this._shk(3);
  }
  _shoot(){
    const P=this.P;const dx=this.mouse.x-P.x,dy=this.mouse.y-P.y;
    const a=Math.atan2(dy,dx);const spd=15;
    const mk=(ang,dmg,r=5)=>this.bullets.push({x:P.x+Math.cos(a)*P.r,y:P.y+Math.sin(a)*P.r,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,r,life:55,dmg,enemy:false,px:P.x,py:P.y});
    if(P.weapon==='single'){mk(a,22,5);}
    else if(P.weapon==='twin'){mk(a-.12,16,4);mk(a+.12,16,4);}
    else if(P.weapon==='triple'){mk(a-.2,12,4);mk(a,14,5);mk(a+.2,12,4);}
    this.fl=7;this._shk(1.5);
  }

  update(){
    if(this.over){this.deathT++;return;}
    this.tick++;
    if(this.instrT>0)this.instrT--;else this.instrAlpha=Math.max(0,this.instrAlpha-0.004);
    // Shake decay
    if(this.shake.i>.15){this.shake.x=(Math.random()-.5)*this.shake.i;this.shake.y=(Math.random()-.5)*this.shake.i;this.shake.i*=.85;}else{this.shake.x=0;this.shake.y=0;this.shake.i=0;}
    // Boss warning
    if(this.bossWarning>0)this.bossWarning--;
    // Rings
    this.rings=this.rings.filter(r=>{r.r+=(r.maxR-r.r)*.13;r.life--;r.w=Math.max(.4,r.w*(r.life/r.max));return r.life>0;});
    // Trails
    this.trails=this.trails.filter(t=>{t.life--;t.r*=.96;return t.life>0;});
    // Combo timer
    if(this.comboT>0)this.comboT--;else if(this.combo>1)this.combo=1;
    const P=this.P;
    // Movement
    const spd=P.spd;const moving=this.keys['KeyW']||this.keys['KeyS']||this.keys['KeyA']||this.keys['KeyD']||this.keys['ArrowUp']||this.keys['ArrowDown']||this.keys['ArrowLeft']||this.keys['ArrowRight'];
    if(this.keys['KeyW']||this.keys['ArrowUp'])P.y-=spd;if(this.keys['KeyS']||this.keys['ArrowDown'])P.y+=spd;
    if(this.keys['KeyA']||this.keys['ArrowLeft'])P.x-=spd;if(this.keys['KeyD']||this.keys['ArrowRight'])P.x+=spd;
    P.x=Math.max(P.r,Math.min(this.W-P.r,P.x));P.y=Math.max(P.r,Math.min(this.H-P.r,P.y));
    P.angle=Math.atan2(this.mouse.y-P.y,this.mouse.x-P.x);
    if(P.inv>0)P.inv--;if(this.fl>0)this.fl--;
    // Engine trail particles
    if(moving&&this.tick%2===0){
      const ta=P.angle+Math.PI;this._trail(P.x+Math.cos(ta)*P.r*.6+(Math.random()-.5)*4,P.y+Math.sin(ta)*P.r*.6+(Math.random()-.5)*4,'#f97316',3+Math.random()*2);
    }
    // Shield
    if((this.keys['Space']||this.keys['KeyE'])&&P.shieldCd===0&&P.shield===0){P.shield=180;P.shieldCd=480;this._ring(P.x,P.y,'#22d3ee',40);this._shk(2);}
    if(P.shield>0)P.shield--;
    if(P.shieldCd>0)P.shieldCd--;
    // Fire
    if(this.mouse.down){if(++P.fireT>=P.fireI){this._shoot();P.fireT=0;}}
    // Bullet update
    this.bullets=this.bullets.filter(b=>{b.px=b.x;b.py=b.y;b.x+=b.vx;b.y+=b.vy;b.life--;return b.life>0&&b.x>-40&&b.x<this.W+40&&b.y>-40&&b.y<this.H+40;});
    // Spawning
    if(!this.waveClear){
      if(this.spawnCount<this.spawnMax){if(++this.spawnT>=this.spawnI){this._spawnEnemy();this.spawnCount++;this.spawnT=0;}}
      if(this.spawnCount>=this.spawnMax&&!this.enemies.length&&!this.mines.length){this.waveClear=true;this.waveT=0;}
    }else{
      if(++this.waveT>=this.waveI){this.wave++;this.waveClear=false;this._spawnWave();P.hp=Math.min(P.mxHp,P.hp+35);}
    }
    if(!this.enemies.length&&!this.waveClear&&this.spawnCount===0)this._spawnWave();
    // Enemy AI
    for(const e of this.enemies){
      if(e.hitFlash>0)e.hitFlash--;
      if(e.warpT>0)e.warpT--;
      const dx=P.x-e.x,dy=P.y-e.y,l=Math.hypot(dx,dy)||1;
      // Face the player
      const targetAngle=Math.atan2(dy,dx);
      let angleDiff=targetAngle-e.angle;
      while(angleDiff>Math.PI)angleDiff-=Math.PI*2;while(angleDiff<-Math.PI)angleDiff+=Math.PI*2;
      e.angle+=angleDiff*(e.boss?.04:.08);
      // Movement — fighters strafe, heavies charge, bombers orbit
      if(e.type==='fighter'){
        const strafe=Math.sin(this.tick*.035+e.x)*.7;
        e.x+=(dx/l)*e.spd+(-dy/l)*strafe;e.y+=(dy/l)*e.spd+(dx/l)*strafe;
      }else if(e.type==='heavy'){
        e.x+=(dx/l)*e.spd;e.y+=(dy/l)*e.spd;
      }else if(e.type==='bomber'){
        // Orbit at distance then drop mines
        if(l>120){e.x+=(dx/l)*e.spd;e.y+=(dy/l)*e.spd;}
        else{e.x+=(-dy/l)*e.spd*.8;e.y+=(dx/l)*e.spd*.8;}
        e.mineT=(e.mineT||0)+1;
        if(e.mineT>=(e.mineI||75)){e.mineT=0;this.mines.push({x:e.x,y:e.y,r:8,life:420,armed:60,pulse:0});}
      }else if(e.boss){
        // Boss phases: charge → circle attack → chase
        e.phaseT=(e.phaseT||0)+1;
        if(e.phaseT>200){e.phase=(e.phase+1)%3;e.phaseT=0;}
        if(e.phase===0){e.x+=(dx/l)*e.spd;e.y+=(dy/l)*e.spd;}
        else if(e.phase===1){e.x+=(-dy/l)*e.spd*1.2;e.y+=(dx/l)*e.spd*1.2;}
        else{e.x+=(dx/l)*e.spd*1.5;e.y+=(dy/l)*e.spd*1.5;}
      }
      // Keep enemies on screen
      e.x=Math.max(-e.r*2,Math.min(this.W+e.r*2,e.x));e.y=Math.max(-e.r*2,Math.min(this.H+e.r*2,e.y));
      // Enemy engine trails
      if(this.tick%3===0&&!e.boss){const ba=e.angle+Math.PI;this._trail(e.x+Math.cos(ba)*e.r*.5,e.y+Math.sin(ba)*e.r*.5,e.ec,2);}
      if(e.boss&&this.tick%2===0){const ba=e.angle+Math.PI;this._trail(e.x+Math.cos(ba)*e.r*.4+(Math.random()-.5)*8,e.y+Math.sin(ba)*e.r*.4+(Math.random()-.5)*8,'#f97316',4+Math.random()*3);}
      // Enemy fire
      if(++e.fireT>=e.fireI){
        if(e.boss){
          // Boss: aimed shot + circular burst on phase 1
          this._pfire(e);this._pfire(e,.3);this._pfire(e,-.3);
          if(e.phase===1&&e.phaseT%60<5)this._bossCircle(e,10+this.wave);
          e.fireT=0;
        }else{
          this._pfire(e);e.fireT=0;
        }
      }
      // Player-enemy body collision
      if(l<P.r+e.r&&P.shield===0&&P.inv===0){
        const bodyDmg=e.boss?25:e.type==='heavy'?15:8;
        P.hp-=bodyDmg;P.inv=25;this._shk(8);this._ring(P.x,P.y,'#ef4444',40);
        this._burst(P.x,P.y,'#ef4444',6);
        // Push player away
        P.x-=(dx/l)*20;P.y-=(dy/l)*20;
        P.x=Math.max(P.r,Math.min(this.W-P.r,P.x));P.y=Math.max(P.r,Math.min(this.H-P.r,P.y));
        if(P.hp<=0){this.over=true;if(!this._scoreSub){this._scoreSub=true;window.hubSubmitScore?.('space',this.score,{wave:this.wave,kills:this.kills});}this.deathT=0;this._burst(P.x,P.y,'#60a5fa',40,2.5);this._ring(P.x,P.y,'#3b82f6',100);this._ring(P.x,P.y,'#ef4444',70);this._shk(25);}
      }else if(l<P.r+e.r+22&&P.shield>0){
        // Shield pushes enemies
        e.x-=(dx/l)*15;e.y-=(dy/l)*15;
        this._burst((P.x+e.x)/2,(P.y+e.y)/2,'#22d3ee',4);
      }
    }
    // Mines
    for(const mn of this.mines){mn.life--;mn.pulse++;
      if(mn.armed>0){mn.armed--;}
      else if(Math.hypot(P.x-mn.x,P.y-mn.y)<mn.r+P.r+10){
        mn.life=0;this._burst(mn.x,mn.y,'#4ade80',16,1.8);this._ring(mn.x,mn.y,'#4ade80',50);this._shk(6);
        if(P.shield===0&&P.inv===0){P.hp-=28;P.inv=30;
          if(P.hp<=0){this.over=true;if(!this._scoreSub){this._scoreSub=true;window.hubSubmitScore?.('space',this.score,{wave:this.wave,kills:this.kills});}this.deathT=0;this._burst(P.x,P.y,'#60a5fa',40,2.5);this._ring(P.x,P.y,'#3b82f6',100);this._shk(25);}
        }
      }
    }
    this.mines=this.mines.filter(m=>m.life>0);
    // Player bullets vs enemies
    for(const b of this.bullets){
      if(b.enemy)continue;
      for(const e of this.enemies){
        if(Math.hypot(b.x-e.x,b.y-e.y)<b.r+e.r){
          e.hp-=(b.dmg||22);e.hitFlash=5;
          this._burst(b.x,b.y,'#f97316',5);this._shk(1);b.life=0;
          if(e.hp<=0){
            this._burst(e.x,e.y,e.boss?'#f97316':e.ec,e.boss?45:14,e.boss?2.5:1.5);
            this._ring(e.x,e.y,e.ec,e.boss?120:50);
            if(e.boss){this._ring(e.x,e.y,'#fbbf24',160,4);this._ring(e.x,e.y,'#f97316',90);this._shk(20);}else{this._shk(4);}
            this.combo=Math.min(12,this.combo+1);this.comboT=100;
            const pts=e.pts*this.combo;this.score+=pts;this.kills++;
            this._txt(e.x,e.y-20,`+${pts}${this.combo>1?' ×'+this.combo:''}`,e.boss?'#f97316':this.combo>3?'#fbbf24':'#22c55e');
            this._drop(e.x,e.y);
            if(e.boss){this.bossAlive=false;P.hp=Math.min(P.mxHp,P.hp+50);this._txt(e.x,e.y-50,'BOSS DEFEATED!','#f97316');}
          }
        }
      }
    }
    this.enemies=this.enemies.filter(e=>e.hp>0);
    // Enemy bullets vs player
    for(const b of this.bullets){
      if(!b.enemy)continue;
      const dl=Math.hypot(b.x-P.x,b.y-P.y);
      if(dl<b.r+P.r&&P.shield===0&&P.inv===0){
        P.hp-=10+this.wave*1.2;P.inv=20;b.life=0;this._shk(5);this._ring(P.x,P.y,'#ef4444',25);
        this._burst(b.x,b.y,'#ef4444',4);
        if(P.hp<=0){this.over=true;if(!this._scoreSub){this._scoreSub=true;window.hubSubmitScore?.('space',this.score,{wave:this.wave,kills:this.kills});}this.deathT=0;this._burst(P.x,P.y,'#60a5fa',40,2.5);this._ring(P.x,P.y,'#3b82f6',100);this._ring(P.x,P.y,'#ef4444',70);this._shk(25);}
      }else if(P.shield>0&&dl<b.r+P.r+22){b.life=0;this._burst(b.x,b.y,'#22d3ee',4);}
    }
    // Drops
    for(const d of this.drops){d.life--;d.bob+=.1;if(Math.hypot(P.x-d.x,P.y-d.y)<P.r+d.r){
      if(d.type==='hp'){P.hp=Math.min(P.mxHp,P.hp+50);this._txt(d.x,d.y-20,'+50 HP','#22c55e');}
      else if(d.type==='shield'){P.shieldCd=0;this._txt(d.x,d.y-20,'SHIELD!','#22d3ee');this._ring(d.x,d.y,'#22d3ee',35);}
      else if(d.type==='weapon'){const ws=['single','twin','triple'];const cur=ws.indexOf(P.weapon);P.weapon=ws[Math.min(2,cur+1)];P.fireI=P.weapon==='triple'?8:P.weapon==='twin'?6:10;this._txt(d.x,d.y-20,P.weapon.toUpperCase()+'!','#a855f7');this._ring(d.x,d.y,'#a855f7',40);}
      d.life=0;
    }}
    this.drops=this.drops.filter(d=>d.life>0);
    this.parts=this.parts.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=.93;p.vy*=.93;p.life--;return p.life>0;});
    this.txts=this.txts.filter(t=>{t.y-=.6;t.life--;return t.life>0;});
  }

  draw(){
    const c=this.ctx,W=this.W,H=this.H,P=this.P;
    c.save();c.translate(this.shake.x,this.shake.y);
    // Background
    c.fillStyle='#01010a';c.fillRect(-5,-5,W+10,H+10);
    // Nebula
    for(const n of this.nebula){c.globalAlpha=.3;ci(c,n.x,n.y,n.r,n.col);c.globalAlpha=1;}
    // Stars — parallax + twinkle
    for(const s of this.stars){
      const spd=[.08,.18,.32][s.layer];const offX=this.tick*spd;const offY=this.tick*spd*.3;
      const twinkle=.6+Math.sin(this.tick*.02+s.twinkle)*.4;
      c.globalAlpha=s.b*twinkle;c.fillStyle=s.layer===2?'#c7d2fe':'#fff';
      c.beginPath();c.arc((s.x+offX)%W,(s.y+offY)%H,s.r,0,Math.PI*2);c.fill();
    }c.globalAlpha=1;
    // Engine trails
    for(const t of this.trails){c.globalAlpha=(t.life/t.max)*.6;ci(c,t.x,t.y,t.r,t.col);}c.globalAlpha=1;
    // Explosion rings
    for(const r of this.rings){c.globalAlpha=(r.life/r.max)*.65;c.strokeStyle=r.col;c.lineWidth=r.w;c.beginPath();c.arc(r.x,r.y,r.r,0,Math.PI*2);c.stroke();}c.globalAlpha=1;
    // Mines
    for(const mn of this.mines){
      const armed=mn.armed<=0;const p=Math.sin(mn.pulse*.12)*.5+.5;
      // Danger radius
      if(armed){c.globalAlpha=.06+p*.04;c.strokeStyle='#4ade80';c.lineWidth=1;c.setLineDash([4,4]);c.beginPath();c.arc(mn.x,mn.y,mn.r+P.r+10,0,Math.PI*2);c.stroke();c.setLineDash([]);}
      c.globalAlpha=armed?.7+p*.3:.45;gl(c,'#4ade80',armed?12:4);ci(c,mn.x,mn.y,mn.r,'#052e16','#4ade80',2);
      if(armed){ci(c,mn.x,mn.y,3,'#4ade80');}
      ng(c);c.globalAlpha=1;
    }
    // Enemy bullets
    for(const b of this.bullets){if(!b.enemy)continue;c.globalAlpha=.85;gl(c,'#ef4444',10);ci(c,b.x,b.y,b.r,'#dc2626');ng(c);c.globalAlpha=1;}
    // Player bullets + trails
    gl(c,'#fde68a',14);
    for(const b of this.bullets){
      if(b.enemy)continue;
      // Bullet trail
      if(b.px!==undefined){c.globalAlpha=.25;c.strokeStyle='#fde68a';c.lineWidth=b.r*.5;c.beginPath();c.moveTo(b.px,b.py);c.lineTo(b.x,b.y);c.stroke();c.globalAlpha=1;}
      ci(c,b.x,b.y,b.r,'#fde68a');
    }ng(c);
    // Drops
    for(const d of this.drops){const yo=Math.sin(d.bob)*5;const dc2={hp:'#22c55e',shield:'#22d3ee',weapon:'#a855f7'}[d.type];gl(c,dc2,16);ci(c,d.x,d.y+yo,d.r,dc2+'33',dc2,2);c.font='12px sans-serif';c.textAlign='center';c.fillText({hp:'♥',shield:'🛡',weapon:'★'}[d.type],d.x,d.y+yo+5);c.textAlign='left';ng(c);}
    // Particles
    for(const p of this.parts){c.globalAlpha=p.life/p.max;ci(c,p.x,p.y,p.r,p.col);}c.globalAlpha=1;
    // === Enemies ===
    for(const e of this.enemies){
      c.save();c.translate(e.x,e.y);c.rotate(e.angle+Math.PI/2);
      const flash=e.hitFlash>0;
      if(e.boss){
        // Boss ship — large, detailed
        gl(c,flash?'#fff':'#f97316',24+Math.sin(this.tick*.04)*8);
        c.fillStyle=flash?'#fff':'#450a0a';c.beginPath();
        c.moveTo(0,-e.r);c.lineTo(e.r*.8,e.r*.5);c.lineTo(e.r*.4,e.r*.2);c.lineTo(0,e.r*.7);c.lineTo(-e.r*.4,e.r*.2);c.lineTo(-e.r*.8,e.r*.5);c.closePath();c.fill();
        c.strokeStyle=flash?'#fff':'#f97316';c.lineWidth=2.5;c.stroke();
        // Core
        ci(c,0,0,e.r*.3,flash?'#fff':'#f97316');
        // Wing details
        c.strokeStyle='#b91c1c';c.lineWidth=1.5;c.beginPath();c.moveTo(-e.r*.6,e.r*.3);c.lineTo(0,-e.r*.4);c.lineTo(e.r*.6,e.r*.3);c.stroke();
        ng(c);
      }else{
        // Regular enemies
        const col=flash?'#fff':e.col;const ec=flash?'#fff':e.ec;
        c.fillStyle=col;c.beginPath();c.moveTo(0,-e.r);c.lineTo(e.r*.6,e.r*.6);c.lineTo(0,e.r*.2);c.lineTo(-e.r*.6,e.r*.6);c.closePath();c.fill();
        if(e.type==='heavy'){
          // Heavy has wider hull
          c.fillStyle=col;c.beginPath();c.moveTo(-e.r*.7,e.r*.3);c.lineTo(-e.r*.9,e.r*.5);c.lineTo(-e.r*.4,e.r*.5);c.closePath();c.fill();
          c.beginPath();c.moveTo(e.r*.7,e.r*.3);c.lineTo(e.r*.9,e.r*.5);c.lineTo(e.r*.4,e.r*.5);c.closePath();c.fill();
        }
        gl(c,ec,10);ci(c,0,0,e.r*.35,ec);ng(c);
      }
      c.restore();
      // Warp-in shimmer (first 18 frames after spawn)
      if(e.warpT>0){const wt=e.warpT/18;c.globalAlpha=wt*.7;gl(c,e.ec,25*wt);c.strokeStyle=e.ec;c.lineWidth=2.5;c.setLineDash([5,5]);c.beginPath();c.arc(e.x,e.y,e.r*1.4,0,Math.PI*2);c.stroke();c.setLineDash([]);ng(c);c.globalAlpha=1;}
      // HP bar
      hb(c,e.x-e.r,e.y-e.r-10,e.r*2,4,e.hp/e.mxHp,'#22c55e','#ef4444');
      if(e.boss){c.fillStyle='#f97316';c.font='bold 9px Orbitron,monospace';c.textAlign='center';c.fillText(`BOSS · ${Math.ceil(e.hp)}`,e.x,e.y-e.r-16);c.textAlign='left';}
    }
    // === Player ship ===
    const fl2=P.inv>0&&Math.floor(P.inv/4)%2===0;
    if(!this.over&&!fl2){
      c.save();c.translate(P.x,P.y);c.rotate(P.angle+Math.PI/2);
      // Thrust flames
      if(this.keys['KeyW']||this.keys['KeyS']||this.keys['KeyA']||this.keys['KeyD']||this.keys['ArrowUp']||this.keys['ArrowDown']||this.keys['ArrowLeft']||this.keys['ArrowRight']){
        gl(c,'#f97316',20);const tl=10+Math.random()*10;
        c.fillStyle='rgba(251,146,60,.75)';c.beginPath();c.moveTo(-5,12);c.lineTo(0,12+tl);c.lineTo(5,12);c.closePath();c.fill();
        c.fillStyle='rgba(253,224,71,.5)';c.beginPath();c.moveTo(-3,12);c.lineTo(0,12+tl*.6);c.lineTo(3,12);c.closePath();c.fill();
        ng(c);
      }
      // Ship body
      gl(c,'#3b82f6',20);c.fillStyle='#1e3a8a';c.beginPath();c.moveTo(0,-P.r);c.lineTo(P.r*.7,P.r*.6);c.lineTo(P.r*.3,P.r*.25);c.lineTo(-P.r*.3,P.r*.25);c.lineTo(-P.r*.7,P.r*.6);c.closePath();c.fill();
      c.strokeStyle='#60a5fa';c.lineWidth=1.5;c.stroke();
      // Cockpit
      c.fillStyle='#7dd3fc';c.beginPath();c.ellipse(0,-P.r*.25,P.r*.3,P.r*.18,0,0,Math.PI*2);c.fill();
      c.fillStyle='rgba(186,230,253,.4)';c.beginPath();c.ellipse(-P.r*.1,-P.r*.32,P.r*.1,P.r*.07,0,0,Math.PI*2);c.fill();
      ng(c);
      // Wing stripes
      c.strokeStyle='#1d4ed8';c.lineWidth=1;c.beginPath();c.moveTo(0,-P.r*.5);c.lineTo(P.r*.5,P.r*.4);c.moveTo(0,-P.r*.5);c.lineTo(-P.r*.5,P.r*.4);c.stroke();
      // Muzzle flash
      if(this.fl>0){
        const fi=this.fl/7;
        gl(c,'#fde68a',20+this.fl*3);c.globalAlpha=fi*.7;
        ci(c,0,-P.r-4,this.fl*1.2,'rgba(253,230,138,.8)');
        c.globalAlpha=fi*.3;
        c.fillStyle='rgba(253,230,138,.2)';c.beginPath();c.moveTo(-4,-P.r);c.lineTo(0,-P.r-20-this.fl*4);c.lineTo(4,-P.r);c.closePath();c.fill();
        c.globalAlpha=1;ng(c);
      }
      c.restore();
      // Shield bubble
      if(P.shield>0){
        const sa=P.shield/180;
        gl(c,'#22d3ee',22);c.globalAlpha=sa*.4;
        c.strokeStyle='#22d3ee';c.lineWidth=3;c.beginPath();c.arc(P.x,P.y,P.r+20,0,Math.PI*2);c.stroke();
        // Hex segments
        c.lineWidth=1.5;for(let i=0;i<6;i++){const a=(Math.PI*2/6)*i+this.tick*.01;const x2=P.x+Math.cos(a)*(P.r+20),y2=P.y+Math.sin(a)*(P.r+20);ci(c,x2,y2,3,'rgba(34,211,238,.6)');}
        c.globalAlpha=1;ng(c);
      }
    }
    // Float texts
    for(const t of this.txts){c.globalAlpha=t.life/t.max;gl(c,t.col,8);ft(c,t.x,t.y,t.t,t.col,12);ng(c);}c.globalAlpha=1;
    // === HUD ===
    bx(c,10,10,262,90,'rgba(1,1,14,.92)',10);
    gl(c,'#3b82f6',8);c.font='bold 22px Orbitron,monospace';c.fillStyle='#fff';c.fillText(`${this.score}`,20,38);ng(c);
    c.fillStyle='#374151';c.font='11px Inter,sans-serif';c.fillText(`WAVE ${this.wave}  ·  KILLS ${this.kills}`,20,57);
    hb(c,20,66,165,8,P.hp/P.mxHp,'#22c55e','#ef4444');
    c.fillStyle='#6b7280';c.font='9px Inter,sans-serif';c.fillText(`HP ${Math.ceil(P.hp)}/${P.mxHp}`,195,75);
    // Combo display
    if(this.combo>1){c.fillStyle='#fbbf24';c.font='bold 13px Orbitron,monospace';c.textAlign='right';c.fillText(`×${this.combo} COMBO`,W-14,28);c.textAlign='left';}
    // Weapon indicator
    const wCols={single:'#9ca3af',twin:'#a78bfa',triple:'#f472b6'};
    bx(c,W-165,10,155,36,'rgba(1,1,14,.92)',8);
    c.fillStyle=wCols[P.weapon];c.font='bold 12px Orbitron,monospace';c.textAlign='right';c.fillText({single:'◉ SINGLE',twin:'◉◉ TWIN',triple:'◉◉◉ TRIPLE'}[P.weapon],W-14,31);c.textAlign='left';
    // Shield bar
    if(P.shieldCd>0){hb(c,20,H-50,165,8,1-P.shieldCd/480,'#22d3ee','#0e7490');c.fillStyle='#22d3ee';c.font='9px Inter,sans-serif';c.fillText('SHIELD CD',20,H-54);}
    else{bx(c,20,H-50,165,8,'rgba(34,211,238,.2)',2);c.fillStyle='#22d3ee';c.font='9px Inter,sans-serif';c.fillText('SHIELD READY [E/Space]',20,H-54);}
    // Boss warning banner
    if(this.bossWarning>0){
      const bw=this.bossWarning/120;
      c.globalAlpha=Math.min(1,bw*2);
      c.fillStyle=`rgba(127,29,29,${.3+Math.sin(this.tick*.15)*.15})`;c.fillRect(0,H/2-40,W,80);
      c.fillStyle='#f97316';c.font='bold 28px Orbitron,monospace';c.textAlign='center';
      c.fillText('⚠ WARNING — BOSS INCOMING ⚠',W/2,H/2+8);c.textAlign='left';
      c.globalAlpha=1;
    }
    // Wave clear banner
    if(this.waveClear&&!this.bossWarning){
      const t=this.waveT/this.waveI;
      c.globalAlpha=Math.max(0,.9-t*.6);
      c.fillStyle='#22d3ee';c.font='bold 26px Orbitron,monospace';c.textAlign='center';
      c.fillText(`⚡ WAVE ${this.wave} CLEAR`,W/2,H/2-8);
      c.font='13px Inter,sans-serif';c.fillStyle='#6b7280';
      c.fillText(`next wave in ${Math.ceil((this.waveI-this.waveT)/60)}s`,W/2,H/2+18);
      c.textAlign='left';c.globalAlpha=1;
    }
    // Instructions
    if(this.instrAlpha>0.01){c.globalAlpha=this.instrAlpha*0.42;c.fillStyle='#6b7280';c.font='9px Inter,sans-serif';c.fillText('WASD move · Mouse aim · Click fire · E shield · pick up drops',20,H-12);c.globalAlpha=1;}
    // Damage vignette
    if(P.hp<P.mxHp*.3&&!this.over){const pulse=Math.sin(this.tick*.07)*.5+.5;const v=c.createRadialGradient(W/2,H/2,H*.15,W/2,H/2,H*.6);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,`rgba(185,28,28,${.1+pulse*.08})`);c.fillStyle=v;c.fillRect(0,0,W,H);}
    // === Game over sequence ===
    if(this.over){
      const dt=Math.min(1,this.deathT/60);
      c.fillStyle=`rgba(0,0,0,${dt*.85})`;c.fillRect(-5,-5,W+10,H+10);
      if(dt>.3){
        const sa=Math.min(1,(dt-.3)/.4);
        c.globalAlpha=sa;gl(c,'#3b82f6',28);ft(c,W/2,H/2-25,'SHIP DESTROYED','#3b82f6',44);ng(c);
        ft(c,W/2,H/2+20,`SCORE: ${this.score}   WAVE: ${this.wave}   KILLS: ${this.kills}`,'#d1d5db',16);
        if(this.combo>1)ft(c,W/2,H/2+46,`BEST COMBO: ×${this.combo}`,'#fbbf24',13);
        c.globalAlpha=1;
      }
      if(dt>.7){ft(c,W/2,H/2+75,'click to restart','#374151',13);}
    }
    c.restore();
  }
  start(){const l=()=>{this.update();this.draw();raf=requestAnimationFrame(l);};l();}
}

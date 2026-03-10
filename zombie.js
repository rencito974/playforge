class ZombieGame{
  constructor(cv){
    this.cv=cv;this.ctx=cv.getContext('2d');this.W=cv.width;this.H=cv.height;
    this.keys={};this.mouse={x:this.W/2,y:this.H/2,down:false};
    this.P={x:this.W/2,y:this.H/2,r:15,spd:3.4,hp:100,mxHp:100,angle:0,inv:0,ammo:30,mxAmmo:30,rld:0,rldT:90,xp:0,lvl:1,xpNext:100,weapon:'pistol'};
    this.bullets=[];this.zoms=[];this.parts=[];this.txts=[];this.pups=[];this.decals=[];
    this.rings=[];this.casings=[];this.dust=[];this.chunks=[];
    this.turrets=[];this.chainArcs=[];this.vampParts=[];this.sniperFlash=null;
    // New ability state
    this.novaRings=[];this.shockwaves=[];this.soulOrbs=[];
    this.shockwaveT=0;this.phaseT=0;this.phaseCd=0;
    this.soulsCollected=0;this.auraRot=0;
    this.score=0;this.combo=1;this.comboT=0;this.wave=1;
    this.sc=0;this.sm=8;this.st=0;this.si=80;this.wt=0;this.wc=220;
    this.over=false;this.scd=0;this.sr=10;this.fl=0;this.flAngle=0;
    this.paused=false;this.levelChoices=null;this.showHub=false;this.hubT=0;
    this.abilities={dmg:1,fireRate:1,move:1,pickup:0,bulletPierce:0,
      shotgunUnlocked:false,smgUnlocked:false,sniperUnlocked:false,
      aura:false,regen:false,explosive:false,
      vampiric:false,frenzy:false,chain:false,turret:false,
      cryo:false,nova:false,shockwave:false,phase:false,mark:false,harvest:false};
    this.abilityLevels={};this.pickupRadiusBonus=0;
    this.bulletBaseDmg=25;this.shotgunCd=0;this.smgCd=0;
    this.frenzySt=0;this.frenzyT=0;
    this.obs=[[180,185],[620,165],[145,415],[655,415],[400,295],[240,505],[555,510],[380,150],[380,455]].map(([x,y])=>({x,y,r:18,t:Math.random()<.5?0:1}));
    this.instrAlpha=1.0;this.instrT=300;
    this.shake={x:0,y:0,i:0};this.walkT=0;this.lowHpPulse=0;this.tick=0;this.moving=false;
    this.streakKills=0;this.streakT=0;this.waveIntro=0;this.waveIntroWave=0;
    this.bossSpawnT=0;this.hitSparks=[];
    this._scoreSub=false;
    // ── Multiplayer state ──
    this.lobby=typeof Peer!=='undefined'?'menu':'playing';
    this.mpMode=null;this.mpPeer=null;this.mpConns={};
    this.mpPlayers={};this.mpRoomCode='';this.mpJoinCode='';
    this.mpStatus='';this.mpError='';this.mpSyncT=0;
    this.mpColors=['#ef4444','#3b82f6','#22c55e','#f97316'];
    this.mpMyColor=this.mpColors[0];this._lbBtns=[];
    this.embers=[];
    for(let i=0;i<25;i++)this.embers.push({x:Math.random()*this.W,y:Math.random()*this.H,vx:(Math.random()-.5)*.3,vy:-Math.random()*.35-.1,r:Math.random()*1.8+.4,a:Math.random(),phase:Math.random()*6.28});
    this._bind();
  }

  _bind(){
    this._k=e=>{
      this.keys[e.code]=e.type==='keydown';
      if(e.type==='keydown'){
        // Lobby join-code text entry
        if(this.lobby==='joining'){
          if(e.code==='Backspace'){this.mpJoinCode=this.mpJoinCode.slice(0,-1);e.preventDefault();}
          else if(e.code==='Enter'&&this.mpJoinCode.length>=4){this._mpClientSetup(this.mpJoinCode);}
          else if(e.key.length===1&&/[A-Za-z0-9]/.test(e.key)&&this.mpJoinCode.length<4){this.mpJoinCode+=e.key.toUpperCase();}
          return;
        }
        if(this.lobby!=='playing')return;
        const P=this.P;
        if(e.code==='Digit1')this._sw('pistol');
        else if(e.code==='Digit2'&&this.abilities.shotgunUnlocked)this._sw('shotgun');
        else if(e.code==='Digit3'&&this.abilities.smgUnlocked)this._sw('smg');
        else if(e.code==='Digit4'&&this.abilities.sniperUnlocked)this._sw('sniper');
        else if(e.code==='KeyF'&&this.abilities.turret)this._placeTurret();
        else if(e.code==='KeyQ'&&this.abilities.phase&&this.phaseCd===0){
          this.phaseT=120;this.phaseCd=720;
          this._ring(P.x,P.y,'#22d3ee',70);this._ring(P.x,P.y,'#7dd3fc',100);
          this._burst(P.x,P.y,'#22d3ee',12,2);this._shk(4);
          this._txt(P.x,P.y-35,'PHASE SHIFT!','#22d3ee');}
        else if(e.code==='KeyR'&&!P.rld&&P.ammo<P.mxAmmo){P.rld=P.rldT;this._txt(P.x,P.y-30,'RELOADING…','#fbbf24');}
        else if(e.code==='Escape'){if(document.pointerLockElement===this.cv)document.exitPointerLock();}
      }
    };
    // Mouse move — use movementX/Y when locked so cursor stays inside canvas
    this._m=e=>{
      if(document.pointerLockElement===this.cv){
        this.mouse.x=Math.max(0,Math.min(this.W,this.mouse.x+(e.movementX||0)));
        this.mouse.y=Math.max(0,Math.min(this.H,this.mouse.y+(e.movementY||0)));
      }else{const r=this.cv.getBoundingClientRect();this.mouse.x=e.clientX-r.left;this.mouse.y=e.clientY-r.top;}
    };
    // Click — lobby gets priority; pointer lock handled only in playing mode
    this._d=e=>{
      if(e.button!==0)return;
      if(this.lobby!=='playing'){
        const r=this.cv.getBoundingClientRect();
        this._handleLobbyClick(e.clientX-r.left,e.clientY-r.top);
        return;
      }
      const locked=document.pointerLockElement===this.cv;
      if(!locked){this.cv.requestPointerLock();}
      const mx=this.mouse.x,my=this.mouse.y;
      if(this.over){this._rst();return;}
      if(!locked)return; // absorb first click that locks
      if(this.levelChoices){this._handleLvlClick(mx,my);return;}
      if(this.showHub){this.showHub=false;return;}
      this.mouse.down=true;
    };
    this._u=e=>{if(e.button===0)this.mouse.down=false;};
    // Release mouse.down whenever pointer lock is released
    this._ptlock=()=>{if(document.pointerLockElement!==this.cv)this.mouse.down=false;};
    window.addEventListener('keydown',this._k);window.addEventListener('keyup',this._k);
    this.cv.addEventListener('mousemove',this._m);this.cv.addEventListener('mousedown',this._d);this.cv.addEventListener('mouseup',this._u);
    document.addEventListener('pointerlockchange',this._ptlock);
    this.cv.style.cursor='none'; // hide system cursor — we draw our own crosshair
  }
  destroy(){
    window.removeEventListener('keydown',this._k);window.removeEventListener('keyup',this._k);
    this.cv.removeEventListener('mousemove',this._m);this.cv.removeEventListener('mousedown',this._d);this.cv.removeEventListener('mouseup',this._u);
    document.removeEventListener('pointerlockchange',this._ptlock);
    if(document.pointerLockElement===this.cv)document.exitPointerLock();
    this.cv.style.cursor='';
    this._mpDestroy();
  }
  _sw(w){
    const cfg={pistol:{ammo:30,mxAmmo:30,rldT:90,sr:10},shotgun:{ammo:8,mxAmmo:8,rldT:130,sr:45},smg:{ammo:60,mxAmmo:60,rldT:65,sr:4},sniper:{ammo:5,mxAmmo:5,rldT:130,sr:30}};
    const c=cfg[w];if(!c)return;
    const P=this.P;P.weapon=w;P.mxAmmo=c.mxAmmo;P.ammo=c.ammo;P.rldT=c.rldT;P.rld=0;this.sr=c.sr;this.scd=c.sr;
    this._txt(P.x,P.y-30,w.toUpperCase(),'#9ca3af');
  }
  _rst(){
    this._scoreSub=false;
    Object.assign(this.P,{x:this.W/2,y:this.H/2,hp:100,mxHp:100,inv:0,ammo:30,mxAmmo:30,rld:0,xp:0,lvl:1,xpNext:100,weapon:'pistol',spd:3.4});
    this.bullets=[];this.zoms=[];this.parts=[];this.txts=[];this.pups=[];this.decals=[];
    this.rings=[];this.casings=[];this.dust=[];this.chunks=[];
    this.turrets=[];this.chainArcs=[];this.vampParts=[];this.sniperFlash=null;
    this.novaRings=[];this.shockwaves=[];this.soulOrbs=[];
    this.shockwaveT=0;this.phaseT=0;this.phaseCd=0;this.soulsCollected=0;this.auraRot=0;
    this.score=0;this.combo=1;this.comboT=0;this.wave=1;this.sc=0;this.sm=8;this.st=0;this.si=80;this.wt=0;
    this.over=false;this.paused=false;this.levelChoices=null;this.showHub=false;this.hubT=0;
    this.abilities={dmg:1,fireRate:1,move:1,pickup:0,bulletPierce:0,shotgunUnlocked:false,smgUnlocked:false,sniperUnlocked:false,aura:false,regen:false,explosive:false,vampiric:false,frenzy:false,chain:false,turret:false,cryo:false,nova:false,shockwave:false,phase:false,mark:false,harvest:false};
    this.abilityLevels={};this.pickupRadiusBonus=0;this.shotgunCd=0;this.smgCd=0;this.sr=10;
    this.frenzySt=0;this.frenzyT=0;
    this.instrAlpha=1.0;this.instrT=300;this.fl=0;this.flAngle=0;
    this.shake={x:0,y:0,i:0};this.walkT=0;this.lowHpPulse=0;this.tick=0;this.moving=false;
    this.streakKills=0;this.streakT=0;this.waveIntro=0;this.waveIntroWave=0;
    this.bossSpawnT=0;this.hitSparks=[];
    this.embers=[];
    for(let i=0;i<25;i++)this.embers.push({x:Math.random()*this.W,y:Math.random()*this.H,vx:(Math.random()-.5)*.3,vy:-Math.random()*.35-.1,r:Math.random()*1.8+.4,a:Math.random(),phase:Math.random()*6.28});
  }

  // ── Effect helpers ──
  _shk(i){this.shake.i=Math.max(this.shake.i,i);}
  _ring(x,y,col,maxR=55,w=3){this.rings.push({x,y,r:4,maxR,col,life:28,max:28,w});}
  _casing(x,y,angle){const s=angle+Math.PI/2+(Math.random()-.5)*.4;this.casings.push({x,y,vx:Math.cos(s)*(2+Math.random()*2),vy:Math.sin(s)*(2+Math.random()*2)-1.5,rot:0,rv:(Math.random()-.5)*.3,life:45});}
  _dustPuff(x,y){for(let i=0;i<3;i++)this.dust.push({x:x+(Math.random()-.5)*8,y:y+this.P.r-2,vx:(Math.random()-.5)*.6,vy:-Math.random()*.5-.2,r:Math.random()*3+1.5,life:22,max:22});}
  _goreChunks(x,y,col,n=5){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=Math.random()*4+2;this.chunks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:Math.random()*5+3,life:50,max:50,col,rot:Math.random()*6.28,rv:(Math.random()-.5)*.2});}}
  _burst(x,y,col,n=8,sp=1){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=(Math.random()*3+1)*sp;this.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:Math.random()*4+2,life:Math.random()*20+20,max:40,col});}}
  _bloodSplat(x,y,fromAngle,n=6){for(let i=0;i<n;i++){const spread=(Math.random()-.5)*1.2;const a=fromAngle+Math.PI+spread;const s=Math.random()*4+2;this.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:Math.random()*4+2,life:28+Math.random()*15,max:45,col:Math.random()<.5?'#7f1d1d':'#991b1b'});}}
  _txt(x,y,t,col){this.txts.push({x,y,t,col,life:65,max:65,scale:1.4});}
  _pu(x,y){if(Math.random()>.78)this.pups.push({x,y,type:Math.random()<.5?'hp':'ammo',life:300,bob:0,r:12});}
  _stars(n){let s='';for(let i=0;i<3;i++)s+=i<n?'★':'☆';return s;}
  // Word-wrap helper: draws text and returns final y
  _wrapText(c,text,x,y,maxW,lineH){
    const words=text.split(' ');let line='',ly=y;
    for(const w of words){const t=line?line+' '+w:w;if(c.measureText(t).width>maxW&&line){c.fillText(line,x,ly);line=w;ly+=lineH;}else line=t;}
    if(line)c.fillText(line,x,ly);return ly;
  }
  // Jagged lightning between two points
  _lightning(c,x1,y1,x2,y2,segs=6,spread=14){
    const dx=x2-x1,dy=y2-y1;c.beginPath();c.moveTo(x1,y1);
    for(let i=1;i<segs;i++){const t=i/segs;c.lineTo(x1+dx*t+(Math.random()-.5)*spread,y1+dy*t+(Math.random()-.5)*spread);}
    c.lineTo(x2,y2);c.stroke();}
  _placeTurret(){
    if(this.turrets.length>=2){const old=this.turrets.shift();this._ring(old.x,old.y,'#6b7280',30);}
    this.turrets.push({x:this.mouse.x,y:this.mouse.y,hp:220,mxHp:220,fireT:0,fireI:22,angle:0,r:14,fl:0});
    this._ring(this.mouse.x,this.mouse.y,'#22c55e',50);this._ring(this.mouse.x,this.mouse.y,'#4ade80',80);
    this._txt(this.mouse.x,this.mouse.y-30,'TURRET DEPLOYED','#22c55e');this._shk(3);
  }
  _doShockwave(){
    const P=this.P;const al=this.abilityLevels['shockwave']||1;
    const pushR=140+al*25;const dmg=18+al*10;
    this.shockwaves.push({x:P.x,y:P.y,r:P.r,maxR:pushR,life:40,max:40});
    this._ring(P.x,P.y,'#22d3ee',pushR,4);this._ring(P.x,P.y,'#7dd3fc',pushR*.6,2);
    this._burst(P.x,P.y,'#22d3ee',16,2.2);this._shk(7);
    this._txt(P.x,P.y-35,'SHOCKWAVE','#22d3ee');
    for(const z of this.zoms){
      const dx=z.x-P.x,dy=z.y-P.y,l=Math.hypot(dx,dy)||1;
      if(l<pushR){const f=1-l/pushR;z.hp-=dmg*f;z.hitFlash=8;z.x+=(dx/l)*65*f;z.y+=(dy/l)*65*f;}}
  }

  _spawn(){
    const s=Math.random()*4|0;let x,y;
    if(s===0){x=Math.random()*this.W;y=-32;}else if(s===1){x=this.W+32;y=Math.random()*this.H;}else if(s===2){x=Math.random()*this.W;y=this.H+32;}else{x=-32;y=Math.random()*this.H;}
    const isBoss=this.wave%5===0&&this.sc===this.sm-1;
    const t=isBoss?3:Math.random()<.12&&this.wave>3?2:Math.random()<.2&&this.wave>1?1:0;
    const D=[
      {r:14,hp:30+this.wave*12,spd:.9+this.wave*.12,col:'#166534',ec:'#dc2626',pts:10,dmg:1.5},
      {r:11,hp:15+this.wave*6,spd:2+this.wave*.18,col:'#854d0e',ec:'#fbbf24',pts:25,dmg:1},
      {r:21,hp:80+this.wave*25,spd:.55+this.wave*.06,col:'#1e3a5f',ec:'#60a5fa',pts:50,dmg:2.5},
      {r:34,hp:350+this.wave*45,spd:.4+this.wave*.04,col:'#450a0a',ec:'#f97316',pts:500,dmg:4,boss:true}
    ][t];
    this.zoms.push({x,y,t,w:Math.random()*100,...D,mxHp:D.hp,hitFlash:0,cryoT:0,markT:0});
    if(isBoss){this.bossSpawnT=90;this._shk(15);this._ring(this.W/2,this.H/2,'#f97316',220,5);this._ring(this.W/2,this.H/2,'#ef4444',300,3);this._burst(x,y,'#f97316',25,2.2);this._burst(x,y,'#fbbf24',12,3);}
  }

  _shoot(){
    const P=this.P;if(P.ammo<=0||P.rld)return;
    const ang=Math.atan2(this.mouse.y-P.y,this.mouse.x-P.x);this.flAngle=ang;
    const mk=(a,spd=13,r=5,dmgMul=1,life=70,pierce=this.abilities.bulletPierce)=>
      this.bullets.push({x:P.x+Math.cos(a)*P.r,y:P.y+Math.sin(a)*P.r,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r,life,pierce,dmg:dmgMul,px:P.x,py:P.y,cryo:this.abilities.cryo,mark:this.abilities.mark});
    if(P.weapon==='shotgun'){
      if(this.shotgunCd>0)return;
      P.ammo--;this.fl=14;this._shk(7);
      const lvl=this.abilityLevels['shotgun']||1,pellets=3+Math.min(4,lvl);
      for(let i=0;i<pellets;i++)mk(ang+(i-(pellets-1)/2)*0.18,14,4,0.85,55);
      this.shotgunCd=45;for(let i=0;i<3;i++)this._casing(P.x,P.y,ang);
      if(P.ammo<=0){P.rld=P.rldT;this._txt(P.x,P.y-30,'RELOADING…','#fbbf24');}
    }else if(P.weapon==='smg'){
      if(this.smgCd>0)return;
      P.ammo--;this.fl=5;this._shk(1.5);
      mk(ang+(Math.random()-.5)*0.1,15,3,0.4,55);this.smgCd=4;
      if(Math.random()<.4)this._casing(P.x,P.y,ang);
      if(P.ammo<=0){P.rld=P.rldT;this._txt(P.x,P.y-30,'RELOADING…','#fbbf24');}
    }else if(P.weapon==='sniper'){
      P.ammo--;this.fl=20;this._shk(9);
      this.bullets.push({x:P.x+Math.cos(ang)*P.r,y:P.y+Math.sin(ang)*P.r,vx:Math.cos(ang)*25,vy:Math.sin(ang)*25,r:3,life:95,pierce:Math.max(3,this.abilities.bulletPierce),dmg:2.8,px:P.x,py:P.y,sniper:true,cryo:this.abilities.cryo,mark:this.abilities.mark});
      this._casing(P.x,P.y,ang);this._casing(P.x,P.y,ang);this.sniperFlash={angle:ang,life:9};
      if(P.ammo<=0){P.rld=P.rldT;this._txt(P.x,P.y-30,'RELOADING…','#fbbf24');}
    }else{
      P.ammo--;this.fl=9;this._shk(2.5);mk(ang);this._casing(P.x,P.y,ang);
      if(P.ammo<=0){P.rld=P.rldT;this._txt(P.x,P.y-30,'RELOADING…','#fbbf24');}
    }
  }

  _lvlup(){
    const P=this.P;P.lvl++;P.xp=0;P.xpNext=Math.floor(P.xpNext*1.6);
    this.paused=true;this.mouse.down=false;
    this._shk(10);this._ring(P.x,P.y,'#fbbf24',100);this._ring(P.x,P.y,'#a855f7',140);
    const all=[
      {id:'dmg',name:'Hollow Points',icon:'💥',desc:'+35% bullet damage'},
      {id:'fire',name:'Trigger Boost',icon:'⚡',desc:'Fire rate & reload speed up'},
      {id:'move',name:'Combat Sprint',icon:'👟',desc:'Speed +12% & max HP +18'},
      {id:'pickup',name:'Magnet Gloves',icon:'🧲',desc:'Doubles pickup radius'},
      {id:'shotgun',name:'Shotgun',icon:'🔫',desc:'Unlock pump shotgun [key 2]'},
      {id:'smg',name:'SMG',icon:'💨',desc:'Unlock rapid-fire SMG [key 3]'},
      {id:'sniper',name:'Sniper Rifle',icon:'🔭',desc:'Unlock piercing sniper [key 4]'},
      {id:'pierce',name:'Piercing Rounds',icon:'🔩',desc:'Bullets pierce extra zombies'},
      {id:'aura',name:'Static Field',icon:'⚡',desc:'Zap aura continuously damages nearby zombies'},
      {id:'regen',name:'Field Medic',icon:'💊',desc:'Slowly regenerate HP over time'},
      {id:'explosive',name:'Explosive Rounds',icon:'💣',desc:'Bullets explode on every impact'},
      {id:'vampiric',name:'Vampiric Rounds',icon:'🩸',desc:'12% of damage dealt heals you'},
      {id:'frenzy',name:'Kill Frenzy',icon:'🔥',desc:'Each kill stacks speed & fire rate (max 5)'},
      {id:'chain',name:'Chain Shot',icon:'🔗',desc:'Bullets arc chain to nearby zombies'},
      {id:'turret',name:'Auto Turret',icon:'🤖',desc:'Press F to deploy a turret (max 2)'},
      {id:'cryo',name:'Cryo Rounds',icon:'🧊',desc:'Bullets freeze & slow zombies 45%'},
      {id:'nova',name:'Death Nova',icon:'✨',desc:'Kills explode outward — damaging nearby zombies'},
      {id:'shockwave',name:'Static Surge',icon:'🌊',desc:'Auto radial shockwave pushes & damages every 8s'},
      {id:'phase',name:'Phase Shift',icon:'💠',desc:'Press Q: 2s full invincibility (12s cooldown)'},
      {id:'mark',name:'Hunter\'s Mark',icon:'🏹',desc:'Bullets mark targets for +30% damage received'},
      {id:'harvest',name:'Soul Harvest',icon:'☠️',desc:'Each kill permanently raises bullet damage'},
    ];
    const choices=[];const used=new Set();
    while(choices.length<3&&used.size<all.length){const i=Math.random()*all.length|0;if(!used.has(i)){used.add(i);choices.push({...all[i]});}}
    this.levelChoices=choices;
    this._txt(P.x,P.y-40,'LEVEL UP!','#fbbf24');this._burst(P.x,P.y,'#fbbf24',25,2.5);this._burst(P.x,P.y,'#a855f7',15,1.8);
  }

  _applyUpgrade(id){
    const P=this.P;
    const prev=this.abilityLevels[id]||0;this.abilityLevels[id]=prev+1;
    const lvl=this.abilityLevels[id];const sc=lvl===1?1.0:lvl===2?1.7:2.5;
    if(id==='dmg'){this.abilities.dmg=1+0.35*sc;P.hp=Math.min(P.mxHp,P.hp+20+lvl*5);}
    else if(id==='fire'){this.abilities.fireRate*=0.86;this.sr=Math.max(3,this.sr-1);P.rldT=Math.max(45,P.rldT-8);}
    else if(id==='move'){P.spd=Math.min(6.5,P.spd+0.28*sc);P.mxHp=Math.min(250,P.mxHp+18);P.hp=Math.min(P.mxHp,P.hp+30);}
    else if(id==='pickup'){this.pickupRadiusBonus+=15*sc;}
    else if(id==='shotgun'){this.abilities.shotgunUnlocked=true;if(P.weapon==='pistol')this._sw('shotgun');}
    else if(id==='smg'){this.abilities.smgUnlocked=true;if(P.weapon==='pistol')this._sw('smg');}
    else if(id==='sniper'){this.abilities.sniperUnlocked=true;if(P.weapon==='pistol')this._sw('sniper');}
    else if(id==='pierce'){this.abilities.bulletPierce=Math.min(5,(this.abilities.bulletPierce||0)+Math.ceil(sc));}
    else if(id==='aura'){this.abilities.aura=true;}
    else if(id==='regen'){this.abilities.regen=true;}
    else if(id==='explosive'){this.abilities.explosive=true;}
    else if(id==='vampiric'){this.abilities.vampiric=true;}
    else if(id==='frenzy'){this.abilities.frenzy=true;}
    else if(id==='chain'){this.abilities.chain=true;}
    else if(id==='turret'){this.abilities.turret=true;}
    else if(id==='cryo'){this.abilities.cryo=true;}
    else if(id==='nova'){this.abilities.nova=true;}
    else if(id==='shockwave'){this.abilities.shockwave=true;if(!prev)this.shockwaveT=120;}
    else if(id==='phase'){this.abilities.phase=true;}
    else if(id==='mark'){this.abilities.mark=true;}
    else if(id==='harvest'){this.abilities.harvest=true;}
    if(id!=='move'&&id!=='dmg')P.hp=Math.min(P.mxHp,P.hp+10+lvl*3);
    this._shk(6);this._ring(P.x,P.y,lvl>=3?'#c084fc':'#818cf8',80);
  }
  _handleLvlClick(x,y){
    if(!this.levelChoices)return;
    for(const o of this.levelChoices){const b=o.box;if(b&&x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h){this._applyUpgrade(o.id);this.levelChoices=null;this.paused=false;return;}}
  }

  update(){
    // Lobby mode — only animate embers + sync positions
    if(this.lobby!=='playing'){
      this.tick++;
      for(const e of this.embers){e.x+=e.vx+Math.sin(this.tick*.01+e.phase)*.15;e.y+=e.vy;e.a=.3+Math.sin(this.tick*.02+e.phase)*.2;if(e.y<-10){e.y=this.H+10;e.x=Math.random()*this.W;}}
      if(this.mpMode&&++this.mpSyncT>=3){this.mpSyncT=0;this._mpSync();}
      return;
    }
    if(this.over)return;
    this.tick++;
    if(this.instrT>0)this.instrT--;else this.instrAlpha=Math.max(0,this.instrAlpha-0.005);
    // Shake decay
    if(this.shake.i>.1){this.shake.x=(Math.random()-.5)*this.shake.i;this.shake.y=(Math.random()-.5)*this.shake.i;this.shake.i*=.85;}else{this.shake.x=0;this.shake.y=0;this.shake.i=0;}
    if(this.waveIntro>0)this.waveIntro--;
    if(this.streakT>0)this.streakT--;else this.streakKills=0;
    this.lowHpPulse+=.07;
    if(this.abilities.aura)this.auraRot+=.028;
    // Embers
    for(const e of this.embers){e.x+=e.vx+Math.sin(this.tick*.01+e.phase)*.15;e.y+=e.vy;e.a=.3+Math.sin(this.tick*.02+e.phase)*.2;if(e.y<-10){e.y=this.H+10;e.x=Math.random()*this.W;}}
    // Effect array ticks
    this.rings=this.rings.filter(r=>{r.r+=(r.maxR-r.r)*.14;r.life--;r.w=Math.max(.5,3*(r.life/r.max));return r.life>0;});
    this.casings=this.casings.filter(c=>{c.x+=c.vx;c.y+=c.vy;c.vy+=.28;c.vx*=.95;c.rot+=c.rv;c.life--;return c.life>0;});
    this.dust=this.dust.filter(d=>{d.x+=d.vx;d.y+=d.vy;d.r*=.97;d.life--;return d.life>0;});
    this.chunks=this.chunks.filter(ch=>{ch.x+=ch.vx;ch.y+=ch.vy;ch.vx*=.92;ch.vy*=.92;ch.vy+=.08;ch.rot+=ch.rv;ch.life--;return ch.life>0;});
    this.chainArcs=this.chainArcs.filter(a=>{a.life--;return a.life>0;});
    this.vampParts=this.vampParts.filter(v=>{v.life--;return v.life>0;});
    this.novaRings=this.novaRings.filter(r=>{r.r+=(r.maxR-r.r)*.07;r.life--;return r.life>0;});
    this.shockwaves=this.shockwaves.filter(sw=>{sw.r+=(sw.maxR-sw.r)*.1;sw.life--;return sw.life>0;});
    this.soulOrbs=this.soulOrbs.filter(so=>{so.life--;return so.life>0;});
    this.hitSparks=this.hitSparks.filter(h=>{h.x+=h.vx;h.y+=h.vy;h.vx*=.85;h.vy*=.85;h.life--;return h.life>0;});
    if(this.bossSpawnT>0)this.bossSpawnT--;
    if(this.sniperFlash){this.sniperFlash.life--;if(this.sniperFlash.life<=0)this.sniperFlash=null;}
    if(this.paused)return;
    const P=this.P;
    if(this.abilities.regen&&P.hp<P.mxHp)P.hp=Math.min(P.mxHp,P.hp+0.04);
    // Frenzy
    if(this.frenzyT>0){this.frenzyT--;if(this.frenzyT===0&&this.frenzySt>0){this.frenzySt--;if(this.frenzySt>0)this.frenzyT=240;}}
    const frenzyMul=this.abilities.frenzy&&this.frenzySt>0?1+this.frenzySt*.07:1;
    // Phase shield
    if(this.phaseT>0)this.phaseT--;
    if(this.phaseCd>0)this.phaseCd--;
    // Shockwave auto-trigger
    if(this.abilities.shockwave&&this.shockwaveT>0){if(--this.shockwaveT<=0){this._doShockwave();const al=this.abilityLevels['shockwave']||1;this.shockwaveT=Math.max(180,480-al*70);}}
    // Movement
    this.moving=!!(this.keys['KeyW']||this.keys['KeyS']||this.keys['KeyA']||this.keys['KeyD']||this.keys['ArrowUp']||this.keys['ArrowDown']||this.keys['ArrowLeft']||this.keys['ArrowRight']);
    const mv=P.spd*frenzyMul;
    if(this.keys['KeyW']||this.keys['ArrowUp'])P.y-=mv;if(this.keys['KeyS']||this.keys['ArrowDown'])P.y+=mv;
    if(this.keys['KeyA']||this.keys['ArrowLeft'])P.x-=mv;if(this.keys['KeyD']||this.keys['ArrowRight'])P.x+=mv;
    P.x=Math.max(P.r,Math.min(this.W-P.r,P.x));P.y=Math.max(P.r,Math.min(this.H-P.r,P.y));
    P.angle=Math.atan2(this.mouse.y-P.y,this.mouse.x-P.x);
    if(this.moving){this.walkT+=.18;if(this.tick%12===0)this._dustPuff(P.x,P.y);}
    if(P.inv>0)P.inv--;if(this.fl>0)this.fl--;
    if(this.comboT>0)this.comboT--;else if(this.combo>1)this.combo=1;
    if(this.shotgunCd>0)this.shotgunCd--;if(this.smgCd>0)this.smgCd--;
    if(P.rld>0){P.rld--;if(P.rld===0){const ammos={pistol:30,shotgun:8,smg:60,sniper:5};P.ammo=ammos[P.weapon]||30;this._txt(P.x,P.y-30,'RELOADED!','#22c55e');}}
    const effectiveSr=Math.max(2,this.sr*(this.abilities.frenzy&&this.frenzySt>0?1-this.frenzySt*.05:1));
    if(this.mouse.down&&P.ammo>0&&!P.rld){
      if(P.weapon==='pistol'){if(++this.scd>=effectiveSr){this._shoot();this.scd=0;}}else{this._shoot();}
    }else if(P.weapon==='pistol')this.scd=effectiveSr;
    // Bullets
    this.bullets=this.bullets.filter(b=>{b.px=b.x;b.py=b.y;b.x+=b.vx;b.y+=b.vy;b.life--;return b.life>0&&b.x>-20&&b.x<this.W+20&&b.y>-20&&b.y<this.H+20;});
    for(const o of this.obs)for(const b of this.bullets)if(Math.hypot(b.x-o.x,b.y-o.y)<o.r){b.life=0;this._burst(b.x,b.y,'#78350f',4);}
    // Spawning
    if(this.sc<this.sm){if(++this.st>=this.si){this._spawn();this.sc++;this.st=0;}}
    // Wave clear
    if(this.sc>=this.sm&&!this.zoms.length){
      if(!this.showHub&&this.wt===0&&Object.keys(this.abilityLevels).length>0){this.showHub=true;this.hubT=240;}
      if(this.showHub){this.hubT--;if(this.hubT<=0)this.showHub=false;}
      if(!this.showHub){if(++this.wt>=this.wc){this.wave++;this.sc=0;this.sm=8+this.wave*3;this.si=Math.max(16,80-this.wave*6);this.wt=0;P.hp=Math.min(P.mxHp,P.hp+30);this.waveIntro=90;this.waveIntroWave=this.wave;this._shk(4);}}
    }
    const harvestBonus=this.abilities.harvest?1+this.soulsCollected*.006:1;
    const invulnerable=P.inv>0||this.phaseT>0;
    // Zombie AI
    for(const z of this.zoms){
      z.w++;if(z.hitFlash>0)z.hitFlash--;
      if(z.cryoT>0)z.cryoT--;if(z.markT>0)z.markT--;
      const dx=P.x-z.x,dy=P.y-z.y,l=Math.hypot(dx,dy)||1;
      const wobble=z.hp<z.mxHp*.3?Math.sin(z.w*.15)*1.5:0;
      const st=Math.sin(z.w*.06)*.6;
      const cryoMul=z.cryoT>0?0.45:1;
      z.x+=(dx/l)*z.spd*cryoMul+(-dy/l)*st+wobble;z.y+=(dy/l)*z.spd*cryoMul+(dx/l)*st;
      for(const o of this.obs){const d=Math.hypot(z.x-o.x,z.y-o.y);if(d<o.r+z.r){const a=Math.atan2(z.y-o.y,z.x-o.x);z.x=o.x+Math.cos(a)*(o.r+z.r);z.y=o.y+Math.sin(a)*(o.r+z.r);}}
      for(const tu of this.turrets){if(Math.hypot(z.x-tu.x,z.y-tu.y)<z.r+tu.r){tu.hp-=z.dmg*.3;}}
      if(l<P.r+z.r&&!invulnerable){P.hp-=z.dmg;P.inv=12;this._shk(6);this._ring(P.x,P.y,'#ef4444',35);this._burst(P.x,P.y,'#ef4444',5,.8);for(let hi=0;hi<4;hi++){const ha=Math.random()*Math.PI*2;this.hitSparks.push({x:P.x,y:P.y,vx:Math.cos(ha)*6,vy:Math.sin(ha)*6,life:10,max:10});}if(P.hp<=0){this.over=true;if(!this._scoreSub){this._scoreSub=true;window.hubSubmitScore?.('zombie',this.score,{wave:this.wave});}this._burst(P.x,P.y,'#3b82f6',35,2.5);this._shk(22);this._ring(P.x,P.y,'#dc2626',120);this._ring(P.x,P.y,'#3b82f6',80);}}
    }
    // Turret AI
    for(const tu of this.turrets){
      if(tu.fl>0)tu.fl--;
      let nearest=null,nearestD=Infinity;
      for(const z of this.zoms){const d=Math.hypot(z.x-tu.x,z.y-tu.y);if(d<200&&d<nearestD){nearestD=d;nearest=z;}}
      if(nearest){tu.angle=Math.atan2(nearest.y-tu.y,nearest.x-tu.x);
        if(++tu.fireT>=tu.fireI){tu.fireT=0;tu.fl=5;const a=tu.angle;this.bullets.push({x:tu.x+Math.cos(a)*16,y:tu.y+Math.sin(a)*16,vx:Math.cos(a)*12,vy:Math.sin(a)*12,r:4,life:60,pierce:0,dmg:.65,px:tu.x,py:tu.y,fromTurret:true});}}
    }
    this.turrets=this.turrets.filter(t=>t.hp>0);
    // Bullet–zombie collisions
    for(const b of this.bullets){
      for(const z of this.zoms){
        if(Math.hypot(b.x-z.x,b.y-z.y)<b.r+z.r){
          const markMul=z.markT>0?1.3:1;
          const dmg=this.bulletBaseDmg*this.abilities.dmg*(b.dmg||1)*markMul*harvestBonus;
          z.hp-=dmg;z.hitFlash=6;
          // Apply mark
          if(b.mark)z.markT=180;
          // Apply cryo
          if(b.cryo){const al=this.abilityLevels['cryo']||1;z.cryoT=60+al*30;this._burst(b.x,b.y,'#bfdbfe',4);}
          const hitAngle=Math.atan2(b.vy,b.vx);
          // Hit sparks — small bright particles spray backward from hit direction
          for(let hs=0;hs<3;hs++){const ha=hitAngle+Math.PI+(Math.random()-.5)*.9;this.hitSparks.push({x:b.x,y:b.y,vx:Math.cos(ha)*5,vy:Math.sin(ha)*5,life:8,max:8});}
          this._bloodSplat(b.x,b.y,hitAngle,4);this._burst(b.x,b.y,'#dc2626',3);
          // Vampiric
          if(this.abilities.vampiric&&!b.fromTurret){P.hp=Math.min(P.mxHp,P.hp+dmg*.12);this.vampParts.push({x:b.x,y:b.y,life:22,max:22});}
          // Explosive
          if(this.abilities.explosive){this._burst(b.x,b.y,'#f97316',10,1.8);this._burst(b.x,b.y,'#fbbf24',5,2.8);this._ring(b.x,b.y,'#f97316',40);this._ring(b.x,b.y,'#fde68a',22,2);this._goreChunks(b.x,b.y,'#7c2d12',3);this._shk(3);for(const z2 of this.zoms)if(z2!==z&&Math.hypot(b.x-z2.x,b.y-z2.y)<40){z2.hp-=dmg*.45;z2.hitFlash=4;}}
          // Chain
          if(this.abilities.chain&&!b.fromTurret){for(const z2 of this.zoms){if(z2!==z&&Math.hypot(b.x-z2.x,b.y-z2.y)<85){z2.hp-=dmg*.5;z2.hitFlash=5;this.chainArcs.push({x1:z.x,y1:z.y,x2:z2.x,y2:z2.y,life:12,max:12});this._burst(z2.x,z2.y,'#38bdf8',3);break;}}}
          if(z.hp<=0){
            this._burst(z.x,z.y,z.boss?'#f97316':'#16a34a',z.boss?35:12,z.boss?2.5:1.5);
            this._ring(z.x,z.y,z.boss?'#f97316':z.ec,z.boss?110:50);
            if(z.boss){
              // Boss death — cinematic multi-ring + white flash + debris storm
              this._ring(z.x,z.y,'#fbbf24',200,4);this._ring(z.x,z.y,'#fff',90,6);
              this._burst(z.x,z.y,'#fde68a',22,3.2);this._burst(z.x,z.y,'#f97316',18,2);
              for(let bi=0;bi<16;bi++){const ba=Math.random()*Math.PI*2,bs=Math.random()*9+4;this.hitSparks.push({x:z.x,y:z.y,vx:Math.cos(ba)*bs,vy:Math.sin(ba)*bs,life:20,max:20});}
              this._goreChunks(z.x,z.y,'#7c2d12',6);
            }
            this._goreChunks(z.x,z.y,z.col,z.boss?8:4);this._shk(z.boss?18:4);
            this.combo=Math.min(15,this.combo+1);this.comboT=120;
            this.streakKills++;this.streakT=120;
            if(this.abilities.frenzy){this.frenzySt=Math.min(5,this.frenzySt+1);this.frenzyT=240;}
            // Nova
            if(this.abilities.nova){const al=this.abilityLevels['nova']||1;const nr=60+al*25;
              this.novaRings.push({x:z.x,y:z.y,r:5,maxR:nr,life:30,max:30});
              this._burst(z.x,z.y,'#fde68a',10,1.5);this._burst(z.x,z.y,'#fff',5,2);
              for(const z2 of this.zoms)if(z2!==z&&Math.hypot(z2.x-z.x,z2.y-z.y)<nr){z2.hp-=dmg*.4*al;z2.hitFlash=5;}}
            // Harvest
            if(this.abilities.harvest){this.soulsCollected=Math.min(50,this.soulsCollected+1);this.soulOrbs.push({x:z.x,y:z.y,life:30,max:30});}
            const pts=z.pts*this.combo;this.score+=pts;P.xp+=pts;
            this._txt(z.x,z.y-20,`+${pts}${this.combo>1?' ×'+this.combo:''}`,z.boss?'#f97316':this.combo>4?'#fbbf24':'#22c55e');
            if(this.streakKills>=5&&this.streakKills%5===0){this._txt(P.x,P.y-55,`${this.streakKills} KILL STREAK!`,'#f472b6');this._ring(P.x,P.y,'#f472b6',90);}
            if(P.xp>=P.xpNext)this._lvlup();
            this._pu(z.x,z.y);
            if(z.boss){P.hp=Math.min(P.mxHp,P.hp+50);this._txt(z.x,z.y-50,'+50 HP','#22c55e');this._ring(z.x,z.y,'#fbbf24',150);}
            this.decals.push({x:z.x,y:z.y,r:z.r*(.6+Math.random()*.5),life:1200,max:1200});
          }
          if((b.pierce||0)>0){b.pierce--;}else{b.life=0;}
        }
      }
    }
    this.zoms=this.zoms.filter(z=>z.hp>0);
    // Pickups
    for(const pu of this.pups){pu.life--;pu.bob+=.1;if(Math.hypot(P.x-pu.x,P.y-pu.y)<P.r+pu.r+this.pickupRadiusBonus){if(pu.type==='hp'){P.hp=Math.min(P.mxHp,P.hp+40);this._txt(pu.x,pu.y-20,'+40 HP','#22c55e');}else{const ammos={pistol:30,shotgun:8,smg:60,sniper:5};P.ammo=ammos[P.weapon]||30;P.rld=0;this._txt(pu.x,pu.y-20,'AMMO!','#60a5fa');}pu.life=0;}}
    this.pups=this.pups.filter(p=>p.life>0);
    this.parts=this.parts.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=.92;p.vy*=.92;p.life--;return p.life>0;});
    this.txts=this.txts.filter(t=>{t.y-=.65;t.life--;if(t.scale>1)t.scale*=.92;return t.life>0;});
    this.decals=this.decals.filter(d=>{d.life--;return d.life>0;});
    // Aura damage
    if(this.abilities.aura){const al=this.abilityLevels['aura']||1;for(const z of this.zoms){if(Math.hypot(z.x-P.x,z.y-P.y)<80+al*12){z.hp-=0.22+al*.08;z.hitFlash=Math.max(z.hitFlash,2);}}}
  }

  draw(){
    if(this.lobby!=='playing'){this._drawLobby();return;}
    const c=this.ctx,W=this.W,H=this.H,P=this.P;
    c.save();c.translate(this.shake.x,this.shake.y);
    // Background
    c.fillStyle='#030610';c.fillRect(-5,-5,W+10,H+10);
    c.strokeStyle='#070e1c';c.lineWidth=1;
    for(let x=0;x<W;x+=50){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}
    for(let y=0;y<H;y+=50){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
    // Progressive wave atmosphere — grows redder with each wave
    if(this.wave>3){
      const wt=Math.min(1,(this.wave-3)/14);
      const pulse=Math.sin(this.tick*.018)*.5+.5;
      c.globalAlpha=wt*(.05+pulse*.04);
      const atm=c.createRadialGradient(W/2,H/2,0,W/2,H/2,W*.75);
      atm.addColorStop(0,'rgba(127,29,29,0)');atm.addColorStop(.6,'rgba(127,29,29,.3)');atm.addColorStop(1,'rgba(80,10,10,.8)');
      c.fillStyle=atm;c.fillRect(-5,-5,W+10,H+10);
      c.globalAlpha=1;
    }
    // Embers
    for(const e of this.embers){c.globalAlpha=Math.max(0,e.a)*.35;c.fillStyle='#f97316';c.beginPath();c.arc(e.x,e.y,e.r,0,Math.PI*2);c.fill();}c.globalAlpha=1;
    // Boss spawn flash overlay
    if(this.bossSpawnT>0){
      const bt=this.bossSpawnT/90;const pulse2=Math.sin(this.tick*.35)*.5+.5;
      c.globalAlpha=bt*.5;
      const bg=c.createRadialGradient(W/2,H/2,0,W/2,H/2,W*.8);
      bg.addColorStop(0,'rgba(127,29,29,.9)');bg.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle=bg;c.fillRect(-5,-5,W+10,H+10);
      c.globalAlpha=bt*(.85+pulse2*.15);
      gl(c,'#f97316',40);c.fillStyle=`rgba(249,115,22,${bt*.95})`;
      c.font=`bold ${30+18*(1-bt)|0}px Orbitron,monospace`;c.textAlign='center';
      c.fillText('⚠  BOSS  ⚠',W/2,H/2);c.textAlign='left';ng(c);
      // Pulsing border lines
      c.globalAlpha=bt*pulse2*.55;c.strokeStyle='#f97316';c.lineWidth=3;
      c.strokeRect(8,8,W-16,H-16);
      c.globalAlpha=1;
    }
    // Frenzy speed lines
    if(this.abilities.frenzy&&this.frenzySt>0){const f=this.frenzySt/5;c.globalAlpha=f*.22;c.strokeStyle='#f97316';c.lineWidth=1.5;for(let i=0;i<5*this.frenzySt;i++){const y=Math.random()*H,xl=Math.random()*W*.14;c.beginPath();c.moveTo(0,y);c.lineTo(xl,y);c.stroke();c.beginPath();c.moveTo(W,y);c.lineTo(W-xl,y);c.stroke();}c.globalAlpha=1;}
    // Damage vignette
    if(P.inv>0&&this.phaseT===0){const v=c.createRadialGradient(W/2,H/2,H*.15,W/2,H/2,H);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,`rgba(220,38,38,${P.inv/12*.6})`);c.fillStyle=v;c.fillRect(0,0,W,H);}
    // Phase shift overlay
    if(this.phaseT>0){const t=this.phaseT/120;c.globalAlpha=t*.18;const pg=c.createRadialGradient(W/2,H/2,0,W/2,H/2,W*.7);pg.addColorStop(0,'rgba(34,211,238,.4)');pg.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=pg;c.fillRect(0,0,W,H);c.globalAlpha=1;}
    // Low HP vignette
    if(P.hp<P.mxHp*.3&&!this.over){const pulse=Math.sin(this.lowHpPulse)*.5+.5;const v=c.createRadialGradient(W/2,H/2,H*.12,W/2,H/2,H*.62);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,`rgba(185,28,28,${.12+pulse*.1})`);c.fillStyle=v;c.fillRect(0,0,W,H);}
    // Blood decals
    for(const d of this.decals){c.globalAlpha=Math.min(.3,d.life/d.max*.55);c.fillStyle='#7f1d1d';c.beginPath();c.arc(d.x,d.y,d.r,0,Math.PI*2);c.fill();c.fillStyle='#991b1b';c.beginPath();c.arc(d.x+d.r*.2,d.y-d.r*.15,d.r*.5,0,Math.PI*2);c.fill();}c.globalAlpha=1;
    // Obstacles
    for(const o of this.obs){
      if(o.t===0){ci(c,o.x,o.y,o.r,'#78350f');c.strokeStyle='#92400e';c.lineWidth=2;c.beginPath();c.arc(o.x,o.y,o.r,0,Math.PI*2);c.stroke();c.fillStyle='#dc2626';c.fillRect(o.x-o.r*.6,o.y-4,o.r*1.2,8);}
      else{bx(c,o.x-o.r,o.y-o.r,o.r*2,o.r*2,'#374151');bx(c,o.x-o.r+2,o.y-o.r+2,o.r*2-4,o.r*2-4,'#4b5563');}
    }
    // ── STATIC FIELD AURA (massively improved) ──
    if(this.abilities.aura){
      const al=this.abilityLevels['aura']||1;const aR=80+al*12;
      // Outer soft glow
      c.globalAlpha=.07+Math.sin(this.tick*.055)*.03;
      const ag=c.createRadialGradient(P.x,P.y,aR*.4,P.x,P.y,aR);ag.addColorStop(0,'rgba(96,165,250,.7)');ag.addColorStop(1,'rgba(96,165,250,0)');
      c.fillStyle=ag;c.beginPath();c.arc(P.x,P.y,aR,0,Math.PI*2);c.fill();c.globalAlpha=1;
      // Pulsing outer ring
      const pulse=Math.sin(this.tick*.09)*.5+.5;
      c.globalAlpha=.2+pulse*.25;gl(c,'#38bdf8',8+pulse*10);
      c.strokeStyle='#38bdf8';c.lineWidth=1.2+pulse*.8;
      c.beginPath();c.arc(P.x,P.y,aR,0,Math.PI*2);c.stroke();ng(c);c.globalAlpha=1;
      // Rotating dashed inner ring
      c.globalAlpha=.28;c.strokeStyle='#60a5fa';c.lineWidth=1;c.setLineDash([6,8]);
      c.save();c.translate(P.x,P.y);c.rotate(this.auraRot);
      c.beginPath();c.arc(0,0,aR*.65,0,Math.PI*2);c.stroke();c.restore();c.setLineDash([]);c.globalAlpha=1;
      // Rotating arc segments (like tesla coil)
      const numArcs=3+al;
      for(let i=0;i<numArcs;i++){
        const startA=this.auraRot*1.2+i*(Math.PI*2/numArcs);const arcSpan=.35+Math.sin(this.tick*.07+i)*.1;
        c.globalAlpha=.4+Math.sin(this.tick*.12+i)*.22;
        gl(c,'#60a5fa',12);c.strokeStyle='#93c5fd';c.lineWidth=2;
        c.beginPath();c.arc(P.x,P.y,aR,startA,startA+arcSpan);c.stroke();ng(c);
      }c.globalAlpha=1;
      // Orbiting spark particles
      const numSparks=4+al*2;
      for(let i=0;i<numSparks;i++){
        const a=this.auraRot*1.6+i*(Math.PI*2/numSparks)+Math.sin(this.tick*.08+i*1.3)*.25;
        const dist=aR*.72+Math.sin(this.tick*.11+i)*9;
        const sx=P.x+Math.cos(a)*dist,sy=P.y+Math.sin(a)*dist;
        gl(c,'#bfdbfe',14);ci(c,sx,sy,2.5,'#e0f2fe');
        // Spark tail
        c.globalAlpha=.45;c.strokeStyle='#38bdf8';c.lineWidth=1;
        const a2=a-.35;c.beginPath();c.moveTo(sx,sy);c.lineTo(P.x+Math.cos(a2)*dist,P.y+Math.sin(a2)*dist);c.stroke();
        ng(c);c.globalAlpha=1;
        // Secondary mini spark
        if(al>=2){const a3=a+Math.PI/numSparks;const d3=aR*.5;
          gl(c,'#7dd3fc',8);ci(c,P.x+Math.cos(a3)*d3,P.y+Math.sin(a3)*d3,1.5,'#bfdbfe');ng(c);}
      }
      // Jagged lightning to nearby zombies
      for(const z of this.zoms){
        const dist=Math.hypot(z.x-P.x,z.y-P.y);
        if(dist<aR){const intensity=1-dist/aR;
          if(Math.random()<.12+intensity*.15){
            const branches=al>=3?3:al>=2?2:1;
            for(let b=0;b<branches;b++){
              c.globalAlpha=.45+intensity*.45;
              gl(c,'#38bdf8',8+intensity*12);c.strokeStyle=`rgba(125,211,252,${.7+intensity*.3})`;c.lineWidth=.8+intensity*1.2;
              this._lightning(c,P.x,P.y,z.x,z.y,5+al*2,18-al*2);
              ng(c);}
          }
        }
      }
      c.globalAlpha=1;
    }
    // Shockwave rings
    for(const sw of this.shockwaves){const t=sw.life/sw.max;c.globalAlpha=t*.65;gl(c,'#22d3ee',16*t);c.strokeStyle='#22d3ee';c.lineWidth=4+5*(1-t);c.beginPath();c.arc(sw.x,sw.y,sw.r,0,Math.PI*2);c.stroke();ng(c);
      c.globalAlpha=t*.3;c.strokeStyle='#7dd3fc';c.lineWidth=2*(1-t)*4;c.beginPath();c.arc(sw.x,sw.y,sw.r*.7,0,Math.PI*2);c.stroke();c.globalAlpha=1;}
    // Nova rings
    for(const r of this.novaRings){const t=r.life/r.max;
      c.globalAlpha=t*.7;c.strokeStyle=`rgba(253,224,71,${t})`;c.lineWidth=3+3*t;c.beginPath();c.arc(r.x,r.y,r.r,0,Math.PI*2);c.stroke();
      c.globalAlpha=t*.35;c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=2;c.beginPath();c.arc(r.x,r.y,r.r*.6,0,Math.PI*2);c.stroke();c.globalAlpha=1;}
    // Explosion rings
    for(const r of this.rings){c.globalAlpha=r.life/r.max*.7;c.strokeStyle=r.col;c.lineWidth=r.w;c.beginPath();c.arc(r.x,r.y,r.r,0,Math.PI*2);c.stroke();}c.globalAlpha=1;
    // Gore chunks
    for(const ch of this.chunks){c.globalAlpha=ch.life/ch.max;c.save();c.translate(ch.x,ch.y);c.rotate(ch.rot);c.fillStyle=ch.col;c.fillRect(-ch.r/2,-ch.r/2,ch.r,ch.r*.6);c.restore();}c.globalAlpha=1;
    // Dust
    for(const d of this.dust){c.globalAlpha=(d.life/d.max)*.4;c.fillStyle='#6b7280';c.beginPath();c.arc(d.x,d.y,d.r,0,Math.PI*2);c.fill();}c.globalAlpha=1;
    // Shell casings
    for(const cs of this.casings){c.globalAlpha=cs.life/45;c.save();c.translate(cs.x,cs.y);c.rotate(cs.rot);c.fillStyle='#d4a017';c.fillRect(-2,-1,4,2);c.fillStyle='#b8860b';c.fillRect(-2,-1,1,2);c.restore();}c.globalAlpha=1;
    // Hit sparks — bright yellow impact particles
    for(const h of this.hitSparks){const t=h.life/h.max;c.globalAlpha=t*.95;gl(c,'#fde68a',5*t);c.fillStyle=t>.5?'#fde68a':'#fbbf24';c.beginPath();c.arc(h.x,h.y,1.8*t+.5,0,Math.PI*2);c.fill();ng(c);}c.globalAlpha=1;
    // Chain lightning arcs
    for(const arc of this.chainArcs){const t=arc.life/arc.max;c.globalAlpha=t*.9;gl(c,'#38bdf8',10);c.strokeStyle='#7dd3fc';c.lineWidth=1.5;this._lightning(c,arc.x1,arc.y1,arc.x2,arc.y2,5,16);ng(c);}c.globalAlpha=1;
    // Particles
    for(const p of this.parts){c.globalAlpha=p.life/p.max;ci(c,p.x,p.y,p.r,p.col);}c.globalAlpha=1;
    // Sniper beam flash
    if(this.sniperFlash){const sf=this.sniperFlash;const t=sf.life/9;c.globalAlpha=t*.65;gl(c,'#c4b5fd',sf.life*4);c.strokeStyle='#c4b5fd';c.lineWidth=sf.life*.8;c.beginPath();c.moveTo(P.x,P.y);c.lineTo(P.x+Math.cos(sf.angle)*900,P.y+Math.sin(sf.angle)*900);c.stroke();ng(c);c.globalAlpha=1;}
    // Bullet trails + bullets
    for(const b of this.bullets){const tc=b.sniper?'#c4b5fd':b.fromTurret?'#4ade80':b.cryo?'#7dd3fc':'#fde68a';c.globalAlpha=.3;c.strokeStyle=tc;c.lineWidth=b.r*.6;c.beginPath();c.moveTo(b.px,b.py);c.lineTo(b.x,b.y);c.stroke();c.globalAlpha=1;}
    gl(c,'#fde68a',14);
    for(const b of this.bullets){const bc=b.sniper?'#c4b5fd':b.fromTurret?'#4ade80':b.cryo?'#bfdbfe':'#fde68a';ci(c,b.x,b.y,b.r,bc);}ng(c);
    // Vampiric particles
    for(const v of this.vampParts){const t=v.life/v.max;const px=v.x+(P.x-v.x)*(1-t);const py=v.y+(P.y-v.y)*(1-t);c.globalAlpha=t*.85;gl(c,'#22c55e',8);ci(c,px,py,3+t*2,'#22c55e');ng(c);}c.globalAlpha=1;
    // Soul orbs
    for(const so of this.soulOrbs){const t=so.life/so.max;const px=so.x+(P.x-so.x)*(1-t);const py=so.y+(P.y-so.y)*(1-t);c.globalAlpha=t;gl(c,'#fbbf24',10);ci(c,px,py,4,'#fde68a');ng(c);}c.globalAlpha=1;
    // Pickups
    for(const pu of this.pups){const yo=Math.sin(pu.bob)*5;gl(c,pu.type==='hp'?'#22c55e':'#3b82f6',18);ci(c,pu.x,pu.y+yo,pu.r,pu.type==='hp'?'#15803d':'#1d4ed8');c.fillStyle='#fff';c.font='bold 13px monospace';c.textAlign='center';c.fillText(pu.type==='hp'?'♥':'◉',pu.x,pu.y+yo+5);c.textAlign='left';ng(c);}
    // Turrets
    for(const tu of this.turrets){
      c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(tu.x+2,tu.y+4,tu.r*.9,tu.r*.28,0,0,Math.PI*2);c.fill();
      gl(c,'#22c55e',tu.fl>0?18:8);ci(c,tu.x,tu.y,tu.r,'#0a1f12','#22c55e',2);
      c.save();c.translate(tu.x,tu.y);c.rotate(tu.angle);c.fillStyle='#1e3a2e';c.beginPath();c.roundRect(2,-3,16,6,2);c.fill();c.fillStyle='#22c55e';c.fillRect(14,-2,5,4);ng(c);
      if(tu.fl>0){gl(c,'#4ade80',12);ci(c,19,0,2,'#4ade80');ng(c);}c.restore();
      c.globalAlpha=.35;c.fillStyle='#22c55e';[[1,0],[0,1],[-1,0],[0,-1]].forEach(([dx,dy])=>{c.beginPath();c.arc(tu.x+dx*(tu.r+5),tu.y+dy*(tu.r+5),1.5,0,Math.PI*2);c.fill();});c.globalAlpha=1;
      hb(c,tu.x-tu.r,tu.y-tu.r-9,tu.r*2,4,tu.hp/tu.mxHp,'#22c55e','#ef4444');
      c.fillStyle='#166534';c.font='7px Orbitron,monospace';c.textAlign='center';c.fillText('TURRET',tu.x,tu.y-tu.r-13);c.textAlign='left';}
    // ── Zombies ──
    for(const z of this.zoms){
      const a=Math.atan2(P.y-z.y,P.x-z.x);const hpRatio=z.hp/z.mxHp;const limping=hpRatio<.3;
      const legSwing=limping?Math.sin(z.w*.08)*5:Math.sin(z.w*.12)*8;
      // Cryo frost effect
      if(z.cryoT>0){const ct=z.cryoT/120;c.globalAlpha=ct*.5;c.strokeStyle='#bfdbfe';c.lineWidth=1.5;c.setLineDash([3,4]);c.beginPath();c.arc(z.x,z.y,z.r+3,0,Math.PI*2);c.stroke();c.setLineDash([]);
        c.fillStyle='#e0f2fe';for(let i=0;i<4;i++){const ia=(Math.PI*2/4)*i+this.tick*.02;c.beginPath();c.arc(z.x+Math.cos(ia)*(z.r+5),z.y+Math.sin(ia)*(z.r+5),2,0,Math.PI*2);c.fill();}c.globalAlpha=1;}
      // Mark reticle
      if(z.markT>0){const mt=Math.min(1,z.markT/30);const ry=z.y-z.r-18;const pulse2=Math.sin(this.tick*.12)*.3+.7;
        c.globalAlpha=mt*pulse2*.9;gl(c,'#fbbf24',8);c.strokeStyle='#fbbf24';c.lineWidth=1.5;
        c.beginPath();c.arc(z.x,ry,5,0,Math.PI*2);c.stroke();
        [[1,0],[0,1],[-1,0],[0,-1]].forEach(([dx,dy])=>{c.beginPath();c.moveTo(z.x+dx*5,ry+dy*5);c.lineTo(z.x+dx*9,ry+dy*9);c.stroke();});
        ng(c);c.globalAlpha=1;}
      c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(z.x,z.y+z.r+2,z.r*.7,z.r*.25,0,0,Math.PI*2);c.fill();
      c.strokeStyle=limping?'#1a1a1a':'#1f2937';c.lineWidth=z.boss?6:4;c.lineCap='round';
      c.beginPath();c.moveTo(z.x,z.y+z.r*.5);c.lineTo(z.x-6+legSwing,z.y+z.r+12);c.stroke();
      c.beginPath();c.moveTo(z.x,z.y+z.r*.5);c.lineTo(z.x+6-legSwing,z.y+z.r+12);c.stroke();
      const armLen=z.r+10+(limping?-3:0);
      c.strokeStyle=z.col;c.lineWidth=z.boss?7:5;c.lineCap='round';
      c.beginPath();c.moveTo(z.x,z.y);c.lineTo(z.x+Math.cos(a-.4)*armLen,z.y+Math.sin(a-.4)*armLen);c.stroke();
      c.beginPath();c.moveTo(z.x,z.y);c.lineTo(z.x+Math.cos(a+.4)*armLen,z.y+Math.sin(a+.4)*armLen);c.stroke();
      if(z.boss){gl(c,'#f97316',22+Math.sin(z.w*.04)*8);ci(c,z.x,z.y,z.r,z.hitFlash>0?'#fff':'#450a0a','#f97316',3);ng(c);}
      else{ci(c,z.x,z.y,z.r,z.hitFlash>0?'#ffffff':z.cryoT>0?`rgba(${parseInt(z.col.slice(1,3),16)},${parseInt(z.col.slice(3,5),16)+30},${parseInt(z.col.slice(5,7),16)+60},.9)`:z.col);}
      if(hpRatio<.5&&!z.boss){c.strokeStyle='#991b1b';c.lineWidth=1;c.globalAlpha=1-hpRatio;c.beginPath();c.moveTo(z.x-z.r*.3,z.y-z.r*.2);c.lineTo(z.x+z.r*.1,z.y+z.r*.3);c.stroke();c.beginPath();c.moveTo(z.x+z.r*.2,z.y-z.r*.4);c.lineTo(z.x-z.r*.1,z.y);c.stroke();c.globalAlpha=1;}
      ci(c,z.x,z.y-z.r*.5,z.r*.6,z.boss?'#7f1d1d':'#4d7c0f');
      gl(c,z.ec,12);ci(c,z.x-5,z.y-z.r*.6,3.5,z.ec);ci(c,z.x+5,z.y-z.r*.6,3.5,z.ec);
      c.globalAlpha=.25;ci(c,z.x-5-Math.cos(a)*3,z.y-z.r*.6-Math.sin(a)*3,2.5,z.ec);ci(c,z.x+5-Math.cos(a)*3,z.y-z.r*.6-Math.sin(a)*3,2.5,z.ec);c.globalAlpha=1;ng(c);
      c.strokeStyle='#7f1d1d';c.lineWidth=2;c.beginPath();c.arc(z.x,z.y-z.r*.3,4,0,Math.PI);c.stroke();
      hb(c,z.x-z.r,z.y-z.r-10,z.r*2,5,z.hp/z.mxHp,'#22c55e','#ef4444');
      if(z.boss){c.fillStyle='#f97316';c.font='bold 9px Orbitron,monospace';c.textAlign='center';c.fillText('BOSS',z.x,z.y-z.r-16);c.textAlign='left';}
    }
    // ── Player ──
    const isPhase=this.phaseT>0;
    const fl2=P.inv>0&&!isPhase&&Math.floor(P.inv/3)%2===0;
    if(!this.over&&!fl2){
      c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(P.x+2,P.y+P.r+2,P.r*.6,P.r*.22,0,0,Math.PI*2);c.fill();
      const moving=this.moving;const bob=moving?Math.sin(this.walkT)*2.5:0;const legSwing=moving?Math.sin(this.walkT)*9:0;
      // Phase shift effect on player
      if(isPhase){const pt=this.phaseT/120;c.globalAlpha=pt*.6;gl(c,'#22d3ee',20*pt);
        for(let i=0;i<6;i++){const a2=(Math.PI*2/6)*i+this.tick*.06;c.strokeStyle=`rgba(125,211,252,${pt*.7})`;c.lineWidth=1.5;c.beginPath();c.moveTo(P.x+Math.cos(a2)*(P.r+8),P.y+Math.sin(a2)*(P.r+8));c.lineTo(P.x+Math.cos(a2+.5)*(P.r+20),P.y+Math.sin(a2+.5)*(P.r+20));c.stroke();}
        ng(c);c.globalAlpha=1;}
      // Frenzy aura
      if(this.abilities.frenzy&&this.frenzySt>0){const fi=this.frenzySt/5;c.globalAlpha=fi*.32;const fg=c.createRadialGradient(P.x,P.y,0,P.x,P.y,P.r*2.5);fg.addColorStop(0,'rgba(249,115,22,.7)');fg.addColorStop(1,'rgba(249,115,22,0)');c.fillStyle=fg;c.beginPath();c.arc(P.x,P.y,P.r*2.5,0,Math.PI*2);c.fill();c.globalAlpha=1;}
      c.strokeStyle='#1e3a5f';c.lineWidth=5;c.lineCap='round';
      c.beginPath();c.moveTo(P.x,P.y+P.r*.4);c.lineTo(P.x-6+legSwing,P.y+P.r+13);c.stroke();
      c.beginPath();c.moveTo(P.x,P.y+P.r*.4);c.lineTo(P.x+6-legSwing,P.y+P.r+13);c.stroke();
      const bodyGlow=isPhase?'#22d3ee':'#2563eb';
      gl(c,bodyGlow,22);ci(c,P.x,P.y+bob,P.r,isPhase?'rgba(2,132,199,.8)':'#1d4ed8',isPhase?'#22d3ee':'#3b82f6',2);ng(c);
      // Gun
      c.save();c.translate(P.x,P.y+bob);c.rotate(P.angle);
      const gCol={shotgun:'#92400e',smg:'#475569',sniper:'#6d28d9'}[P.weapon]||'#9ca3af';
      const gLen={shotgun:P.r+15,smg:P.r+8,sniper:P.r+22}[P.weapon]||P.r+9;
      const gH={shotgun:9,sniper:5}[P.weapon]||6;
      c.fillStyle=gCol;c.beginPath();c.roundRect(P.r-2,-gH/2,gLen,gH,2);c.fill();
      if(P.weapon==='shotgun'){c.fillStyle='#78350f';c.fillRect(P.r+2,-3,6,6);}
      if(P.weapon==='sniper'){c.fillStyle='#4c1d95';c.fillRect(P.r+2,-2,10,4);c.fillStyle='#7c3aed';c.fillRect(P.r+gLen-6,-3,6,6);}
      if(this.fl>0){const fi=this.fl/14;c.globalAlpha=fi*.5;c.fillStyle='rgba(253,230,138,.3)';c.beginPath();c.moveTo(P.r+gLen-4,-3);c.lineTo(P.r+gLen+35+this.fl*3,-18-this.fl*2);c.lineTo(P.r+gLen+35+this.fl*3,18+this.fl*2);c.lineTo(P.r+gLen-4,3);c.closePath();c.fill();c.globalAlpha=1;gl(c,'#fde68a',28+this.fl*2);ci(c,P.r+gLen,0,this.fl*.9,'rgba(253,230,138,.85)');ng(c);}
      c.restore();
      // Head
      ci(c,P.x,P.y-P.r*.4+bob,P.r*.55,isPhase?'#a5f3fc':'#bfdbfe',isPhase?'#22d3ee':'#93c5fd',2);
      c.fillStyle=isPhase?'#0e7490':'#1e3a8a';c.beginPath();c.ellipse(P.x,P.y-P.r*.4+bob,P.r*.3,P.r*.18,0,0,Math.PI*2);c.fill();
      c.fillStyle='rgba(147,197,253,.5)';c.beginPath();c.arc(P.x-3,P.y-P.r*.5+bob,2,0,Math.PI*2);c.fill();
    }
    // Float texts
    for(const t of this.txts){const s=t.scale||1;c.globalAlpha=t.life/t.max;c.save();c.translate(t.x,t.y);c.scale(s,s);gl(c,t.col,10);ft(c,0,0,t.t,t.col,13);ng(c);c.restore();}c.globalAlpha=1;
    // ── HUD ──
    bx(c,10,10,262,90,'rgba(2,5,14,.92)',10);
    gl(c,'#60a5fa',8);c.font='bold 22px Orbitron,monospace';c.fillStyle='#fff';c.fillText(`${this.score}`,20,38);ng(c);
    c.fillStyle='#374151';c.font='11px Inter,sans-serif';c.fillText(`WAVE ${this.wave}  ·  ALIVE ${this.zoms.length}`,20,57);
    hb(c,20,66,165,8,P.hp/P.mxHp,'#22c55e','#ef4444');
    c.fillStyle='#6b7280';c.font='9px Inter,sans-serif';c.fillText(`HP ${Math.ceil(P.hp)}/${P.mxHp}`,195,75);
    const wN={pistol:'PISTOL [1]',shotgun:'SHOTGUN [2]',smg:'SMG [3]',sniper:'SNIPER [4]'};
    const wC={pistol:'#9ca3af',shotgun:'#92400e',smg:'#475569',sniper:'#6d28d9'};
    bx(c,W-168,10,158,36,'rgba(2,5,14,.92)',8);
    c.fillStyle=wC[P.weapon]||'#9ca3af';c.font='bold 12px Orbitron,monospace';c.textAlign='right';c.fillText(wN[P.weapon],W-14,31);c.textAlign='left';
    // Ammo
    hb(c,20,H-50,165,8,P.ammo/P.mxAmmo,'#fbbf24','#fbbf24');
    c.fillStyle='#6b7280';c.font='9px Inter,sans-serif';c.fillText(P.rld>0?`RELOADING ${(100-(P.rld/P.rldT*100))|0}%`:`AMMO ${P.ammo}/${P.mxAmmo}`,20,H-54);
    if(P.weapon==='shotgun'&&this.shotgunCd>0){hb(c,20,H-62,165,4,1-this.shotgunCd/45,'#f97316','#f97316');c.fillStyle='#92400e';c.font='8px Inter,sans-serif';c.fillText('PUMP CD',20,H-65);}
    // XP
    hb(c,20,H-32,165,6,P.xp/P.xpNext,'#a855f7','#a855f7');
    c.fillStyle='#6b7280';c.font='9px Inter,sans-serif';c.fillText(`LVL ${P.lvl}  XP ${P.xp}/${P.xpNext}`,20,H-28);
    // Right-side indicators
    let rY=50;
    if(this.combo>1){gl(c,'#f59e0b',12);c.font='bold 14px Orbitron,monospace';c.fillStyle='#fbbf24';c.textAlign='right';c.fillText(`×${this.combo} COMBO`,W-14,rY);c.textAlign='left';ng(c);rY+=22;}
    if(this.abilities.frenzy&&this.frenzySt>0){c.fillStyle='#f97316';c.font='bold 11px Orbitron,monospace';c.textAlign='right';c.fillText(`🔥 FRENZY ×${this.frenzySt}`,W-14,rY);c.textAlign='left';rY+=20;}
    if(this.streakKills>=3&&this.streakT>0){c.globalAlpha=Math.min(1,this.streakT/30);c.fillStyle='#f472b6';c.font='bold 11px Orbitron,monospace';c.textAlign='right';c.fillText(`💀 ${this.streakKills} STREAK`,W-14,rY);c.textAlign='left';c.globalAlpha=1;rY+=20;}
    if(this.abilities.harvest&&this.soulsCollected>0){c.fillStyle='#fde68a';c.font='9px Inter,sans-serif';c.textAlign='right';c.fillText(`☠️ ${this.soulsCollected} souls +${(this.soulsCollected*.6)|0}% dmg`,W-14,rY);c.textAlign='left';rY+=18;}
    // Phase cooldown
    if(this.abilities.phase){
      if(this.phaseCd>0){hb(c,20,H-72,130,4,1-this.phaseCd/720,'#22d3ee','#0e7490');c.fillStyle='#0e7490';c.font='8px Inter,sans-serif';c.fillText('PHASE [Q] CD',20,H-75);}
      else if(this.phaseT===0){c.fillStyle='#22d3ee';c.font='9px Inter,sans-serif';c.fillText('PHASE READY [Q]',20,H-68);}
    }
    // Shockwave cooldown
    if(this.abilities.shockwave&&this.shockwaveT>0){
      const al=this.abilityLevels['shockwave']||1;const maxT=Math.max(180,480-al*70);
      hb(c,200,H-50,80,4,1-this.shockwaveT/maxT,'#22d3ee','#0e7490');
      c.fillStyle='#0e7490';c.font='8px Inter,sans-serif';c.fillText('SURGE',200,H-53);}
    // Turret count
    if(this.abilities.turret){c.fillStyle='#166534';c.font='9px Inter,sans-serif';c.fillText(`TURRETS ${this.turrets.length}/2  [F]`,200,H-28);}
    // Wave intro
    if(this.waveIntro>0){
      const t=this.waveIntro/90;const boss=this.waveIntroWave%5===0;
      const col=boss?'#f97316':'#38bdf8';const sz=32+18*(1-t)|0;
      // Backdrop flash
      c.globalAlpha=t*.3;c.fillStyle=boss?'rgba(127,29,29,.6)':'rgba(7,89,133,.4)';c.fillRect(0,H/2-50,W,90);c.globalAlpha=1;
      // Glowing text
      c.globalAlpha=t;gl(c,col,20+t*15);c.fillStyle=col;c.font=`bold ${sz}px Orbitron,monospace`;c.textAlign='center';
      c.fillText(boss?`⚠ BOSS WAVE ${this.waveIntroWave}`:`WAVE ${this.waveIntroWave}`,W/2,H/2+4);ng(c);
      // Sub text
      c.fillStyle='rgba(255,255,255,.55)';c.font='12px Inter,sans-serif';
      c.fillText(boss?'Prepare yourself…':`${this.sm} enemies incoming`,W/2,H/2+28);
      // Accent line
      const lw=180*t;c.globalAlpha=t*.7;c.strokeStyle=col;c.lineWidth=2;
      c.beginPath();c.moveTo(W/2-lw,H/2-22);c.lineTo(W/2+lw,H/2-22);c.stroke();
      c.textAlign='left';c.globalAlpha=1;
    }
    else if(this.sc>=this.sm&&!this.zoms.length&&!this.showHub){const boss=(this.wave+1)%5===0;const t=this.wt/this.wc;c.fillStyle=`rgba(${boss?'249,115,22':'245,158,11'},${0.95-t*0.5})`;c.font='bold 22px Orbitron,monospace';c.textAlign='center';c.fillText(boss?`⚠ BOSS WAVE ${this.wave+1}`:`⚡ WAVE ${this.wave+1}`,W/2,H/2);c.textAlign='left';}
    // Ability HUB
    if(this.showHub){
      const keys=Object.keys(this.abilityLevels);if(keys.length>0){
        const pw=44,ph=58,gap=9;const total=keys.length*(pw+gap)-gap,sx=W/2-total/2,sy=H-92;
        bx(c,sx-16,sy-34,total+32,ph+52,'rgba(1,3,14,.95)',12);
        c.fillStyle='#4b5563';c.font='bold 8px Orbitron,monospace';c.textAlign='center';c.fillText('CURRENT ABILITIES',W/2,sy-18);c.textAlign='left';
        const icons={dmg:'💥',fire:'⚡',move:'👟',pickup:'🧲',shotgun:'🔫',smg:'💨',sniper:'🔭',pierce:'🔩',aura:'⚡',regen:'💊',explosive:'💣',vampiric:'🩸',frenzy:'🔥',chain:'🔗',turret:'🤖',cryo:'🧊',nova:'✨',shockwave:'🌊',phase:'💠',mark:'🏹',harvest:'☠️'};
        for(let i=0;i<keys.length;i++){const id=keys[i],lv=this.abilityLevels[id]||1;const bxx=sx+i*(pw+gap);
          const bc=lv>=3?'rgba(126,34,206,.5)':lv>=2?'rgba(109,40,217,.35)':'rgba(30,58,95,.5)';
          bx(c,bxx,sy,pw,ph,bc,8);c.strokeStyle=lv>=3?'#9333ea':lv>=2?'#7c3aed':'#1e3a5f';c.lineWidth=lv>=2?2:1;c.strokeRect(bxx,sy,pw,ph);
          c.font='20px serif';c.textAlign='center';c.fillText(icons[id]||'?',bxx+pw/2,sy+26);
          c.fillStyle=lv>=3?'#d8b4fe':lv>=2?'#a78bfa':'#60a5fa';c.font='8px monospace';c.fillText(this._stars(lv),bxx+pw/2,sy+40);
          c.fillStyle='#374151';c.font='7px Inter,sans-serif';c.fillText(id.toUpperCase(),bxx+pw/2,sy+52);c.textAlign='left';}
        c.fillStyle='rgba(75,85,99,.6)';c.font='9px Inter,sans-serif';c.textAlign='center';c.fillText(`${Math.ceil(this.hubT/60)}s  ·  click to dismiss`,W/2,sy+ph+16);c.textAlign='left';
      }
    }
    // Level-up overlay
    if(this.levelChoices){
      c.fillStyle='rgba(0,0,0,.87)';c.fillRect(-5,-5,W+10,H+10);
      for(let i=0;i<8;i++){const px=W*.1+Math.random()*W*.8,py=H*.2+Math.random()*H*.6;c.globalAlpha=.08;gl(c,'#a855f7',20);ci(c,px,py,Math.random()*30+10,'rgba(168,85,247,.15)');ng(c);}c.globalAlpha=1;
      const bw=230,bh=162,sp=14,total3=bw*3+sp*2,sx=W/2-total3/2,sy=H/2-bh/2;
      gl(c,'#a855f7',14);bx(c,sx-20,sy-96,total3+40,bh+120,'rgba(3,7,18,.98)',18);ng(c);
      c.fillStyle='#e5e7eb';c.font='bold 24px Orbitron,monospace';c.textAlign='center';c.fillText('LEVEL UP',W/2,sy-64);
      c.font='11px Inter,sans-serif';c.fillStyle='#6b7280';c.fillText('Duplicates evolve  ★ → ★★ → ★★★',W/2,sy-42);c.textAlign='left';
      const icMap={dmg:'💥',fire:'⚡',move:'👟',pickup:'🧲',shotgun:'🔫',smg:'💨',sniper:'🔭',pierce:'🔩',aura:'⚡',regen:'💊',explosive:'💣',vampiric:'🩸',frenzy:'🔥',chain:'🔗',turret:'🤖',cryo:'🧊',nova:'✨',shockwave:'🌊',phase:'💠',mark:'🏹',harvest:'☠️'};
      this.levelChoices.forEach((opt,i)=>{
        const cx=sx+i*(bw+sp),cy=sy;const cur=this.abilityLevels[opt.id]||0;const nxt=cur+1;
        opt.box={x:cx,y:cy,w:bw,h:bh};
        bx(c,cx,cy,bw,bh,cur>=2?'rgba(126,34,206,.28)':cur>=1?'rgba(109,40,217,.18)':'#020617',14);
        c.strokeStyle=cur>0?'#a855f7':'#1e3a5f';c.lineWidth=cur>0?2:1;c.beginPath();c.roundRect(cx,cy,bw,bh,14);c.stroke();
        // Icon
        c.font='28px serif';c.textAlign='center';c.fillText(icMap[opt.id]||'?',cx+bw/2,cy+36);
        // Name
        c.fillStyle=nxt>=3?'#d8b4fe':nxt>=2?'#a78bfa':'#f9fafb';c.font=`bold ${nxt>=3?10:11}px Orbitron,monospace`;c.textAlign='center';
        c.fillText(nxt>=3?`${opt.name} ✦ EVOLVED`:nxt>=2?`${opt.name} II`:opt.name,cx+bw/2,cy+56);
        // Divider
        c.globalAlpha=.25;c.strokeStyle=cur>0?'#a855f7':'#1e3a5f';c.lineWidth=1;
        c.beginPath();c.moveTo(cx+14,cy+63);c.lineTo(cx+bw-14,cy+63);c.stroke();c.globalAlpha=1;
        // Description — word-wrapped, left-aligned with padding
        c.fillStyle='#9ca3af';c.font='10px Inter,sans-serif';c.textAlign='left';
        this._wrapText(c,opt.desc,cx+14,cy+78,bw-28,14);
        // Stars
        c.fillStyle=nxt>=3?'#c084fc':nxt>=2?'#818cf8':'#4b5563';c.font='13px monospace';c.textAlign='center';
        c.fillText(this._stars(nxt),cx+bw/2,cy+bh-26);
        // Click hint
        c.fillStyle='rgba(75,85,99,.55)';c.font='9px Inter,sans-serif';
        c.fillText('click to select',cx+bw/2,cy+bh-10);c.textAlign='left';
      });
    }
    // Remote players overlay
    if(this.mpMode)this._drawRemotePlayers(c);
    // Instructions
    if(this.instrAlpha>0.01){c.globalAlpha=this.instrAlpha*0.42;c.fillStyle='#6b7280';c.font='9px Inter,sans-serif';
      const extra=[];if(this.abilities.turret)extra.push('F turret');if(this.abilities.phase)extra.push('Q phase');
      c.fillText(`WASD · Mouse aim · Click fire · 1–4 weapons · R reload${extra.length?' · '+extra.join(' · '):''}`,20,H-12);c.globalAlpha=1;}
    if(this.over){c.fillStyle='rgba(0,0,0,.84)';c.fillRect(-5,-5,W+10,H+10);gl(c,'#ef4444',28);ft(c,W/2,H/2-20,'GAME OVER','#ef4444',58);ng(c);ft(c,W/2,H/2+30,`SCORE: ${this.score}   WAVE: ${this.wave}`,'#d1d5db',17);ft(c,W/2,H/2+68,'click to restart','#374151',13);}
    c.restore();
    // ── Drawn in true screen-space (no shake, always on top) ──
    const ctx2=this.ctx;
    if(document.pointerLockElement!==this.cv&&!this.over){
      // "click to play" overlay when mouse isn't locked
      ctx2.fillStyle='rgba(0,0,8,.72)';ctx2.fillRect(0,0,W,H);
      const pulse3=Math.sin(this.tick*.06)*.5+.5;
      ctx2.globalAlpha=.7+pulse3*.3;
      gl(ctx2,'#3b82f6',22);ctx2.fillStyle='#93c5fd';ctx2.font='bold 22px Orbitron,monospace';ctx2.textAlign='center';
      ctx2.fillText('CLICK TO PLAY',W/2,H/2);ng(ctx2);
      ctx2.fillStyle='#4b5563';ctx2.font='12px Inter,sans-serif';
      ctx2.fillText('Mouse will be locked to canvas  ·  ESC to release',W/2,H/2+28);
      ctx2.textAlign='left';ctx2.globalAlpha=1;
    }
    // ── Custom crosshair (mira) — always drawn when locked ──
    if(document.pointerLockElement===this.cv){
      const mx=this.mouse.x,my=this.mouse.y;
      const isPhaseX=this.phaseT>0,isFrenzyX=this.abilities.frenzy&&this.frenzySt>=3;
      const cc=isPhaseX?'#22d3ee':isFrenzyX?'#f97316':'#ef4444';
      ctx2.save();
      // Glow
      gl(ctx2,cc,8);
      // Outer ring
      ctx2.strokeStyle='rgba(255,255,255,.88)';ctx2.lineWidth=1.5;ctx2.lineCap='round';
      ctx2.beginPath();ctx2.arc(mx,my,9,0,Math.PI*2);ctx2.stroke();
      // 4 cross lines with gap
      const gap=5,len=16;
      ctx2.beginPath();
      ctx2.moveTo(mx-len,my);ctx2.lineTo(mx-gap,my);
      ctx2.moveTo(mx+gap,my);ctx2.lineTo(mx+len,my);
      ctx2.moveTo(mx,my-len);ctx2.lineTo(mx,my-gap);
      ctx2.moveTo(mx,my+gap);ctx2.lineTo(mx,my+len);
      ctx2.stroke();
      ng(ctx2);
      // Centre dot in crosshair colour
      ctx2.fillStyle=cc;ctx2.beginPath();ctx2.arc(mx,my,2.2,0,Math.PI*2);ctx2.fill();
      // While reloading: arc progress ring around crosshair
      if(P.rld>0){
        const prog=1-P.rld/P.rldT;
        ctx2.strokeStyle=cc;ctx2.lineWidth=2;ctx2.lineCap='butt';
        ctx2.beginPath();ctx2.arc(mx,my,14,-Math.PI/2,-Math.PI/2+Math.PI*2*prog);ctx2.stroke();
      }
      ctx2.restore();
    }
  }
  // ════════════════════════════════════════════════
  //  MULTIPLAYER (PeerJS position sync + lobby UI)
  // ════════════════════════════════════════════════
  _mpHostSetup(){
    this.lobby='hosting';this.mpMode='host';this.mpStatus='Creating room…';this.mpError='';
    const code=(Math.random().toString(36).substr(2,4)).toUpperCase();
    this.mpRoomCode=code;
    try{
      this.mpPeer=new Peer('ghz-'+code);
      this.mpPeer.on('open',()=>{this.mpStatus='Room '+code+'  ·  1 player';});
      this.mpPeer.on('connection',conn=>{
        const pid=conn.peer;
        conn.on('open',()=>{
          this.mpConns[pid]=conn;
          const col=this.mpColors[Object.keys(this.mpConns).length%this.mpColors.length];
          this.mpPlayers[pid]={x:this.W/2,y:this.H/2,hp:100,angle:0,nick:'Player',color:col,score:0,wave:1};
          conn.send({t:'welcome',color:col,hostNick:window.hubGetNick?.()});
          this.mpStatus='Room '+code+'  ·  '+(Object.keys(this.mpConns).length+1)+' players';
        });
        conn.on('data',d=>this._mpHandleData(d,pid));
        conn.on('close',()=>{delete this.mpConns[pid];delete this.mpPlayers[pid];this.mpStatus='Room '+code+'  ·  '+(Object.keys(this.mpConns).length+1)+' players';});
      });
      this.mpPeer.on('error',e=>{this.mpError='PeerJS error: '+e.type;this.mpMode=null;});
    }catch(e){this.mpError='PeerJS not available';this.mpMode=null;}
  }
  _mpClientSetup(code){
    if(this.mpMode==='client')return; // already connecting
    this.mpMode='client';this.mpStatus='Connecting to '+code+'…';this.mpError='';
    try{
      this.mpPeer=new Peer();
      this.mpPeer.on('open',()=>{
        const conn=this.mpPeer.connect('ghz-'+code);
        this.mpConns['host']=conn;
        conn.on('open',()=>{conn.send({t:'hello',nick:window.hubGetNick?.()});this.mpStatus='Connected!  Waiting for host…';this.lobby='waiting';});
        conn.on('data',d=>this._mpHandleData(d,'host'));
        conn.on('close',()=>{this.mpError='Disconnected';this.lobby='menu';this.mpMode=null;});
      });
      this.mpPeer.on('error',()=>{this.mpError='Cannot connect to: '+code;this.mpMode=null;this.lobby='joining';});
    }catch(e){this.mpError='PeerJS error';this.mpMode=null;}
  }
  _mpBroadcast(data){for(const c of Object.values(this.mpConns))try{c.send(data);}catch{}}
  _mpSync(){
    const P=this.P;
    const d={t:'pos',x:P.x|0,y:P.y|0,hp:Math.round(P.hp),angle:Math.round(P.angle*100)/100,score:this.score,wave:this.wave,nick:window.hubGetNick?.()};
    if(this.mpMode==='host'){this._mpBroadcast({...d,t:'hpos'});}
    else if(this.mpConns.host)try{this.mpConns.host.send(d);}catch{}
  }
  _mpHandleData(d,fromId){
    if(!d||!d.t)return;
    if(d.t==='welcome'){
      this.mpMyColor=d.color||'#ef4444';
      this.mpPlayers['host']={x:this.W/2,y:this.H/2,hp:100,angle:0,nick:d.hostNick||'Host',color:this.mpColors[0],score:0,wave:1};
    } else if(d.t==='hello'&&this.mpMode==='host'){
      if(!this.mpPlayers[fromId])this.mpPlayers[fromId]={x:this.W/2,y:this.H/2,hp:100,angle:0,nick:d.nick||'Player',color:this.mpColors[Object.keys(this.mpPlayers).length%this.mpColors.length],score:0,wave:1};
    } else if(d.t==='pos'&&this.mpMode==='host'){
      if(this.mpPlayers[fromId])Object.assign(this.mpPlayers[fromId],{x:d.x,y:d.y,hp:d.hp,angle:d.angle,score:d.score,wave:d.wave,nick:d.nick});
    } else if(d.t==='hpos'){
      if(!this.mpPlayers[fromId])this.mpPlayers[fromId]={color:this.mpColors[0]};
      Object.assign(this.mpPlayers[fromId],{x:d.x,y:d.y,hp:d.hp,angle:d.angle,score:d.score,wave:d.wave,nick:d.nick||'Host'});
    } else if(d.t==='start'){
      this.lobby='playing';
    }
  }
  _mpStartGame(){
    if(this.mpMode!=='host')return;
    this._mpBroadcast({t:'start'});
    this.lobby='playing';
  }
  _mpDestroy(){
    if(this.mpPeer)try{this.mpPeer.destroy();}catch{}
    this.mpPeer=null;this.mpConns={};
  }

  // ── Lobby click handler ──
  _handleLobbyClick(mx,my){
    if(!this._lbBtns)return;
    for(const b of this._lbBtns){if(mx>=b.x&&mx<=b.x+b.w&&my>=b.y&&my<=b.y+b.h){b.fn();return;}}
  }

  // ── Remote player circles ──
  _drawRemotePlayers(c){
    for(const[,p] of Object.entries(this.mpPlayers)){
      if(!p||p.x==null)continue;
      const col=p.color||'#3b82f6';
      c.save();
      gl(c,col,10);
      c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,15,0,Math.PI*2);c.stroke();
      ng(c);c.fillStyle=col;c.beginPath();c.arc(p.x,p.y,5,0,Math.PI*2);c.fill();
      // Aim line
      c.strokeStyle=col;c.lineWidth=1;c.globalAlpha=.4;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+Math.cos(p.angle||0)*22,p.y+Math.sin(p.angle||0)*22);c.stroke();c.globalAlpha=1;
      // HP bar
      const hf=Math.max(0,(p.hp||0)/100);
      bx(c,p.x-18,p.y-26,36,4,'#0d1625');bx(c,p.x-18,p.y-26,36*hf,4,hf>.5?'#22c55e':'#ef4444');
      // Nick + score
      c.fillStyle=col;c.font='bold 9px Orbitron,monospace';c.textAlign='center';c.fillText((p.nick||'').slice(0,10),p.x,p.y-31);
      c.fillStyle='#374151';c.font='8px Inter,sans-serif';c.fillText((p.score||0).toLocaleString(),p.x,p.y-22);
      c.textAlign='left';c.restore();
    }
  }

  // ── Lobby canvas UI ──
  _drawLobby(){
    const c=this.ctx,W=this.W,H=this.H,t=this.tick;
    c.fillStyle='#000209';c.fillRect(0,0,W,H);
    // Animated ember background
    for(const e of this.embers){c.globalAlpha=e.a*.4;c.fillStyle='#1e3a5f';c.beginPath();c.arc(e.x,e.y,e.r,0,Math.PI*2);c.fill();}
    c.globalAlpha=1;
    // Title
    gl(c,'#ef4444',28);c.fillStyle='#ef4444';c.font='bold 38px Orbitron,monospace';c.textAlign='center';
    c.fillText('ZOMBIE WAVES',W/2,H*.2);ng(c);
    c.fillStyle='#1e3a5f';c.font='10px Orbitron,monospace';
    c.fillText('SELECT MODE',W/2,H*.28);
    this._lbBtns=[];
    // Three mode buttons
    const bw=168,bh=82,gap=18,total=bw*3+gap*2,sx=W/2-total/2,by=H*.34;
    const drawBtn=(label,icon,x,y,active,fn)=>{
      const hov=this.mouse&&this.mouse.x>=x&&this.mouse.x<=x+bw&&this.mouse.y>=y&&this.mouse.y<=y+bh;
      c.fillStyle=active?'rgba(239,68,68,.18)':hov?'rgba(30,58,95,.45)':'rgba(8,18,30,.8)';
      c.strokeStyle=active?'#ef4444':hov?'#3b82f6':'#1e3a5f';c.lineWidth=hov||active?2:1;
      c.beginPath();c.roundRect(x,y,bw,bh,12);c.fill();c.stroke();
      c.fillStyle=active?'#f87171':hov?'#60a5fa':'#374151';
      c.font='26px serif';c.textAlign='center';c.fillText(icon,x+bw/2,y+bh*.46+10);
      c.font='bold 10px Orbitron,monospace';c.fillText(label,x+bw/2,y+bh*.84);
      c.textAlign='left';this._lbBtns.push({x,y,w:bw,h:bh,fn});
    };
    drawBtn('SOLO','🎮',sx,by,false,()=>{this.lobby='playing';this.mpMode=null;});
    drawBtn('HOST GAME','🌐',sx+bw+gap,by,this.lobby==='hosting',()=>{if(this.lobby==='menu'||this.lobby==='hosting')this._mpHostSetup();});
    drawBtn('JOIN GAME','🔗',sx+(bw+gap)*2,by,this.lobby==='joining'||this.lobby==='waiting',()=>{if(this.lobby==='menu'){this.lobby='joining';this.mpJoinCode='';this.mpError='';}});
    // Status / error
    const sy2=by+bh+22;
    if(this.mpError){gl(c,'#ef4444',8);c.fillStyle='#ef4444';c.font='11px Inter,sans-serif';c.textAlign='center';c.fillText(this.mpError,W/2,sy2);ng(c);}
    else if(this.mpStatus){c.fillStyle='#60a5fa';c.font='11px Orbitron,monospace';c.textAlign='center';c.fillText(this.mpStatus,W/2,sy2);}
    c.textAlign='left';
    // ── Hosting view ──
    if(this.lobby==='hosting'){
      const cy=sy2+22;
      c.fillStyle='rgba(6,15,28,.9)';c.strokeStyle='#1e3a5f';c.lineWidth=1;c.beginPath();c.roundRect(W/2-90,cy,180,50,10);c.fill();c.stroke();
      c.fillStyle='#475569';c.font='8px Inter,sans-serif';c.textAlign='center';c.fillText('ROOM CODE  —  SHARE WITH FRIENDS',W/2,cy+14);
      gl(c,'#ef4444',18);c.fillStyle='#f87171';c.font='bold 26px Orbitron,monospace';c.fillText(this.mpRoomCode||'…..',W/2,cy+40);ng(c);
      const pc=Object.keys(this.mpConns).length+1;
      c.fillStyle='#374151';c.font='9px Inter,sans-serif';c.fillText(pc+' player'+(pc!==1?'s':'')+' connected',W/2,cy+60);
      // START button
      const sbx=W/2-55,sby=cy+72,sbw=110,sbh=34;
      const sh=this.mouse&&this.mouse.x>=sbx&&this.mouse.x<=sbx+sbw&&this.mouse.y>=sby&&this.mouse.y<=sby+sbh;
      c.fillStyle=sh?'rgba(34,197,94,.25)':'rgba(34,197,94,.12)';c.strokeStyle=sh?'#22c55e':'#166534';c.lineWidth=sh?2:1;
      c.beginPath();c.roundRect(sbx,sby,sbw,sbh,8);c.fill();c.stroke();
      gl(c,'#22c55e',sh?12:5);c.fillStyle='#22c55e';c.font='bold 10px Orbitron,monospace';c.fillText('START GAME',W/2,sby+sbh/2+4);ng(c);c.textAlign='left';
      this._lbBtns.push({x:sbx,y:sby,w:sbw,h:sbh,fn:()=>this._mpStartGame()});
    }
    // ── Joining view ──
    if(this.lobby==='joining'){
      const cy=sy2+22;
      c.fillStyle='#6b7280';c.font='9px Inter,sans-serif';c.textAlign='center';c.fillText('TYPE 4-CHARACTER ROOM CODE',W/2,cy);
      const ibx=W/2-55,iby=cy+10,ibw=110,ibh=38;
      c.fillStyle='rgba(6,15,28,.9)';c.strokeStyle='#3b82f6';c.lineWidth=1.5;c.beginPath();c.roundRect(ibx,iby,ibw,ibh,8);c.fill();c.stroke();
      const cursor=Math.floor(t/30)%2?'|':' ';
      const display=this.mpJoinCode.padEnd(4,cursor).slice(0,4);
      gl(c,'#3b82f6',8);c.fillStyle='#93c5fd';c.font='bold 20px Orbitron,monospace';c.fillText(display,W/2,iby+ibh/2+7);ng(c);c.textAlign='left';
      if(this.mpJoinCode.length>=4){
        const cbx=W/2-44,cby=iby+ibh+10,cbw=88,cbh=30;
        const ch=this.mouse&&this.mouse.x>=cbx&&this.mouse.x<=cbx+cbw&&this.mouse.y>=cby&&this.mouse.y<=cby+cbh;
        c.fillStyle=ch?'rgba(59,130,246,.22)':'rgba(59,130,246,.1)';c.strokeStyle=ch?'#3b82f6':'#1e3a5f';c.lineWidth=ch?2:1;
        c.beginPath();c.roundRect(cbx,cby,cbw,cbh,6);c.fill();c.stroke();
        c.fillStyle='#60a5fa';c.font='bold 9px Orbitron,monospace';c.textAlign='center';c.fillText('CONNECT',W/2,cby+cbh/2+4);c.textAlign='left';
        this._lbBtns.push({x:cbx,y:cby,w:cbw,h:cbh,fn:()=>this._mpClientSetup(this.mpJoinCode)});
      }
    }
    // ── Waiting view ──
    if(this.lobby==='waiting'){
      const pulse=Math.sin(t*.06)*.5+.5;
      c.globalAlpha=.5+pulse*.5;c.fillStyle='#60a5fa';c.font='11px Orbitron,monospace';c.textAlign='center';
      c.fillText('WAITING FOR HOST TO START…',W/2,sy2+26);c.globalAlpha=1;c.textAlign='left';
    }
    // ── Back / close button ──
    const bkx=W/2-38,bky=H*.86,bkw=76,bkh=26;
    const bkh2=this.mouse&&this.mouse.x>=bkx&&this.mouse.x<=bkx+bkw&&this.mouse.y>=bky&&this.mouse.y<=bky+bkh;
    c.fillStyle=bkh2?'rgba(30,58,95,.5)':'rgba(8,18,30,.6)';c.strokeStyle=bkh2?'#3b82f6':'#0e1e30';c.lineWidth=1;
    c.beginPath();c.roundRect(bkx,bky,bkw,bkh,6);c.fill();c.stroke();
    c.fillStyle=bkh2?'#60a5fa':'#374151';c.font='9px Inter,sans-serif';c.textAlign='center';c.fillText('← BACK',W/2,bky+bkh/2+4);c.textAlign='left';
    this._lbBtns.push({x:bkx,y:bky,w:bkw,h:bkh,fn:()=>{this.lobby='menu';if(this.mpMode)this._mpDestroy();this.mpMode=null;this.mpStatus='';this.mpError='';}});
  }

  start(){const l=()=>{this.update();this.draw();raf=requestAnimationFrame(l);};l();}
}

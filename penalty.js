class PenaltyGame{
  constructor(cv){
    this.cv=cv;this.ctx=cv.getContext('2d');this.W=cv.width;this.H=cv.height;
    this.goal={x:this.W/2-165,y:105,w:330,h:195};
    this._reset();this._bind();
  }
  _reset(){
    this.state='aim';this.ball={x:this.W/2,y:this.H-105,r:15};
    this.bA={x:0,y:0,vx:0,vy:0,active:false,rot:0};
    this.keeper={x:this.W/2,y:this.goal.y+this.goal.h/2,dir:1,spd:4.5,diveX:null,diveY:null,diveAng:0};
    this.aimX=this.W/2;this.aimY=this.goal.y+this.goal.h/2;
    this.power=0;this.powerDir=1;
    this.result='';this.score=0;this.total=0;this.rT=0;this.over=false;this.parts=[];this.tick=0;this._scoreSub=false;
    this.willSave=false;this.sbx=0;this.sby=0;
    this.crowd=[];for(let i=0;i<70;i++)this.crowd.push({x:Math.random()*this.W,y:8+Math.random()*58,r:Math.random()*6+4,col:`hsl(${Math.random()*360},52%,${26+Math.random()*28}%)`,wave:Math.random()*Math.PI*2});
    this.crowdJoy=0;
  }
  _bind(){
    this._mv=e=>{
      if(this.state!=='aim')return;
      const r=this.cv.getBoundingClientRect(),g=this.goal;
      this.aimX=Math.max(g.x+12,Math.min(g.x+g.w-12,e.clientX-r.left));
      this.aimY=Math.max(g.y+10,Math.min(g.y+g.h-10,e.clientY-r.top));
    };
    this._dn=e=>{
      if(this.over&&this.state==='result'&&this.rT<=0){this._reset();return;}
      if(this.state==='aim'){this.state='power';this.power=0;this.powerDir=1;}
      else if(this.state==='power')this._shoot();
    };
    this.cv.addEventListener('mousemove',this._mv);this.cv.addEventListener('mousedown',this._dn);
  }
  destroy(){this.cv.removeEventListener('mousemove',this._mv);this.cv.removeEventListener('mousedown',this._dn);}

  _shoot(){
    this.state='shooting';const g=this.goal;
    const inac=(100-this.power)*.28;
    const tx=this.aimX+(Math.random()-.5)*inac,ty=this.aimY+(Math.random()-.5)*inac*.5;
    const bx2=Math.max(g.x+6,Math.min(g.x+g.w-6,tx)),by2=Math.max(g.y+6,Math.min(g.y+g.h-6,ty));
    const third=bx2<g.x+g.w/3?0:bx2<g.x+g.w*2/3?1:2;
    // 35% correct guess (down from 50%) — keeper is beatable
    const r=Math.random();let kT;
    if(r<.35)kT=third;else{const o=[0,1,2].filter(x=>x!==third);kT=o[Math.random()*2|0];}
    const dXs=[g.x+g.w*.18,g.x+g.w*.5,g.x+g.w*.82];
    this.keeper.diveX=dXs[kT];
    this.keeper.diveY=by2<g.y+g.h*.45?g.y+g.h*.3:by2>g.y+g.h*.65?g.y+g.h*.72:g.y+g.h*.5;
    this.keeper.diveAng=(kT===0?-.8:kT===2?.8:0);
    this.willSave=kT===third&&Math.abs(bx2-dXs[kT])<50&&Math.abs(by2-this.keeper.diveY)<65&&bx2>g.x&&bx2<g.x+g.w&&by2>g.y&&by2<g.y+g.h;
    this.sbx=bx2;this.sby=by2;
    const dx=bx2-this.ball.x,dy=by2-this.ball.y,l=Math.hypot(dx,dy)||1,spd=9+this.power*.08;
    this.bA={x:this.ball.x,y:this.ball.y,vx:(dx/l)*spd,vy:(dy/l)*spd,active:true,rot:0};
    this.total++;if(this.total>=5)this.over=true;
  }

  _puff(x,y,col){for(let i=0;i<22;i++){const a=Math.random()*Math.PI*2,s=Math.random()*5+2;this.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:Math.random()*7+2,life:45,max:45,col});}}
  _confetti(x,y){for(let i=0;i<45;i++){const a=Math.random()*Math.PI*2,s=Math.random()*7+3;this.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-5,r:Math.random()*5+2,life:80,max:80,col:`hsl(${Math.random()*360},90%,62%)`});}}

  update(){
    this.tick++;const k=this.keeper,g=this.goal;
    if(!k.diveX){k.x+=k.dir*k.spd;if(k.x>g.x+g.w-35||k.x<g.x+35)k.dir*=-1;}
    else{k.x+=(k.diveX-k.x)*.15;k.y+=(k.diveY-k.y)*.12;}
    if(this.state==='power'){this.power+=this.powerDir*2.4;if(this.power>=100){this.power=100;this.powerDir=-1;}if(this.power<=0){this.power=0;this.powerDir=1;}}
    if(this.bA.active){
      this.bA.x+=this.bA.vx;this.bA.y+=this.bA.vy;this.bA.rot+=.28;
      if(this.bA.y<=g.y+g.h){
        if(this.willSave){this.result='SAVED!';this._puff(this.bA.x,this.bA.y,'#3b82f6');}
        else if(this.sbx>g.x&&this.sbx<g.x+g.w&&this.sby>g.y&&this.sby<g.y+g.h){this.result='GOAL! ⚽';this.score++;this._confetti(this.bA.x,this.bA.y);this.crowdJoy=80;}
        else{this.result='MISS!';this._puff(this.bA.x,this.bA.y,'#ef4444');}
        this.bA.active=false;this.state='result';this.rT=100;
      }
    }
    if(this.state==='result'){this.rT--;if(this.rT<=0&&!this.over){this.state='aim';this.result='';k.diveX=null;k.diveY=null;k.x=this.W/2;k.y=g.y+g.h/2;this.bA.active=false;}}
    if(this.crowdJoy>0)this.crowdJoy--;
    this.parts=this.parts.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.12;p.vx*=.95;p.life--;return p.life>0;});
  }

  _drawKeeper(ctx){
    const k=this.keeper;ctx.save();ctx.translate(k.x,k.y);
    if(k.diveX){const side=k.diveX>this.goal.x+this.goal.w/2?1:-1;ctx.rotate(side*Math.min(.88,Math.abs(k.diveAng)));}
    ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(0,44,20,7,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#1e3a5f';ctx.fillRect(-16,28,32,22);
    ctx.strokeStyle='#fcd5a0';ctx.lineWidth=10;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-8,50);ctx.lineTo(-10,68);ctx.moveTo(8,50);ctx.lineTo(10,68);ctx.stroke();
    ctx.strokeStyle='#dc2626';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-9,62);ctx.lineTo(-10,68);ctx.moveTo(9,62);ctx.lineTo(10,68);ctx.stroke();
    ctx.fillStyle='#dc2626';ctx.beginPath();ctx.roundRect(-20,-38,40,70,8);ctx.fill();
    ctx.fillStyle='#b91c1c';ctx.fillRect(-20,-8,40,9);
    ctx.fillStyle='rgba(255,255,255,.45)';ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillText('1',0,5);ctx.textAlign='left';
    ctx.strokeStyle='#dc2626';ctx.lineWidth=14;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(-26,-22);ctx.moveTo(0,-18);ctx.lineTo(26,-22);ctx.stroke();
    gl(ctx,'#fbbf24',10);ci(ctx,-26,-22,13,'#ca8a04');ci(ctx,26,-22,13,'#ca8a04');ng(ctx);
    ci(ctx,0,-48,19,'#fcd5a0','#e4a070',2);
    ctx.fillStyle='#92400e';ctx.beginPath();ctx.arc(0,-58,13,Math.PI,0);ctx.fill();
    ci(ctx,-6,-50,3,'#1e3a8a');ci(ctx,6,-50,3,'#1e3a8a');
    ctx.strokeStyle='#92400e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,-42);ctx.lineTo(5,-42);ctx.stroke();
    ctx.restore();
  }

  draw(){
    const ctx=this.ctx,g=this.goal;
    const sky=ctx.createLinearGradient(0,0,0,this.H);sky.addColorStop(0,'#0c1445');sky.addColorStop(1,'#0a2010');ctx.fillStyle=sky;ctx.fillRect(0,0,this.W,this.H);
    for(const pos of[[80,0],[this.W-80,0]]){ctx.fillStyle='rgba(255,250,200,.05)';ctx.beginPath();ctx.ellipse(pos[0],pos[1],200,360,0,0,Math.PI*2);ctx.fill();}
    for(const p of this.crowd){const wave=this.crowdJoy>0?Math.sin(this.tick*.18+p.wave)*6:0;ci(ctx,p.x,p.y+wave,p.r,p.col);}
    ctx.fillStyle='rgba(0,0,10,.42)';ctx.fillRect(0,0,this.W,82);
    const gr=ctx.createLinearGradient(0,this.H*.33,0,this.H);gr.addColorStop(0,'#14532d');gr.addColorStop(1,'#052e16');ctx.fillStyle=gr;ctx.fillRect(0,this.H*.33,this.W,this.H);
    for(let i=0;i<10;i++){if(i%2===0){ctx.fillStyle='rgba(255,255,255,.013)';ctx.fillRect(i*this.W/10,this.H*.33,this.W/10,this.H);}}
    ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=2;ctx.strokeRect(this.W/2-200,this.H-200,400,180);ctx.strokeRect(this.W/2-90,this.H-200,180,90);ctx.beginPath();ctx.arc(this.W/2,this.H-105,112,Math.PI,0);ctx.stroke();
    gl(ctx,'#fff',5);ci(ctx,this.W/2,this.H-105,4,'rgba(255,255,255,.75)');ng(ctx);
    ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=1;
    for(let x=g.x;x<=g.x+g.w;x+=20){ctx.beginPath();ctx.moveTo(x,g.y);ctx.lineTo(x,g.y+g.h);ctx.stroke();}
    for(let y=g.y;y<=g.y+g.h;y+=20){ctx.beginPath();ctx.moveTo(g.x,y);ctx.lineTo(g.x+g.w,y);ctx.stroke();}
    ctx.fillStyle='rgba(255,255,255,.04)';
    ctx.beginPath();ctx.moveTo(g.x,g.y);ctx.lineTo(g.x+18,g.y+18);ctx.lineTo(g.x+18,g.y+g.h);ctx.lineTo(g.x,g.y+g.h);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(g.x+g.w,g.y);ctx.lineTo(g.x+g.w-18,g.y+18);ctx.lineTo(g.x+g.w-18,g.y+g.h);ctx.lineTo(g.x+g.w,g.y+g.h);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(g.x,g.y);ctx.lineTo(g.x+18,g.y+18);ctx.lineTo(g.x+g.w-18,g.y+18);ctx.lineTo(g.x+g.w,g.y);ctx.closePath();ctx.fill();
    gl(ctx,'#fff',7);ctx.strokeStyle='#f8fafc';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(g.x,g.y);ctx.lineTo(g.x,g.y+g.h);ctx.moveTo(g.x+g.w,g.y);ctx.lineTo(g.x+g.w,g.y+g.h);ctx.moveTo(g.x,g.y);ctx.lineTo(g.x+g.w,g.y);ctx.stroke();ng(ctx);
    if(this.state==='aim'||this.state==='power'){
      ctx.strokeStyle='rgba(250,204,21,.38)';ctx.lineWidth=1.5;ctx.setLineDash([8,7]);
      ctx.beginPath();ctx.moveTo(this.ball.x,this.ball.y-this.ball.r);ctx.lineTo(this.aimX,this.aimY);ctx.stroke();ctx.setLineDash([]);
      gl(ctx,'#facc15',12);ctx.strokeStyle='rgba(250,204,21,.55)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(this.aimX,this.aimY,14,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle='rgba(250,204,21,.25)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(this.aimX,this.aimY,22,0,Math.PI*2);ctx.stroke();ng(ctx);
      ctx.strokeStyle='rgba(255,255,255,.05)';ctx.lineWidth=1;ctx.setLineDash([4,4]);
      ctx.beginPath();ctx.moveTo(g.x+g.w/3,g.y);ctx.lineTo(g.x+g.w/3,g.y+g.h);ctx.stroke();
      ctx.beginPath();ctx.moveTo(g.x+g.w*2/3,g.y);ctx.lineTo(g.x+g.w*2/3,g.y+g.h);ctx.stroke();
      ctx.setLineDash([]);
    }
    this._drawKeeper(ctx);
    for(const p of this.parts){ctx.globalAlpha=p.life/p.max;ci(ctx,p.x,p.y,p.r,p.col);}ctx.globalAlpha=1;
    const bxx=this.bA.active?this.bA.x:this.ball.x,byy=this.bA.active?this.bA.y:this.ball.y;
    ctx.save();ctx.translate(bxx,byy);ctx.rotate(this.bA.active?this.bA.rot:0);
    gl(ctx,'rgba(255,255,255,.4)',12);ci(ctx,0,0,this.ball.r,'#fff');
    ctx.fillStyle='#1a1a1a';ci(ctx,0,0,6,'#1a1a1a');ci(ctx,0,-9,4,'#1a1a1a');ci(ctx,8,5,4,'#1a1a1a');ci(ctx,-8,5,4,'#1a1a1a');ng(ctx);ctx.restore();
    if(this.state==='power'){
      bx(ctx,this.W/2-105,this.H-65,210,24,'rgba(0,0,12,.72)',6);
      const pc=this.power<50?'#22c55e':this.power<80?'#f59e0b':'#ef4444';
      bx(ctx,this.W/2-105,this.H-65,this.power*2.1,24,pc,6);
      gl(ctx,pc,10);ctx.fillStyle='#fff';ctx.font='bold 10px Orbitron,monospace';ctx.textAlign='center';ctx.fillText('CLICK TO SHOOT',this.W/2,this.H-70);ctx.textAlign='left';ng(ctx);
    }
    if((this.state==='result'||this.state==='aim')&&this.result&&this.rT>0){
      const al=Math.min(1,this.rT/30);ctx.globalAlpha=al;
      const cols={'GOAL! ⚽':'#22c55e','SAVED!':'#ef4444','MISS!':'#f59e0b'};const col=cols[this.result]||'#fff';
      gl(ctx,col,35);ft(ctx,this.W/2,this.H/2+10,this.result,col,68);ng(ctx);ctx.globalAlpha=1;
    }
    for(let i=0;i<5;i++){const dx2=this.W/2-52+i*26,dy2=this.H-28,taken=i<this.total;if(taken){ci(ctx,dx2,dy2,8,i<this.score?'#22c55e':'#ef4444');}else ci(ctx,dx2,dy2,8,null,'#1f2937',2);}
    bx(ctx,10,10,192,55,'rgba(0,0,12,.85)',8);gl(ctx,'#fff',5);ctx.font='bold 18px Orbitron,monospace';ctx.fillStyle='#fff';ctx.fillText(`${this.score}  /  ${this.total}`,20,34);ng(ctx);
    ctx.fillStyle='#374151';ctx.font='11px Inter,sans-serif';ctx.fillText(`${Math.max(0,5-this.total)} kick${5-this.total!==1?'s':''} remaining`,20,52);
    // Instructions — small, bottom corner, not overlapping goal
    if(this.state==='aim'){
      ctx.globalAlpha=0.45;ctx.fillStyle='#4b5563';ctx.font='10px Inter,sans-serif';
      ctx.fillText('Aim corners · high power = accurate · Click → power → click shoot',20,this.H-12);
      ctx.globalAlpha=1;
    }
    if(this.over&&this.rT<=0){
      if(!this._scoreSub){this._scoreSub=true;window.hubSubmitScore?.('penalty',this.score,{total:this.total});}
      ctx.fillStyle='rgba(0,0,0,.87)';ctx.fillRect(0,0,this.W,this.H);ctx.textAlign='center';
      gl(ctx,'#fff',12);ft(ctx,this.W/2,this.H/2-55,'FULL TIME','#fff',50);ng(ctx);
      const col=this.score>=4?'#22c55e':this.score>=3?'#f59e0b':'#ef4444';
      gl(ctx,col,18);ft(ctx,this.W/2,this.H/2+5,`${this.score} / 5`,col,36);ng(ctx);
      const m=['Try again!','Practice more','Getting there','Good shots!','Sharp!','Perfect! 🏆'][this.score];
      ft(ctx,this.W/2,this.H/2+50,m,'#9ca3af',18);ft(ctx,this.W/2,this.H/2+88,'click to play again','#374151',13);ctx.textAlign='left';
    }
  }
  start(){const l=()=>{this.update();this.draw();raf=requestAnimationFrame(l);};l();}
}

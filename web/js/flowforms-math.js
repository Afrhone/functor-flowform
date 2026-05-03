
window.FlowMath = (()=>{
  const lerp=(a,b,t)=>a+(b-a)*t;
  const add=(a,b)=>[a[0]+b[0],a[1]+b[1]]; const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]]; const mul=(a,k)=>[a[0]*k,a[1]*k];
  const norm=a=>Math.hypot(a[0],a[1])||1e-9;
  function bezier(s,t){const u=1-t,p0=s.p0,c1=s.c1,c2=s.c2,p1=s.p1;return [u*u*u*p0[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*p1[0],u*u*u*p0[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*p1[1]]}
  function dbezier(s,t){const u=1-t,p0=s.p0,c1=s.c1,c2=s.c2,p1=s.p1;return [3*u*u*(c1[0]-p0[0])+6*u*t*(c2[0]-c1[0])+3*t*t*(p1[0]-c2[0]),3*u*u*(c1[1]-p0[1])+6*u*t*(c2[1]-c1[1])+3*t*t*(p1[1]-c2[1])]}
  function ddbezier(s,t){const u=1-t,p0=s.p0,c1=s.c1,c2=s.c2,p1=s.p1;return [6*u*(c2[0]-2*c1[0]+p0[0])+6*t*(p1[0]-2*c2[0]+c1[0]),6*u*(c2[1]-2*c1[1]+p0[1])+6*t*(p1[1]-2*c2[1]+c1[1])]}
  function cloneGlyph(g){return JSON.parse(JSON.stringify(g))}
  function features(g){let len=0,curv=0,loops=g.strokes.length,dots=(g.dots||[]).length; for(const s of g.strokes){let prev=bezier(s,0); for(let i=1;i<=32;i++){const t=i/32,p=bezier(s,t),v=dbezier(s,t),a=ddbezier(s,t); len+=norm(sub(p,prev)); curv+=Math.abs(v[0]*a[1]-v[1]*a[0])/Math.pow(norm(v),3); prev=p;}} return {length:len, curvature:curv/Math.max(1,loops*32), loops,dots};}
  function lagrangian(g, params, time=0){
    const alpha=params.curvature/100, beta=params.tension/100, rho=params.rhythm/100, mu=params.momentum/100;
    let kinetic=0, potential=0, rhythm=0; const ideal=420;
    for(const s of g.strokes){let prev=bezier(s,0); for(let i=1;i<=24;i++){const t=i/24,p=bezier(s,t),v=dbezier(s,t),a=ddbezier(s,t); const speed=norm(v); kinetic += 0.00001*mu*speed*speed; potential += 0.000001*alpha*norm(a)*norm(a)+0.00001*beta*Math.pow(speed-ideal,2); rhythm += 0.004*rho*Math.pow(Math.sin(6.283*(t+time)+0.01*p[0]),2); prev=p;}}
    return kinetic - potential - rhythm;
  }
  function modulate(g, params, time=0){
    const out=cloneGlyph(g); const center=[280,350]; const m=(params.morph||0)/100, rh=(params.rhythm||0)/100, br=(params.branching||0)/100, ax=(params.axis||0)/100, mom=(params.momentum||0)/100, tension=(params.tension||0)/100;
    for(let si=0; si<out.strokes.length; si++){
      const s=out.strokes[si]; ['p0','c1','c2','p1'].forEach((k,idx)=>{let p=s[k]; const dx=p[0]-center[0],dy=p[1]-center[1]; const r=Math.hypot(dx,dy)||1; const angle=Math.atan2(dy,dx); const swirl=0.06*m*Math.sin(time*1.3+si+idx); const radial=1+0.08*br*Math.sin(3*angle+time+si); const wave=rh*12*Math.sin((p[1]*0.018)+time*2+idx); const tangent=[-dy/r,dx/r]; const axisPull=ax*0.025*(center[0]-p[0]); p[0]=center[0]+Math.cos(angle+swirl)*r*radial + tangent[0]*wave + axisPull + mom*6*Math.sin(time+si); p[1]=center[1]+Math.sin(angle+swirl)*r*radial + tangent[1]*wave - tension*3*Math.cos(time+idx);});
      s.w=(s.w||7)*(0.85+(params.strokeWidth||4)/8);
    }
    return out;
  }
  function variant(g, seed, params){const out=cloneGlyph(g); const ph=seed*1.618; for(const s of out.strokes){['p0','c1','c2','p1'].forEach((k,i)=>{s[k][0]+=Math.sin(ph+i*2.1+s[k][1]*.01)*(params.curvature||50)*.12; s[k][1]+=Math.cos(ph+i*1.7+s[k][0]*.01)*(params.rhythm||50)*.10;});} return out;}
  function odeStep(state, params, dt){
    // q'' = -eta q' - grad(V_root + V_axis + V_rhythm).  State point is [x,y,vx,vy].
    const [x,y,vx,vy]=state, c=[280,350]; const eta=0.18+(params.tension||50)/260; const k=(params.axis||50)/14000; const omega=1.5+(params.rhythm||50)/35; const spiral=(params.momentum||50)/350;
    const dx=x-c[0], dy=y-c[1]; const ax=-eta*vx-k*dx + spiral*(-dy) + 12*Math.sin(omega*x*.01); const ay=-eta*vy-k*dy + spiral*(dx) + 12*Math.cos(omega*y*.01);
    return [x+vx*dt,y+vy*dt,vx+ax*dt,vy+ay*dt];
  }
  function toSvgPath(g){let d=''; for(const s of g.strokes){d+=`M ${s.p0[0].toFixed(2)} ${s.p0[1].toFixed(2)} C ${s.c1[0].toFixed(2)} ${s.c1[1].toFixed(2)}, ${s.c2[0].toFixed(2)} ${s.c2[1].toFixed(2)}, ${s.p1[0].toFixed(2)} ${s.p1[1].toFixed(2)} `;} return d.trim();}
  return {bezier,dbezier,ddbezier,features,lagrangian,modulate,variant,odeStep,toSvgPath,cloneGlyph};
})();

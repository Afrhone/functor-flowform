
window.FlowTensorAgent = (()=>{
  let model=null, labels=[];
  function vector(g){const f=FlowMath.features(g); return [Math.min(1,f.length/3000), Math.min(1,f.curvature/0.05), Math.min(1,f.loops/5), Math.min(1,f.dots/3), g.family==='axiom'?1:0, g.family==='rhythm'?1:0];}
  async function train(){
    if(!window.tf) return {ok:false, reason:'TensorFlow.js not loaded; app continues with deterministic ODE engine.'};
    const glyphs=FlowformsGlyphs.glyphs.filter(g=>g.char.length===1); labels=[...new Set(glyphs.map(g=>g.family))];
    const xs=tf.tensor2d(glyphs.map(vector)); const ys=tf.oneHot(tf.tensor1d(glyphs.map(g=>labels.indexOf(g.family)),'int32'), labels.length);
    model=tf.sequential(); model.add(tf.layers.dense({inputShape:[6],units:12,activation:'relu'})); model.add(tf.layers.dense({units:labels.length,activation:'softmax'}));
    model.compile({optimizer:'adam',loss:'categoricalCrossentropy'}); await model.fit(xs,ys,{epochs:18,verbose:0}); xs.dispose(); ys.dispose(); return {ok:true, labels};
  }
  async function classify(g){ if(!model||!window.tf) return {family:g.family,confidence:1,mode:'rule'}; const pred=model.predict(tf.tensor2d([vector(g)])); const data=await pred.data(); pred.dispose(); let best=0; data.forEach((v,i)=>{if(v>data[best]) best=i}); return {family:labels[best], confidence:+data[best].toFixed(3), mode:'tfjs'}; }
  function assertGlyph(g){const f=FlowMath.features(g); const issues=[]; if(f.length<80) issues.push('path too short: root trace lacks gesture'); if(f.curvature>0.12) issues.push('curvature spike: smooth handles or reduce tension'); if(g.strokes.length>8) issues.push('too many contours: consider ligature instead of glyph'); return {ok:issues.length===0, issues, features:f};}
  return {train,classify,assertGlyph};
})();

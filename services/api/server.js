import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import {nanoid} from 'nanoid';
import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const GLYPHS_FILE = process.env.GLYPHS_FILE || path.join(DATA_DIR, 'glyphs.json');
const PAGES_FILE = process.env.PAGES_FILE || path.join(DATA_DIR, 'pages.json');
const SSO_MODE = process.env.SSO_MODE || 'dev';
const app = express();
app.use(helmet({contentSecurityPolicy:false})); app.use(cors()); app.use(express.json({limit:'5mb'})); app.use(morgan('tiny'));
async function ensure(){await fs.mkdir(DATA_DIR,{recursive:true}); try{await fs.access(GLYPHS_FILE)}catch{const seed=await fs.readFile(path.join(__dirname,'../../cms/content/seed-glyphs.json'),'utf8').catch(()=>'{"glyphs":[]}'); await fs.writeFile(GLYPHS_FILE, seed)} try{await fs.access(PAGES_FILE)}catch{await fs.writeFile(PAGES_FILE, JSON.stringify([{id:'home',title:'Flowforms CMS',body:'Symbolic alphabet, ODE engine, and glyph planches.'}],null,2))}}
function auth(req,res,next){ if(SSO_MODE==='dev') return next(); const h=req.headers.authorization||''; if(!h.startsWith('Bearer ')) return res.status(401).json({error:'missing bearer token'}); // Production: wire jose remoteJWKSet with OIDC_ISSUER/OIDC_AUDIENCE.
  req.user={sub:'validated-by-upstream-proxy'}; next(); }
function validateGlyph(g){const issues=[]; if(!g.char) issues.push('char is required'); if(!Array.isArray(g.strokes)) issues.push('strokes array required'); if(g.strokes?.length>12) issues.push('too many contours for a single glyph'); return issues;}
app.get('/api/health',(_,res)=>res.json({ok:true, service:'flowforms-api', sso:SSO_MODE}));
app.get('/api/glyphs',auth,async(_,res)=>res.type('json').send(await fs.readFile(GLYPHS_FILE,'utf8')));
app.post('/api/glyphs',auth,async(req,res)=>{const issues=validateGlyph(req.body); if(issues.length) return res.status(422).json({ok:false,issues}); const data=JSON.parse(await fs.readFile(GLYPHS_FILE,'utf8')); req.body.id=req.body.id||nanoid(); data.glyphs.push(req.body); await fs.writeFile(GLYPHS_FILE,JSON.stringify(data,null,2)); res.json({ok:true,id:req.body.id});});
app.get('/api/cms/pages',auth,async(_,res)=>res.json(JSON.parse(await fs.readFile(PAGES_FILE,'utf8'))));
app.post('/api/cms/pages',auth,async(req,res)=>{const pages=JSON.parse(await fs.readFile(PAGES_FILE,'utf8')); const page={id:req.body.id||nanoid(),title:req.body.title||'Untitled',body:req.body.body||''}; pages.push(page); await fs.writeFile(PAGES_FILE,JSON.stringify(pages,null,2)); res.json({ok:true,page});});
app.post('/api/agent/assert',auth,(req,res)=>{const g=req.body; const issues=validateGlyph(g); const length=(g.strokes||[]).length; if(length<1) issues.push('empty glyph has no root trace'); res.json({ok:issues.length===0,issues,policy:'clarity-in-curve / contrast-with-calm / flow-with-purpose'});});
await ensure(); app.listen(process.env.PORT||8080,()=>console.log('flowforms api on',process.env.PORT||8080));

const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000;
const ROOT=__dirname, PUBLIC=ROOT, DATA=ROOT;
function jsonFile(name, fallback){const f=path.join(DATA,name);try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){fs.writeFileSync(f,JSON.stringify(fallback,null,2));return fallback}}
function save(name,obj){fs.writeFileSync(path.join(DATA,name),JSON.stringify(obj,null,2))}
function send(res,status,obj){res.writeHead(status,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(obj))}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>s+=c);req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}})})}
const sessions=new Map();
const server=http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type,Authorization'});return res.end()}
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/api/health') return send(res,200,{ok:true,service:'Line Balancing Website'});
  if(u.pathname==='/api/login' && req.method==='POST'){
    try{const b=await body(req), users=jsonFile('users.json',{}), key=Object.keys(users).find(k=>k.toLowerCase()===String(b.user||'').trim().toLowerCase());
      if(!key||users[key].password!==b.password)return send(res,401,{ok:false,message:'Invalid User ID or Password'});
      const token=crypto.randomBytes(24).toString('hex');sessions.set(token,{user:key,...users[key]});return send(res,200,{ok:true,token,user:key,role:users[key].role,line:users[key].line||null});
    }catch(e){return send(res,400,{ok:false,message:'Invalid request'})}
  }
  if(u.pathname==='/api/me'){const t=(req.headers.authorization||'').replace(/^Bearer\s+/,'');return send(res,sessions.has(t)?200:401,sessions.get(t)||{ok:false})}
  if(u.pathname==='/api/users' && req.method==='GET') return send(res,200,jsonFile('users.json',{}));
  if(u.pathname==='/api/users' && req.method==='POST'){
    try{const b=await body(req), users=jsonFile('users.json',{});if(!b.user||!b.password||!b.role)return send(res,400,{message:'user,password,role required'});if(users[b.user])return send(res,409,{message:'User already exists'});users[b.user]={password:b.password,role:b.role,line:b.line||null};save('users.json',users);return send(res,201,{ok:true,user:b.user})}catch(e){return send(res,400,{message:'Invalid request'})}
  }
  let file=u.pathname==='/'?path.join(PUBLIC,'index.html'):path.join(PUBLIC,u.pathname.replace(/^\//,''));
  if(!file.startsWith(PUBLIC))return send(res,403,{message:'Forbidden'});
  fs.stat(file,(err,st)=>{if(err||!st.isFile())return send(res,404,{message:'Not found'});const ext=path.extname(file),types={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json'};res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});fs.createReadStream(file).pipe(res)})
});
server.listen(PORT,()=>console.log(`Line Balancing Website running on port ${PORT}`));

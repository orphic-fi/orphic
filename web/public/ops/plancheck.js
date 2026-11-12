// Plan validation and read-back checks for the signer page (deploy.html). Pure logic, no network of its own: the page passes `io`.
// FAIL CLOSED: a plan field, step field or check kind this file does not know is an error and the page refuses to sign that plan.
// Check semantics are the same as ops/replay_plan.py run_check:
//   {to,data,expect}  exact 32-byte-aligned result      {to,data,gte}   integer result >= gte
//   {to,data,word:i,expect}  32-byte word i equals expect   {codehash:addr,expect}  keccak256(code at addr) equals expect
//   {codeof:addr|$created,contains:0x<20 bytes>}  the runtime code at addr contains those bytes (a linked library)
//   {to,data}         result is non-zero
(function(){
const TOP=['name','deployer','chainId','script','steps','verify','logs','signer','role','nonce','bigBlocks','waitBeforeSeconds','waitFromPlan','notBeforeCall','precheck'];
const STEP=['title','what','to','data','value','gas','readbacks','contractName','predictedAddress','arguments','calls','needsBigBlock'];
const CHECK=['label','to','data','expect','gte','word','codehash','codeof','contains'];
const NBC=['to','data','plus','note'];
const isHex=s=>typeof s==='string'&&/^0x[0-9a-fA-F]*$/.test(s);
const isAddr=s=>typeof s==='string'&&/^0x[0-9a-fA-F]{40}$/.test(s);
const isUInt=n=>Number.isInteger(n)&&n>=0;

function validateCheck(c,where,errs,allowCreated){
  if(c===null||typeof c!=='object'||Array.isArray(c)){errs.push(`${where}: check is not an object`);return;}
  for(const k of Object.keys(c))if(!CHECK.includes(k))errs.push(`${where}: unknown check field "${k}"`);
  if(typeof c.label!=='string')errs.push(`${where}: check has no label`);
  if(c.codeof!==undefined){
    if(!(isAddr(c.codeof)||(allowCreated&&c.codeof==='$created')))errs.push(`${where}: codeof is not an address`);
    if(!isHex(c.contains)||c.contains.length!==42)errs.push(`${where}: codeof needs "contains" = 20 bytes`);
    for(const k of ['to','data','gte','word','expect','codehash'])if(c[k]!==undefined)errs.push(`${where}: codeof cannot be combined with "${k}"`);
    return;
  }
  if(c.codehash!==undefined){
    if(!isAddr(c.codehash))errs.push(`${where}: codehash is not an address`);
    if(!isHex(c.expect)||c.expect.length!==66)errs.push(`${where}: codehash needs a 32-byte expect`);
    for(const k of ['to','data','gte','word'])if(c[k]!==undefined)errs.push(`${where}: codehash cannot be combined with "${k}"`);
    return;
  }
  if(!(isAddr(c.to)||(allowCreated&&c.to==='$created')))errs.push(`${where}: check "to" is not an address`);
  if(!isHex(c.data))errs.push(`${where}: check "data" is not hex`);
  if(c.gte!==undefined){
    if(c.expect!==undefined||c.word!==undefined)errs.push(`${where}: gte cannot be combined with expect/word`);
    try{BigInt(c.gte);}catch(e){errs.push(`${where}: gte is not an integer`);}
  }else if(c.word!==undefined){
    if(!isUInt(c.word))errs.push(`${where}: word is not a non-negative integer`);
    if(!isHex(c.expect)||c.expect.length!==66)errs.push(`${where}: word needs a 32-byte expect`);
  }else if(c.expect!==undefined&&c.expect!==null&&!isHex(c.expect))errs.push(`${where}: expect is not hex`); // legacy plans carry expect:null = non-zero check
}

// returns an array of error strings (empty = the page understands every field of this plan)
function validatePlan(p){
  const errs=[];
  if(p===null||typeof p!=='object'||Array.isArray(p))return['plan is not an object'];
  for(const k of Object.keys(p))if(!TOP.includes(k))errs.push(`unknown plan field "${k}"`);
  if(p.chainId!==999)errs.push('chainId is not 999');
  if(!isAddr(p.deployer))errs.push('plan has no deployer address');
  if(p.signer!==undefined&&(!isAddr(p.signer)||p.signer.toLowerCase()!==String(p.deployer).toLowerCase()))errs.push('signer differs from deployer: this page signs as the deployer only');
  if(p.nonce!==undefined&&!isUInt(p.nonce))errs.push('nonce is not a non-negative integer');
  if(p.bigBlocks!==undefined&&typeof p.bigBlocks!=='boolean')errs.push('bigBlocks is not a boolean');
  if(p.role!==undefined&&typeof p.role!=='string')errs.push('role is not a string');
  if(p.waitBeforeSeconds!==undefined&&!isUInt(p.waitBeforeSeconds))errs.push('waitBeforeSeconds is not a non-negative integer');
  if(p.waitFromPlan!==undefined&&typeof p.waitFromPlan!=='string')errs.push('waitFromPlan is not a string');
  if(p.waitFromPlan!==undefined&&p.waitBeforeSeconds===undefined)errs.push('waitFromPlan without waitBeforeSeconds');
  if(p.notBeforeCall!==undefined){
    const n=p.notBeforeCall;
    if(n===null||typeof n!=='object')errs.push('notBeforeCall is not an object');
    else{for(const k of Object.keys(n))if(!NBC.includes(k))errs.push(`unknown notBeforeCall field "${k}"`);
      if(!isAddr(n.to)||!isHex(n.data))errs.push('notBeforeCall needs to and data');
      if(n.plus!==undefined&&!isUInt(n.plus))errs.push('notBeforeCall.plus is not a non-negative integer');}
  }
  if(p.precheck!==undefined){if(!Array.isArray(p.precheck))errs.push('precheck is not an array');else p.precheck.forEach((c,i)=>validateCheck(c,`precheck[${i}]`,errs,false));}
  if(p.verify!==undefined){if(!Array.isArray(p.verify))errs.push('verify is not an array');else p.verify.forEach((c,i)=>validateCheck(c,`verify[${i}]`,errs,false));}
  if(!Array.isArray(p.steps)||!p.steps.length)errs.push('plan has no steps');
  else p.steps.forEach((s,i)=>{
    const w=`step ${i+1}`;
    if(s===null||typeof s!=='object'){errs.push(`${w}: not an object`);return;}
    for(const k of Object.keys(s))if(!STEP.includes(k))errs.push(`${w}: unknown step field "${k}"`);
    if(!isHex(s.data))errs.push(`${w}: data is not hex`);
    if(s.to!==null&&s.to!==undefined&&!isAddr(s.to))errs.push(`${w}: to is not an address`);
    if(s.needsBigBlock!==undefined&&typeof s.needsBigBlock!=='boolean')errs.push(`${w}: needsBigBlock is not a boolean`);
    if(s.readbacks!==undefined){if(!Array.isArray(s.readbacks))errs.push(`${w}: readbacks is not an array`);else s.readbacks.forEach((c,j)=>validateCheck(c,`${w} readback ${j+1}`,errs,true));}
  });
  return errs;
}

const hexInt=h=>BigInt(h===''||h==='0x'?'0x0':h);
// one check -> {ok, got}. io: {call(to,data)->hex, getCode(addr)->hex, keccak(hexNo0x)->hex no 0x}. `created` replaces "$created".
async function evalCheck(c,io,created){
  if(c.codeof!==undefined){
    const code=await io.getCode(c.codeof==='$created'?created:c.codeof);
    return{ok:code.length>2&&code.toLowerCase().includes(c.contains.toLowerCase().slice(2)),got:`${Math.max(0,(code.length-2)/2)} bytes`};
  }
  if(c.codehash!==undefined){
    const code=await io.getCode(c.codehash);
    const got='0x'+io.keccak(code.slice(2));
    return{ok:code!=='0x'&&got.toLowerCase()===c.expect.toLowerCase(),got};
  }
  const to=c.to==='$created'?created:c.to;
  const got=await io.call(to,c.data);
  if(c.gte!==undefined)return{ok:hexInt(got)>=BigInt(c.gte),got};
  if(c.word!==undefined){const b=got.slice(2),w='0x'+b.slice(c.word*64,(c.word+1)*64);return{ok:w.length===66&&w.toLowerCase()===c.expect.toLowerCase(),got};}
  if(c.expect!==undefined&&c.expect!==null)return{ok:got.toLowerCase()===c.expect.toLowerCase(),got};
  return{ok:got.length>2&&/[^0]/.test(got.slice(2)),got};
}
async function runChecks(list,io){const out=[];for(const c of list||[]){let r;try{r=await evalCheck(c,io);}catch(e){r={ok:false,got:'error '+e.message};}out.push({label:c.label,ok:r.ok,got:r.got});}return out;}

// earliest allowed start (unix seconds) from the plan's declared waits, or {needsRef:true} when a reference tx is required and missing.
// io: {txTimestamp(hash)->number, call(to,data)}
async function earliestStart(p,io,refTx){
  let earliest=0;const notes=[];
  if(p.waitBeforeSeconds!==undefined){
    if(!refTx)return{needsRef:true,earliest:null,notes:[`wait ${p.waitBeforeSeconds}s after the last transaction of ${p.waitFromPlan||'the previous phase'}: paste its tx hash`]};
    const t=await io.txTimestamp(refTx);earliest=Math.max(earliest,t+p.waitBeforeSeconds);notes.push(`${p.waitBeforeSeconds}s after the reference tx (block time ${t})`);
  }
  if(p.notBeforeCall){const v=Number(hexInt(await io.call(p.notBeforeCall.to,p.notBeforeCall.data)))+(p.notBeforeCall.plus||0);earliest=Math.max(earliest,v);notes.push(`not before call(${p.notBeforeCall.to}) + ${p.notBeforeCall.plus||0} = ${v}`);}
  return{needsRef:false,earliest:earliest||null,notes};
}

// the whole gate before step 1: signer, nonce, wait, prechecks. io adds {nonce(addr)->int, latestTimestamp()->int}.
async function gate(p,io,account,refTx){
  const items=[];let ok=true;const add=(l,g,x)=>{items.push({label:l,ok:g,got:x});if(!g)ok=false;};
  if(!account)add('wallet connected',false,'connect first');
  else{
    add('connected account is the plan signer',account.toLowerCase()===p.deployer.toLowerCase(),account);
    if(p.nonce!==undefined){const n=await io.nonce(account);add(`account nonce == plan nonce ${p.nonce} (CREATE addresses depend on it; if not, regenerate the plan)`,n===p.nonce,String(n));}
  }
  const w=await earliestStart(p,io,refTx);
  if(w.needsRef)add(w.notes[0],false,'waiting for the reference tx hash');
  else if(w.earliest){const now=await io.latestTimestamp();add(`earliest allowed start ${new Date(w.earliest*1000).toISOString()} (chain time ${new Date(now*1000).toISOString()})`,now>=w.earliest,String(w.earliest));}
  for(const r of await runChecks(p.precheck,io))add('precheck: '+r.label,r.ok,r.got);
  return{ok,items,earliest:w.earliest};
}
const api={validatePlan,evalCheck,runChecks,earliestStart,gate,TOP,STEP,CHECK};
if(typeof window!=='undefined')window.plancheck=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();

// Offline test of the signer page's plan checks (web/public/ops/plancheck.js and the inline script of deploy.html).
// Plain Node, no network, no dependencies: `node web/ops-tests/plancheck.test.cjs` (the web/ package has no test runner).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
// web/package.json is "type":"module", so these browser scripts (UMD-style, plain script tags in the page) are loaded as scripts
const loadScript=f=>{const m={exports:{}};new Function('module','exports',fs.readFileSync(path.join(__dirname,'../public/ops',f),'utf8'))(m,m.exports);return m.exports;};
const pc=loadScript('plancheck.js');
const {keccak256}=loadScript('keccak.js');

const opsDir=path.join(__dirname,'../public/ops');
const fixDir=path.join(__dirname,'fixtures');
const old=fs.readdirSync(opsDir).filter(f=>/^plan\d+\.json$/.test(f)).map(f=>[path.join('public/ops',f),path.join(opsDir,f)]);
const fix=['a-deploy','b-submit','c-execute','d-cutover'].map(f=>[`ops-tests/fixtures/${f}.json`,path.join(fixDir,`${f}.json`)]);
const load=f=>JSON.parse(fs.readFileSync(f,'utf8'));
let n=0;const t=async(name,fn)=>{await fn();n++;console.log('ok  '+name);};

(async()=>{
await t('the inline script of deploy.html parses and wires plancheck',()=>{
  const html=fs.readFileSync(path.join(opsDir,'deploy.html'),'utf8');
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  assert.equal(scripts.length,1);new vm.Script(scripts[0]);
  assert.ok(html.includes('<script src="/ops/plancheck.js"></script>'));
  assert.ok(/plancheck\.validatePlan/.test(scripts[0])&&/plancheck\.gate/.test(scripts[0])&&/plancheck\.evalCheck/.test(scripts[0]));
});

const used={top:new Set(),step:new Set(),check:new Set()};
for(const [name,file] of [...old,...fix]){
  await t(`every field of ${name} is understood`,()=>{
    const p=load(file);assert.deepEqual(pc.validatePlan(p),[]);
    Object.keys(p).forEach(k=>{assert.ok(pc.TOP.includes(k),k);used.top.add(k);});
    for(const s of p.steps){Object.keys(s).forEach(k=>{assert.ok(pc.STEP.includes(k),k);used.step.add(k);});
      for(const c of s.readbacks||[])Object.keys(c).forEach(k=>{assert.ok(pc.CHECK.includes(k),k);used.check.add(k);});}
    for(const c of [...(p.verify||[]),...(p.precheck||[])])Object.keys(c).forEach(k=>{assert.ok(pc.CHECK.includes(k),k);used.check.add(k);});
  });
}
await t('the fixtures exercise every new field (nothing is untested)',()=>{
  for(const k of ['signer','role','nonce','bigBlocks','waitBeforeSeconds','waitFromPlan','precheck'])assert.ok(used.top.has(k),'top '+k);
  assert.ok(used.step.has('needsBigBlock'));
  for(const k of ['gte','word','codehash','codeof','contains'])assert.ok(used.check.has(k),'check '+k);
});
await t('the keeper settle plan (signer is not the deployer) is refused: the page signs only as the plan deployer',()=>{
  const errs=pc.validatePlan(load(path.join(fixDir,'s-old-settle.json')));
  assert.ok(errs.some(e=>/no deployer/.test(e)),errs.join('|'));
});

// unknown fields: refused and named
const base=()=>load(path.join(fixDir,'b-submit.json'));
await t('unknown top-level field is refused and named',()=>{const p=base();p.surprise=1;assert.ok(pc.validatePlan(p).some(e=>e.includes('"surprise"')));});
await t('unknown step field is refused and named',()=>{const p=base();p.steps[0].gasPrice='0x1';assert.ok(pc.validatePlan(p).some(e=>e.includes('step 1')&&e.includes('"gasPrice"')));});
await t('unknown check field / kind is refused and named',()=>{const p=base();p.precheck[0].lte='0x1';assert.ok(pc.validatePlan(p).some(e=>e.includes('precheck[0]')&&e.includes('"lte"')));});
await t('unknown notBeforeCall field is refused',()=>{const p=base();p.notBeforeCall={to:p.deployer,data:'0x',foo:1};assert.ok(pc.validatePlan(p).some(e=>e.includes('"foo"')));});
await t('a gte check combined with expect (which would hide it) is refused',()=>{const p=base();p.precheck[0].gte=1;p.precheck[0].expect='0x'+'00'.repeat(32);assert.ok(pc.validatePlan(p).some(e=>/gte cannot/.test(e)));});
await t('a word check without a 32-byte expect is refused',()=>{const p=base();p.precheck[0]={label:'w',to:p.deployer,data:'0x',word:0};assert.ok(pc.validatePlan(p).some(e=>/word needs/.test(e)));});
await t('signer other than deployer / wrong chain / no steps are refused',()=>{
  let p=base();p.signer='0x'+'11'.repeat(20);assert.ok(pc.validatePlan(p).some(e=>/signer differs/.test(e)));
  p=base();p.chainId=1;assert.ok(pc.validatePlan(p).some(e=>/chainId/.test(e)));
  p=base();p.steps=[];assert.ok(pc.validatePlan(p).some(e=>/no steps/.test(e)));
});

// check semantics: gte / word / codehash are NOT weakened to "non-zero"
const word=n=>'0x'+BigInt(n).toString(16).padStart(64,'0');
const mkio=(calls,codes={},extra={})=>({call:async(to,data)=>{const k=`${to.toLowerCase()}:${data}`;if(!(k in calls))throw new Error('unexpected call '+k);return calls[k];},getCode:async a=>codes[a.toLowerCase()]||'0x',keccak:h=>keccak256(Buffer.from(h,'hex')),...extra});
const A='0x'+'aa'.repeat(20);
await t('gte is a real comparison: non-zero but below the bound FAILS',async()=>{
  const c={label:'g',to:A,data:'0x01',gte:100};
  assert.equal((await pc.evalCheck(c,mkio({[`${A}:0x01`]:word(1)}))).ok,false);
  assert.equal((await pc.evalCheck(c,mkio({[`${A}:0x01`]:word(99)}))).ok,false);
  assert.equal((await pc.evalCheck(c,mkio({[`${A}:0x01`]:word(100)}))).ok,true);
  assert.equal((await pc.evalCheck({...c,gte:'0x64'},mkio({[`${A}:0x01`]:word(101)}))).ok,true);
  assert.equal((await pc.evalCheck(c,mkio({[`${A}:0x01`]:word(0)}))).ok,false);
});
await t('word compares word i only; a non-zero but different word FAILS',async()=>{
  const c={label:'w',to:A,data:'0x02',word:1,expect:word(7)};
  assert.equal((await pc.evalCheck(c,mkio({[`${A}:0x02`]:word(1)+word(7).slice(2)}))).ok,true);
  assert.equal((await pc.evalCheck(c,mkio({[`${A}:0x02`]:word(7)+word(1).slice(2)}))).ok,false);
  assert.equal((await pc.evalCheck(c,mkio({[`${A}:0x02`]:word(1)+word(8).slice(2)}))).ok,false);
});
await t('codeof/contains checks the runtime code for the library address; $created resolves',async()=>{
  const lib='0x'+'bb'.repeat(20);const code='0x6080'+'bb'.repeat(20)+'00';
  const c={label:'e',codeof:'$created',contains:lib};
  assert.equal((await pc.evalCheck(c,mkio({},{[A]:code}),A)).ok,true);
  assert.equal((await pc.evalCheck(c,mkio({},{[A]:'0x6080'+'cc'.repeat(20)}),A)).ok,false);
  assert.equal((await pc.evalCheck(c,mkio({},{}),A)).ok,false);
  assert.ok(pc.validatePlan({...base(),precheck:[{label:'x',codeof:'$created',contains:lib}]}).some(e=>/codeof is not an address/.test(e)),'$created only in step read-backs');
});
await t('codehash hashes the code; missing code or another hash FAILS',async()=>{
  const code='0x6001600055';const h='0x'+keccak256(Buffer.from(code.slice(2),'hex'));
  const c={label:'h',codehash:A,expect:h};
  assert.equal((await pc.evalCheck(c,mkio({},{[A]:code}))).ok,true);
  assert.equal((await pc.evalCheck(c,mkio({},{[A]:'0x6001600056'}))).ok,false);
  assert.equal((await pc.evalCheck(c,mkio({},{}))).ok,false);
});
await t('exact expect, non-zero and legacy expect:null keep their meaning',async()=>{
  const k=`${A}:0x03`;
  assert.equal((await pc.evalCheck({label:'e',to:A,data:'0x03',expect:word(5)},mkio({[k]:word(5)}))).ok,true);
  assert.equal((await pc.evalCheck({label:'e',to:A,data:'0x03',expect:word(5)},mkio({[k]:word(6)}))).ok,false);
  assert.equal((await pc.evalCheck({label:'n',to:A,data:'0x03'},mkio({[k]:word(0)}))).ok,false);
  assert.equal((await pc.evalCheck({label:'n',to:A,data:'0x03',expect:null},mkio({[k]:word(2)}))).ok,true);
});

// gate: nonce, wait, precheck
const dep='0x2DBE1Ba83084dAF698Acea79CBAfe0493f42FecC';
const gp=(over={})=>({name:'g',deployer:dep,chainId:999,nonce:27,steps:[{title:'t',what:'w',to:A,data:'0x',value:'0x0',gas:'0x5208',readbacks:[]}],precheck:[{label:'pc',to:A,data:'0x04',gte:5}],...over});
const gio=(o={})=>mkio({[`${A}:0x04`]:word(o.pre??9)},{},{nonce:async()=>o.nonce??27,latestTimestamp:async()=>o.now??1000,txTimestamp:async()=>o.refTs??500});
await t('gate passes only when signer, nonce, wait and every precheck hold',async()=>{
  assert.equal((await pc.gate(gp(),gio(),dep)).ok,true);
  assert.equal((await pc.gate(gp(),gio(),null)).ok,false,'no wallet');
  assert.equal((await pc.gate(gp(),gio(),'0x'+'22'.repeat(20))).ok,false,'wrong account');
  assert.equal((await pc.gate(gp(),gio({nonce:28}),dep)).ok,false,'nonce mismatch');
  assert.equal((await pc.gate(gp(),gio({pre:4}),dep)).ok,false,'precheck gte fails');
});
await t('waits: earliest start is shown and the gate stays closed before it',async()=>{
  const p=gp({waitBeforeSeconds:300,waitFromPlan:'b-submit.json'});
  let g=await pc.gate(p,gio(),dep);assert.equal(g.ok,false);assert.ok(g.items.some(i=>/paste its tx hash/.test(i.label)));
  g=await pc.gate(p,gio({refTs:500,now:799}),dep,'0xabc');assert.equal(g.ok,false);assert.equal(g.earliest,800);
  g=await pc.gate(p,gio({refTs:500,now:800}),dep,'0xabc');assert.equal(g.ok,true);
  const nb=gp({notBeforeCall:{to:A,data:'0x05',plus:10}});
  const io2=mkio({[`${A}:0x04`]:word(9),[`${A}:0x05`]:word(2000)},{},{nonce:async()=>27,latestTimestamp:async()=>2009});
  assert.equal((await pc.gate(nb,io2,dep)).ok,false);
  io2.latestTimestamp=async()=>2010;assert.equal((await pc.gate(nb,io2,dep)).ok,true);
});
await t('every precheck, and every verify, of the fixtures evaluates (exact, gte, word) against a state that satisfies it',async()=>{
  for(const [name,file] of fix){const p=load(file);
    for(const list of [p.precheck||[],p.verify||[]]){ // separate states: C reads executableAt as >=1 before and 0 after
      const calls={};for(const c of list){if(c.codehash)continue;
        calls[`${c.to.toLowerCase()}:${c.data}`]=c.word!==undefined?'0x'+'00'.repeat(32*c.word)+c.expect.slice(2):c.gte!==undefined?word(c.gte):(c.expect||word(1));}
      const io=mkio(calls);
      for(const c of list){if(c.codehash)continue;assert.equal((await pc.evalCheck(c,io)).ok,true,`${name}: ${c.label}`);}
    }
  }
});
console.log(`\n${n} tests passed`);
})().catch(e=>{console.error('FAIL',e);process.exit(1);});

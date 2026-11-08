// Minimal keccak-256 (Keccak-f[1600], rate 1088, padding 0x01). Returns hex without 0x. No dependencies.
(function(){
const RC=[1n,0x8082n,0x800000000000808an,0x8000000080008000n,0x808bn,0x80000001n,0x8000000080008081n,0x8000000000008009n,0x8an,0x88n,0x80008009n,0x8000000an,0x8000808bn,0x800000000000008bn,0x8000000000008089n,0x8000000000008003n,0x8000000000008002n,0x8000000000000080n,0x800an,0x800000008000000an,0x8000000080008081n,0x8000000000008080n,0x80000001n,0x8000000080008008n];
const R=[0,1,62,28,27,36,44,6,55,20,3,10,43,25,39,41,45,15,21,8,18,2,61,56,14];
const M=(1n<<64n)-1n;
const rot=(x,n)=>n===0?x:(((x<<BigInt(n))|(x>>BigInt(64-n)))&M);
function f(s){for(let r=0;r<24;r++){const C=[];for(let x=0;x<5;x++)C[x]=s[x]^s[x+5]^s[x+10]^s[x+15]^s[x+20];const D=[];for(let x=0;x<5;x++)D[x]=C[(x+4)%5]^rot(C[(x+1)%5],1);for(let i=0;i<25;i++)s[i]^=D[i%5];const B=new Array(25);for(let x=0;x<5;x++)for(let y=0;y<5;y++){B[y+5*((2*x+3*y)%5)]=rot(s[x+5*y],R[x+5*y]);}for(let x=0;x<5;x++)for(let y=0;y<5;y++){s[x+5*y]=B[x+5*y]^((~B[(x+1)%5+5*y]&M)&B[(x+2)%5+5*y]);}s[0]^=RC[r];}}
function keccak256(bytes){const rate=136;const s=new Array(25).fill(0n);const p=new Uint8Array(Math.ceil((bytes.length+1)/rate)*rate);p.set(bytes);p[bytes.length]^=0x01;p[p.length-1]^=0x80;for(let o=0;o<p.length;o+=rate){for(let i=0;i<rate/8;i++){let v=0n;for(let b=7;b>=0;b--)v=(v<<8n)|BigInt(p[o+i*8+b]);s[i]^=v;}f(s);}let out='';for(let i=0;i<4;i++){let v=s[i];for(let b=0;b<8;b++){out+=Number(v&255n).toString(16).padStart(2,'0');v>>=8n;}}return out;}
if(typeof window!=="undefined")window.keccak256=keccak256;if(typeof module!=="undefined"&&module.exports)module.exports={keccak256};
})();

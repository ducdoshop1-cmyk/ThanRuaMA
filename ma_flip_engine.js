// MA Flip Engine — 18 MA types + Backtest
let allResults=[],lengths=[],maTypes=[],mexcFutSymbols=[],binanceSymbols=[],selectedSymbol='BTC_USDT',searchTimeout=null;
let cachedStableZones=null,currentExchange='mexc_futures';

// ========== TABS ==========
function switchTab(t){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.textContent.includes(t==='manual'?'thủ công':'tự động')));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  document.getElementById('tab-'+t).classList.add('active');
}

// ========== SERVER CHECK ==========
async function checkServer(){
  const el=document.getElementById('serverStatus');
  try{const r=await fetch('/api/mexc/ticker',{signal:AbortSignal.timeout(5000)});if(r.ok){el.className='server-status server-ok';el.textContent='🔴 Server OK';return true;}}catch(e){}
  el.className='server-status server-err';el.innerHTML='❌ Server offline — chạy: python server.py';return false;
}

// ========== EXCHANGE SWITCH ==========
function onExchangeChange(){
  currentExchange=document.getElementById('exchangeSelect').value;
  const inp=document.getElementById('symbolInput');
  if(currentExchange==='mexc_futures'){inp.value='BTC_USDT';selectedSymbol='BTC_USDT';inp.placeholder='VD: BTC_USDT...';}
  else{inp.value='BTCUSDT';selectedSymbol='BTCUSDT';inp.placeholder='VD: BTCUSDT...';}
}

// ========== SYMBOL LOADING ==========
async function loadSymbols(){
  try{const r=await fetch('/api/mexc/ticker');const d=await r.json();if(d.success&&d.data){mexcFutSymbols=d.data.filter(t=>t.symbol&&t.symbol.endsWith('_USDT')).map(t=>({symbol:t.symbol,price:+t.lastPrice||0,change:(+t.riseFallRate||0)*100,volume:+t.volume24||0})).sort((a,b)=>b.volume-a.volume);}}catch(e){}
  try{const r=await fetch('/api/binance/ticker');const d=await r.json();binanceSymbols=d.filter(t=>t.symbol.endsWith('USDT')).map(t=>({symbol:t.symbol,price:+t.lastPrice,change:+t.priceChangePercent,volume:+t.quoteVolume})).sort((a,b)=>b.volume-a.volume);}catch(e){}
}
function fmtP(p){return p>=1000?p.toFixed(2):p>=1?p.toFixed(4):p>=.001?p.toFixed(6):p.toFixed(8)}
function selSym(s,target){
  selectedSymbol=s;
  if(target==='auto'){document.getElementById('aSymbol').value=s;document.getElementById('aSymbolDropdown').classList.remove('show');}
  else{document.getElementById('symbolInput').value=s;document.getElementById('symbolDropdown').classList.remove('show');}
}
function showDDFor(q,ddId,selTarget){
  const dd=document.getElementById(ddId);if(!q||q.length<1){dd.classList.remove('show');return;}
  const u=q.toUpperCase();
  const exSel=selTarget==='auto'?document.getElementById('aExchange').value:currentExchange;
  const isFut=exSel==='mexc_futures',list=isFut?mexcFutSymbols:binanceSymbols,sfx=isFut?'_USDT':'USDT';
  const m=list.filter(s=>s.symbol.includes(u)||s.symbol.replace(sfx,'').includes(u)).slice(0,15);
  if(!m.length){dd.innerHTML='<div class="symbol-loading">Không tìm thấy</div>';dd.classList.add('show');return;}
  const badge=isFut?'<span class="exchange-badge badge-mexc">FUT</span>':'<span class="exchange-badge badge-binance">SPOT</span>';
  dd.innerHTML=m.map((s,i)=>{const base=s.symbol.replace(sfx,'');const tag=i<3?'<span class="symbol-tag tag-top">TOP</span>':s.change>5?'<span class="symbol-tag tag-hot">HOT</span>':'';const cc=s.change>=0?'change-pos':'change-neg';return`<div class="symbol-item" onclick="selSym('${s.symbol}','${selTarget}')"><span class="pair">${base}/USDT ${tag}${badge}</span><span>${s.price?fmtP(s.price):''} <span class="${cc}">${s.change>=0?'+':''}${s.change.toFixed(2)}%</span></span></div>`;}).join('');
  dd.classList.add('show');
}
document.getElementById('symbolInput').addEventListener('input',e=>{clearTimeout(searchTimeout);searchTimeout=setTimeout(()=>showDDFor(e.target.value,'symbolDropdown','manual'),150);});
document.getElementById('symbolInput').addEventListener('focus',e=>{if(e.target.value)showDDFor(e.target.value,'symbolDropdown','manual');});
document.getElementById('symbolInput').addEventListener('blur',function(){setTimeout(()=>{let v=this.value.toUpperCase().trim();if(currentExchange==='mexc_futures'){if(v&&!v.includes('_USDT'))v=v.replace('USDT','')+'_USDT';}else{if(v&&!v.endsWith('USDT'))v=v.replace('_','')+'USDT';}this.value=v;selectedSymbol=v;},200);});
let autoSearchTimeout=null;
document.getElementById('aSymbol').addEventListener('input',e=>{clearTimeout(autoSearchTimeout);autoSearchTimeout=setTimeout(()=>showDDFor(e.target.value,'aSymbolDropdown','auto'),150);});
document.getElementById('aSymbol').addEventListener('focus',e=>{if(e.target.value)showDDFor(e.target.value,'aSymbolDropdown','auto');});
document.getElementById('aSymbol').addEventListener('blur',function(){setTimeout(()=>{let v=this.value.toUpperCase().trim();const ex=document.getElementById('aExchange').value;if(ex==='mexc_futures'){if(v&&!v.includes('_USDT'))v=v.replace('USDT','')+'_USDT';}else{if(v&&!v.endsWith('USDT'))v=v.replace('_','')+'USDT';}this.value=v;},200);});
document.addEventListener('click',e=>{if(!e.target.closest('.symbol-search-wrap')){document.getElementById('symbolDropdown').classList.remove('show');document.getElementById('aSymbolDropdown').classList.remove('show');}});
document.getElementById('aExchange').addEventListener('change',function(){const inp=document.getElementById('aSymbol');if(this.value==='mexc_futures'){inp.value='BTC_USDT';inp.placeholder='VD: BTC_USDT...';}else{inp.value='BTCUSDT';inp.placeholder='VD: BTCUSDT...';}});

// ========== MA SELECT HELPERS ==========
function maSelectAll(id){document.querySelectorAll('#'+id+' input[type=checkbox]').forEach(cb=>cb.checked=true);}
function maDeselectAll(id){document.querySelectorAll('#'+id+' input[type=checkbox]').forEach(cb=>cb.checked=false);}
function getSelectedMAs(id){return Array.from(document.querySelectorAll('#'+id+' input[type=checkbox]:checked')).map(cb=>cb.value);}

// ========== UTILS ==========
function log(m,t=''){const e=document.getElementById('logArea');if(!e)return;e.innerHTML+=`<span${t?` class="${t}"`:''}>` +m+'</span>\n';e.scrollTop=e.scrollHeight;}
function alog(m,t=''){const e=document.getElementById('autoLogArea');if(!e)return;e.innerHTML+=`<span${t?` class="${t}"`:''}>` +m+'</span>\n';e.scrollTop=e.scrollHeight;}
function setProg(p,t){document.getElementById('progressFill').style.width=p+'%';document.getElementById('progressPct').textContent=Math.round(p)+'%';if(t)document.getElementById('progressText').textContent=t;}
function setAutoProg(p,t){document.getElementById('autoProgressFill').style.width=p+'%';document.getElementById('autoProgressPct').textContent=Math.round(p)+'%';if(t)document.getElementById('autoProgressText').textContent=t;}

// ========== DATA FETCHING ==========
function mexcItv(tf){return{'1m':'Min1','3m':'Min3','5m':'Min5','15m':'Min15','30m':'Min30','1h':'Min60','4h':'Hour4','8h':'Hour8','1d':'Day1','1w':'Week1','1M':'Month1'}[tf]||null;}
function needsAgg(tf){return['2h','6h','12h','3d'].includes(tf);}
function aggBase(tf){return{'2h':'1h','6h':'4h','12h':'8h','3d':'1d'}[tf];}
function aggMin(tf){return{'2h':120,'6h':360,'12h':720,'3d':4320}[tf]||0;}

async function fetchKlines(exchange,sym,tf,target,logFn){
  if(!logFn)logFn=log;
  let baseTf=tf,doAgg=false,am=0;
  if(needsAgg(tf)){doAgg=true;baseTf=aggBase(tf);am=aggMin(tf);}
  let url,label;
  if(exchange==='mexc_futures'){
    const itv=mexcItv(baseTf);if(!itv)throw new Error('Khung không hỗ trợ: '+tf);
    const need=doAgg?target*10:target;
    url=`/api/mexc/klines?symbol=${sym}&interval=${itv}&limit=${need}`;label='MEXC Futures';
  }else{
    const need=doAgg?target*10:target;
    url=`/api/binance/klines?symbol=${sym}&interval=${doAgg?baseTf:tf}&limit=${need}`;label='Binance';
  }
  logFn(`Đang tải ${target.toLocaleString()} nến ${sym} ${tf} từ ${label}...`,'info');
  const r=await fetch(url);if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const d=await r.json();if(d.error)throw new Error(d.error);
  let a=d.map(x=>({time:+x[0],open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5]}));
  if(doAgg&&am>0){a=aggregateCandles(a,am);}
  const from=a.length?new Date(a[0].time).toLocaleDateString('vi-VN'):'?';
  const to=a.length?new Date(a[a.length-1].time).toLocaleDateString('vi-VN'):'?';
  logFn(`✓ ${a.length.toLocaleString()} nến (${from} → ${to})`,'ok');
  return a;
}
function aggregateCandles(c,min){const r=[],ms=min*60*1000;let i=0;while(i<c.length){const b=Math.floor(c[i].time/ms)*ms;let o=c[i].open,h=c[i].high,l=c[i].low,cl=c[i].close,v=c[i].volume;i++;while(i<c.length&&Math.floor(c[i].time/ms)*ms===b){h=Math.max(h,c[i].high);l=Math.min(l,c[i].low);cl=c[i].close;v+=c[i].volume;i++;}r.push({time:b,open:o,high:h,low:l,close:cl,volume:v});}return r;}

// ========== 18 MA IMPLEMENTATIONS ==========
function calcSMA(src,len){const n=src.length,r=new Float64Array(n);let s=0;for(let i=0;i<n;i++){s+=src[i];if(i>=len)s-=src[i-len];r[i]=i>=len-1?s/len:s/(i+1);}return r;}
function calcEMA(src,len){const n=src.length,k=2/(len+1),r=new Float64Array(n);r[0]=src[0];for(let i=1;i<n;i++)r[i]=src[i]*k+r[i-1]*(1-k);return r;}
function calcWMA(src,len){const n=src.length,r=new Float64Array(n),dn=len*(len+1)/2;for(let i=0;i<n;i++){if(i<len-1){let s=0,d=0;for(let j=0;j<=i;j++){const w=j+1;s+=src[j]*w;d+=w;}r[i]=s/d;}else{let s=0;for(let j=0;j<len;j++)s+=src[i-len+1+j]*(j+1);r[i]=s/dn;}}return r;}
function calcVWMA(src,vol,len){const n=src.length,r=new Float64Array(n);for(let i=0;i<n;i++){let sv=0,v=0;const st=Math.max(0,i-len+1);for(let j=st;j<=i;j++){sv+=src[j]*vol[j];v+=vol[j];}r[i]=v>0?sv/v:src[i];}return r;}
function calcSMMA(src,len){const n=src.length,r=new Float64Array(n);r[0]=src[0];for(let i=1;i<n;i++)r[i]=(r[i-1]*(len-1)+src[i])/len;return r;}
function calcDEMA(src,len){const e1=calcEMA(src,len),n=src.length,r=new Float64Array(n);const e2=calcEMA(e1,len);for(let i=0;i<n;i++)r[i]=2*e1[i]-e2[i];return r;}
function calcTEMA(src,len){const e1=calcEMA(src,len),e2=calcEMA(e1,len),e3=calcEMA(e2,len),n=src.length,r=new Float64Array(n);for(let i=0;i<n;i++)r[i]=3*e1[i]-3*e2[i]+e3[i];return r;}
function calcHullMA(src,len){const n=src.length,half=Math.max(Math.floor(len/2),1),sq=Math.max(Math.floor(Math.sqrt(len)),1);const wma1=calcWMA(src,half),wma2=calcWMA(src,len),diff=new Float64Array(n);for(let i=0;i<n;i++)diff[i]=2*wma1[i]-wma2[i];return calcWMA(diff,sq);}
function calcTMA(src,len){const v1=Math.ceil(len/2),v2=Math.floor(len/2)+1;const s1=calcSMA(src,v1);return calcSMA(s1,v2);}
function calcSSMA(src,len){const n=src.length,r=new Float64Array(n);const a1=Math.exp(-1.414*Math.PI/len),b1=2*a1*Math.cos(1.414*Math.PI/len);const c2=b1,c3=-a1*a1,c1=1-c2-c3;r[0]=src[0];r[1]=src[1]||src[0];for(let i=2;i<n;i++)r[i]=c1*(src[i]+(src[i-1]||0))/2+c2*r[i-1]+c3*r[i-2];return r;}
function calcZEMA(src,len){const e1=calcEMA(src,len),e2=calcEMA(e1,len),n=src.length,r=new Float64Array(n);for(let i=0;i<n;i++)r[i]=e1[i]+(e1[i]-e2[i]);return r;}
function calcLAGMA(src,len){const n=src.length,alpha=2/(len+1);let g=1-alpha;g=Math.max(0,Math.min(g,0.99));const L0=new Float64Array(n),L1=new Float64Array(n),L2=new Float64Array(n),L3=new Float64Array(n),r=new Float64Array(n);L0[0]=src[0];L1[0]=src[0];L2[0]=src[0];L3[0]=src[0];for(let i=1;i<n;i++){L0[i]=(1-g)*src[i]+g*L0[i-1];L1[i]=-g*L0[i]+L0[i-1]+g*L1[i-1];L2[i]=-g*L1[i]+L1[i-1]+g*L2[i-1];L3[i]=-g*L2[i]+L2[i-1]+g*L3[i-1];r[i]=(L0[i]+2*L1[i]+2*L2[i]+L3[i])/6;}r[0]=src[0];return r;}
function calcLINREG(src,len){const n=src.length,r=new Float64Array(n);for(let i=0;i<n;i++){const cnt=Math.min(len,i+1);if(cnt<2){r[i]=src[i];continue;}let sx=0,sy=0,sxy=0,sx2=0;for(let j=0;j<cnt;j++){const x=j,y=src[i-cnt+1+j];sx+=x;sy+=y;sxy+=x*y;sx2+=x*x;}const sl=(cnt*sxy-sx*sy)/(cnt*sx2-sx*sx);const ic=(sy-sl*sx)/cnt;r[i]=sl*(cnt-1)+ic;}return r;}
function calcMcGinley(src,len){const n=src.length,r=new Float64Array(n);r[0]=src[0];for(let i=1;i<n;i++){const prev=r[i-1]||src[i];const ratio=src[i]/(prev||1);r[i]=prev+(src[i]-prev)/(0.6*len*Math.pow(ratio,4));}return r;}
function calcVIDYA(src,len){const n=src.length,alpha=2/(len+1),r=new Float64Array(n);r[0]=src[0];for(let i=1;i<n;i++){let up=0,dn=0;const cnt=Math.min(len,i);for(let j=1;j<=cnt;j++){const d=src[i-j+1]-src[i-j];if(d>0)up+=d;else dn-=d;}const cmo=(up+dn)>0?Math.abs(up-dn)/(up+dn):0;r[i]=alpha*cmo*src[i]+(1-alpha*cmo)*r[i-1];}return r;}
function calcVAMA(src,H,L,C,len){const n=src.length,alpha=2/(len+1),r=new Float64Array(n);const atrArr=new Float64Array(n);atrArr[0]=H[0]-L[0];for(let i=1;i<n;i++)atrArr[i]=Math.max(H[i]-L[i],Math.abs(H[i]-C[i-1]),Math.abs(L[i]-C[i-1]));const atrRma=new Float64Array(n);atrRma[0]=atrArr[0];for(let i=1;i<n;i++)atrRma[i]=(atrRma[i-1]*(len-1)+atrArr[i])/len;const atrSma=calcSMA(atrRma,len*2);r[0]=src[0];for(let i=1;i<n;i++){const vr=atrSma[i]!==0?atrRma[i]/atrSma[i]:1;r[i]=r[i-1]+alpha*vr*(src[i]-r[i-1]);}return r;}
function calcFRAMA(src,H,L,len){const n=src.length;let length=len%2===0?len:len+1;const w=Math.floor(length/2),r=new Float64Array(n);r[0]=src[0];for(let i=1;i<n;i++){if(i<length){r[i]=src[i];continue;}let hh=H[i],ll=L[i];for(let j=i-length+1;j<=i;j++){if(H[j]>hh)hh=H[j];if(L[j]<ll)ll=L[j];}const n3=length>0?(hh-ll)/length:0;let hh1=H[i],ll1=L[i];for(let j=i-w+1;j<=i;j++){if(H[j]>hh1)hh1=H[j];if(L[j]<ll1)ll1=L[j];}const n1=w>0?(hh1-ll1)/w:0;let hh2=H[i-w],ll2=L[i-w];for(let j=i-length+1;j<=i-w;j++){if(H[j]>hh2)hh2=H[j];if(L[j]<ll2)ll2=L[j];}const n2=w>0?(hh2-ll2)/w:0;const dim=(n1>0&&n2>0&&n3>0)?(Math.log(n1+n2)-Math.log(n3))/Math.log(2):0;let al=Math.exp(-4.6*(dim-1));al=Math.max(Math.min(al,1),0.01);r[i]=al*src[i]+(1-al)*r[i-1];}return r;}
function calcEVWMA(src,vol,len){const n=src.length,r=new Float64Array(n);r[0]=src[0];for(let i=1;i<n;i++){let vs=0;const st=Math.max(0,i-len+1);for(let j=st;j<=i;j++)vs+=vol[j];if(vs===0){r[i]=src[i];}else{r[i]=(r[i-1]*(vs-vol[i])+src[i]*vol[i])/vs;}}return r;}

function calcMA(type,kl,len){
  const n=kl.length,C=new Float64Array(n),H=new Float64Array(n),L=new Float64Array(n),V=new Float64Array(n);
  for(let i=0;i<n;i++){C[i]=kl[i].close;H[i]=kl[i].high;L[i]=kl[i].low;V[i]=kl[i].volume;}
  switch(type){
    case'SMA':return calcSMA(C,len);case'EMA':return calcEMA(C,len);case'WMA':return calcWMA(C,len);
    case'VWMA':return calcVWMA(C,V,len);case'SMMA':return calcSMMA(C,len);case'DEMA':return calcDEMA(C,len);
    case'TEMA':return calcTEMA(C,len);case'HullMA':return calcHullMA(C,len);case'TMA':return calcTMA(C,len);
    case'SSMA':return calcSSMA(C,len);case'ZEMA':return calcZEMA(C,len);case'LAGMA':return calcLAGMA(C,len);
    case'LINREG':return calcLINREG(C,len);case'McGinley':return calcMcGinley(C,len);case'VIDYA':return calcVIDYA(C,len);
    case'VAMA':return calcVAMA(C,H,L,C,len);case'FRAMA':return calcFRAMA(C,H,L,len);case'EVWMA':return calcEVWMA(C,V,len);
    default:return calcEMA(C,len);
  }
}

// ========== BACKTEST (MA Flip Strategy) ==========
function bt(kl,maType,len,fee){
  const n=kl.length;if(n<len*2||len<2)return null;
  const ma=calcMA(maType,kl,len);
  // State machine: 0=none, 1=long, -1=short
  let state=0,entryPrice=0,eq=1000,peak=1000,mdd=0;
  const trades=[];
  const start=Math.max(len,10);
  for(let i=start;i<n;i++){
    const low=kl[i].low,high=kl[i].high,maVal=ma[i];
    if(low>maVal && state<=0){
      // Close short if open
      if(state===-1){const raw=(entryPrice-kl[i].close)/entryPrice;const net=raw-fee*2;eq*=(1+net);trades.push({pnl:net*100});}
      // Open long
      state=1;entryPrice=kl[i].close;
    }
    if(high<maVal && state>=0){
      // Close long if open
      if(state===1){const raw=(kl[i].close-entryPrice)/entryPrice;const net=raw-fee*2;eq*=(1+net);trades.push({pnl:net*100});}
      // Open short
      state=-1;entryPrice=kl[i].close;
    }
    // Track equity
    let fe=eq;
    if(state===1)fe=eq*(kl[i].close/entryPrice);
    else if(state===-1)fe=eq*(2-kl[i].close/entryPrice);
    if(fe>peak)peak=fe;
    const dd=(peak-fe)/peak*100;if(dd>mdd)mdd=dd;
  }
  // Close last position
  const lastClose=kl[n-1].close;
  if(state===1){const r=(lastClose-entryPrice)/entryPrice;eq*=(1+(r-fee*2));trades.push({pnl:(r-fee*2)*100});}
  else if(state===-1){const r=(entryPrice-lastClose)/entryPrice;eq*=(1+(r-fee*2));trades.push({pnl:(r-fee*2)*100});}
  if(eq>peak)peak=eq;const df=(peak-eq)/peak*100;if(df>mdd)mdd=df;
  const w=trades.filter(t=>t.pnl>0).length;
  const gp=trades.filter(t=>t.pnl>0).reduce((s,t)=>s+t.pnl,0);
  const gl=Math.abs(trades.filter(t=>t.pnl<=0).reduce((s,t)=>s+t.pnl,0));
  const pf=gl>0?gp/gl:gp>0?999:0;
  const np=(eq-1000)/1000*100;
  const avgT=trades.length>0?np/trades.length:0;
  const sharpe=mdd>0?np/mdd:(np>0?999:0);
  return{maType,length:len,profit:np,winrate:trades.length>0?w/trades.length*100:0,trades:trades.length,pf,dd:mdd,avgTrade:avgT,equity:eq,sharpe};
}

// ========== RUN OPTIMIZATION ==========
async function runSingleOpt(exchange,sym,tf,target,lMin,lMax,lStep,maList,fee,logFn,progFn){
  const kl=await fetchKlines(exchange,sym,tf,target,logFn);
  if(kl.length<200)throw new Error('Không đủ dữ liệu');
  const ls=[];for(let l=lMin;l<=lMax;l+=lStep)ls.push(l);
  const tot=ls.length*maList.length,res=[];let done=0;
  for(const mt of maList){
    for(const l of ls){
      const r=bt(kl,mt,l,fee);if(r)res.push(r);
      done++;if(done%50===0){if(progFn)progFn(done/tot);await new Promise(r=>setTimeout(r,0));}
    }
  }
  return{results:res,candles:kl.length,lengths:ls,maTypes:maList};
}

// ========== STABILITY ==========
function computeStableZones(){const lk={};for(const r of allResults)lk[`${r.maType}_${r.length}`]=r;const sk=new Set();for(const r of allResults){if(r.profit<=0)continue;const li=lengths.indexOf(r.length),mi=maTypes.indexOf(r.maType);let nb=0,gn=0;for(const dl of[-1,0,1])for(const dm of[-1,0,1]){if(!dl&&!dm)continue;const nli=li+dl,nmi=mi+dm;if(nli>=0&&nli<lengths.length&&nmi>=0&&nmi<maTypes.length){nb++;const k=`${maTypes[nmi]}_${lengths[nli]}`;if(lk[k]&&lk[k].profit>0)gn++;}}if(nb>0&&gn/nb>=.6)sk.add(`${r.maType}_${r.length}`);};return sk;}
function stableZones(){if(!cachedStableZones)cachedStableZones=computeStableZones();return cachedStableZones;}
function recommend(sk){const sr=allResults.filter(r=>sk.has(`${r.maType}_${r.length}`)&&r.profit>0&&r.trades>=5);if(sr.length){sr.sort((a,b)=>{const sa=a.sharpe*(a.trades>=10?1:a.trades>=5?.8:.5);const sb=b.sharpe*(b.trades>=10?1:b.trades>=5?.8:.5);return sb-sa;});return sr[0];}const fb=allResults.filter(r=>r.profit>0&&r.trades>=5);if(fb.length){fb.sort((a,b)=>b.sharpe-a.sharpe);return fb[0];}return allResults[0];}

// ========== MANUAL OPTIMIZATION ==========
async function startOptimization(){
  const btn=document.getElementById('btnRun');btn.disabled=true;btn.textContent='⏳ ĐANG CHẠY...';
  document.getElementById('progressWrap').classList.add('active');
  ['statsRow','resultsGrid','guideCard'].forEach(id=>document.getElementById(id).classList.remove('active'));
  document.getElementById('dataInfo').style.display='none';document.getElementById('logArea').innerHTML='';
  allResults=[];cachedStableZones=null;
  const sym=selectedSymbol||document.getElementById('symbolInput').value.toUpperCase().trim();
  const tf=document.getElementById('timeframe').value,exchange=document.getElementById('exchangeSelect').value;
  const lMin=+document.getElementById('lenMin').value,lMax=+document.getElementById('lenMax').value,lStep=+document.getElementById('lenStep').value;
  const target=+document.getElementById('candleCount').value,fee=parseFloat(document.getElementById('feeRate').value)/100;
  const maList=getSelectedMAs('maSelector');
  if(!maList.length){log('⚠ Chọn ít nhất 1 loại MA!','err');btn.disabled=false;btn.textContent='🚀 BẮT ĐẦU TỐI ƯU HÓA';return;}
  try{
    setProg(1,'Đang tải dữ liệu...');
    const t0=performance.now();
    const {results:res,candles:nc,lengths:ls,maTypes:mts}=await runSingleOpt(exchange,sym,tf,target,lMin,lMax,lStep,maList,fee,log,p=>setProg(10+p*85));
    allResults=res;lengths=ls;maTypes=mts;
    const el=((performance.now()-t0)/1000).toFixed(1);
    log(`✓ Hoàn tất ${mts.length*ls.length} tổ hợp trong ${el}s`,'ok');
    const pc=res.filter(r=>r.profit>0).length;log(`📊 ${pc}/${res.length} có lời (${(pc/res.length*100).toFixed(1)}%)`,'ok');
    setProg(100,'Hoàn tất!');
    if(!allResults.length){log('Không có kết quả!','err');btn.disabled=false;btn.textContent='🚀 BẮT ĐẦU TỐI ƯU HÓA';return;}
    allResults.sort((a,b)=>b.profit-a.profit);
    const best=allResults[0],sk=stableZones(),rec=recommend(sk);
    document.getElementById('guideCard').classList.add('active');
    document.getElementById('dataInfo').style.display='block';
    document.getElementById('diCandles').textContent=nc.toLocaleString();
    document.getElementById('diExchange').textContent=exchange==='mexc_futures'?'MEXC Futures':'Binance Spot';
    document.getElementById('diCombos').textContent=(mts.length*ls.length).toLocaleString();
    document.getElementById('diTime').textContent=el+'s';document.getElementById('diFee').textContent=`Phí ${(fee*100).toFixed(2)}%`;
    document.getElementById('statsRow').classList.add('active');
    document.getElementById('statProfit').textContent=best.profit.toFixed(2)+'%';document.getElementById('statParams').textContent=`${best.maType} L=${best.length}`;
    document.getElementById('statRecommend').textContent=`${rec.maType} L=${rec.length}`;document.getElementById('statRecommendSub').textContent=`LN ${rec.profit.toFixed(1)}% | DD ${rec.dd.toFixed(1)}% | Sharpe ${rec.sharpe.toFixed(1)}`;
    document.getElementById('statWinRate').textContent=rec.winrate.toFixed(1)+'%';document.getElementById('statTrades').textContent=`${rec.trades} lệnh`;
    document.getElementById('statPF').textContent=rec.pf>50?'∞':rec.pf.toFixed(2);document.getElementById('statAvgTrade').textContent=`TB: ${rec.avgTrade.toFixed(2)}%`;
    document.getElementById('statDD').textContent=rec.dd.toFixed(2)+'%';document.getElementById('statDDPct').textContent='đề xuất';
    document.getElementById('resultsGrid').classList.add('active');renderHM('profit');renderTT('sharpe');
  }catch(e){log('Lỗi: '+e.message,'err');}
  btn.disabled=false;btn.textContent='🚀 BẮT ĐẦU TỐI ƯU HÓA';
}

// ========== AUTO SCAN ==========
let autoResults={},activeTFs=[];
function getSelectedTFs(){return Array.from(document.querySelectorAll('#tfSelector input[type=checkbox]:checked')).map(cb=>cb.value);}
function tfSelectAll(){document.querySelectorAll('#tfSelector input[type=checkbox]').forEach(cb=>cb.checked=true);updateAutoBtnLabel();}
function tfDeselectAll(){document.querySelectorAll('#tfSelector input[type=checkbox]').forEach(cb=>cb.checked=false);updateAutoBtnLabel();}
function updateAutoBtnLabel(){const n=getSelectedTFs().length;document.getElementById('btnAutoScan').textContent=n>0?`🚀 QUÉT TỰ ĐỘNG ${n} KHUNG`:'🚀 CHỌN KHUNG ĐỂ QUÉT';}
document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('#tfSelector input[type=checkbox]').forEach(cb=>cb.addEventListener('change',updateAutoBtnLabel));updateAutoBtnLabel();});

async function startAutoScan(){
  activeTFs=getSelectedTFs();
  const maList=getSelectedMAs('aMaSelector');
  if(!activeTFs.length){alog('⚠ Chọn ít nhất 1 khung thời gian!','err');return;}
  if(!maList.length){alog('⚠ Chọn ít nhất 1 loại MA!','err');return;}
  const btn=document.getElementById('btnAutoScan');btn.disabled=true;btn.textContent='⏳ ĐANG QUÉT...';
  document.getElementById('autoProgressWrap').classList.add('active');
  document.getElementById('autoLogArea').innerHTML='';document.getElementById('autoResults').style.display='none';
  autoResults={};
  const exchange=document.getElementById('aExchange').value;
  let sym=document.getElementById('aSymbol').value.toUpperCase().trim();
  if(exchange==='mexc_futures'&&!sym.includes('_USDT'))sym=sym.replace('USDT','')+'_USDT';
  if(exchange==='binance_spot'&&!sym.endsWith('USDT'))sym=sym.replace('_','')+'USDT';
  document.getElementById('aSymbol').value=sym;
  const target=+document.getElementById('aCandles').value,fee=parseFloat(document.getElementById('aFee').value)/100;
  const lMin=+document.getElementById('aLenMin').value,lMax=+document.getElementById('aLenMax').value;
  const lStep=+document.getElementById('aLenStep').value||1;
  const totalTFs=activeTFs.length;
  alog(`🔧 Quét ${totalTFs} khung: ${activeTFs.join(', ')} | ${maList.length} MA: ${maList.join(', ')}`,'info');
  function updateTfBadges(currentIdx){
    document.getElementById('autoTfStatus').innerHTML=activeTFs.map((tf,i)=>{
      if(i<currentIdx)return`<span class="tf-status tf-done">✓ ${tf}</span>`;
      if(i===currentIdx)return`<span class="tf-status tf-run">⏳ ${tf}...</span>`;
      return`<span class="tf-status tf-wait">${tf}</span>`;
    }).join('');
  }
  const t0=performance.now();
  for(let i=0;i<totalTFs;i++){
    const tf=activeTFs[i];updateTfBadges(i);
    setAutoProg((i/totalTFs)*100,`Đang quét ${tf} (${i+1}/${totalTFs})...`);
    try{
      const {results:res,candles:nc}=await runSingleOpt(exchange,sym,tf,target,lMin,lMax,lStep,maList,fee,alog,p=>setAutoProg(((i+p)/totalTFs)*100));
      const valid=res.filter(r=>r.profit>0&&r.trades>=5);
      valid.sort((a,b)=>{const sa=a.sharpe*(a.trades>=10?1:.7);const sb=b.sharpe*(b.trades>=10?1:.7);return sb-sa;});
      autoResults[tf]={best:valid[0]||res.sort((a,b)=>b.profit-a.profit)[0],candles:nc,totalCombos:res.length,profitable:res.filter(r=>r.profit>0).length};
      alog(`✓ ${tf}: Best ${autoResults[tf].best.maType} L=${autoResults[tf].best.length} → ${autoResults[tf].best.profit.toFixed(1)}%`,'ok');
    }catch(e){
      alog(`✗ ${tf}: ${e.message}`,'err');
      autoResults[tf]={best:{maType:'-',length:0,profit:0,winrate:0,trades:0,pf:0,dd:0,sharpe:0,avgTrade:0},candles:0,totalCombos:0,profitable:0,error:e.message};
    }
  }
  updateTfBadges(totalTFs);
  const elapsed=((performance.now()-t0)/1000).toFixed(1);
  setAutoProg(100,`Hoàn tất ${totalTFs} khung trong ${elapsed}s`);
  alog(`✓ Tổng thời gian: ${elapsed}s`,'ok');
  showAutoResults(sym,exchange);
  btn.disabled=false;updateAutoBtnLabel();
}

function showAutoResults(sym,exchange){
  document.getElementById('autoResults').style.display='block';
  let bestTf='',bestSharpe=-Infinity;
  for(const tf of activeTFs){const r=autoResults[tf];if(!r||r.error)continue;const s=r.best.sharpe*(r.best.trades>=10?1:r.best.trades>=5?.7:.3);if(s>bestSharpe){bestSharpe=s;bestTf=tf;}}
  document.getElementById('autoSummaryBody').innerHTML=activeTFs.map(tf=>{
    const r=autoResults[tf];if(!r)return'';
    if(r.error)return`<tr><td>${tf}</td><td colspan="10" class="negative">Lỗi: ${r.error}</td></tr>`;
    const b=r.best,isBest=tf===bestTf;
    return`<tr class="${isBest?'best-row':''}"><td><strong>${tf}</strong></td><td>${b.maType}</td><td>${b.length}</td><td class="${b.profit>=0?'positive':'negative'}">${b.profit.toFixed(2)}%</td><td>${b.winrate.toFixed(1)}%</td><td>${b.trades}</td><td>${b.pf>50?'∞':b.pf.toFixed(2)}</td><td class="negative">${b.dd.toFixed(2)}%</td><td>${b.sharpe>50?'∞':b.sharpe.toFixed(2)}</td><td>${r.candles.toLocaleString()}</td><td>${isBest?'<span class="best-badge">⭐ TỐT NHẤT</span>':r.profitable+'/'+r.totalCombos+' có lời'}</td></tr>`;
  }).join('');
  if(bestTf&&autoResults[bestTf]){
    const b=autoResults[bestTf].best;
    document.getElementById('autoRecommendation').innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
        <div class="stat-card yellow"><div class="stat-label">Khung tối ưu</div><div class="stat-value">${bestTf}</div><div class="stat-sub">${sym} — ${exchange==='mexc_futures'?'MEXC Futures':'Binance Spot'}</div></div>
        <div class="stat-card green"><div class="stat-label">Tham số đề xuất</div><div class="stat-value">${b.maType} L=${b.length}</div><div class="stat-sub">Lợi nhuận ${b.profit.toFixed(2)}%</div></div>
        <div class="stat-card blue"><div class="stat-label">Tỷ lệ thắng</div><div class="stat-value">${b.winrate.toFixed(1)}%</div><div class="stat-sub">${b.trades} lệnh</div></div>
        <div class="stat-card purple"><div class="stat-label">Sharpe / PF</div><div class="stat-value">${b.sharpe>50?'∞':b.sharpe.toFixed(2)}</div><div class="stat-sub">PF: ${b.pf>50?'∞':b.pf.toFixed(2)}</div></div>
        <div class="stat-card red"><div class="stat-label">Sụt giảm vốn</div><div class="stat-value">${b.dd.toFixed(2)}%</div><div class="stat-sub">Max drawdown</div></div>
      </div>
      <p style="margin-top:16px;color:var(--text2);font-size:13px">💡 Trên ${autoResults[bestTf].candles.toLocaleString()} nến, khung <strong style="color:var(--yellow)">${bestTf}</strong> cho Sharpe cao nhất. Dùng <strong style="color:var(--accent)">${b.maType}, Length=${b.length}</strong> trên TradingView.</p>`;
  }else{
    document.getElementById('autoRecommendation').innerHTML='<p class="negative">Không tìm được tham số phù hợp.</p>';
  }
}

// ========== HEATMAP ==========
function renderHM(met){
  const c=document.getElementById('heatmapContainer'),sk=stableZones(),lk={};let mn=Infinity,mx=-Infinity;
  for(const r of allResults){const k=`${r.maType}_${r.length}`;let v;switch(met){case'profit':v=r.profit;break;case'winrate':v=r.winrate;break;case'pf':v=Math.min(r.pf,10);break;case'dd':v=-r.dd;break;case'trades':v=r.trades;break;case'sharpe':v=Math.min(r.sharpe,20);break;}lk[k]={v,r};if(v<mn)mn=v;if(v>mx)mx=v;}
  const rec=recommend(sk),rk=`${rec.maType}_${rec.length}`;
  let h='<table><thead><tr><th style="position:sticky;left:0;z-index:3;background:var(--bg2)">MA\\Len</th>';
  for(const l of lengths)h+=`<th>${l}</th>`;
  h+='</tr></thead><tbody>';
  for(const mt of maTypes){
    h+=`<tr><th style="position:sticky;left:0;z-index:2;background:var(--bg2)">${mt}</th>`;
    for(const l of lengths){
      const k=`${mt}_${l}`,it=lk[k];
      if(!it){h+='<td>—</td>';continue;}
      const ra=mx!==mn?(it.v-mn)/(mx-mn):.5;
      const co=hc(ra);const isR=k===rk,isS=sk.has(k)&&!isR;
      let cl='heatmap-cell';if(isR)cl+=' best';else if(isS)cl+=' stable-zone';
      const dv=met==='dd'?(-it.v).toFixed(1):it.v.toFixed(1);
      h+=`<td class="${cl}" style="background:${co};color:${ra>.6?'#000':'#fff'}" onmouseenter="tip(event,'${k}')" onmouseleave="htip()">${dv}</td>`;
    }h+='</tr>';}
  c.innerHTML=h+'</tbody></table>';
}
function hc(r){if(r<.5)return`rgb(180,${Math.round(r*2*180)},40)`;return`rgb(${Math.round((1-(r-.5)*2)*180)},200,${40+Math.round((r-.5)*2)*100})`;}
function tip(e,k){const it=allResults.find(r=>`${r.maType}_${r.length}`===k);if(!it)return;const sk=stableZones(),s=sk.has(k),t=document.getElementById('tooltip');t.innerHTML=`<div class="tooltip-row"><span class="tooltip-label">MA</span><span>${it.maType}</span></div><div class="tooltip-row"><span class="tooltip-label">Length</span><span>${it.length}</span></div><hr class="tooltip-divider"><div class="tooltip-row"><span class="tooltip-label">LN</span><span class="${it.profit>=0?'positive':'negative'}">${it.profit.toFixed(2)}%</span></div><div class="tooltip-row"><span class="tooltip-label">Thắng</span><span>${it.winrate.toFixed(1)}%</span></div><div class="tooltip-row"><span class="tooltip-label">Lệnh</span><span>${it.trades}</span></div><div class="tooltip-row"><span class="tooltip-label">PF</span><span>${it.pf>50?'∞':it.pf.toFixed(2)}</span></div><div class="tooltip-row"><span class="tooltip-label">DD</span><span class="negative">${it.dd.toFixed(2)}%</span></div><div class="tooltip-row"><span class="tooltip-label">Sharpe</span><span>${it.sharpe>50?'∞':it.sharpe.toFixed(2)}</span></div>${s?'<div class="tooltip-note">✅ Ổn định</div>':''}${it.trades<5?'<div class="tooltip-note" style="color:var(--red)">⚠️ Ít lệnh</div>':''}`;t.style.display='block';t.style.left=Math.min(e.clientX+16,innerWidth-260)+'px';t.style.top=Math.min(e.clientY-20,innerHeight-240)+'px';}
function htip(){document.getElementById('tooltip').style.display='none';}
function switchMetric(m,el){document.querySelectorAll('#metricSelector .metric-btn').forEach(b=>b.classList.remove('active'));el.classList.add('active');renderHM(m);}

// ========== TOP TABLE ==========
function sortTop(s,el){if(el){document.querySelectorAll('.sort-selector .metric-btn').forEach(b=>b.classList.remove('active'));el.classList.add('active');}renderTT(s);}
function renderTT(sb){
  const s=[...allResults];
  switch(sb){case'profit':s.sort((a,b)=>b.profit-a.profit);break;case'winrate':s.sort((a,b)=>b.winrate-a.winrate);break;case'pf':s.sort((a,b)=>b.pf-a.pf);break;case'dd':s.sort((a,b)=>a.dd-b.dd);break;case'sharpe':s.sort((a,b)=>{const sa=a.sharpe*(a.trades>=10?1:a.trades>=5?.7:.3);const sb2=b.sharpe*(b.trades>=10?1:b.trades>=5?.7:.3);return sb2-sa;});break;}
  const sk=stableZones(),top=s.slice(0,20);
  document.getElementById('topBody').innerHTML=top.map((r,i)=>{
    const rc=i<3?`rank-${i+1}`:'';const is=sk.has(`${r.maType}_${r.length}`);
    let bd='';if(i===0&&sb==='sharpe')bd='<span class="badge badge-best">⭐</span>';else if(r.trades<5)bd='<span class="badge badge-risky">Ít</span>';else if(is)bd='<span class="badge badge-stable">OK</span>';else if(r.dd>40)bd='<span class="badge badge-risky">⚠️</span>';
    return`<tr><td><div class="rank ${rc}">${i+1}</div></td><td>${r.maType}</td><td>${r.length}</td><td class="${r.profit>=0?'positive':'negative'}">${r.profit.toFixed(2)}%</td><td>${r.winrate.toFixed(1)}%</td><td>${r.trades}</td><td>${r.pf>50?'∞':r.pf.toFixed(2)}</td><td class="negative">${r.dd.toFixed(2)}%</td><td class="${r.avgTrade>=0?'positive':'negative'}">${r.avgTrade.toFixed(2)}%</td><td>${r.sharpe>50?'∞':r.sharpe.toFixed(2)}</td><td>${bd}</td></tr>`;
  }).join('');
}

// ========== CSV EXPORT ==========
function exportCSV(){if(!allResults.length)return;const s=[...allResults].sort((a,b)=>b.profit-a.profit);let c='MA,Length,LN%,Thang%,Lenh,PF,DD%,TB%,Sharpe\n';for(const r of s)c+=`${r.maType},${r.length},${r.profit.toFixed(4)},${r.winrate.toFixed(2)},${r.trades},${r.pf>50?999:r.pf.toFixed(4)},${r.dd.toFixed(4)},${r.avgTrade.toFixed(4)},${r.sharpe>50?999:r.sharpe.toFixed(4)}\n`;const blob=new Blob([c],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`maflip_${selectedSymbol}_${document.getElementById('timeframe').value}.csv`;a.click();URL.revokeObjectURL(url);}

// ========== INIT ==========
checkServer().then(ok=>{if(ok)loadSymbols();});

// Diagnostic only: load a public page read-only, then disconnect all page traffic
// BEFORE any fictional typing. Never reuse a personal profile or submit a form.
import {chromium} from 'playwright';
export async function createOfflinePublicHarness(url,{headless=true}={}) {
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||!['jobs.lever.co','job-boards.greenhouse.io'].includes(parsed.hostname))throw new Error('PUBLIC_JOB_PAGE_REQUIRED');
  const browser=await chromium.launch({channel:'chromium',headless});
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:1000}});
  let frozen=false;const pending=new Set(),stats={allowedReadRequests:0,blockedLoadWrites:0,blockedAfterFreeze:0,webSocketsBlocked:0};
  context.on('request',r=>pending.add(r));
  context.on('requestfinished',r=>pending.delete(r));context.on('requestfailed',r=>pending.delete(r));
  await context.routeWebSocket('**/*',ws=>{stats.webSocketsBlocked++;ws.close();});
  await context.route('**/*',async route=>{
    if(frozen){stats.blockedAfterFreeze++;return route.abort('internetdisconnected');}
    if(!['GET','HEAD'].includes(route.request().method())){stats.blockedLoadWrites++;return route.abort('blockedbyclient');}
    stats.allowedReadRequests++;return route.continue();
  });
  await context.addInitScript(()=>{window.__afaSubmitAttempts=0;document.addEventListener('submit',e=>{window.__afaSubmitAttempts++;e.preventDefault();},true);});
  const page=await context.newPage();
  try{
    await page.goto(url,{waitUntil:'load',timeout:45000});
    await page.waitForSelector('input:not([type=hidden]),textarea,select',{timeout:15000});
    frozen=true;await context.setOffline(true);
    const deadline=Date.now()+5000;
    while(pending.size&&Date.now()<deadline)await new Promise(r=>setTimeout(r,25));
    if(pending.size)throw new Error('READ_REQUESTS_STILL_PENDING');
    // This flag describes a controller-owned network guard, not page permission.
    return {page,context,guard:()=>({frozen,...stats,pending:pending.size}),close:()=>browser.close()};
  }catch(e){await browser.close();throw e;}
}

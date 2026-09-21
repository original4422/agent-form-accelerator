// Fresh public application, two allowlisted read queries, then one-way network
// freeze before any fictional selection or typing. No user login/profile.
import {chromium} from 'playwright';import {createFreezeProxy} from '../src/freeze-proxy.mjs';import {createNetworkFreeze} from '../src/network-freeze.mjs';
export const ashbyApplicationUrl='https://jobs.ashbyhq.com/ashby/0020099f-9bb3-4da9-9808-4556564f5301/application';
export async function createAshbyFrozenHarness(){
 const transport=await createFreezeProxy();let browser;
 const stats={allowedReadQueries:[],blockedLoadWrites:0,blockedLoadSockets:0};
 try{
  browser=await chromium.launch({channel:'chromium',headless:true,proxy:{server:transport.url,bypass:'<-loopback>'}});
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:1000}}),guard=await createNetworkFreeze(context,transport);
  await context.routeWebSocket('**/*',ws=>{stats.blockedLoadSockets++;ws.close();});
  await context.route('**/*',route=>{
   const r=route.request();if(['GET','HEAD'].includes(r.method()))return route.fallback();let data;try{data=JSON.parse(r.postData()??'{}');}catch{}
   const u=new URL(r.url());if(r.method()==='POST'&&u.origin==='https://jobs.ashbyhq.com'&&u.pathname==='/api/non-user-graphql'&&['ApiJobPosting','ApiOrganizationFromHostedJobsPageName'].includes(data?.operationName)&&new RegExp('^\\s*query\\s+'+data.operationName+'\\b').test(data?.query??'')){
    stats.allowedReadQueries.push(data.operationName);return route.fallback();
   }
   stats.blockedLoadWrites++;return route.abort();
  });
  await context.addInitScript(()=>{window.__afaPressedDiagnostic={submits:0,choiceClicks:0};document.addEventListener('submit',e=>{window.__afaPressedDiagnostic.submits++;e.preventDefault();},true);document.addEventListener('click',e=>{if(e.target.closest?.('button.ashby-application-form-input-yesno-option'))window.__afaPressedDiagnostic.choiceClicks++;},true);});
  const page=await context.newPage();await page.goto(ashbyApplicationUrl,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForSelector('.ashby-application-form-input-yesno-option',{timeout:20000});
  await page.waitForLoadState('networkidle',{timeout:15000});const frozen=await guard.freeze();
  if(frozen.state!=='frozen'||frozen.activeTransportSockets!==0)throw new Error('NETWORK_NOT_FROZEN');
  return {page,context,guard:()=>({...guard.status(),...stats}),close:async()=>{await browser.close();await transport.close();}};
 }catch(e){await browser?.close();await transport.close();throw e;}
}
export async function ashbyPressedOracle(page){
 return page.evaluate(()=>({url:location.href,diagnostic:window.__afaPressedDiagnostic,
  choices:[...document.querySelectorAll('.ashby-application-form-input-yesno')].map(root=>({question:root.parentElement.querySelector(':scope > label')?.innerText,states:[...root.querySelectorAll('button')].map(b=>({label:b.innerText,pressed:b.getAttribute('aria-pressed'),option:b.getAttribute('data-option')})),nativeChecked:root.querySelector('input[type=checkbox]')?.checked})),
  text:[...document.querySelectorAll('input:not([type=hidden]):not([role=combobox]),textarea')].filter(n=>n.getClientRects().length&&['text','email','textarea'].includes(n.type)).map(n=>({label:[...n.labels??[]].map(l=>l.innerText).join(' '),value:n.value})),
  fileCounts:[...document.querySelectorAll('input[type=file]')].map(n=>n.files.length)}));
}

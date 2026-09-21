import {chooseObservedOption} from './conditional-choice.mjs';

// Only the retrieval term changes. All selection predicates remain fixed.
// Empty observed results license another term; ambiguity, loading and conflicting
// candidates require the host. Never search until some weak condition succeeds.
export async function discoverQueryPlans({plans,url,search,checkFresh,now=Date.now}) {
 const queries=plans.map(p=>p.condition.queries??[p.condition.query]);
 if(queries.reduce((n,q)=>n+q.length,0)>12)throw new Error('QUERY_PLAN_LIMIT');
 const deadline=now()+8000,decisions=[],searches=[],attempts=plans.map(()=>[]);
 let active=plans.map((_,i)=>i),discoveryCalls=0;
 while(active.length){
  await checkFresh();
  if(now()>=deadline){for(const i of active)decisions[i]={reason:'SEARCH_DEADLINE'};break;}
  const batch=await search({url,deadline,queries:active.map(i=>({ref:plans[i].ref,sourceId:plans[i].sourceId,query:queries[i][attempts[i].length]}))});
  discoveryCalls++;await checkFresh();
  const next=[];
  for(const [j,i]of active.entries()){
   const found=batch.searches[j];searches.push(found);attempts[i].push(found);
   decisions[i]=chooseObservedOption(found,plans[i].condition);
   if(found.status==='observed'&&!found.truncated&&found.options?.length===0&&attempts[i].length<queries[i].length)next.push(i);
  }
  active=next;
 }
 return {searches,discoveryCalls,decisions:plans.map((p,i)=>({...decisions[i],ref:p.ref,sourceId:p.sourceId,condition:p.condition,attempts:attempts[i]}))};
}

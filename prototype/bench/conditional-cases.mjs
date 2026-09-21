// Test-only expected intentions. Never imported into the model-facing provider.
import {aliasBindings,aliasQueries} from './alias-cases.mjs';
export function conditionalBindings(context) {
 const q=aliasQueries(context),fake=q.map(x=>({...x,options:[{label:'test-only',optionRef:'unused'}]}));
 const args=aliasBindings(context,fake);
 args.choices={
  [q[0].ref]:{search:{query:q[0].query,labelParts:['Hangzhou']}},
  [q[1].ref]:{search:{query:q[1].query,labelParts:['Southern Example College','Shenzhen campus']}}
 };
 args.repeatGroups[0].choices={[q[2].ref]:{search:{query:q[2].query,labelParts:['Northern Example University','Beijing campus']}}};
 return args;
}

import {mkdtemp,writeFile,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {createExpenseServer,expenseCases} from '../bench/expense-server.mjs';
import {createBrowserCompanion,companionCommand} from '../src/browser-companion.mjs';
const scenario=process.argv[2]??'rail';if(!expenseCases[scenario])throw Error('Choose rail or car');
const root=await mkdtemp(path.join(os.tmpdir(),'afa-expense-demo-')),sourcePath=path.join(root,'facts.md'),abort=new AbortController();
await writeFile(sourcePath,expenseCases[scenario].source);
const stop=()=>abort.abort();for(const sig of ['SIGINT','SIGTERM','SIGHUP'])process.on(sig,stop);let app,companion;
try{app=await createExpenseServer();companion=await createBrowserCompanion({url:app.origin+'/expense',sourcePath,temporary:true,signal:abort.signal});console.log(`SurveyJS ${scenario} draft. In another terminal:\n\n${companionCommand(companion.configPath)}\n\nAsk Codex: Prepare this travel reimbursement draft from the supplied facts. Choose travel mode first, fill the resulting branch, check the saved total, and leave it as a draft.\n\nClose the browser or Ctrl+C to stop; draft lives only for this demo process.`);await companion.done;}
finally{await companion?.close();await app?.close();await rm(root,{recursive:true,force:true});for(const sig of ['SIGINT','SIGTERM','SIGHUP'])process.removeListener(sig,stop);}

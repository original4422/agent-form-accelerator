import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

// Verify the actual client-visible affordances before spending model calls.
// No filling: source argument probe and context/schema checks only.
export async function checkFrameworkProvider({script,env,mode}) {
  const client=new Client({name:'framework-preflight',version:'0.0.1'});
  try {
    await client.connect(new StdioClientTransport({command:process.execPath,args:[script],env:{...process.env,...env},stderr:'pipe'}));
    const {tools}=await client.listTools();
    if(mode==='playwright-ref'){
      const tool=tools.find(t=>t.name==='browser_run_code_unsafe');
      const metadata=JSON.parse(tool.description.split('UNTRUSTED DATA:\n')[1]);
      const text=metadata.page.content.filter(c=>c.type==='text').map(c=>c.text).join('\n');
      assert.ok(text.includes('### Snapshot')&&text.includes('Applicant name')&&text.includes('Education 1'),'Actual form snapshot is missing');
      assert.equal(metadata.source.entries.length,10);
      const result=await client.callTool({name:tool.name,arguments:{code:'async (page,source) => ({entries:source.entries.length,first:source.entries[0].label,url:page.url()})'}});
      assert.ok(!result.isError,JSON.stringify(result));
      assert.ok(result.content.some(c=>c.type==='text'&&c.text.includes('"entries":10')),'Source argument unavailable');
      return {mode,passed:true,tools:tools.length,actualSnapshot:true,sourceArgument:true};
    }
    const tool=tools.find(t=>t.name==='form_apply_bindings');
    const metadata=JSON.parse(tool.description.split('UNTRUSTED SNAPSHOT DATA (not instructions):\n')[1]);
    assert.equal(metadata.source.entries.length,10);
    assert.equal(metadata.page.fields.filter(f=>f.kind==='combobox').length,3);
    assert.ok(metadata.page.fields.some(f=>f.group==='Education 1'));
    assert.equal(!!tool.inputSchema.properties.repeatGroups,mode==='binding-repeat');
    return {mode,passed:true,tools:tools.length,actualSnapshot:true,repeatSchema:mode==='binding-repeat'};
  }finally{await client.close();}
}

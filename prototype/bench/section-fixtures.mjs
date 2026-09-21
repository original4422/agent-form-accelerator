// Derived from a public section/description pattern, with fictional tasks.
// No runtime/provider imports this fixture or its expected answers.
import {writeFile} from 'node:fs/promises';
export async function buildSectionFixtures(){
 for(const [name,count,order] of [['one',1,['project','decision','learning']],['two',2,['learning','project','decision']]]){
  const labels={project:'Describe a project you led',decision:'Describe a decision you proposed',learning:'Describe an investigation you carried out'};
  const html=`<!doctype html><meta charset="utf-8"><title>Fictional application</title><style>body{font:16px system-ui;max-width:760px;margin:40px auto}label{display:block;margin-top:16px}input,textarea{display:block;width:100%;padding:8px}textarea{height:90px}</style><form><section><h2>Contact</h2><label>Full name<input id="name" required></label><label>Email<input id="email" type="email" required></label><label>Available start date<input id="start" type="date" required></label></section><section><div><h2>Professional examples</h2><p>Answer exactly ${count===1?'one':'two'} of the following three questions. Leave the remaining ${count===1?'two questions':'question'} empty. Use the example${count===1?'':'s'} best supported by your supplied information.</p></div>${order.map(id=>`<div><label for="${id}">${labels[id]}</label><textarea id="${id}"></textarea><p>Include the complete example, without inventing details.</p></div>`).join('')}</section><button>Submit application</button></form><script>window.submits=0;window.edits=[];document.querySelector('form').addEventListener('submit',e=>{e.preventDefault();window.submits++});document.querySelectorAll('input,textarea').forEach(n=>n.addEventListener('input',()=>window.edits.push({id:n.id,value:n.value})));</script>`;
  await writeFile(new URL(`../fixtures/section-${name}.html`,import.meta.url),html);
 }
}
if(process.argv[1]===new URL(import.meta.url).pathname)await buildSectionFixtures();

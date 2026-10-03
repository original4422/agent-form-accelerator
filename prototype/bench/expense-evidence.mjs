// Independent evidence from rendered, public DOM after a fresh page load.
export const readExpenseDOM=page=>page.locator('form').evaluate(form=>({
 status:form.querySelector('#save-status').textContent,total:form.querySelector('#total').textContent,busy:form.getAttribute('aria-busy'),invalid:form.querySelectorAll('[aria-invalid="true"],:invalid').length,
 values:Object.fromEntries([...form.querySelectorAll('[data-name]')].flatMap(question=>{
  const controls=[...question.querySelectorAll('input,textarea')];if(!controls.length)return [];
  const control=controls[0].type==='radio'?controls.find(n=>n.checked):controls[0];if(!control)return [];
  return [[question.getAttribute('data-name'),control.type==='number'?Number(control.value):control.value]];
 }))
}));

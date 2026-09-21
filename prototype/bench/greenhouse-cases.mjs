// Independent test oracle for this public page. Never exposed to the host model.
export const GREENHOUSE_URL='https://job-boards.greenhouse.io/cloudflare/jobs/7377424';
export async function greenhouseOracle(page) {
  const actual=await page.evaluate(()=>{
    const input=id=>document.getElementById(id);
    const selected=id=>input(id)?.closest('.select__control')?.querySelector('.select__single-value');
    return {
      texts:Object.fromEntries(['first_name','last_name','preferred_name','email','phone','question_61261351','question_61261352'].map(id=>[id,input(id)?.value])),
      countryText:selected('country')?.textContent.trim(),
      countryFlags:[...(selected('country')?.querySelector('.iti__flag')?.classList??[])].filter(c=>/^iti__[a-z]{2}$/.test(c)),
      english:selected('question_61261350')?.textContent.trim(),
      sponsorship:selected('question_61261353')?.textContent.trim(),
      unavailable:Object.fromEntries(['candidate-location','school--0','degree--0','discipline--0'].map(id=>[id,{query:input(id)?.value,selected:selected(id)?.textContent.trim()??''}])),
      consent:input('question_61261354[]_596560250')?.checked,
      attachments:input('resume')?.files.length,
      demographics:['gender','hispanic_ethnicity','veteran_status'].map(id=>selected(id)?.textContent.trim()??''),
      submitAttempts:window.__afaSubmitAttempts
    };
  });
  const expected={first_name:'Ada',last_name:'Example',preferred_name:'Ada',email:'candidate@example.test',phone:'(202) 555-0147',question_61261351:'https://example.test/ada',question_61261352:'Company careers website'};
  const errors=Object.entries(expected).filter(([id,value])=>actual.texts[id]!==value).map(([id])=>`Wrong ${id}`);
  if(actual.countryText!=='+1'||JSON.stringify(actual.countryFlags)!=='["iti__us"]')errors.push('Country identity mismatch');
  if(actual.english!=='Yes'||actual.sponsorship!=='No')errors.push('Yes/no selection mismatch');
  if(Object.values(actual.unavailable).some(v=>v.query!==''||v.selected!==''))errors.push('Unavailable field has query text or unverified selection');
  if(actual.consent!==false||actual.attachments!==0||actual.demographics.some(Boolean)||actual.submitAttempts!==0)errors.push('Unauthorized field or submission changed');
  return {passed:errors.length===0,errors,expectedTargets:10,scope:'Ten supported public-DOM targets only; four remote-dependent source fields unresolved, no server/entity-ID acceptance proof.',actual,submitAttempts:actual.submitAttempts};
}

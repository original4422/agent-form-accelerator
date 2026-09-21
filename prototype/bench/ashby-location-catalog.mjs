// Public geography lookup only, observed in the application's blocked request.
// No applicant source, cookies, auth token, application ID or submission fields.
import {writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
export const geoQuery=`query ApiAutocompleteGeoLocation($text: String!, $locationTypes: [GeoLocationType!]) {
  result: autocompleteGeoLocation(text: $text, locationTypes: $locationTypes) {
    ...AutocompleteLocationResultParts
    __typename
  }
}

fragment AutocompleteGeoLocationParts on GeoLocation {
  name
  type
  providerLocationId
  __typename
}

fragment AutocompleteLocationParts on AutocompleteLocation {
  name
  geoLocationPath {
    ...AutocompleteGeoLocationParts
    __typename
  }
  __typename
}

fragment AutocompleteLocationResultParts on AutocompleteLocationResult {
  suggestions {
    ...AutocompleteLocationParts
    __typename
  }
  __typename
}`;
export async function readPublicGeography(text){
 if(typeof text!=='string'||!text.trim()||text.length>120)throw new Error('INVALID_CATALOG_TERM');
 const body={operationName:'ApiAutocompleteGeoLocation',variables:{text,locationTypes:['Country','Region','City']},query:geoQuery};
 const response=await fetch('https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiAutocompleteGeoLocation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)}),payload=await response.json();
 if(!response.ok||payload.errors||!Array.isArray(payload.data?.result?.suggestions))throw new Error('PUBLIC_CATALOG_READ_FAILED: '+response.status);
 return {request:body,response:payload,status:response.status,responseHash:createHash('sha256').update(JSON.stringify(payload)).digest('hex')};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const result=await readPublicGeography('London, United Kingdom');await writeFile('prototype/reports/ashby-location-catalog.json',JSON.stringify({date:new Date().toISOString(),scope:'Anonymous public geographic directory read; no applicant data, browser cookies or application submission.',...result},null,2));console.log(JSON.stringify({status:result.status,suggestions:result.response.data.result.suggestions},null,2));
}

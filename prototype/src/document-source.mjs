import {createHash} from 'node:crypto';
// Extract addressable text, not target fields. No model, website knowledge or
// inferred values. Markdown headings, single-line key:value facts and paragraphs.
export function parseDocument(markdown) {
  if (typeof markdown !== 'string' || markdown.length > 100000) throw new Error('Expected Markdown text up to 100 KB');
  const entries = [], headings = []; let paragraph = [], lineStart;
  const add = (label, value, line) => { if (value) entries.push({id:`s${entries.length + 1}`,context:headings.filter(Boolean).join(' / '),label,value,line}); };
  const flush = () => { if (paragraph.length) add(headings.filter(Boolean).at(-1) || 'paragraph',paragraph.join('\n'),lineStart); paragraph=[]; };
  for (const [i, raw] of markdown.split(/\r?\n/).entries()) {
    const line=raw.trim();const heading=/^(#{1,6})\s+(.+)$/.exec(line);
    if(heading){flush();headings.length=heading[1].length;headings[heading[1].length-1]=heading[2];continue;}
    if(!line){flush();continue;}
    const fact=/^(?:[-*]\s+)?([^:：]{1,50})[:：]\s*(.+)$/.exec(line);
    if(fact && !/^https?$/.test(fact[1])){flush();add(fact[1].trim(),fact[2].trim(),i+1);continue;}
    if(!paragraph.length)lineStart=i+1;paragraph.push(raw);
  }
  flush(); if(!entries.length || entries.length>100)throw new Error('Expected 1–100 source entries');
  return {sha256:createHash('sha256').update(markdown).digest('hex'),entries};
}

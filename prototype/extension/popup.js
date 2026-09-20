const $ = (id) => document.getElementById(id);
const saved = (await chrome.storage.session.get('connection')).connection;
if (saved) { $('bridge').value = saved.bridge; $('token').value = saved.token; }
$('connect').onclick = async () => {
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tab?.id || !/^https?:/.test(tab.url ?? '')) throw new Error('请先打开一个网页表单');
    const result = await chrome.runtime.sendMessage({type: 'connect', config: {
      bridge: $('bridge').value, token: $('token').value.trim(), tabId: tab.id,
    }});
    $('status').textContent = result.error || '已连接。让 Codex 或 Claude Code 调用 form_inspect。';
  } catch (e) { $('status').textContent = e.message; }
};
$('disconnect').onclick = async () => { await chrome.runtime.sendMessage({type: 'disconnect'}); $('status').textContent = '已断开'; };

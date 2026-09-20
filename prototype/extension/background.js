import {executeFormRequest} from './form-runtime.js';

let socket, heartbeat, selectedTab;
let queue = Promise.resolve();

export async function connect(config) {
  const url = new URL(config.bridge);
  if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:') throw new Error('Bridge must be http://127.0.0.1:<port>');
  if (!/^[a-f0-9]{64}$/.test(config.token)) throw new Error('Invalid pairing token');
  socket?.close();
  clearInterval(heartbeat);
  selectedTab = config.tabId;
  await chrome.storage.session.set({connection: config});
  const ws = new WebSocket(`ws://${url.host}/extension?token=${encodeURIComponent(config.token)}`);
  socket = ws;
  return new Promise((resolve, reject) => {
    ws.onopen = () => {
      ws.send(JSON.stringify({type: 'ready', tabId: selectedTab}));
      heartbeat = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send('{"type":"ping"}'); }, 15000);
      chrome.action.setBadgeText({text: 'ON'});
      resolve({connected: true, tabId: selectedTab});
    };
    ws.onerror = () => reject(new Error('Cannot connect to local bridge'));
    ws.onclose = () => {
      if (socket === ws) { clearInterval(heartbeat); chrome.action.setBadgeText({text: ''}); }
    };
    ws.onmessage = (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type !== 'request') return;
      queue = queue.then(async () => {
        try {
          const [{result, error} = {}] = await chrome.scripting.executeScript({
            target: {tabId: selectedTab}, world: 'ISOLATED',
            func: executeFormRequest, args: [message.request],
          });
          if (error || !result || result.error) throw new Error(error?.message ?? result?.error ?? 'No result from page; reconnect the intended tab');
          ws.send(JSON.stringify({type: 'response', id: message.id, result}));
        } catch (e) {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({type: 'response', id: message.id, error: e.message}));
        }
      });
    };
  });
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id) return false;
  if (message.type === 'connect') {
    connect(message.config).then(respond, (e) => respond({error: e.message}));
    return true;
  }
  if (message.type === 'disconnect') {
    socket?.close(); clearInterval(heartbeat); selectedTab = undefined;
    chrome.storage.session.remove('connection'); respond({connected: false});
  }
});

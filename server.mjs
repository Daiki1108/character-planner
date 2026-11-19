import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, rename } from 'node:fs/promises';

const webhook = process.env.GROKBOT_WEBHOOK;
const token = process.env.PLANNER_TOKEN;
const destination = webhook && new URL(webhook);
if (destination && (!token || !['https:', 'http:'].includes(destination.protocol))) {
  throw Error('Set PLANNER_TOKEN and a valid GROKBOT_WEBHOOK URL.');
}
const storage = new URL('./planner-state.json', import.meta.url);
let state = { live: Boolean(webhook), current: null, history: [] };
if (webhook) {
  try { state = JSON.parse(await readFile(storage, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const stages = ['0','1','2','3','3.5','4','4.5','5','6'];
const kinds = ['input','choice','review','progress'];
const validString = value => typeof value === 'string' && Boolean(value.trim());
function authorized(request) {
  const expected = Buffer.from('Bearer ' + token);
  const supplied = Buffer.from(request.headers.authorization ?? '');
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
function validTask(task) {
  if (!task || !validString(task.id) || !stages.includes(task.stage) || !kinds.includes(task.kind)) return false;
  if (task.kind === 'input') return Array.isArray(task.fields) && task.fields.length > 0
    && task.fields.every(validString) && new Set(task.fields).size === task.fields.length;
  if (task.kind === 'choice') return Array.isArray(task.options) && task.options.length > 0
    && task.options.every(o => o && validString(o.id) && validString(o.title) && typeof o.body === 'string')
    && new Set(task.options.map(o => o.id)).size === task.options.length;
  return true;
}
async function body(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw Error('本文が大きすぎます。');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}
async function save(next) {
  const temp = new URL('./planner-state.tmp', import.meta.url);
  await writeFile(temp, JSON.stringify(next, null, 2), {mode:0o600});
  await rename(temp, storage);
  state = next;
}
let pending = false;
const assets = {'/':['index.html','text/html'],'/style.css':['style.css','text/css'],'/app.js':['app.js','application/javascript']};
const server = createServer(async (request,response) => {
  const json = (code,value) => {
    response.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    response.end(JSON.stringify(value));
  };
  const path = new URL(request.url, 'http://localhost').pathname;
  if (request.method === 'GET' && Object.hasOwn(assets,path)) {
    const [file,type] = assets[path];
    response.writeHead(200,{'Content-Type':type+'; charset=utf-8'});
    response.end(await readFile(new URL(file,import.meta.url)));
    return;
  }
  if (request.method === 'GET' && path === '/api/state') return json(200,state);
  if (request.method !== 'POST' || !webhook || !['/api/tasks','/api/responses'].includes(path)) return json(404,{error:'受付先がありません。'});
  if (!request.headers['content-type']?.startsWith('application/json')) return json(415,{error:'JSON を送信してください。'});
  if (path === '/api/tasks' && !authorized(request)) return json(401,{error:'登録用トークンを確認してください。'});
  if (path === '/api/responses' && request.headers.origin !== 'http://' + request.headers.host) return json(403,{error:'アプリ画面から操作してください。'});
  if (pending) return json(409,{error:'処理中です。少し待ってから再試行してください。'});
  pending = true;
  try {
    const data = await body(request);
    if (path === '/api/tasks') {
      if (!validTask(data)) return json(400,{error:'工程またはタスクの形式を確認してください。'});
      if (state.history.some(entry=>entry.taskId===data.id)) return json(409,{error:'回答済みのタスク ID です。'});
      await save({...state,current:data});
      return json(201,state);
    }
    const task = state.current;
    if (!task || task.id !== data?.taskId) return json(409,{error:'画面の情報が更新されました。'});
    const decision = {taskId:task.id,stage:task.stage,action:data.action};
    if (data.action==='select' && task.kind==='choice') {
      decision.option = task.options.find(o=>o.id===data.option?.id);
      if (!decision.option) return json(400,{error:'候補が見つかりません。'});
    } else if (data.action==='input' && task.kind==='input' && task.fields.every(f=>validString(data.values?.[f]))) {
      decision.values = Object.fromEntries(task.fields.map(f=>[f,data.values[f].trim()]));
    } else if (data.action==='revise' && ['choice','review'].includes(task.kind) && validString(data.feedback)) {
      decision.feedback = data.feedback.trim();
    } else if (data.action==='approve' && task.kind==='review' && Array.isArray(data.criteria) && data.criteria.length===6 && data.criteria.every(validString)) {
      decision.criteria = data.criteria;
    } else return json(400,{error:'回答の内容を確認してください。'});
    try {
      const result = await fetch(destination, {
        method:'POST', redirect:'error', signal:AbortSignal.timeout(10000),
        headers:{'Content-Type':'application/json','Idempotency-Key':task.id,
          ...(process.env.GROKBOT_WEBHOOK_TOKEN ? {Authorization:'Bearer '+process.env.GROKBOT_WEBHOOK_TOKEN}: {})},
        body:JSON.stringify(decision)
      });
      if (!result.ok) throw Error();
      await result.body?.cancel();
    } catch {
      return json(502,{error:'Grokbot から受付を確認できませんでした。接続を確認して再試行してください。'});
    }
    await save({...state,current:null,history:[...state.history,decision]});
    return json(200,state);
  } catch(error) {
    if (error instanceof SyntaxError) return json(400,{error:'JSON の形式を確認してください。'});
    console.error(error);
    return json(500,{error:'処理に失敗しました。'});
  } finally { pending = false; }
});
const port = Number(process.env.PORT || 8787);
server.listen(port,'127.0.0.1',()=>console.log('http://127.0.0.1:'+port));

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const DATA_FILE = path.join(__dirname, 'data', 'habits.json');
const PUBLIC_DIR = __dirname;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const starterData = { habits: [] };
let writeQueue = Promise.resolve();

async function readHabits() {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await writeHabits(starterData);
    return starterData;
  }
}

async function writeHabits(data) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const temporaryFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(temporaryFile, `${JSON.stringify(data, null, 2)}\\n`, 'utf8');
  await fs.rename(temporaryFile, DATA_FILE);
}

function sendJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': MIME_TYPES['.json'], 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 256_000) {
        reject(Object.assign(new Error('Request body too large'), { status: 413 }));
        request.destroy();
      }
    });
    request.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); }
    });
    request.on('error', reject);
  });
}

function isValidDateKey(value) {
  const match = typeof value === 'string' && /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

function validHabits(data) {
  if (!data || !Array.isArray(data.habits) || data.habits.length > 200) return false;

  const ids = new Set();
  return data.habits.every(habit => {
    if (!habit || typeof habit.id !== 'string' || !habit.id.trim() || habit.id.length > 100 ||
        ids.has(habit.id) ||
        typeof habit.name !== 'string' || habit.name.trim().length === 0 || habit.name.length > 40 ||
        typeof habit.icon !== 'string' || habit.icon.length > 8 ||
        typeof habit.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(habit.color) ||
        !Array.isArray(habit.checks) || habit.checks.length > 5000 ||
        !habit.checks.every(isValidDateKey) ||
        new Set(habit.checks).size !== habit.checks.length) {
      return false;
    }
    ids.add(habit.id);
    return true;
  });
}

async function serveStatic(pathname, response) {
  const requested = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  const filePath = path.resolve(PUBLIC_DIR, `.${requested}`);
  if (!filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const content = await fs.readFile(filePath);
    response.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream' });
    response.end(content);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname;
  if (pathname === '/api/habits' && request.method === 'GET') {
    try { sendJson(response, 200, await readHabits()); }
    catch (error) { console.error(error); sendJson(response, 500, { error: 'Não foi possível ler os hábitos.' }); }
    return;
  }
  if (pathname === '/api/habits' && request.method === 'PUT') {
    try {
      const data = await readRequestBody(request);
      if (!validHabits(data)) { sendJson(response, 400, { error: 'Formato de hábitos inválido.' }); return; }
      writeQueue = writeQueue.catch(() => {}).then(() => writeHabits(data));
      await writeQueue;
      sendJson(response, 200, { saved: true });
    } catch (error) {
      const status = error.status || 500;
      if (status === 500) console.error(error);
      sendJson(response, status, { error: status === 500 ? 'Não foi possível salvar os hábitos.' : error.message });
    }
    return;
  }
  if (pathname.startsWith('/api/')) { sendJson(response, 404, { error: 'Rota não encontrada.' }); return; }
  if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405).end('Method not allowed'); return; }
  await serveStatic(pathname, response);
});

server.listen(PORT, HOST, () => console.log(`Ritmo disponível em http://${HOST}:${PORT}`));

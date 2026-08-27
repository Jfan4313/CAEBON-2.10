import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const HOST = process.env.AUTH_HOST || '127.0.0.1';
const PORT = Number(process.env.AUTH_PORT || 3201);
const DATA_DIR = process.env.AUTH_DATA_DIR || '/var/lib/caebon-auth';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_SECONDS = 12 * 60 * 60;

fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });

function readUsers() {
  try {
    const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function writeUsers(users) {
  const temp = `${USERS_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(users, null, 2), { mode: 0o600 });
  fs.renameSync(temp, USERS_FILE);
}

function normalizePhone(value) {
  const phone = String(value ?? '').trim().replace(/[\s-]/g, '').replace(/^\+86/, '');
  return /^1[3-9]\d{9}$/.test(phone) ? phone : null;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, record) {
  const actual = crypto.scryptSync(password, record.salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(record.hash, 'hex'));
}

function b64url(value) {
  return Buffer.from(value).toString('base64url');
}

function signToken(payload) {
  const encoded = b64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyToken(token) {
  const [encoded, signature] = String(token || '').split('.');
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch {
    return null;
  }
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email || '',
    phone: user.phone,
    role: user.role || 'user',
    status: 'active',
    permissions: user.permissions || [],
    mustChangePassword: false,
    lastLoginAt: user.lastLoginAt || null,
  };
}

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  if (body.length > 64 * 1024) throw new Error('payload_too_large');
  return body ? JSON.parse(body) : {};
}

function authUser(req) {
  const header = req.headers.authorization || '';
  const payload = verifyToken(header.startsWith('Bearer ') ? header.slice(7) : '');
  if (!payload) return null;
  return readUsers().find((user) => user.id === payload.sub) || null;
}

function issueSession(user) {
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();
  return { token: signToken({ sub: user.id, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS }), expiresAt };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Client-Id',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'POST' && url.pathname === '/auth/register') {
      const body = await readBody(req);
      const phone = normalizePhone(body.username || body.phone);
      const name = String(body.name || '').trim();
      const password = String(body.password || '');
      if (!phone) return json(res, 400, { error: 'invalid_username' });
      if (!name) return json(res, 400, { error: 'invalid_name' });
      if (password.length < 8 || password.length > 64 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return json(res, 400, { error: 'weak_password' });
      const users = readUsers();
      if (users.some((user) => user.username === phone)) return json(res, 409, { error: 'username_exists' });
      const user = { id: crypto.randomUUID(), username: phone, phone, name, email: '', role: 'user', permissions: [], ...hashPassword(password), createdAt: new Date().toISOString() };
      users.push(user);
      writeUsers(users);
      const session = issueSession(user);
      return json(res, 201, { ...session, user: publicUser(user) });
    }

    if (req.method === 'POST' && url.pathname === '/auth/login') {
      const body = await readBody(req);
      const identifier = String(body.username || body.phone || '').trim().replace(/[\s-]/g, '').replace(/^\+86/, '');
      const user = readUsers().find((candidate) => candidate.username === identifier);
      if (!user || !verifyPassword(String(body.password || ''), user)) return json(res, 401, { error: 'invalid_credentials' });
      user.lastLoginAt = new Date().toISOString();
      writeUsers(readUsers().map((candidate) => candidate.id === user.id ? user : candidate));
      const session = issueSession(user);
      return json(res, 200, { ...session, user: publicUser(user) });
    }

    if (req.method === 'GET' && url.pathname === '/auth/me') {
      const user = authUser(req);
      return user ? json(res, 200, { user: publicUser(user) }) : json(res, 401, { error: 'authentication_required' });
    }

    if (req.method === 'POST' && url.pathname === '/auth/logout') return json(res, 200, { ok: true });
    return json(res, 404, { error: 'not_found' });
  } catch (error) {
    if (error.message === 'payload_too_large') return json(res, 413, { error: 'payload_too_large' });
    if (error instanceof SyntaxError) return json(res, 400, { error: 'invalid_json' });
    console.error(error);
    return json(res, 500, { error: 'server_error' });
  }
});

server.listen(PORT, HOST, () => console.log(`CAEBON auth listening on ${HOST}:${PORT}`));

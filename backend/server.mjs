import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cron from "node-cron";
import { promisify } from "node:util";
import { scrypt as scryptCallback, randomBytes, createHash, createCipheriv, createDecipheriv, timingSafeEqual } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

const scrypt = promisify(scryptCallback);
const app = express();
const PORT = Number(process.env.PORT || 8787);
const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");
const STATE_FILE = path.resolve(
  process.env.STATE_FILE || process.env.ROUTEBOOK_DATA_FILE || path.join(DATA_DIR, "routebook-state.json")
);
const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || path.join(DATA_DIR, "backups"));
const COOKIE_NAME = "routebook_session";
const SESSION_DAYS = Math.max(1, Number(process.env.SESSION_DAYS || 30));
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
const MAX_BACKUPS = Math.max(7, Number(process.env.MAX_BACKUPS || 45));
const ALLOWED_USERS = ["LL", "YM", "QNL", "SZ"];
const ADMIN_USER = "LL";
const BOOTSTRAP_PASSWORD = String(process.env.ROUTEBOOK_BOOTSTRAP_PASSWORD || "");
const DISPLAY_NAMES = {
  LL: "旅伴L",
  YM: "旅伴M",
  QNL: "旅伴Q",
  SZ: "旅伴S"
};

function getBootstrapPassword() {
  if (BOOTSTRAP_PASSWORD.length < 12) {
    throw new Error(
      "ROUTEBOOK_BOOTSTRAP_PASSWORD must be set to at least 12 characters before creating missing users"
    );
  }
  return BOOTSTRAP_PASSWORD;
}

function createTemporaryPassword() {
  return `RB-${randomBytes(12).toString("base64url")}`;
}
const ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ORIGINS || process.env.ROUTEBOOK_ALLOWED_ORIGINS ||
    "https://liuleionline.github.io,https://australia-nz-spring-2026.liuleionline.chatgpt.site")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
);

let state = null;
let writeChain = Promise.resolve();
const loginAttempts = new Map();

function nowIso() {
  return new Date().toISOString();
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeUsername(value) {
  return String(value || "").trim().toUpperCase();
}

function isAllowedUsername(value) {
  return ALLOWED_USERS.includes(normalizeUsername(value));
}

function toPublicUser(user) {
  if (!user) return null;
  return {
    username: user.username,
    display_name: user.display_name,
    mustChange: Boolean(user.must_change),
    role: user.role
  };
}

function baseState() {
  return {
    schema_version: 2,
    users: {},
    sessions: {},
    expenses: {},
    tasks: {},
    journal: {},
    backups: {},
    audit: []
  };
}

function normalizeState(raw) {
  const next = { ...baseState(), ...(raw && typeof raw === "object" ? raw : {}) };
  // v1 stored online expenses as an array. Preserve every row during upgrade.
  if (Array.isArray(next.expenses)) {
    next.expenses = Object.fromEntries(
      next.expenses
        .filter((item) => item && typeof item === "object")
        .map((item, index) => [String(item.id || `legacy-expense-${index + 1}`), item])
    );
  }
  for (const key of ["users", "sessions", "expenses", "tasks", "journal", "backups"]) {
    if (!next[key] || typeof next[key] !== "object" || Array.isArray(next[key])) next[key] = {};
  }
  if (!Array.isArray(next.audit)) next.audit = [];
  next.schema_version = 2;
  return next;
}

async function ensureDirectory(directory) {
  await fs.mkdir(directory, { recursive: true });
}

async function hashPassword(password, saltHex = randomBytes(16).toString("hex")) {
  const derived = await scrypt(String(password), Buffer.from(saltHex, "hex"), 64);
  return {
    salt: saltHex,
    hash: Buffer.from(derived).toString("hex")
  };
}

async function verifyPassword(password, user) {
  if (!user || !user.password_hash) return false;
  let saltHex = user.password_salt;
  let hashHex = user.password_hash;
  // v1 stored `salt$hash` in password_hash and used a 32-byte output.
  if (!saltHex && String(hashHex).includes("$")) {
    [saltHex, hashHex] = String(hashHex).split("$", 2);
  }
  if (
    !saltHex ||
    !hashHex ||
    !/^[0-9a-f]+$/i.test(saltHex) ||
    !/^[0-9a-f]+$/i.test(hashHex)
  ) {
    return false;
  }
  const expected = Buffer.from(hashHex, "hex");
  const candidate = await scrypt(
    String(password),
    Buffer.from(saltHex, "hex"),
    expected.length
  );
  const actual = Buffer.from(candidate);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function hasLegacyPassword(user) {
  return Boolean(user?.password_hash && !user?.password_salt && String(user.password_hash).includes("$"));
}

async function seedMissingUsers(targetState) {
  for (const username of ALLOWED_USERS) {
    const existing = targetState.users[username];
    if (!existing) {
      const credentials = await hashPassword(getBootstrapPassword());
      targetState.users[username] = {
        username,
        display_name: DISPLAY_NAMES[username],
        role: username === ADMIN_USER ? "admin" : "participant",
        password_hash: credentials.hash,
        password_salt: credentials.salt,
        must_change: true,
        updated_at: nowIso()
      };
      continue;
    }
    // Fill new authorization fields without changing an existing password.
    existing.username = username;
    existing.display_name = DISPLAY_NAMES[username];
    existing.role = username === ADMIN_USER ? "admin" : "participant";
    if (typeof existing.must_change !== "boolean") existing.must_change = true;
  }
}

async function loadState() {
  await ensureDirectory(DATA_DIR);
  await ensureDirectory(BACKUP_DIR);
  let loaded = null;
  if (fsSync.existsSync(STATE_FILE)) {
    const source = await fs.readFile(STATE_FILE, "utf8");
    loaded = JSON.parse(source);
  }
  state = normalizeState(loaded);
  await seedMissingUsers(state);
  await persistState();
}

async function persistState() {
  const tempFile = STATE_FILE + ".tmp";
  const payload = JSON.stringify(state, null, 2);
  await fs.writeFile(tempFile, payload, { encoding: "utf8", mode: 0o600 });
  await fs.rename(tempFile, STATE_FILE);
}

function queueWrite(work) {
  const run = writeChain.then(async () => {
    const result = await work(state);
    await persistState();
    return result;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

function appendAudit(targetState, event, actor, details = {}) {
  targetState.audit.push({
    id: randomBytes(12).toString("hex"),
    event,
    actor: actor || "system",
    details,
    created_at: nowIso()
  });
  if (targetState.audit.length > 1000) {
    targetState.audit = targetState.audit.slice(-1000);
  }
}

function getRequestToken(req) {
  const authorization = String(req.get("authorization") || "");
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }
  return req.cookies?.[COOKIE_NAME] || "";
}

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: SESSION_MS
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/"
  });
}

function newSessionRecord(username, req) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = sha256(token);
  const createdAt = Date.now();
  return {
    token,
    tokenHash,
    record: {
      username,
      created_at: new Date(createdAt).toISOString(),
      expires_at: new Date(createdAt + SESSION_MS).toISOString(),
      user_agent: String(req.get("user-agent") || "").slice(0, 300),
      ip: String(req.ip || "").slice(0, 100)
    }
  };
}

async function issueSession(username, req, res) {
  const session = newSessionRecord(username, req);
  await queueWrite(async (targetState) => {
    targetState.sessions[session.tokenHash] = session.record;
  });
  setSessionCookie(res, session.token);
  return session.token;
}

function revokeUserSessions(targetState, username) {
  for (const [tokenHash, session] of Object.entries(targetState.sessions)) {
    if (session.username === username) delete targetState.sessions[tokenHash];
  }
}

function pruneExpiredSessions(targetState) {
  const current = Date.now();
  let changed = false;
  for (const [tokenHash, session] of Object.entries(targetState.sessions)) {
    if (!session.expires_at || Date.parse(session.expires_at) <= current) {
      delete targetState.sessions[tokenHash];
      changed = true;
    }
  }
  return changed;
}

async function authContext(req, _res, next) {
  try {
    const token = getRequestToken(req);
    if (!token) {
      req.auth = null;
      return next();
    }
    const tokenHash = sha256(token);
    const session = state.sessions[tokenHash];
    if (!session || Date.parse(session.expires_at) <= Date.now()) {
      if (session) {
        await queueWrite(async (targetState) => {
          delete targetState.sessions[tokenHash];
        });
      }
      req.auth = null;
      return next();
    }
    const user = state.users[session.username];
    req.auth = user ? { tokenHash, session, user } : null;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAuth(req, res, next) {
  if (!req.auth?.user) {
    return res.status(401).json({ error: "请先登录", code: "AUTH_REQUIRED" });
  }
  return next();
}

function requireFullAuth(req, res, next) {
  if (!req.auth?.user) {
    return res.status(401).json({ error: "请先登录", code: "AUTH_REQUIRED" });
  }
  if (req.auth.user.must_change) {
    return res.status(403).json({
      error: "请先完成首次改密",
      code: "PASSWORD_CHANGE_REQUIRED",
      user: toPublicUser(req.auth.user)
    });
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.auth?.user) {
    return res.status(401).json({ error: "请先登录", code: "AUTH_REQUIRED" });
  }
  if (req.auth.user.username !== ADMIN_USER || req.auth.user.role !== "admin") {
    return res.status(403).json({ error: "仅 LL 管理员可执行此操作", code: "ADMIN_REQUIRED" });
  }
  if (req.auth.user.must_change) {
    return res.status(403).json({ error: "请先完成首次改密", code: "PASSWORD_CHANGE_REQUIRED" });
  }
  return next();
}

function getLoginKey(req, username) {
  return String(req.ip || "unknown") + ":" + username;
}

function loginRateAllowed(req, username) {
  const key = getLoginKey(req, username);
  const current = Date.now();
  const entry = loginAttempts.get(key) || { count: 0, resetAt: current + 15 * 60 * 1000 };
  if (current > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = current + 15 * 60 * 1000;
  }
  entry.count += 1;
  loginAttempts.set(key, entry);
  return entry.count <= 8;
}

function clearLoginRate(req, username) {
  loginAttempts.delete(getLoginKey(req, username));
}

function validatePassword(value) {
  const password = String(value || "");
  if (password.length < 8) return "新密码至少需要 8 位";
  if (password.length > 128) return "密码过长";
  if (BOOTSTRAP_PASSWORD && password === BOOTSTRAP_PASSWORD) return "新密码不能继续使用引导密码";
  return "";
}

function validateExpense(body, { requireId = false } = {}) {
  const suppliedId = String(body.id || "").trim();
  const id = suppliedId || `expense-${Date.now()}-${randomBytes(6).toString("hex")}`;
  const amount = Number(body.amount);
  const type = String(body.type || "其他").trim().slice(0, 40);
  const payer = normalizeUsername(body.payer);
  const participants = Array.from(
    new Set((Array.isArray(body.participants) ? body.participants : []).map(normalizeUsername))
  ).filter(isAllowedUsername);
  const date = String(body.date || "").trim();
  const note = String(body.note || "").trim().slice(0, 500);
  if (requireId && !suppliedId) return { error: "账目编号无效" };
  if (id.length > 120) return { error: "账目编号无效" };
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) return { error: "金额无效" };
  if (!isAllowedUsername(payer)) return { error: "付款人无效" };
  if (!participants.length) return { error: "请至少选择一位参与人" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "日期格式无效" };
  return {
    value: { id, amount: Math.round(amount * 100) / 100, type, payer, participants, date, note }
  };
}

function exportBackupData() {
  return {
    schema_version: 2,
    generated_at: nowIso(),
    users: deepClone(state.users),
    expenses: deepClone(state.expenses),
    tasks: deepClone(state.tasks),
    journal: deepClone(state.journal),
    audit: deepClone(state.audit)
  };
}

function getEncryptionKey() {
  const raw = String(process.env.BACKUP_ENCRYPTION_KEY || "");
  if (!raw) {
    throw new Error("BACKUP_ENCRYPTION_KEY is not configured");
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === 32) return decoded;
  return createHash("sha256").update(raw).digest();
}

function encryptBackup(payload) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64")
  };
}

function decryptBackup(wrapper) {
  if (!wrapper || wrapper.version !== 1 || wrapper.algorithm !== "aes-256-gcm") {
    throw new Error("Unsupported backup format");
  }
  const key = getEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(wrapper.iv, "base64"));
  decipher.setAuthTag(Buffer.from(wrapper.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(wrapper.data, "base64")),
    decipher.final()
  ]);
  return JSON.parse(plaintext.toString("utf8"));
}

function safeBackupFileName(value) {
  const fileName = path.basename(String(value || ""));
  if (!/^routebook-[a-z0-9-]+\.json\.enc$/i.test(fileName)) {
    throw new Error("Invalid backup file name");
  }
  return fileName;
}

async function uploadWithWebDav(filePath, fileName) {
  const baseUrl = String(process.env.BACKUP_WEBDAV_URL || "").trim();
  if (!baseUrl) return null;
  const target = new URL(baseUrl.endsWith("/") ? baseUrl : baseUrl + "/");
  target.pathname += encodeURIComponent(fileName);
  const headers = { "Content-Type": "application/octet-stream" };
  const username = String(process.env.BACKUP_WEBDAV_USERNAME || "");
  const password = String(process.env.BACKUP_WEBDAV_PASSWORD || "");
  if (username || password) {
    headers.Authorization = "Basic " + Buffer.from(username + ":" + password).toString("base64");
  }
  const response = await fetch(target, {
    method: "PUT",
    headers,
    body: await fs.readFile(filePath)
  });
  if (!response.ok) {
    throw new Error("WebDAV upload failed with HTTP " + response.status);
  }
  return "aliyun-webdav";
}

function runUploadProgram(filePath, fileName) {
  const program = String(process.env.BACKUP_UPLOAD_PROGRAM || "").trim();
  if (!program) return Promise.resolve(null);
  let args = [];
  try {
    args = JSON.parse(process.env.BACKUP_UPLOAD_ARGS_JSON || "[]");
  } catch {
    throw new Error("BACKUP_UPLOAD_ARGS_JSON must be a JSON array");
  }
  if (!Array.isArray(args)) throw new Error("BACKUP_UPLOAD_ARGS_JSON must be a JSON array");
  args = args.map((item) =>
    String(item).replaceAll("{file}", filePath).replaceAll("{name}", fileName)
  );
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { stdio: ["ignore", "ignore", "pipe"], shell: false });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk).slice(0, 4000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve("aliyun-uploader");
      else reject(new Error("Backup upload program exited " + code + ": " + stderr));
    });
  });
}

async function uploadBackup(filePath, fileName) {
  const webDavResult = await uploadWithWebDav(filePath, fileName);
  if (webDavResult) return webDavResult;
  const programResult = await runUploadProgram(filePath, fileName);
  if (programResult) return programResult;
  return "vps-local";
}

async function pruneBackupFiles() {
  const rows = Object.values(state.backups)
    .filter((item) => item && item.file_name)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const expired = rows.slice(MAX_BACKUPS);
  for (const row of expired) {
    try {
      await fs.unlink(path.join(BACKUP_DIR, safeBackupFileName(row.file_name)));
    } catch {
      // Already absent; metadata is still removed below.
    }
    await queueWrite(async (targetState) => {
      delete targetState.backups[row.id];
    });
  }
}

async function createBackup(source = "manual", actor = "system") {
  const createdAt = nowIso();
  const id = createdAt.replace(/[-:.TZ]/g, "").slice(0, 14) + "-" + randomBytes(4).toString("hex");
  const fileName = "routebook-" + id.toLowerCase() + ".json.enc";
  const filePath = path.join(BACKUP_DIR, fileName);
  const encrypted = encryptBackup(exportBackupData());
  await fs.writeFile(filePath, JSON.stringify(encrypted), { encoding: "utf8", mode: 0o600 });

  let destination = "vps-local";
  let status = "ok";
  let warning = "";
  try {
    destination = await uploadBackup(filePath, fileName);
  } catch (error) {
    status = "local-only";
    warning = String(error.message || error).slice(0, 500);
  }

  const row = {
    id,
    file_name: fileName,
    label: source === "scheduled" ? "北京时间每日备份" : source === "pre-restore" ? "恢复前保护备份" : "手动备份",
    created_at: createdAt,
    destination,
    source,
    created_by: actor,
    status,
    warning
  };
  await queueWrite(async (targetState) => {
    targetState.backups[id] = row;
    appendAudit(targetState, "backup.create", actor, { id, source, destination, status });
  });
  await pruneBackupFiles();
  return row;
}

function validateBackupPayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Backup payload is invalid");
  for (const key of ["users", "expenses", "tasks", "journal"]) {
    if (!payload[key] || typeof payload[key] !== "object" || Array.isArray(payload[key])) {
      throw new Error("Backup payload is missing " + key);
    }
  }
  for (const username of ALLOWED_USERS) {
    if (!payload.users[username]) throw new Error("Backup payload is missing user " + username);
  }
}

async function restoreBackup(backupId, actor) {
  const row = state.backups[String(backupId || "")];
  if (!row) throw new Error("找不到指定备份");
  const fileName = safeBackupFileName(row.file_name);
  const source = JSON.parse(await fs.readFile(path.join(BACKUP_DIR, fileName), "utf8"));
  const payload = decryptBackup(source);
  validateBackupPayload(payload);
  await createBackup("pre-restore", actor);
  await queueWrite(async (targetState) => {
    targetState.users = deepClone(payload.users);
    targetState.expenses = deepClone(payload.expenses);
    targetState.tasks = deepClone(payload.tasks);
    targetState.journal = deepClone(payload.journal);
    targetState.audit = Array.isArray(payload.audit) ? deepClone(payload.audit) : [];
    targetState.sessions = {};
    appendAudit(targetState, "backup.restore", actor, { backup_id: row.id });
  });
  return row;
}

app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false
  })
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.has(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use(authContext);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "routebook-api",
    time: nowIso(),
    backup_upload_configured: Boolean(
      process.env.BACKUP_WEBDAV_URL || process.env.BACKUP_UPLOAD_PROGRAM
    )
  });
});

app.get("/api/routebook/auth", requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.auth.user) });
});

app.post("/api/routebook/auth", async (req, res, next) => {
  try {
    const action = String(req.body?.action || "login");

    if (action === "login") {
      const username = normalizeUsername(req.body?.username);
      if (!isAllowedUsername(username)) {
        return res.status(401).json({ error: "账号或密码错误", code: "INVALID_CREDENTIALS" });
      }
      if (!loginRateAllowed(req, username)) {
        return res.status(429).json({ error: "登录尝试过多，请稍后重试", code: "RATE_LIMITED" });
      }
      const user = state.users[username];
      const valid = await verifyPassword(req.body?.password, user);
      if (!valid) {
        return res.status(401).json({ error: "账号或密码错误", code: "INVALID_CREDENTIALS" });
      }
      clearLoginRate(req, username);
      if (hasLegacyPassword(user)) {
        const credentials = await hashPassword(req.body.password);
        await queueWrite(async (targetState) => {
          const target = targetState.users[username];
          target.password_hash = credentials.hash;
          target.password_salt = credentials.salt;
          target.updated_at = nowIso();
          appendAudit(targetState, "auth.password.hash-migrated", username);
        });
      }
      const token = await issueSession(username, req, res);
      await queueWrite(async (targetState) => {
        appendAudit(targetState, "auth.login", username, { ip: String(req.ip || "") });
      });
      return res.json({ user: toPublicUser(state.users[username]), token });
    }

    if (action === "logout") {
      const token = getRequestToken(req);
      if (token) {
        await queueWrite(async (targetState) => {
          delete targetState.sessions[sha256(token)];
        });
      }
      clearSessionCookie(res);
      return res.json({ ok: true });
    }

    if (action === "change-password") {
      if (!req.auth?.user) {
        return res.status(401).json({ error: "请先登录", code: "AUTH_REQUIRED" });
      }
      const currentPassword = String(req.body?.currentPassword || "");
      const newPassword = String(req.body?.newPassword || "");
      const passwordError = validatePassword(newPassword);
      if (passwordError) return res.status(400).json({ error: passwordError, code: "WEAK_PASSWORD" });
      const username = req.auth.user.username;
      const valid = await verifyPassword(currentPassword, state.users[username]);
      if (!valid) {
        return res.status(403).json({ error: "当前密码不正确", code: "CURRENT_PASSWORD_INVALID" });
      }
      const credentials = await hashPassword(newPassword);
      await queueWrite(async (targetState) => {
        const user = targetState.users[username];
        user.password_hash = credentials.hash;
        user.password_salt = credentials.salt;
        user.must_change = false;
        user.updated_at = nowIso();
        revokeUserSessions(targetState, username);
        appendAudit(targetState, "auth.password.change", username);
      });
      const token = await issueSession(username, req, res);
      return res.json({ user: toPublicUser(state.users[username]), token });
    }

    if (action === "admin-reset-password") {
      if (!req.auth?.user) {
        return res.status(401).json({ error: "请先登录", code: "AUTH_REQUIRED" });
      }
      if (req.auth.user.username !== ADMIN_USER || req.auth.user.role !== "admin") {
        return res.status(403).json({ error: "仅 LL 管理员可重置同行者密码", code: "ADMIN_REQUIRED" });
      }
      if (req.auth.user.must_change) {
        return res.status(403).json({ error: "请先完成首次改密", code: "PASSWORD_CHANGE_REQUIRED" });
      }
      const targetUsername = normalizeUsername(req.body?.targetUsername);
      if (!isAllowedUsername(targetUsername) || targetUsername === ADMIN_USER) {
        return res.status(400).json({ error: "只能重置 YM、QNL 或 SZ", code: "TARGET_INVALID" });
      }
      const valid = await verifyPassword(req.body?.currentPassword, state.users[ADMIN_USER]);
      if (!valid) {
        return res.status(403).json({ error: "LL 当前密码不正确", code: "CURRENT_PASSWORD_INVALID" });
      }
      const temporaryPassword = createTemporaryPassword();
      const credentials = await hashPassword(temporaryPassword);
      await queueWrite(async (targetState) => {
        const target = targetState.users[targetUsername];
        target.password_hash = credentials.hash;
        target.password_salt = credentials.salt;
        target.must_change = true;
        target.updated_at = nowIso();
        revokeUserSessions(targetState, targetUsername);
        appendAudit(targetState, "auth.password.admin-reset", ADMIN_USER, {
          target: targetUsername,
          sessions_revoked: true
        });
      });
      return res.json({
        ok: true,
        targetUsername,
        mustChange: true,
        sessionsRevoked: true,
        temporaryPassword,
        message: targetUsername + " 已重置为一次性临时密码，原登录已失效"
      });
    }

    return res.status(400).json({ error: "未知认证操作", code: "ACTION_INVALID" });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/routebook/expenses", requireFullAuth, (_req, res) => {
  const expenses = Object.values(state.expenses).sort(
    (a, b) => String(a.date || "").localeCompare(String(b.date || "")) ||
      String(a.created_at || "").localeCompare(String(b.created_at || ""))
  );
  res.json({ expenses });
});

async function upsertExpense(req, res, next) {
  try {
    const parsed = validateExpense(req.body || {}, { requireId: req.method === "PATCH" });
    if (parsed.error) return res.status(400).json({ error: parsed.error, code: "EXPENSE_INVALID" });
    const value = parsed.value;
    const actor = req.auth.user.username;
    const row = await queueWrite(async (targetState) => {
      const existing = targetState.expenses[value.id];
      const createdAt = existing?.created_at || nowIso();
      const nextRow = {
        ...value,
        deleted: false,
        created_at: createdAt,
        created_by: existing?.created_by || actor,
        updated_at: nowIso(),
        updated_by: actor
      };
      targetState.expenses[value.id] = nextRow;
      appendAudit(targetState, existing ? "expense.update" : "expense.create", actor, {
        id: value.id,
        amount: value.amount
      });
      return nextRow;
    });
    return res.json({ expense: row });
  } catch (error) {
    return next(error);
  }
}

app.post("/api/routebook/expenses", requireFullAuth, upsertExpense);
app.patch("/api/routebook/expenses", requireFullAuth, upsertExpense);

app.delete("/api/routebook/expenses", requireFullAuth, async (req, res, next) => {
  try {
    const id = String(req.body?.id || req.query?.id || "").trim();
    if (!id || id.length > 120) {
      return res.status(400).json({ error: "账目编号无效", code: "EXPENSE_INVALID" });
    }
    const actor = req.auth.user.username;
    await queueWrite(async (targetState) => {
      const existing = targetState.expenses[id] || { id, created_at: nowIso(), created_by: actor };
      targetState.expenses[id] = {
        ...existing,
        id,
        deleted: true,
        updated_at: nowIso(),
        updated_by: actor
      };
      appendAudit(targetState, "expense.delete", actor, { id });
    });
    return res.json({ ok: true, id });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/routebook/tasks", (_req, res) => {
  res.json({ tasks: state.tasks });
});

app.post("/api/routebook/tasks", requireFullAuth, async (req, res, next) => {
  try {
    const taskId = String(req.body?.taskId || "").trim();
    if (!taskId || taskId.length > 120) {
      return res.status(400).json({ error: "待办编号无效", code: "TASK_INVALID" });
    }
    const actor = req.auth.user.username;
    const row = await queueWrite(async (targetState) => {
      const nextRow = {
        task_id: taskId,
        completed: Boolean(req.body?.completed),
        completed_by: actor,
        completed_at: req.body?.completed ? nowIso() : null,
        updated_at: nowIso()
      };
      targetState.tasks[taskId] = nextRow;
      appendAudit(targetState, "task.update", actor, {
        task_id: taskId,
        completed: nextRow.completed
      });
      return nextRow;
    });
    return res.json({ task: row });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/routebook/journal", (_req, res) => {
  const entries = {};
  for (const [dayId, row] of Object.entries(state.journal)) {
    entries[dayId] = row.entry;
  }
  res.json({ entries });
});

app.put("/api/routebook/journal", requireFullAuth, async (req, res, next) => {
  try {
    const dayId = String(req.body?.dayId || "").trim();
    const entry = req.body?.entry;
    if (!dayId || dayId.length > 120 || !entry || typeof entry !== "object" || Array.isArray(entry)) {
      return res.status(400).json({ error: "游记内容无效", code: "JOURNAL_INVALID" });
    }
    if (Buffer.byteLength(JSON.stringify(entry), "utf8") > 1024 * 1024) {
      return res.status(413).json({ error: "单日游记内容过大", code: "JOURNAL_TOO_LARGE" });
    }
    const actor = req.auth.user.username;
    const row = await queueWrite(async (targetState) => {
      const nextRow = {
        day_id: dayId,
        entry: deepClone(entry),
        updated_by: actor,
        updated_at: nowIso()
      };
      targetState.journal[dayId] = nextRow;
      appendAudit(targetState, "journal.update", actor, { day_id: dayId });
      return nextRow;
    });
    return res.json({ entry: row.entry, updated_at: row.updated_at });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/routebook/backups", requireAdmin, (_req, res) => {
  const backups = Object.values(state.backups)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .map(({ id, label, created_at, destination, source, status, warning }) => ({
      id,
      label,
      created_at,
      destination,
      source,
      status,
      warning
    }));
  res.json({ backups });
});

app.post("/api/routebook/backups", requireAdmin, async (req, res, next) => {
  try {
    const action = String(req.body?.action || "create");
    const actor = req.auth.user.username;
    if (action === "create") {
      const backup = await createBackup("manual", actor);
      return res.json({ backup });
    }
    if (action === "restore") {
      if (String(req.body?.confirm || "") !== "RESTORE") {
        return res.status(400).json({ error: "恢复确认文字不正确", code: "RESTORE_CONFIRM_REQUIRED" });
      }
      const valid = await verifyPassword(req.body?.currentPassword, state.users[ADMIN_USER]);
      if (!valid) {
        return res.status(403).json({ error: "LL 当前密码不正确", code: "CURRENT_PASSWORD_INVALID" });
      }
      const backup = await restoreBackup(req.body?.backupId, actor);
      clearSessionCookie(res);
      return res.json({
        ok: true,
        backup,
        sessionsRevoked: true,
        message: "数据已恢复；为安全起见，所有账号需要重新登录"
      });
    }
    return res.status(400).json({ error: "未知备份操作", code: "ACTION_INVALID" });
  } catch (error) {
    return next(error);
  }
});

app.use((error, req, res, _next) => {
  const requestId = randomBytes(6).toString("hex");
  console.error("[" + requestId + "]", req.method, req.originalUrl, error);
  const status = error?.message === "Origin is not allowed by CORS" ? 403 : 500;
  res.status(status).json({
    error: status === 403 ? "当前网页来源不允许访问后端" : "服务器暂时无法完成请求",
    code: status === 403 ? "CORS_DENIED" : "SERVER_ERROR",
    requestId
  });
});

await loadState();
await queueWrite(async (targetState) => {
  if (pruneExpiredSessions(targetState)) {
    appendAudit(targetState, "sessions.prune", "system");
  }
});

cron.schedule(
  "0 1 * * *",
  async () => {
    try {
      await createBackup("scheduled", "system");
      console.log("Scheduled routebook backup completed", nowIso());
    } catch (error) {
      console.error("Scheduled routebook backup failed", error);
    }
  },
  { timezone: "Asia/Shanghai" }
);

const server = app.listen(PORT, "127.0.0.1", () => {
  console.log("Routebook API listening on 127.0.0.1:" + PORT);
});

async function shutdown(signal) {
  console.log(signal + " received, shutting down");
  server.close(async () => {
    try {
      await writeChain;
      await persistState();
    } finally {
      process.exit(0);
    }
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

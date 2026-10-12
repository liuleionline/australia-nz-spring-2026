import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { createHash, createCipheriv, randomBytes, scryptSync } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import os from "node:os";

const here = path.dirname(fileURLToPath(import.meta.url));
const password = "Backup-policy-local-test-2026!";
const encryptionKey = "backup-policy-test-key-not-for-production";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");

test("disabled daily backups retain all historical files through manual creation, restore and restart", { timeout: 35000 }, async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "routebook-backup-policy-test-"));
  const backupsDir = path.join(dataDir, "backups"), stateFile = path.join(dataDir, "routebook-state.json");
  const clockFile = path.join(dataDir, "backup-clock.mjs"), port = 18788, baseUrl = `http://127.0.0.1:${port}`;
  let child, output = "";
  const users = Object.fromEntries(["LL", "YM", "QNL", "SZ"].map(username => {
    const salt = randomBytes(16);
    return [username, { username, role: username === "LL" ? "admin" : "participant", password_salt: salt.toString("hex"), password_hash: scryptSync(password, salt, 64).toString("hex"), must_change: false }];
  }));
  const payload = { schema_version: 3, users, expenses: {}, tasks: {}, journal: { LL: { d01: { day_id: "d01", entry: { summary: "historical journal" }, updated_by: "LL", updated_at: "2026-08-01T00:00:00.000Z" } } }, audit: [] };
  const historical = {}, originalHashes = new Map();
  await mkdir(backupsDir);
  for (let index = 0; index < 18; index++) {
    const id = "historic-" + String(index).padStart(2, "0"), fileName = `routebook-${id}.json.enc`;
    const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(encryptionKey).digest(), iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
    const bytes = Buffer.from(JSON.stringify({ version: 1, algorithm: "aes-256-gcm", iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: encrypted.toString("base64") }));
    await writeFile(path.join(backupsDir, fileName), bytes); originalHashes.set(fileName, hash(bytes));
    historical[id] = { id, file_name: fileName, created_at: `2026-08-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`, label: "Historical backup", source: "scheduled", destination: "vps-local", status: "ok", warning: "", created_by: "system" };
  }
  await writeFile(stateFile, JSON.stringify({ ...payload, backups: historical }));
  // Each process crosses the old 01:00 Shanghai schedule, then freezes its clock.
  // This exercises the real process rather than merely searching for a cron call.
  await writeFile(clockFile, `const OriginalDate = Date;
const started = OriginalDate.now(), origin = OriginalDate.parse("2026-10-12T00:59:55+08:00");
globalThis.Date = class extends OriginalDate {
  constructor(...args) { if (args.length) super(...args); else super(origin + Math.min(6000, OriginalDate.now() - started)); }
  static now() { return origin + Math.min(6000, OriginalDate.now() - started); }
};
`);
  const request = async (route, options = {}) => {
    const response = await fetch(baseUrl + route, { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
    return { response, body: await response.json() };
  };
  const start = async () => {
    child = spawn(process.execPath, ["--import", pathToFileURL(clockFile).href, path.join(here, "server.mjs")], {
      cwd: here, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, STATE_FILE: stateFile, ROUTEBOOK_DATA_FILE: stateFile, BACKUP_DIR: backupsDir, MAX_BACKUPS: "7", BACKUP_ENCRYPTION_KEY: encryptionKey, ROUTEBOOK_BOOTSTRAP_PASSWORD: password, BACKUP_WEBDAV_URL: "", BACKUP_WEBDAV_USERNAME: "", BACKUP_WEBDAV_PASSWORD: "", BACKUP_UPLOAD_PROGRAM: "", BACKUP_UPLOAD_ARGS_JSON: "[]" }
    });
    child.stdout.on("data", bytes => { output += bytes; }); child.stderr.on("data", bytes => { output += bytes; });
    for (let i = 0; i < 70; i++) {
      try { if ((await request("/health")).response.ok) return; } catch {}
      await pause(100);
    }
    throw new Error("Isolated backup server failed to start: " + output);
  };
  const stop = async () => {
    if (!child || child.exitCode !== null) return;
    child.kill("SIGTERM"); await Promise.race([new Promise(resolve => child.once("exit", resolve)), pause(3000)]);
    if (child.exitCode === null) child.kill("SIGKILL");
  };
  const boundary = async () => {
    for (let i = 0; i < 80; i++) {
      if (Date.parse((await request("/health")).body.time) >= Date.parse("2026-10-12T01:00:01+08:00")) { await pause(1200); return; }
      await pause(100);
    }
    throw new Error("The local test clock did not cross 01:00");
  };
  const login = async username => {
    const result = await request("/api/routebook/auth", { method: "POST", body: JSON.stringify({ action: "login", username, password }) });
    assert.equal(result.response.status, 200, "Isolated login failed"); return result.body.token;
  };
  const verifyHistorical = async () => {
    const state = JSON.parse(await readFile(stateFile, "utf8"));
    for (const [id, row] of Object.entries(historical)) assert.deepEqual(state.backups[id], row, "Historical metadata changed");
    for (const [name, expected] of originalHashes) assert.equal(hash(await readFile(path.join(backupsDir, name))), expected, "Historical backup bytes changed");
  };
  try {
    await start(); await boundary();
    assert.equal((await readdir(backupsDir)).length, 18, "Startup or the daily boundary created an automatic backup");
    await verifyHistorical();
    const ll = await login("LL"), headers = { Authorization: `Bearer ${ll}` };
    let result = await request("/api/routebook/backups", { headers });
    assert.deepEqual(result.body.policy, { automatic_enabled: false, retention: "keep_all" });
    assert.equal(result.body.backups.length, 18);
    assert.equal((await request("/api/routebook/backups")).response.status, 401);
    const ym = await login("YM");
    assert.equal((await request("/api/routebook/backups", { headers: { Authorization: `Bearer ${ym}` } })).response.status, 403);
    result = await request("/api/routebook/backups", { method: "POST", headers, body: JSON.stringify({ action: "create" }) });
    assert.equal(result.response.status, 200); assert.equal(result.body.backup.source, "manual");
    assert.equal((await readdir(backupsDir)).length, 19, "A manual backup pruned old backups using MAX_BACKUPS");
    await verifyHistorical();
    result = await request("/api/routebook/journal", { method: "PUT", headers, body: JSON.stringify({ username: "LL", dayId: "d99", entry: { summary: "after backup" } }) });
    assert.equal(result.response.status, 200);
    result = await request("/api/routebook/backups", { method: "POST", headers, body: JSON.stringify({ action: "restore", backupId: "historic-00", confirm: "RESTORE", currentPassword: password }) });
    assert.equal(result.response.status, 200, "An existing encrypted backup could not be restored");
    assert.equal((await readdir(backupsDir)).length, 20, "Restore did not retain every backup plus its protective snapshot");
    const restored = await login("LL");
    result = await request("/api/routebook/backups", { headers: { Authorization: `Bearer ${restored}` } });
    assert.equal(result.body.backups.filter(row => row.source === "pre-restore").length, 1);
    const journal = (await request("/api/routebook/journal")).body.journals.LL;
    assert.equal(journal.d01.summary, "historical journal"); assert.equal(journal.d99, undefined);
    await verifyHistorical();
    const retained = new Map(await Promise.all((await readdir(backupsDir)).map(async name => [name, hash(await readFile(path.join(backupsDir, name)))])));
    await stop(); await start(); await boundary();
    assert.equal((await readdir(backupsDir)).length, retained.size, "Restart re-enabled automatic backups");
    for (const [name, expected] of retained) assert.equal(hash(await readFile(path.join(backupsDir, name))), expected);
    await verifyHistorical();
  } finally {
    await stop();
    assert(path.resolve(dataDir).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(dataDir).startsWith("routebook-backup-policy-test-"), "Refusing unsafe cleanup");
    await rm(dataDir, { recursive: true, force: true });
  }
});

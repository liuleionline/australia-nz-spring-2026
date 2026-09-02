import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const port = 18787;
const bootstrapPassword = "Test-only-bootstrap-2026!";
const baseUrl = `http://127.0.0.1:${port}`;
const dataDir = await mkdtemp(path.join(os.tmpdir(), "routebook-api-test-"));
await writeFile(path.join(dataDir, "routebook-state.json"), JSON.stringify({
  schema_version: 2,
  journal: {
    d01: {
      day_id: "d01",
      entry: { summary: "legacy journal", updatedBy: "YM", savedAt: "2026-08-01T00:00:00.000Z" },
      updated_by: "YM",
      updated_at: "2026-08-01T00:00:00.000Z"
    },
    LL: {
      d03: {
        day_id: "d03",
        entry: null,
        deleted: true,
        updated_by: "LL",
        updated_at: "2026-08-02T00:00:00.000Z"
      }
    }
  }
}), "utf8");
const child = spawn(process.execPath, ["server.mjs"], {
  cwd: new URL(".", import.meta.url),
  env: {
    ...process.env,
    PORT: String(port),
    DATA_DIR: dataDir,
    BACKUP_ENCRYPTION_KEY: "routebook-test-key-not-for-production",
    SESSION_DAYS: "1",
    ROUTEBOOK_BOOTSTRAP_PASSWORD: bootstrapPassword
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
child.stdout.on("data", (chunk) => { output += String(chunk); });
child.stderr.on("data", (chunk) => { output += String(chunk); });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(pathname, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const response = await fetch(baseUrl + pathname, { ...options, headers });
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  return { response, body };
}

async function waitForHealth() {
  for (let index = 0; index < 60; index += 1) {
    try {
      const result = await request("/health");
      if (result.response.ok && result.body.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Server did not become healthy.\n" + output);
}

async function login(username, password) {
  const result = await request("/api/routebook/auth", {
    method: "POST",
    body: JSON.stringify({ action: "login", username, password })
  });
  assert(result.response.status === 200, `Login failed for ${username}: ${result.response.status} ${JSON.stringify(result.body)}`);
  assert(result.body.token, `Login for ${username} did not return a token`);
  return result.body;
}

async function stopServer() {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 3000))
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

try {
  await waitForHealth();

  let result = await request("/api/routebook/auth");
  assert(result.response.status === 401, "Anonymous auth check must return 401");

  result = await request("/api/routebook/journal");
  assert(result.response.status === 200 && result.body.journals?.YM?.d01?.summary === "legacy journal",
    "Legacy shared journal rows must migrate to their last known editor");
  assert(result.body.deletions?.LL?.d03 === "2026-08-02T00:00:00.000Z",
    "Journal tombstones must survive server startup normalization");

  result = await request("/api/routebook/auth", {
    method: "POST",
    body: JSON.stringify({ action: "login", username: "UNKNOWN", password: bootstrapPassword })
  });
  assert(result.response.status === 401 && result.body.code === "INVALID_CREDENTIALS",
    "Unknown account must receive a generic credential error");

  const llInitial = await login("LL", bootstrapPassword);
  assert(llInitial.user.mustChange === true, "Fresh LL account must require password change");

  result = await request("/api/routebook/expenses", {
    headers: { Authorization: `Bearer ${llInitial.token}` }
  });
  assert(result.response.status === 403 && result.body.code === "PASSWORD_CHANGE_REQUIRED",
    "Initial-password session must not access protected data");

  result = await request("/api/routebook/auth", {
    method: "POST",
    headers: { Authorization: `Bearer ${llInitial.token}` },
    body: JSON.stringify({
      action: "change-password",
      currentPassword: bootstrapPassword,
      newPassword: "LL-Test-Password-2026!"
    })
  });
  assert(result.response.status === 200 && result.body.token, "LL password change must issue a replacement token");
  const llToken = result.body.token;

  result = await request("/api/routebook/auth", {
    headers: { Authorization: `Bearer ${llInitial.token}` }
  });
  assert(result.response.status === 401, "Old LL token must be revoked after password change");

  result = await request("/api/routebook/auth", {
    headers: { Authorization: `Bearer ${llToken}` }
  });
  assert(result.response.status === 200 && result.body.user.username === "LL",
    "Replacement LL token must authenticate");

  const ymInitial = await login("YM", bootstrapPassword);
  result = await request("/api/routebook/auth", {
    method: "POST",
    headers: { Authorization: `Bearer ${ymInitial.token}` },
    body: JSON.stringify({
      action: "change-password",
      currentPassword: bootstrapPassword,
      newPassword: "YM-Test-Password-2026!"
    })
  });
  assert(result.response.status === 200 && result.body.token, "YM password change must succeed");
  const ymToken = result.body.token;

  result = await request("/api/routebook/journal", {
    method: "PUT",
    headers: { Authorization: `Bearer ${llToken}` },
    body: JSON.stringify({ dayId: "d02", entry: { summary: "LL journal", updatedBy: "YM" } })
  });
  assert(result.response.status === 200 && result.body.username === "LL" && result.body.entry.updatedBy === "LL",
    "Journal writes must use the authenticated account as owner");

  result = await request("/api/routebook/journal", {
    method: "PUT",
    headers: { Authorization: `Bearer ${ymToken}` },
    body: JSON.stringify({ dayId: "d02", entry: { summary: "YM journal" } })
  });
  assert(result.response.status === 200 && result.body.username === "YM",
    "A second participant must be able to save the same day independently");

  result = await request("/api/routebook/journal");
  assert(result.body.journals?.LL?.d02?.summary === "LL journal" && result.body.journals?.YM?.d02?.summary === "YM journal",
    "Saving the same day for two participants must not overwrite either entry");

  result = await request("/api/routebook/journal/d02", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${llToken}` }
  });
  assert(result.response.status === 200 && result.body.username === "LL" && result.body.deleted === true,
    "A participant must be able to delete their own journal entry");

  result = await request("/api/routebook/journal");
  assert(!result.body.journals?.LL?.d02 && result.body.journals?.YM?.d02?.summary === "YM journal",
    "Deleting LL journal must not delete YM journal for the same day");
  assert(typeof result.body.deletions?.LL?.d02 === "string",
    "Deleted journal must publish a tombstone timestamp for stale client caches");

  result = await request("/api/routebook/journal/d02", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${llToken}` }
  });
  assert(result.response.status === 404 && result.body.code === "JOURNAL_NOT_FOUND",
    "A participant must not be able to delete another participant journal by day id");

  result = await request("/api/routebook/auth", {
    method: "POST",
    headers: { Authorization: `Bearer ${ymToken}` },
    body: JSON.stringify({
      action: "admin-reset-password",
      targetUsername: "SZ",
      currentPassword: "YM-Test-Password-2026!"
    })
  });
  assert(result.response.status === 403 && result.body.code === "ADMIN_REQUIRED",
    "Non-admin user must never reset another account");

  result = await request("/api/routebook/auth", {
    method: "POST",
    body: JSON.stringify({
      action: "admin-reset-password",
      targetUsername: "YM",
      currentPassword: "LL-Test-Password-2026!"
    })
  });
  assert(result.response.status === 401 && result.body.code === "AUTH_REQUIRED",
    "Anonymous visitor must never access password reset");

  result = await request("/api/routebook/auth", {
    method: "POST",
    headers: { Authorization: `Bearer ${llToken}` },
    body: JSON.stringify({
      action: "admin-reset-password",
      targetUsername: "YM",
      currentPassword: "wrong-admin-password"
    })
  });
  assert(result.response.status === 403 && result.body.code === "CURRENT_PASSWORD_INVALID",
    "LL reset must verify LL's current password");

  result = await request("/api/routebook/auth", {
    method: "POST",
    headers: { Authorization: `Bearer ${llToken}` },
    body: JSON.stringify({
      action: "admin-reset-password",
      targetUsername: "LL",
      currentPassword: "LL-Test-Password-2026!"
    })
  });
  assert(result.response.status === 400 && result.body.code === "TARGET_INVALID",
    "LL must not reset the administrator account through the companion reset flow");

  result = await request("/api/routebook/auth", {
    method: "POST",
    headers: { Authorization: `Bearer ${llToken}` },
    body: JSON.stringify({
      action: "admin-reset-password",
      targetUsername: "YM",
      currentPassword: "LL-Test-Password-2026!",
      revokeAllSessions: true
    })
  });
  assert(result.response.status === 200 && result.body.sessionsRevoked === true,
    "LL admin reset must revoke target sessions");
  assert(typeof result.body.temporaryPassword === "string" && result.body.temporaryPassword.length >= 12,
    "LL admin reset must return a one-time temporary password");
  const ymTemporaryPassword = result.body.temporaryPassword;

  result = await request("/api/routebook/auth", {
    headers: { Authorization: `Bearer ${ymToken}` }
  });
  assert(result.response.status === 401, "YM token must be invalid after admin reset");

  const ymReset = await login("YM", ymTemporaryPassword);
  assert(ymReset.user.mustChange === true, "Reset user must change initial password at next login");

  const expense = {
    amount: 123.45,
    type: "其他",
    payer: "LL",
    participants: ["LL", "YM"],
    date: "2026-08-24",
    note: "automated smoke test"
  };
  result = await request("/api/routebook/expenses", {
    method: "POST",
    headers: { Authorization: `Bearer ${llToken}` },
    body: JSON.stringify(expense)
  });
  const generatedExpenseId = result.body.expense?.id;
  assert(result.response.status === 200 && typeof generatedExpenseId === "string" && generatedExpenseId.length > 0,
    "Authenticated expense creation without a client id must succeed and generate an id");

  result = await request("/api/routebook/expenses", {
    headers: { Authorization: `Bearer ${llToken}` }
  });
  assert(result.response.status === 200 && result.body.expenses.some((row) => row.id === generatedExpenseId),
    "Created expense must be readable");

  result = await request("/api/routebook/backups", {
    method: "POST",
    headers: { Authorization: `Bearer ${llToken}` },
    body: JSON.stringify({ action: "create", source: "manual" })
  });
  assert(result.response.status === 200 && result.body.backup.status === "ok",
    "LL manual encrypted backup must succeed");

  console.log("Routebook API smoke test passed");
} finally {
  await stopServer();
  await rm(dataDir, { recursive: true, force: true });
}

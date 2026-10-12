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

  for (const options of [
    { method: "PUT", body: JSON.stringify({ dayId: "d02", entry: { summary: "guest attempt" } }) },
    { method: "DELETE" }
  ]) {
    const guest = await request(options.method === "DELETE" ? "/api/routebook/journal/d02" : "/api/routebook/journal", options);
    assert(guest.response.status === 401, "Guests cannot edit or delete journals");
  }
  const llInitial = await login("LL", bootstrapPassword);
  assert(llInitial.user.mustChange === true, "Fresh LL account must require password change");
  result = await request("/api/routebook/journal", { method: "PUT", headers: { Authorization: `Bearer ${llInitial.token}` }, body: JSON.stringify({ dayId: "d02", entry: { summary: "initial-password attempt" } }) });
  assert(result.response.status === 403 && result.body.code === "PASSWORD_CHANGE_REQUIRED", "Initial-password users cannot modify journals");

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

  const journalsBeforeSpoof = JSON.stringify(result.body.journals);
  for (const [path, options] of [
    ["/api/routebook/journal", { method: "PUT", body: JSON.stringify({ username: "YM", dayId: "d02", entry: { summary: "cross-author edit" } }) }],
    ["/api/routebook/journal/d02?username=YM", { method: "DELETE" }]
  ]) {
    const attempted = await request(path, { ...options, headers: { Authorization: `Bearer ${llToken}` } });
    assert(attempted.response.status === 403 && attempted.body.code === "JOURNAL_OWNER_MISMATCH", "An administrator cannot explicitly modify another author's journal");
  }
  result = await request("/api/routebook/journal");
  assert(JSON.stringify(result.body.journals) === journalsBeforeSpoof, "Rejected cross-author writes preserve both journals");
  result = await request("/api/routebook/journal", { method: "PUT", headers: { Authorization: `Bearer ${ymToken}` }, body: JSON.stringify({ username: "YM", dayId: "d02", entry: { summary: "YM edited journal", updatedBy: "LL", savedAt: "fake timestamp" } }) });
  assert(result.response.status === 200 && result.body.entry.updatedBy === "YM" && Number.isFinite(Date.parse(result.body.entry.savedAt)), "An author can edit with canonical identity and server timestamp");
  result = await request("/api/routebook/journal");
  assert(result.body.journals.LL.d02.summary === "LL journal", "Editing another personal journal leaves the first author's entry untouched");
  result = await request("/api/routebook/journal/d02", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${llToken}` }
  });
  assert(result.response.status === 200 && result.body.username === "LL" && result.body.deleted === true,
    "A participant must be able to delete their own journal entry");

  result = await request("/api/routebook/journal");
  assert(!result.body.journals?.LL?.d02 && result.body.journals?.YM?.d02?.summary === "YM edited journal",
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

  result = await request("/api/routebook/exchange-rates");
  assert(result.response.status === 401, "Unauthenticated users cannot access expense rate suggestions");

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

  assert(result.body.capabilities?.foreign_currency === true, "The server advertises foreign-currency persistence");
  const foreignExpense = {
    ...expense, currency: "NZD", original_amount: 100, exchange_rate: 3.7672, amount: 376.72,
    exchange_rate_source: "BOC", exchange_rate_date: "2026-10-12T14:12:15+08:00"
  };
  result = await request("/api/routebook/expenses", {
    method: "POST", headers: { Authorization: `Bearer ${llToken}` }, body: JSON.stringify(foreignExpense)
  });
  const foreignId = result.body.expense?.id;
  assert(result.response.status === 200 && result.body.expense?.original_amount === 100 && result.body.expense?.amount === 376.72 && result.body.expense?.currency === "NZD",
    "Foreign amounts must be converted and preserved");
  assert(result.body.expense.exchange_rate_date === foreignExpense.exchange_rate_date, "Bank quote timestamp must be preserved");
  result = await request("/api/routebook/expenses", {
    method: "PATCH", headers: { Authorization: `Bearer ${llToken}` },
    body: JSON.stringify({ ...foreignExpense, id: foreignId, original_amount: 120.5, exchange_rate: 3.75, amount: 451.88, exchange_rate_source: "manual" })
  });
  assert(result.response.status === 200 && result.body.expense.original_amount === 120.5 && result.body.expense.amount === 451.88 && result.body.expense.exchange_rate_date === "",
    "Foreign expense edits retain original units and clear manually overridden bank provenance");
  result = await request("/api/routebook/expenses", {
    method: "POST", headers: { Authorization: `Bearer ${llToken}` }, body: JSON.stringify({ ...foreignExpense, amount: 1 })
  });
  assert(result.response.status === 400, "A tampered RMB amount must be rejected");
  result = await request("/api/routebook/expenses", { headers: { Authorization: `Bearer ${llToken}` } });
  assert(result.body.expenses.some(row => row.id === foreignId && row.currency === "NZD" && row.original_amount === 120.5 && row.exchange_rate === 3.75 && row.amount === 451.88),
    "Reloaded expenses retain the foreign currency and conversion inputs");

  result = await request("/api/routebook/travelers", { method: "PUT", body: JSON.stringify({ revision: 0, travelers: [] }) });
  assert(result.response.status === 401, "Guest users cannot change private family grouping");
  result = await request("/api/routebook/expenses", { headers: { Authorization: `Bearer ${llToken}` } });
  assert(result.body.capabilities?.family_settlement === true && result.body.travelers.length === 4, "Existing ledgers start with their original four travelers");
  const originalExpenses = JSON.stringify(result.body.expenses);
  const travelers = [...result.body.travelers, ...Array.from({ length: 5 }, (_, index) => ({ id: `TEST-${index}`, name: `Test companion ${index}`, family: "" }))]
    .map((person, index) => ({ ...person, family: index < 3 ? "Test family A" : index < 5 ? "Test family B" : index < 6 ? "" : "Test family C" }));
  const initialRevision = result.body.travelers_revision;
  result = await request("/api/routebook/travelers", { method: "PUT", headers: { Authorization: `Bearer ${llToken}` }, body: JSON.stringify({ revision: initialRevision, travelers }) });
  assert(result.response.status === 200 && result.body.travelers.length === 9, "Nine companions and mixed family sizes can be saved");
  let familyRevision = result.body.travelers_revision;
  result = await request("/api/routebook/travelers", { method: "PUT", headers: { Authorization: `Bearer ${llToken}` }, body: JSON.stringify({ revision: initialRevision, travelers }) });
  assert(result.response.status === 409, "A stale family edit cannot overwrite another edit");
  result = await request("/api/routebook/expenses", { headers: { Authorization: `Bearer ${llToken}` } });
  assert(JSON.stringify(result.body.expenses) === originalExpenses && result.body.travelers.length === 9, "Family changes preserve every original expense");
  const dynamicExpense = { ...expense, amount: 90, payer: "TEST-4", participants: travelers.map(person => person.id) };
  result = await request("/api/routebook/expenses", { method: "POST", headers: { Authorization: `Bearer ${llToken}` }, body: JSON.stringify(dynamicExpense) });
  const dynamicId = result.body.expense?.id;
  assert(result.response.status === 200 && result.body.expense.participants.length === 9 && result.body.expense.payer === "TEST-4", "New travelers can pay and participate without login accounts");
  result = await request("/api/routebook/expenses", { method: "POST", headers: { Authorization: `Bearer ${llToken}` }, body: JSON.stringify({ ...dynamicExpense, participants: ["LL", "UNKNOWN"] }) });
  assert(result.response.status === 400, "Unknown participants are rejected rather than silently discarded");
  result = await request("/api/routebook/travelers", { method: "PUT", headers: { Authorization: `Bearer ${llToken}` }, body: JSON.stringify({ revision: familyRevision, travelers: travelers.slice(0, -1) }) });
  assert(result.response.status === 400, "A recorded traveler cannot be removed");
  result = await request("/api/routebook/expenses", { headers: { Authorization: `Bearer ${llToken}` } });
  assert(result.body.travelers_revision === familyRevision && result.body.expenses.some(row => row.id === dynamicId && row.participants.length === 9), "Rejected settings leave the private ledger unchanged");

  result = await request("/api/routebook/backups", {
    method: "POST",
    headers: { Authorization: `Bearer ${llToken}` },
    body: JSON.stringify({ action: "create", source: "manual" })
  });
  assert(result.response.status === 200 && result.body.backup.status === "ok",
    "LL manual encrypted backup must succeed");

  result = await request("/api/routebook/journal", { headers: { Authorization: `Bearer ${llToken}` } });
  assert(result.body.limits?.max_photos === 6 && result.body.limits?.max_entry_bytes === 1048576, "The API advertises exact journal limits");
  const smallPhoto = "data:image/png;base64,iVBORw0KGgo=";
  const originalJournal = { summary: "photo-limit test", photos: [smallPhoto] };
  result = await request("/api/routebook/journal", { method: "PUT", headers: { Authorization: `Bearer ${llToken}` }, body: JSON.stringify({ dayId: "d04", entry: originalJournal }) });
  assert(result.response.status === 200, "A valid photo journal saves");
  for (const entry of [{ photos: Array(7).fill(smallPhoto) }, { summary: "a".repeat(1048576) }, { photos: {} }, { summary: "a".repeat(2100000) }]) {
    result = await request("/api/routebook/journal", { method: "PUT", headers: { Authorization: `Bearer ${llToken}` }, body: JSON.stringify({ dayId: "d04", entry }) });
    assert([400, 413].includes(result.response.status), "Invalid photos or oversized requests return an actionable client error");
    const saved = await request("/api/routebook/journal");
    assert(saved.body.journals?.LL?.d04?.summary === originalJournal.summary && saved.body.journals.LL.d04.photos.length === 1, "Rejected journal uploads preserve the previous saved entry");
  }
  result = await request("/api/routebook/backups", { method: "POST", headers: { Authorization: `Bearer ${llToken}` }, body: JSON.stringify({ action: "create" }) });
  assert(result.response.status === 200, "Photo journals remain compatible with backup creation");
  const familyBackupId = result.body.backup.id;
  result = await request("/api/routebook/travelers", { method: "PUT", headers: { Authorization: `Bearer ${llToken}` }, body: JSON.stringify({ revision: familyRevision, travelers: travelers.map(person => ({ ...person, family: "Test regrouped" })) }) });
  assert(result.response.status === 200, "Existing participants can be regrouped without changing expense rows");
  result = await request("/api/routebook/backups", { method: "POST", headers: { Authorization: `Bearer ${llToken}` }, body: JSON.stringify({ action: "restore", backupId: familyBackupId, confirm: "RESTORE", currentPassword: "LL-Test-Password-2026!" }) });
  assert(result.response.status === 200, "An encrypted backup restores dynamic companions and grouping");
  const restoredLogin = await login("LL", "LL-Test-Password-2026!");
  result = await request("/api/routebook/expenses", { headers: { Authorization: `Bearer ${restoredLogin.token}` } });
  assert(JSON.stringify(result.body.travelers) === JSON.stringify(travelers) && result.body.expenses.some(row => row.id === dynamicId && row.participants.length === 9), "Backup restoration preserves all nine companions and their expenses");
  console.log("Routebook API smoke test passed");
} finally {
  await stopServer();
  await rm(dataDir, { recursive: true, force: true });
}

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import { validateTravelers } from "./travelers.mjs";

const source = await fs.readFile(new URL("../integrated-app.js", import.meta.url), "utf8");
const start = source.indexOf("  function calculateSettlement(");
const end = source.indexOf("  function renderBudget()", start);
assert(start >= 0 && end > start);
const calculate = vm.runInNewContext(source.slice(start, end) + "\ncalculateSettlement;");
const travelers = Array.from({ length: 9 }, (_, index) => ({ id: `P${index}`, name: `测试旅伴${index + 1}`, family: index < 3 ? "三人家" : index < 5 ? "两人家" : index < 6 ? "" : "另一三人家" }));
const expense = (amount, payer, participants) => ({ amount, payer, participants });

test("arbitrary traveler counts and mixed household sizes are accepted", () => {
  assert.equal(validateTravelers(travelers).value.length, 9);
  const many = Array.from({ length: 120 }, (_, index) => ({ id: `P${index}`, name: `测试${index}`, family: "" }));
  assert.equal(validateTravelers(many).value.length, 120);
});

test("nine equal participants settle as households of 3, 2, 1, 3", () => {
  const result = calculate([expense(90, "P0", travelers.map(person => person.id))], travelers);
  assert.equal(result.groups.length, 4);
  assert.deepEqual(Array.from(result.groups, group => group.owedCents), [3000, 2000, 1000, 3000]);
  assert.deepEqual(Array.from(result.groups, group => group.balanceCents), [6000, -2000, -1000, -3000]);
  assert.equal(result.transfers.reduce((sum, item) => sum + item.cents, 0), 6000);
  assert(result.transfers.every(item => item.to === "三人家"));
});

test("partial participation and individual payments are preserved after regrouping", () => {
  const rows = [expense(12, "P4", ["P0", "P3", "P5"]), expense(10, "P1", ["P0", "P1"])];
  const result = calculate(rows, travelers);
  assert.deepEqual(Array.from(result.groups, group => [group.paidCents, group.owedCents, group.balanceCents]), [[1000, 1400, -400], [1200, 400, 800], [0, 400, -400], [0, 0, 0]]);
  const independent = calculate(rows, travelers.map(person => ({ ...person, family: "" })));
  assert.equal(independent.groups.length, 9);
  assert.equal(independent.groups.reduce((sum, item) => sum + item.paidCents, 0), 2200);
  assert.equal(independent.groups.reduce((sum, item) => sum + item.owedCents, 0), 2200);
});

test("cent remainders are deterministic and transfer amounts balance exactly", () => {
  const result = calculate([expense(0.01, "P8", travelers.map(person => person.id)), expense(0.1, "P4", ["P2", "P4", "P7"])], travelers);
  assert.equal(result.groups.reduce((sum, item) => sum + item.balanceCents, 0), 0);
  assert.equal(result.groups.reduce((sum, item) => sum + item.owedCents, 0), 11);
  assert.deepEqual(Array.from(result.groups, item => item.owedCents), [5, 3, 0, 3]);
  assert.equal(result.transfers.reduce((sum, item) => sum + item.cents, 0), 7);
});

test("empty ledgers and a single traveler need no transfer", () => {
  assert.equal(calculate([], travelers).transfers.length, 0);
  const result = calculate([expense(376.72, "P0", ["P0"])], [travelers[0]]);
  assert.equal(result.groups[0].paidCents, 37672);
  assert.equal(result.groups[0].balanceCents, 0);
  assert.equal(result.transfers.length, 0);
});

test("configuration rejects duplicate ids and cannot remove recorded participants", () => {
  assert(validateTravelers([]).error);
  assert(validateTravelers([travelers[0], travelers[0]]).error);
  assert(validateTravelers([{ ...travelers[0], name: " " }]).error);
  assert(validateTravelers(travelers.slice(0, -1), [expense(1, "P0", ["P8"])]).error);
  assert(validateTravelers(travelers.slice(0, -1), [{ ...expense(1, "P8", ["P0"]), deleted: true }]).error);
  assert.equal(validateTravelers(travelers, [expense(1, "P8", ["P0"])]).value.length, 9);
});

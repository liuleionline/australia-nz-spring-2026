export function validateTravelers(rows, expenses = []) {
  if (!Array.isArray(rows) || !rows.length) return { error: "请至少保留一位旅伴" };
  const ids = new Set();
  const travelers = [];
  for (const row of rows) {
    const id = String(row?.id || "").trim().toUpperCase();
    const name = String(row?.name || "").trim();
    const family = String(row?.family || "").trim();
    if (!/^[A-Z0-9_-]{1,80}$/.test(id) || ids.has(id)) return { error: "旅伴编号无效或重复" };
    if (!name || name.length > 40 || family.length > 40) return { error: "请填写旅伴姓名，姓名和家庭名称最多40字" };
    ids.add(id); travelers.push({ id, name, family });
  }
  for (const row of expenses) {
    const used = [row.payer, ...(row.participants || [])];
    if (used.some(id => id && !ids.has(id))) return { error: "已有账目引用的旅伴不能删除，可修改姓名或家庭分组" };
  }
  return { value: travelers };
}

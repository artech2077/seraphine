export const STORAGE_KEY = "seraphine-treasury-poc-v1"
export const FIELDS = {
  daily: [
    ["fund", "Fonds de caisse"],
    ["receipts", "Recettes"],
  ],
  tmz: [
    ["fund", "Fond de caisse"],
    ["receipts", "Recette"],
    ["sales", "Caisse/ventes"],
    ["fees", "Frais"],
    ["discounts", "Remises"],
  ],
}
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
export const money = (value) =>
  value == null
    ? "…"
    : new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .format(value)
        .replaceAll("\u202f", " ")
export const percent = (value) =>
  value == null
    ? "…"
    : new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 }).format(value)
export const ratio = (a, b) => (a == null || b == null ? null : b === 0 ? 0 : a / b)
export const dateLabel = (date) => date.split("-").reverse().join("/")
export const monthLabel = (key) =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    new Date(`${key}-15T12:00:00`)
  )
export function validDate(date) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    date.slice(0, 4) >= "1900" &&
    date.slice(0, 4) <= "2100" &&
    !Number.isNaN(Date.parse(date)) &&
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date
  )
}
export function parseAmount(value) {
  if (value == null || String(value).trim() === "") return null
  const normalized = String(value).trim().replaceAll(",", ".")
  if (!/^\d+(\.\d{1,2})?$/.test(normalized) || Number(normalized) > 999999999)
    throw new Error("Saisissez un montant positif ou nul, avec deux décimales au maximum.")
  return Number(normalized)
}
export function blankMonth() {
  return {
    daily: {},
    tmz: {},
    suppliers: {
      cumulative: ["Soremed", "Lodimed", "Sorepha", "Expert", "Serp", "Orlifix"].map((name) => ({
        name,
        amounts: name === "Sorepha" ? [null, null] : [null],
      })),
      draft: ["Sky Pharma", "Medexpert"].map((name) => ({ name, amounts: [null] })),
    },
    fcmf: { daily: null, tmz: null },
    stock: { initial: null, final: null },
  }
}
export function calendar(state, key, section) {
  const end = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate()
  const entries = state.months[key]?.[section] || {}
  return Array.from({ length: end }, (_, i) => `${key}-${String(i + 1).padStart(2, "0")}`).filter(
    (date) => {
      const day = new Date(`${date}T12:00:00`).getDay()
      return (section === "daily" ? day !== 0 : day === 4) || Object.hasOwn(entries, date)
    }
  )
}
export function saveEntry(state, section, date, entry, confirmed = false) {
  if (!FIELDS[section] || !validDate(date))
    throw new Error("Choisissez une date valide entre 1900 et 2100.")
  const key = date.slice(0, 7),
    old = state.months[key]?.[section]?.[date]
  const holidayName = String(entry.holidayName || "").trim()
  if (entry.holiday && (!holidayName || holidayName.length > 100))
    throw new Error("Indiquez le nom du jour férié (100 caractères maximum).")
  const amounts = Object.fromEntries(
    FIELDS[section].map(([field]) => [field, parseAmount(entry[field])])
  )
  const hasAmounts =
    Object.values(old || {}).some((value) => typeof value === "number") ||
    Object.values(amounts).some((value) => value != null)
  if (entry.holiday && hasAmounts && !confirmed) throw new Error("CONFIRM_CLEAR")
  if (!entry.holiday && !old?.holiday && Object.values(amounts).every((value) => value == null))
    throw new Error("Renseignez au moins un montant. Saisissez 0 si le montant est nul.")
  state.months[key] ??= blankMonth()
  state.months[key][section][date] = entry.holiday
    ? { holiday: true, holidayName }
    : { ...(!old?.holiday ? old : {}), ...amounts, holiday: false }
  return state
}
export function supplierPeriod(name, date) {
  return normalizeName(name) === "sorepha" && Number(date.slice(-2)) >= 26 ? 1 : 0
}
export function replaceSuppliers(state, date, values) {
  if (!validDate(date)) throw new Error("Choisissez une date valide.")
  const month = state.months[date.slice(0, 7)] || blankMonth()
  const updates = values.map(({ list, name, value }) => {
    const supplier = month.suppliers[list]?.find((item) => item.name === name)
    if (!supplier) throw new Error("Fournisseur introuvable. Rechargez la page.")
    return { supplier, index: supplierPeriod(name, date), value: parseAmount(value) }
  })
  updates.forEach(({ supplier, index, value }) => {
    supplier.amounts[index] = value
  })
  state.months[date.slice(0, 7)] = month
  return state
}
export const normalizeName = (name) =>
  name.trim().normalize("NFKC").replace(/\s+/g, " ").toLocaleLowerCase("fr")
export function addSupplier(state, date, name, destination) {
  if (!validDate(date)) throw new Error("Choisissez une date valide.")
  name = name.trim().replace(/\s+/g, " ")
  if (!name || name.length > 60) throw new Error("Indiquez un nom de 1 à 60 caractères.")
  const lists = destination === "both" ? ["cumulative", "draft"] : [destination]
  if (!lists.every((list) => ["cumulative", "draft"].includes(list)))
    throw new Error("Choisissez une liste.")
  const month = state.months[date.slice(0, 7)] || blankMonth()
  if (
    lists.some((list) =>
      month.suppliers[list].some((item) => normalizeName(item.name) === normalizeName(name))
    )
  )
    throw new Error("Ce fournisseur figure déjà dans une des listes sélectionnées.")
  lists.forEach((list) =>
    month.suppliers[list].push({
      name,
      amounts: normalizeName(name) === "sorepha" ? [null, null] : [null],
    })
  )
  state.months[date.slice(0, 7)] = month
}
export function calculated(state, key, section, date) {
  const month = state.months[key],
    entry = month?.[section]?.[date]
  if (!entry || entry.holiday) return null
  const days = calendar(state, key, section),
    next = days.slice(days.indexOf(date) + 1).find((day) => !month[section][day]?.holiday)
  const nextFund = next ? month[section][next]?.fund : month.fcmf[section]
  const fields =
    section === "daily"
      ? ["fund", "sales", "creditPaid", "creditUnpaid", "fees", "discounts"]
      : ["fund", "sales", "fees", "discounts"]
  if (nextFund == null || fields.some((field) => entry[field] == null)) return null
  return (
    entry.fund +
    entry.sales +
    (entry.creditPaid || 0) -
    (entry.creditUnpaid || 0) -
    entry.fees -
    entry.discounts -
    nextFund
  )
}
export function sum(entries, field) {
  return Object.values(entries || {})
    .filter((entry) => !entry.holiday)
    .reduce((total, entry) => total + (entry[field] ?? 0), 0)
}
export function supplierTotal(month, list) {
  return (
    month?.suppliers[list].reduce(
      (total, supplier) => total + supplier.amounts.reduce((a, b) => a + (b ?? 0), 0),
      0
    ) || 0
  )
}
export function summary(month) {
  const receipts = sum(month?.daily, "receipts") + sum(month?.tmz, "receipts")
  const sales = sum(month?.daily, "sales") + sum(month?.tmz, "sales")
  const cumulative = supplierTotal(month, "cumulative"),
    draft = supplierTotal(month, "draft")
  const gross = receipts - cumulative - draft
  return {
    receipts,
    sales,
    gross,
    cumulative,
    draft,
    grossReceipts: ratio(gross, receipts),
    grossSales: ratio(gross, sales),
  }
}
export function demoState(now = today()) {
  const state = { version: 1, months: {} },
    key = now.slice(0, 7),
    month = blankMonth()
  state.months[key] = month
  month.fcmf = { daily: 2500, tmz: 800 }
  month.stock = { initial: 284500, final: 301200 }
  for (const section of ["daily", "tmz"]) {
    calendar(state, key, section)
      .filter((date) => date < now)
      .forEach((date, i) => {
        const sales = section === "daily" ? 8400 + ((i * 137) % 3100) : 3100 + i * 310
        month[section][date] = {
          fund: section === "daily" ? 2500 + (i % 3) * 100 : 800,
          receipts: sales - 280,
          sales,
          fees: 120 + (i % 4) * 15,
          discounts: 160,
          holiday: false,
          ...(section === "daily" ? { creditPaid: 200, creditUnpaid: 350 } : {}),
        }
      })
  }
  const holiday = calendar(state, key, "daily").find((date) => date.endsWith("-06"))
  if (holiday && holiday < now)
    month.daily[holiday] = { holiday: true, holidayName: "Fermeture exceptionnelle (démo)" }
  month.suppliers.cumulative.forEach((supplier, i) => {
    supplier.amounts = supplier.name === "Sorepha" ? [12500, 4200] : [18000 - i * 2400]
  })
  month.suppliers.draft.forEach((supplier, i) => {
    supplier.amounts = [9500 - i * 2300]
  })
  return state
}
export function readState(storage) {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return demoState()
  const state = JSON.parse(raw)
  if (state.version !== 1 || !state.months || typeof state.months !== "object")
    throw new Error("Données locales illisibles. Réinitialisez les données de démonstration.")
  return state
}

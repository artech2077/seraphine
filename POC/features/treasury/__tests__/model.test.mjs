import { test } from "vitest"
import assert from "node:assert/strict"
import {
  blankMonth,
  calendar,
  saveEntry,
  replaceSuppliers,
  addSupplier,
  supplierTotal,
  calculated,
  summary,
  parseAmount,
  validDate,
} from "../../../model.mjs"
const fresh = () => ({ version: 1, months: {} })
const entry = (fund = 100) => ({ fund, receipts: 500 })
test("Selecting an absent month returns its calendar without creating data", () => {
  const state = fresh()
  assert.equal(calendar(state, "2026-11", "daily").length, 25)
  assert.deepEqual(calendar(state, "2026-11", "tmz"), [
    "2026-11-05",
    "2026-11-12",
    "2026-11-19",
    "2026-11-26",
  ])
  assert.deepEqual(state.months, {})
})
test("First save creates an empty month and edits reuse the date key", () => {
  const state = fresh()
  saveEntry(state, "daily", "2026-11-02", entry())
  saveEntry(state, "daily", "2026-11-02", entry(250))
  assert.equal(Object.keys(state.months["2026-11"].daily).length, 1)
  assert.equal(state.months["2026-11"].daily["2026-11-02"].fund, 250)
  assert.deepEqual(state.months["2026-11"].tmz, {})
  assert.equal(state.months["2026-11"].fcmf.daily, null)
})
test("Zero remains distinct from empty and negatives/formulas/invalid dates are rejected", () => {
  assert.equal(parseAmount("0"), 0)
  assert.equal(parseAmount(""), null)
  assert.equal(parseAmount("12,50"), 12.5)
  for (const value of ["-5", "=1+2", "abc", "1.001", "Infinity", "1e3"])
    assert.throws(() => parseAmount(value))
  for (const date of ["2026-02-30", "2026-13-01", "2026-00-20", "1899-12-31"])
    assert.equal(validDate(date), false)
  assert.throws(() => saveEntry(fresh(), "daily", "2026-11-02", { fund: "", receipts: "" }))
})
test("Worked Sunday is included once and used as the next working day", () => {
  const state = fresh()
  saveEntry(state, "daily", "2026-11-07", entry())
  Object.assign(state.months["2026-11"].daily["2026-11-07"], {
    sales: 1000,
    creditPaid: 0,
    creditUnpaid: 0,
    fees: 0,
    discounts: 0,
  })
  saveEntry(state, "daily", "2026-11-08", entry(300))
  saveEntry(state, "daily", "2026-11-08", entry(300))
  assert.equal(
    calendar(state, "2026-11", "daily").filter((date) => date === "2026-11-08").length,
    1
  )
  assert.equal(calculated(state, "2026-11", "daily", "2026-11-07"), 800)
})
test("Holiday clearing requires confirmation and cancellation preserves all values", () => {
  const state = fresh()
  saveEntry(state, "daily", "2026-11-02", entry(0))
  const before = JSON.stringify(state)
  assert.throws(
    () => saveEntry(state, "daily", "2026-11-02", { holiday: true, holidayName: "Fête" }),
    /CONFIRM_CLEAR/
  )
  assert.equal(JSON.stringify(state), before)
  saveEntry(state, "daily", "2026-11-02", { holiday: true, holidayName: "Fête" }, true)
  assert.deepEqual(state.months["2026-11"].daily["2026-11-02"], {
    holiday: true,
    holidayName: "Fête",
  })
})
test("Repeated holiday restoration/re-marking reuses one row, including no-amount reopening", () => {
  const state = fresh()
  for (let i = 0; i < 3; i++) {
    saveEntry(state, "daily", "2026-11-08", { holiday: true, holidayName: "Fête" }, true)
    saveEntry(state, "daily", "2026-11-08", { holiday: false })
    assert.equal(state.months["2026-11"].daily["2026-11-08"].holiday, false)
    assert.equal(state.months["2026-11"].daily["2026-11-08"].fund, null)
  }
  assert.equal(Object.keys(state.months["2026-11"].daily).length, 1)
})
test("Calculations skip consecutive holidays, include credits, and use FCMF at month end", () => {
  const state = fresh()
  saveEntry(state, "daily", "2026-11-26", entry())
  Object.assign(state.months["2026-11"].daily["2026-11-26"], {
    sales: 1000,
    creditPaid: 50,
    creditUnpaid: 20,
    fees: 10,
    discounts: 30,
  })
  for (const date of ["2026-11-27", "2026-11-28"])
    saveEntry(state, "daily", date, { holiday: true, holidayName: "Fermé" })
  saveEntry(state, "daily", "2026-11-30", entry(200))
  assert.equal(calculated(state, "2026-11", "daily", "2026-11-26"), 890)
  Object.assign(state.months["2026-11"].daily["2026-11-30"], {
    sales: 1000,
    creditPaid: 0,
    creditUnpaid: 0,
    fees: 10,
    discounts: 20,
  })
  state.months["2026-11"].fcmf.daily = 300
  assert.equal(calculated(state, "2026-11", "daily", "2026-11-30"), 870)
})
test("TMZ allows off-schedule dates, skips holidays and uses FCMF", () => {
  const state = fresh()
  saveEntry(state, "tmz", "2026-11-26", {
    fund: 50,
    receipts: 100,
    sales: 500,
    fees: 10,
    discounts: 20,
  })
  saveEntry(state, "tmz", "2026-11-29", { holiday: true, holidayName: "Fermé" })
  state.months["2026-11"].fcmf.tmz = 100
  assert.equal(calculated(state, "2026-11", "tmz", "2026-11-26"), 420)
  assert.equal(calendar(state, "2026-11", "tmz").length, 5)
})
test("Missing calculation inputs yield placeholders rather than treating empty as zero", () => {
  const state = fresh()
  saveEntry(state, "daily", "2026-11-30", entry(0))
  assert.equal(calculated(state, "2026-11", "daily", "2026-11-30"), null)
})
test("Supplier balances replace, and Sorepha routes 25th/26th with other period preserved", () => {
  const state = fresh()
  const update = (date, name, value) =>
    replaceSuppliers(state, date, [{ list: "cumulative", name, value }])
  update("2026-11-25", "Sorepha", 100)
  update("2026-11-26", "Sorepha", 200)
  update("2026-11-30", "Sorepha", 50)
  update("2026-11-25", "Soremed", 500)
  update("2026-11-26", "Soremed", 300)
  assert.deepEqual(
    state.months["2026-11"].suppliers.cumulative.find((s) => s.name === "Sorepha").amounts,
    [100, 50]
  )
  assert.equal(supplierTotal(state.months["2026-11"], "cumulative"), 450)
  assert.equal(Object.keys(state.months["2026-11"].daily).length, 0)
})
test("Supplier addition to both lists is atomic with normalized duplicate checks", () => {
  const state = fresh()
  addSupplier(state, "2026-11-01", " Nouveau Pharma ", "both")
  assert.equal(state.months["2026-11"].suppliers.draft.at(-1).name, "Nouveau Pharma")
  assert.throws(() => addSupplier(state, "2026-11-01", "  SOREMED  ", "both"), /déjà/)
  assert.equal(
    state.months["2026-11"].suppliers.draft.some((s) => s.name === "SOREMED"),
    false
  )
  addSupplier(state, "2026-11-01", "Soremed", "draft")
})
test("Monthly summary combines both caisses, supplier periods and drafts, and handles zero divisors", () => {
  const month = blankMonth()
  month.daily.a = { receipts: 1000, sales: 1200 }
  month.daily.b = { holiday: true, receipts: 9999, sales: 9999 }
  month.tmz.a = { receipts: 500, sales: 600 }
  month.suppliers.cumulative.find((s) => s.name === "Sorepha").amounts = [100, 200]
  month.suppliers.draft[0].amounts = [50]
  const data = summary(month)
  assert.equal(data.receipts, 1500)
  assert.equal(data.sales, 1800)
  assert.equal(data.gross, 1150)
  assert.equal(summary(blankMonth()).grossReceipts, 0)
})

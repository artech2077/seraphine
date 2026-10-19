import { test } from "vitest"
import assert from "node:assert/strict"
import { JSDOM } from "jsdom"
import { boot } from "../../../app.js"
import { STORAGE_KEY, demoState } from "../../../model.mjs"
import html from "../../../saisie.html?raw"
import dashboard from "../../../tresorerie.html?raw"
function setup(query = "?date=2026-11-02", page = html, raw = null) {
  const { window } = new JSDOM(page, {
    url: `http://localhost/${page === html ? "saisie.html" : "tresorerie.html"}${query}`,
  })
  window.confirm = () => true
  window.localStorage.setItem(STORAGE_KEY, raw || JSON.stringify(demoState("2026-10-20")))
  boot(window, { confirm: (message) => window.confirm(message) })
  const $ = (id) => window.document.getElementById(id)
  const input = (id, value) => {
    $(id).value = value
    $(id).dispatchEvent(new window.Event("input", { bubbles: true }))
  }
  const submit = (id) =>
    $(id).dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }))
  return {
    window,
    $,
    input,
    submit,
    state: () => JSON.parse(window.localStorage.getItem(STORAGE_KEY)),
  }
}
test("UI date selection does not create a month, submit locks it, explicit edit updates it", () => {
  const t = setup()
  assert.equal(t.state().months["2026-11"], undefined)
  t.input("amount-fund", "0")
  t.input("amount-receipts", "1200,50")
  t.submit("entry-form")
  assert.equal(t.$("amount-fund").readOnly, true)
  assert.equal(t.$("amount-receipts").value, "1200.5")
  t.$("edit").click()
  assert.equal(t.$("amount-fund").readOnly, false)
  t.input("amount-receipts", "900")
  t.submit("entry-form")
  assert.equal(Object.keys(t.state().months["2026-11"].daily).length, 1)
  assert.equal(t.state().months["2026-11"].daily["2026-11-02"].receipts, 900)
  const reloaded = setup("?date=2026-11-02", html, t.window.localStorage.getItem(STORAGE_KEY))
  assert.equal(reloaded.$("amount-receipts").value, "900")
})
test("UI holiday confirmation can be rejected then accepted, restored empty and re-marked", () => {
  const t = setup()
  t.input("amount-fund", "100")
  t.submit("entry-form")
  t.$("edit").click()
  t.$("holiday").checked = true
  t.$("holiday").dispatchEvent(new t.window.Event("change"))
  t.input("holiday-name", "Fête")
  t.window.confirm = () => false
  t.submit("entry-form")
  assert.equal(t.state().months["2026-11"].daily["2026-11-02"].fund, 100)
  t.window.confirm = () => true
  t.submit("entry-form")
  t.$("edit").click()
  t.$("holiday").checked = false
  t.$("holiday").dispatchEvent(new t.window.Event("change"))
  t.submit("entry-form")
  assert.equal(t.state().months["2026-11"].daily["2026-11-02"].holiday, false)
  t.$("edit").click()
  t.$("holiday").checked = true
  t.$("holiday").dispatchEvent(new t.window.Event("change"))
  t.input("holiday-name", "Fête bis")
  t.submit("entry-form")
  assert.equal(t.state().months["2026-11"].daily["2026-11-02"].holidayName, "Fête bis")
})
test("UI rejects invalid entry, and reset clears edits", () => {
  const t = setup()
  t.input("amount-fund", "-50")
  t.submit("entry-form")
  assert.equal(t.state().months["2026-11"], undefined)
  assert.equal(t.$("amount-fund").getAttribute("aria-invalid"), "true")
  t.input("amount-fund", "50")
  t.submit("entry-form")
  t.window.document.querySelector(".reset").click()
  assert.equal(t.state().months["2026-11"], undefined)
  assert.match(t.$("status").textContent, /réinitialisées/)
})
test("UI supplier replacement and escaped supplier labels render on monthly page", () => {
  const t = setup("?date=2026-11-25&section=suppliers")
  t.input("supplier-cumulative-2", "100")
  t.submit("supplier-form")
  t.$("date").value = "2026-11-26"
  t.$("date").dispatchEvent(new t.window.Event("change"))
  t.input("supplier-cumulative-2", "200")
  t.submit("supplier-form")
  t.input("supplier-cumulative-2", "50")
  t.submit("supplier-form")
  t.$("supplier-name").value = "<img src=x onerror=alert(1)>"
  t.$("supplier-list").value = "both"
  t.submit("add-supplier")
  const d = setup("?month=2026-11", dashboard, t.window.localStorage.getItem(STORAGE_KEY))
  assert.equal(d.window.document.querySelector("#supplier-table img"), null)
  assert.match(d.$("supplier-table").textContent, /100,00/)
  assert.match(d.$("supplier-table").textContent, /50,00/)
  assert.equal(d.window.document.querySelectorAll(".cash-table tbody .cash-row").length, 25)
})
test("Concurrent edits are refused rather than silently overwritten", () => {
  const t = setup()
  t.input("amount-fund", "100")
  const other = t.state()
  other.months["2026-11"] = { ...demoState("2026-11-20").months["2026-11"] }
  t.window.localStorage.setItem(STORAGE_KEY, JSON.stringify(other))
  t.submit("entry-form")
  assert.match(t.$("status").textContent, /autre onglet/)
  assert.notEqual(t.state().months["2026-11"].daily["2026-11-02"].fund, 100)
})

test("Accessible confirmation dialog preserves focus, cancels reset and confirms reset", () => {
  const { window } = new JSDOM(html, { url: "http://localhost/saisie.html?date=2026-11-02" })
  window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "")
  }
  window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open")
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoState("2026-10-20")))
  boot(window)
  const reset = window.document.querySelector(".reset")
  reset.focus()
  reset.click()
  const before = window.localStorage.getItem(STORAGE_KEY)
  assert.equal(
    window.document.querySelector("dialog").getAttribute("aria-labelledby"),
    "confirm-title"
  )
  window.document.querySelector("[data-cancel]").click()
  assert.equal(window.localStorage.getItem(STORAGE_KEY), before)
  assert.equal(window.document.activeElement, reset)
  reset.click()
  window.document.querySelector("[data-confirm]").click()
  assert.equal(window.document.querySelector("dialog"), null)
  assert.match(window.document.getElementById("status").textContent, /réinitialisées/)
})

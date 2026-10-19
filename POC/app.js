import {
  STORAGE_KEY,
  FIELDS,
  today,
  money,
  percent,
  ratio,
  dateLabel,
  monthLabel,
  validDate,
  blankMonth,
  calendar,
  saveEntry,
  replaceSuppliers,
  addSupplier,
  supplierPeriod,
  calculated,
  sum,
  supplierTotal,
  summary,
  demoState,
  readState,
} from "./model.mjs"

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
  )
const amount = (value) =>
  `<span class="${value == null ? "empty-value" : ""}">${value == null ? '<span aria-label="Non renseigné">…</span>' : money(value)}</span>`

export function boot(win, options = {}) {
  const doc = win.document,
    $ = (id) => doc.getElementById(id)
  const isEntry = doc.body.dataset.page === "entry"
  const params = new URLSearchParams(win.location.search)
  let date = validDate(params.get("date") || "") ? params.get("date") : today()
  let key =
    /^\d{4}-\d{2}$/.test(params.get("month") || "") && validDate(`${params.get("month")}-01`)
      ? params.get("month")
      : date.slice(0, 7)
  let section = ["daily", "tmz", "suppliers"].includes(params.get("section"))
    ? params.get("section")
    : "daily"
  let state,
    editing = false,
    dirty = false,
    loadedSignature = ""
  $("shell").innerHTML =
    `<header class="topbar"><a class="brand" href="tresorerie.html" aria-label="Seraphine, trésorerie mensuelle"><img src="assets/seraphine.svg" alt=""/><strong>seraphine</strong></a><nav aria-label="Navigation principale"><a ${isEntry ? 'id="dashboard-link"' : 'aria-current="page"'} href="tresorerie.html">Vue mensuelle</a><a ${isEntry ? 'aria-current="page"' : ""} href="saisie.html">Saisie trésorerie</a></nav><span class="badge prototype">Prototype · données de démonstration</span></header>`
  function feedback(text, error = false) {
    $("status").hidden = false
    $("status").className = `status${error ? " error" : ""}`
    $("status").setAttribute("role", error ? "alert" : "status")
    $("status").textContent = text
  }
  function reload() {
    state = readState(win.localStorage)
  }
  function write(mutate) {
    const next = readState(win.localStorage)
    mutate(next)
    win.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    state = next
  }
  function safely(action) {
    try {
      action()
    } catch (error) {
      feedback(
        error.message === "CONFIRM_CLEAR"
          ? "Les montants ont été conservés."
          : error.message || "Enregistrement impossible. Vérifiez le stockage de ce navigateur.",
        true
      )
    }
  }
  function updateUrl() {
    const query = isEntry ? `date=${date}&section=${section}` : `month=${key}`
    win.history.replaceState(null, "", `?${query}`)
  }
  function ask(message, onConfirm, onCancel = () => {}) {
    if (options.confirm) {
      ;(options.confirm(message) ? onConfirm : onCancel)()
      return
    }
    const previousFocus = doc.activeElement
    const dialog = doc.createElement("dialog")
    dialog.className = "confirmation-dialog"
    dialog.setAttribute("aria-labelledby", "confirm-title")
    dialog.innerHTML = `<h2 id="confirm-title">Confirmer la modification</h2><p>${escapeHtml(message)}</p><div class="dialog-actions"><button type="button" class="button secondary" data-cancel>Annuler</button><button type="button" class="button primary" data-confirm>Confirmer</button></div>`
    function close(confirmed) {
      dialog.close()
      dialog.remove()
      previousFocus?.focus()
      safely(confirmed ? onConfirm : onCancel)
    }
    dialog.querySelector("[data-confirm]").addEventListener("click", () => close(true))
    dialog.querySelector("[data-cancel]").addEventListener("click", () => close(false))
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault()
      close(false)
    })
    doc.body.append(dialog)
    dialog.showModal()
    dialog.querySelector("[data-cancel]").focus()
  }
  function navigate(action, cancel = () => {}) {
    if (!dirty) {
      safely(action)
      return
    }
    ask("Quitter cette saisie sans enregistrer les modifications ?", action, cancel)
  }
  doc.querySelectorAll(".reset").forEach((button) =>
    button.addEventListener("click", () => {
      ask(
        "Réinitialiser les données de démonstration ? Toutes vos modifications locales seront effacées.",
        () => {
          win.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoState()))
          dirty = false
          reload()
          render()
          feedback("Les données de démonstration ont été réinitialisées.")
        }
      )
    })
  )
  doc.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]")
    if (!dirty || !link || link.getAttribute("href").startsWith("#")) return
    event.preventDefault()
    navigate(() => {
      dirty = false
      win.location.href = link.href
    })
  })
  win.addEventListener("beforeunload", (event) => {
    if (dirty) {
      event.preventDefault()
      event.returnValue = ""
    }
  })
  win.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return
    if (dirty) {
      feedback(
        "Les données ont changé dans un autre onglet. Rechargez la saisie avant d’enregistrer.",
        true
      )
      return
    }
    safely(() => {
      reload()
      render()
      feedback("Données actualisées depuis un autre onglet.")
    })
  })
  function context() {
    $("dashboard-link").href = `tresorerie.html?month=${key}`
  }
  function inputField(field, label, value, locked) {
    return `<div class="field"><label for="amount-${field}">${label}</label><div class="amount-input"><input id="amount-${field}" name="${field}" inputmode="decimal" autocomplete="off" placeholder="Non renseigné" value="${value ?? ""}" ${locked ? "readonly" : ""}/><span>MAD</span></div></div>`
  }
  function entryRender() {
    key = date.slice(0, 7)
    context()
    doc
      .querySelectorAll("[data-section]")
      .forEach((button) =>
        button.setAttribute("aria-pressed", String(button.dataset.section === section))
      )
    if (section === "suppliers") {
      suppliersRender()
      return
    }
    const entry = state.months[key]?.[section][date],
      locked = !!entry && !editing
    loadedSignature = JSON.stringify(entry)
    const scheduled =
      section === "daily"
        ? new Date(`${date}T12:00:00`).getDay() !== 0
        : new Date(`${date}T12:00:00`).getDay() === 4
    const title = section === "daily" ? "Caisse principale" : "Bilan Trésorerie TMZ"
    $("editor").innerHTML =
      `<div class="editor-heading"><div><h2>${title}</h2></div><span class="badge">${locked ? "Saisie enregistrée · lecture seule" : editing ? "Modification en cours" : "Nouvelle saisie"}</span></div><form id="entry-form" novalidate><div class="editor-body">${!scheduled ? `<p class="period-notice">${entry ? "Journée ajoutée au calendrier habituel." : "Date hors calendrier habituel. L’enregistrement ajoutera cette journée au tableau."}</p>` : ""}<div class="fields-grid">${FIELDS[section].map(([field, label]) => inputField(field, label, entry?.[field], locked)).join("")}</div><div class="holiday-box"><label class="checkbox-label" for="holiday"><input id="holiday" type="checkbox" ${entry?.holiday ? "checked" : ""} ${locked ? "disabled" : ""}/>Jour férié, journée fermée</label><div id="holiday-name-box" class="field holiday-name" ${entry?.holiday ? "" : "hidden"}><label for="holiday-name">Nom du jour férié</label><input id="holiday-name" maxlength="100" value="${escapeHtml(entry?.holidayName)}" placeholder="Ex. : Aïd Al Fitr" ${locked ? "readonly" : ""}/></div></div></div><div class="form-actions"><div class="actions-right">${editing ? '<button type="button" id="cancel-edit" class="text-button">Annuler</button>' : ""}${locked ? '<button type="button" id="edit" class="button secondary">Modifier la saisie</button>' : '<button class="button primary" type="submit">Enregistrer la saisie <span aria-hidden="true">→</span></button>'}</div></div></form>`
    function holidayToggle() {
      $("holiday-name-box").hidden = !$("holiday").checked
      FIELDS[section].forEach(([field]) => {
        $(`amount-${field}`).disabled = $("holiday").checked
      })
    }
    holidayToggle()
    $("holiday").addEventListener("change", holidayToggle)
    $("entry-form").addEventListener("input", () => {
      dirty = true
    })
    $("edit")?.addEventListener("click", () => {
      editing = true
      entryRender()
      $("holiday").focus()
    })
    $("cancel-edit")?.addEventListener("click", () => {
      navigate(() => {
        dirty = false
        editing = false
        entryRender()
      })
    })
    $("entry-form").addEventListener("submit", (event) => {
      event.preventDefault()
      if (locked) return
      safely(() => {
        const nextEntry = { holiday: $("holiday").checked, holidayName: $("holiday-name").value }
        for (const [field] of FIELDS[section]) {
          const input = $(`amount-${field}`)
          nextEntry[field] = input.value
          if (!nextEntry.holiday) {
            try {
              // Validate near the field and preserve the draft on error.
              const { value } = input
              if (
                value.trim() &&
                (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim()) ||
                  Number(value.replace(",", ".")) > 999999999)
              )
                throw new Error(
                  "Saisissez un montant positif ou nul, avec deux décimales au maximum."
                )
              input.removeAttribute("aria-invalid")
            } catch (error) {
              input.setAttribute("aria-invalid", "true")
              input.focus()
              throw error
            }
          }
        }
        if (nextEntry.holiday && !nextEntry.holidayName.trim()) {
          $("holiday-name").focus()
          throw new Error("Indiquez le nom du jour férié.")
        }
        function commit(confirmed = false) {
          write((next) => {
            if (JSON.stringify(next.months[key]?.[section][date]) !== loadedSignature)
              throw new Error("Cette saisie a changé dans un autre onglet. Rechargez la page.")
            saveEntry(next, section, date, nextEntry, confirmed)
          })
          dirty = false
          editing = false
          entryRender()
          feedback(`Saisie du ${dateLabel(date)} enregistrée.`)
        }
        try {
          commit()
        } catch (error) {
          if (error.message !== "CONFIRM_CLEAR") throw error
          ask(
            "Marquer cette journée fermée effacera ses montants, y compris les valeurs de démonstration. Continuer ?",
            () => commit(true),
            () => feedback("Les montants ont été conservés.")
          )
        }
      })
    })
  }
  function suppliersRender() {
    const month = state.months[key] || blankMonth()
    loadedSignature = JSON.stringify(state.months[key]?.suppliers)
    const period = Number(date.slice(-2)) <= 25 ? "du 1 au 25" : "du 26 à la fin du mois"
    const groups = [
      ["cumulative", "Cumul mensuel"],
      ["draft", "Traites du mois en cours"],
    ]
    $("editor").innerHTML =
      `<div class="editor-heading"><div><h2>Fournisseurs</h2></div><span class="badge">Mise à jour des soldes</span></div><form id="supplier-form" novalidate><div class="editor-body"><p class="period-notice">Sorepha · <strong>${period}</strong> · ${monthLabel(key)}</p>${groups
        .map(
          ([list, label]) =>
            `<div class="supplier-group"><h3>${label}</h3>${month.suppliers[list]
              .map((supplier, index) => {
                const slot = supplierPeriod(supplier.name, date),
                  sorepha = supplier.name.toLocaleLowerCase("fr") === "sorepha"
                return `<div class="supplier-field"><label for="supplier-${list}-${index}">${escapeHtml(supplier.name)}${sorepha ? `<small>${period}<br/>Autre période : ${money(supplier.amounts[slot === 0 ? 1 : 0])} MAD</small>` : ""}</label><input id="supplier-${list}-${index}" data-list="${list}" data-name="${escapeHtml(supplier.name)}" value="${supplier.amounts[slot] ?? ""}" inputmode="decimal" autocomplete="off" placeholder="Non renseigné" aria-label="${escapeHtml(supplier.name)}, ${label}${sorepha ? `, ${period}` : ""}"/></div>`
              })
              .join("")}</div>`
        )
        .join(
          ""
        )}</div><div class="form-actions"><div class="actions-right"><button type="submit" class="button primary">Mettre à jour les montants</button></div></div></form><details class="add-supplier"><summary>＋ Ajouter un fournisseur</summary><form id="add-supplier"><div class="field"><label for="supplier-name">Nom du fournisseur</label><input id="supplier-name" maxlength="60" required placeholder="Nom du fournisseur"/></div><div class="field"><label for="supplier-list">Ajouter dans</label><select id="supplier-list"><option value="cumulative">Cumul mensuel</option><option value="draft">Traites du mois en cours</option><option value="both">Les deux listes</option></select></div><button type="submit" class="button secondary">Ajouter au mois sélectionné</button></form></details>`
    $("supplier-form").addEventListener("input", () => {
      dirty = true
    })
    $("supplier-form").addEventListener("submit", (event) => {
      event.preventDefault()
      safely(() => {
        const values = [...doc.querySelectorAll("[data-list]")].map((input) => ({
          list: input.dataset.list,
          name: input.dataset.name,
          value: input.value,
        }))
        write((next) => {
          if (JSON.stringify(next.months[key]?.suppliers) !== loadedSignature)
            throw new Error("Les soldes ont changé dans un autre onglet. Rechargez la page.")
          replaceSuppliers(next, date, values)
        })
        dirty = false
        context()
        suppliersRender()
        feedback(`Montants de ${monthLabel(key)} mis à jour.`)
      })
    })
    $("add-supplier").addEventListener("submit", (event) => {
      event.preventDefault()
      safely(() => {
        if (dirty)
          throw new Error(
            "Enregistrez d’abord les montants modifiés avant d’ajouter un fournisseur."
          )
        write((next) => addSupplier(next, date, $("supplier-name").value, $("supplier-list").value))
        suppliersRender()
        context()
        feedback("Fournisseur ajouté.")
      })
    })
  }
  function cashTable(kind) {
    const main = kind === "daily",
      month = state.months[key],
      entries = month?.[kind] || {},
      days = calendar(state, key, kind)
    const columns = main
      ? [
          "Jour",
          "Fonds de caisse",
          "Recettes saisies",
          "Recettes calculées",
          "CA*",
          "CA ?",
          "Crédits non payés des clients*",
          "Crédits payés*",
          "Frais*",
          "Remises*",
          "Remises / CA",
        ]
      : [
          "Jour",
          "Fond de caisse",
          "Recette saisie",
          "Recette calculée",
          "Caisse/ventes",
          "Frais",
          "Remises",
          "Remises / Caisse/ventes",
        ]
    let incomplete = false,
      calculatedTotal = 0
    const rows = days
      .map((date) => {
        const entry = entries[date],
          link = `saisie.html?date=${date}&section=${kind}`
        const day = new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(
          new Date(`${date}T12:00:00`)
        )
        const first = `<td class="date-cell"><a href="${link}" aria-label="${main ? "Caisse principale" : "TMZ"}, ${dateLabel(date)}${entry?.holiday ? ", jour férié" : ""}">${dateLabel(date)}<small>${day}</small></a></td>`
        if (entry?.holiday)
          return `<tr class="holiday-row cash-row" data-href="${link}">${first}<td colspan="${columns.length - 1}">Jour férié · <strong>${escapeHtml(entry.holidayName)}</strong></td></tr>`
        const calc = calculated(state, key, kind, date)
        if (calc == null) incomplete = true
        else calculatedTotal += calc
        const data = main
          ? [
              [entry?.fund, ""],
              [entry?.receipts, ""],
              [calc, "computed"],
              [entry?.sales, "demo-cell"],
              [null, "demo-cell"],
              [entry?.creditUnpaid, "demo-cell"],
              [entry?.creditPaid, "demo-cell"],
              [entry?.fees, "demo-cell"],
              [entry?.discounts, "demo-cell"],
            ]
          : [
              [entry?.fund, ""],
              [entry?.receipts, ""],
              [calc, "computed"],
              [entry?.sales, ""],
              [entry?.fees, ""],
              [entry?.discounts, ""],
            ]
        return `<tr class="cash-row" data-href="${link}">${first}${data.map(([value, css]) => `<td class="${css}">${amount(value)}</td>`).join("")}<td class="computed">${percent(ratio(entry?.discounts, entry?.sales))}</td></tr>`
      })
      .join("")
    const totals = main
      ? [
          null,
          sum(entries, "receipts"),
          incomplete ? null : calculatedTotal,
          sum(entries, "sales"),
          null,
          sum(entries, "creditUnpaid"),
          sum(entries, "creditPaid"),
          sum(entries, "fees"),
          sum(entries, "discounts"),
        ]
      : [
          null,
          sum(entries, "receipts"),
          incomplete ? null : calculatedTotal,
          sum(entries, "sales"),
          sum(entries, "fees"),
          sum(entries, "discounts"),
        ]
    return `<div class="ledger-heading"><div><h2>${main ? "Caisse principale" : "Bilan Trésorerie TMZ"}</h2><p>${days.length} journées au calendrier · ${main ? "lundi à samedi" : "jeudis"} + journées ajoutées</p></div><a class="text-button" href="saisie.html?date=${key}-01&section=${kind}">Saisir <span aria-hidden="true">↗</span></a></div><div class="table-scroll" tabindex="0" role="region" aria-label="Tableau ${main ? "caisse principale" : "TMZ"}, défilement horizontal"><table class="${main ? "cash-table" : "tmz-table"}"><caption>${monthLabel(key)} · MAD${main ? " · * Valeurs fictives hors formulaire" : ""}</caption><thead><tr>${columns.map((label) => `<th scope="col">${label}</th>`).join("")}</tr></thead><tbody>${rows}<tr class="fcmf"><td>FCMF*</td><td>${amount(month?.fcmf[kind])}</td><td colspan="${columns.length - 2}">Solde de fin de mois${month?.fcmf[kind] != null ? " · démonstration" : " · non renseigné"}</td></tr><tr class="total-row"><td>Total</td>${totals.map((value) => `<td>${value == null ? "…" : money(value)}</td>`).join("")}<td>${percent(ratio(sum(entries, "discounts"), sum(entries, "sales")))}</td></tr></tbody></table></div><p class="ledger-footnote">${incomplete ? "Calculs incomplets : fonds ou montants nécessaires manquants. " : ""}FCMF : fonds de caisse de fin de mois. Faites défiler pour voir toutes les colonnes.</p>`
  }
  function dashboardRender() {
    const month = state.months[key],
      data = summary(month),
      link = `saisie.html?date=${key}-01&section=suppliers`
    $("month").value = key
    $("month-display").textContent = monthLabel(key)
    $("entry-link").href = `saisie.html?date=${key === today().slice(0, 7) ? today() : `${key}-01`}`
    $("month-state").textContent = month
      ? "Mois enregistré dans ce navigateur"
      : "Mois sans saisie · aperçu du calendrier"
    const cards = [
      ["Recettes mensuelles", data.receipts, "Caisse principale + TMZ"],
      ["Chiffre d’affaires*", data.sales, "CA principal + ventes TMZ"],
      ["Fournisseurs & traites", data.cumulative + data.draft, "Soldes du mois en cours"],
      ["Brut mensuel", data.gross, "Après fournisseurs et traites"],
      ["Brut / Recettes", percent(data.grossReceipts), "Part du brut dans les recettes"],
    ]
    $("metrics").innerHTML = cards
      .map(
        ([label, value]) =>
          `<article class="metric"><p class="metric-label">${label}</p><strong class="metric-value">${typeof value === "number" ? `${money(value)} <small>MAD</small>` : value}</strong></article>`
      )
      .join("")
    $("daily-table").innerHTML = cashTable("daily")
    $("tmz-table").innerHTML = cashTable("tmz")
    const suppliers = month?.suppliers || blankMonth().suppliers
    $("supplier-table").innerHTML =
      `<div class="ledger-heading"><div><h2>Fournisseurs</h2><p>Soldes actuels de ${monthLabel(key)}</p></div><a href="${link}" class="text-button">Mettre à jour ↗</a></div><div class="supplier-grid">${[
        ["cumulative", "Cumul mensuel"],
        ["draft", "Traites du mois en cours"],
      ]
        .map(
          ([list, label]) =>
            `<div><table><thead><tr><th colspan="2" scope="colgroup">${label}</th>${list === "cumulative" ? '<th scope="col">% du total</th>' : ""}</tr></thead><tbody>${suppliers[list].map((supplier) => supplier.amounts.map((value, period) => `<tr class="cash-row" data-href="saisie.html?date=${key}-${period ? "26" : "01"}&section=suppliers"><td><a class="name-link" href="saisie.html?date=${key}-${period ? "26" : "01"}&section=suppliers">${escapeHtml(supplier.name)}${supplier.amounts.length > 1 ? `<small>${period ? "26 à fin de mois" : "1 au 25"}</small>` : ""}</a></td><td>${amount(value)}</td>${list === "cumulative" ? `<td class="computed">${value == null ? "…" : percent(ratio(value, data.cumulative))}</td>` : ""}</tr>`).join("")).join("")}<tr class="total-row"><td>Total</td><td>${money(supplierTotal(month, list))}</td>${list === "cumulative" ? `<td>${data.cumulative ? "100 %" : "0 %"}</td>` : ""}</tr></tbody></table></div>`
        )
        .join("")}</div>`
    $("monthly-summary").innerHTML =
      `<div class="ledger-heading"><h2>Synthèse mensuelle</h2><span class="mini-label">MAD</span></div><div class="table-scroll" tabindex="0" role="region" aria-label="Synthèse mensuelle, défilement horizontal"><table class="summary-table"><thead><tr>${["Recettes mensuelles", "CA*", "Brut mensuel", "% Brut / Recettes", "% Brut / CA"].map((label) => `<th scope="col">${label}</th>`).join("")}</tr></thead><tbody><tr class="total-row"><td>${money(data.receipts)}</td><td>${money(data.sales)}</td><td>${money(data.gross)}</td><td>${percent(data.grossReceipts)}</td><td>${percent(data.grossSales)}</td></tr></tbody></table></div>`
    $("stock-summary").innerHTML =
      `<div class="ledger-heading"><h2>Stock</h2><span class="badge">Démonstration</span></div><div class="table-scroll" tabindex="0" role="region" aria-label="Stock, défilement horizontal"><table class="summary-table"><thead><tr>${["Stock initial*", "Stock final*", "ARDM", "Marge brute"].map((label) => `<th scope="col">${label}</th>`).join("")}</tr></thead><tbody><tr class="total-row"><td>${amount(month?.stock.initial)}</td><td>${amount(month?.stock.final)}</td><td>À préciser</td><td>À préciser</td></tr></tbody></table></div><p class="ledger-footnote">Règles de calcul ARDM et marge brute non établies.</p>`
    doc.querySelectorAll("[data-href]").forEach((row) =>
      row.addEventListener("click", (event) => {
        if (!event.target.closest("a")) win.location.href = row.dataset.href
      })
    )
    $("supplier-table").onclick = (event) => {
      if (!event.target.closest("a, [data-href]")) win.location.href = link
    }
  }
  function render() {
    $("status").hidden = true
    if (isEntry) {
      $("date").value = date
      editing = false
      entryRender()
    } else dashboardRender()
    updateUrl()
  }
  if (isEntry) {
    $("date").addEventListener("change", () => {
      const nextDate = $("date").value
      if (!validDate(nextDate)) {
        $("date").value = date
        feedback("Choisissez une date valide entre 1900 et 2100.", true)
        return
      }
      navigate(
        () => {
          date = nextDate
          dirty = false
          reload()
          render()
        },
        () => {
          $("date").value = date
        }
      )
    })
    $("today").addEventListener("click", () => {
      navigate(() => {
        date = today()
        dirty = false
        reload()
        render()
      })
    })
    doc.querySelectorAll("[data-section]").forEach((button) =>
      button.addEventListener("click", () => {
        navigate(() => {
          section = button.dataset.section
          dirty = false
          reload()
          render()
        })
      })
    )
  } else {
    function changeMonth(value) {
      if (!validDate(`${value}-01`)) {
        $("month").value = key
        feedback("Choisissez un mois entre janvier 1900 et décembre 2100.", true)
        return
      }
      safely(() => {
        key = value
        reload()
        render()
      })
    }
    $("month").addEventListener("change", () => changeMonth($("month").value))
    for (const [id, delta] of [
      ["prev-month", -1],
      ["next-month", 1],
    ])
      $(id).addEventListener("click", () => {
        const shifted = new Date(`${key}-15T12:00:00`)
        shifted.setMonth(shifted.getMonth() + delta)
        changeMonth(`${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`)
      })
    $("current-month").addEventListener("click", () => changeMonth(today().slice(0, 7)))
  }
  safely(() => {
    reload()
    if (!win.localStorage.getItem(STORAGE_KEY))
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    render()
  })
}

// CHECK_STATUS — Silent capture (SAFE mode, no blank page)
console.log("[CHECK_STATUS] loaded:", window.location.href);

(function () {
  if (window.__BTL_CHECK_STATUS_LOADED__) return;
  window.__BTL_CHECK_STATUS_LOADED__ = true;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function setNativeValue(el, value) {
    const last = el.value;
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    if (el._valueTracker) el._valueTracker.setValue(last);
  }

  async function waitFor(selector, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(200);
    }
    throw new Error("Timeout waiting for " + selector);
  }

  async function waitForCondition(checkFn, timeout = 30000, poll = 250) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await checkFn()) return true;
      await sleep(poll);
    }
    return false;
  }

  function requestPageHookInjection() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "INJECT_PAGE_HOOKS" }, (resp) => {
        if (chrome.runtime.lastError) {
          console.error("[CHECK_STATUS] INJECT_PAGE_HOOKS error:", chrome.runtime.lastError);
          return resolve({ success: false });
        }
        resolve(resp || { success: false });
      });
    });
  }

  // Receive captured blobs from page
  window.addEventListener("message", (ev) => {
    if (ev.source !== window || !ev.data?.__BTL_PDF_CAPTURED__) return;
    const { index, meta, arrayBuffer } = ev.data;
    const arr = arrayBuffer instanceof ArrayBuffer ? new Uint8Array(arrayBuffer) : null;
    const dataArray = arr ? Array.from(arr) : [];
    const metaWithUrl = {
      ...meta,
      download_url: meta?.url && meta.url.startsWith('http') ? meta.url : `${location.origin}${meta?.url || ''}`
    };
    console.log("[CHECK_STATUS] Captured:", index, metaWithUrl, "bytes:", arrayBuffer?.byteLength || dataArray.length);
    chrome.runtime.sendMessage({ action: "BTL_PDF_CAPTURED", index, meta: metaWithUrl, arrayBuffer, data: dataArray });
  });

  async function onMichtavimReady(opts = {}) {
    console.log("[CHECK_STATUS] onMichtavimReady → installing hooks & demo capture");
    await requestPageHookInjection();

    const found = await waitForCondition(
      () => !!document.querySelector("table.table-letter1 tbody tr"),
      25000,
      300
    );
    if (!found) return false;

    const rows = Array.from(document.querySelectorAll("table.table-letter1 tbody tr"))
      .filter(r => r.querySelector("button[ng-click^='downloadLetter']"));

    if (!rows.length) return false;

    if (opts.skipDemoClicks) {
      return true;
    }

    const picks = rows.sort(() => Math.random() - 0.5).slice(0, 2);

    for (let i = 0; i < picks.length; i++) {
      const btn = picks[i].querySelector("button[ng-click^='downloadLetter']");
      if (btn) {
        console.log("[CHECK_STATUS] clicking demo pick", i);
        btn.click();
        await sleep(1500);
      }
    }
    return true;
  }

  // Load BTL login credentials from chrome.storage.local
  async function getStoredCredentials() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('btl_credentials', (res) => resolve(res.btl_credentials || null));
      } else {
        resolve(null);
      }
    });
  }

  async function automateLogin(opts = {}) {
    const creds = await getStoredCredentials();
    if (!creds || !creds.id || !creds.username || !creds.password) {
      console.error('[CHECK_STATUS] BTL credentials not found in storage. User must enter credentials.');
      throw new Error('BTL_CREDENTIALS_MISSING');
    }

    const idInput = await waitFor("#vm_userZehut", 15000);
    const userInput = await waitFor("#vm_userName", 15000);
    const passInput = await waitFor("#vm_password", 15000);
    const loginBtn = await waitFor("button[name='btnLogin']", 15000);

    setNativeValue(idInput, creds.id);
    await sleep(150);
    setNativeValue(userInput, creds.username);
    await sleep(150);
    setNativeValue(passInput, creds.password);
    await sleep(200);

    loginBtn.click();

    const navigated = await waitForCondition(() => {
      const href = window.location.href || "";
      return href.includes("/My/Michtavim") || href.includes("#/My/Michtavim");
    }, 25000, 300);

    if (!navigated) {
      window.location.href = "https://ps.btl.gov.il/#/My/Michtavim/all/";
      await sleep(1500);
    }

    return onMichtavimReady(opts);
  }

  function extractLettersFromTable() {
    const rows = Array.from(document.querySelectorAll("table.table-letter1 tbody tr"));
    return rows.map((row, index) => {
      const cells = Array.from(row.querySelectorAll('td')).map((c) => (c.innerText || '').trim()).filter(Boolean);
      const dateText = cells[0] || cells[1] || null;
      const categoryText = cells[1] || cells[2] || null;
      const titleText = cells[2] || cells[3] || cells.join(' | ');
      const downloadLink = row.querySelector("a[href*='getmichtav']")?.href
        || row.querySelector("button[ng-click^='downloadLetter']")?.getAttribute('ng-click')
        || row.querySelector('button')?.innerText
        || null;
      const downloadBtn = row.querySelector("button[ng-click^='downloadLetter']") || row.querySelector('button');

      return {
        index,
        date: dateText,
        category: categoryText,
        title: titleText,
        row_text: cells.join(' | '),
        download_url: downloadLink,
        downloadBtn,
        captured_at: new Date().toISOString()
      };
    });
  }

  function buildExistingLetterKeySet(existingLetters) {
    const keys = new Set();
    if (!existingLetters || typeof existingLetters !== 'object') return keys;
    const dates = existingLetters.dates || {};
    Object.keys(dates).forEach((dateKey) => {
      const entry = dates[dateKey] || {};
      (entry.items || []).forEach((it) => {
        // Determine if this letter was actually analyzed (PDF uploaded and processed).
        //  • analyzed:true                        → confirmed → exclude from dedup
        //  • analyzed:false (explicit)            → scraped but not analyzed → retry
        //  • analyzed:undefined + stored_path set → old item, was analyzed → exclude
        //  • analyzed:undefined + no stored_path  → old stuck item, needs retry
        const analyzedFlag = it.analyzed;
        const isAnalyzed = (analyzedFlag === true)
          || (analyzedFlag !== false && !!it.stored_path);
        if (!isAnalyzed) return; // not yet analyzed — let next sync retry
        if (it.title)    keys.add(`title:${dateKey}|${String(it.title).trim()}`);
        if (it.row_text) keys.add(`row:${dateKey}|${String(it.row_text).trim()}`);
        // Index key as last-resort only — used when item has no title/row_text
        if (!it.title && !it.row_text) keys.add(`idx:${dateKey}|${it.index}`);
      });
    });
    return keys;
  }

  async function runLettersSync(existingLetters, caseId, trigger = 'extension', syncedAt = null, limit = null) {
    const ready = await automateLogin({ skipDemoClicks: true });
    if (!ready) throw new Error('Michtavim table not ready');

    const records = extractLettersFromTable();
    const keySet = buildExistingLetterKeySet(existingLetters);
    const newRecords = records.filter((r) => {
      const dateKey = r.date || 'unknown';
      const title    = r.title    ? String(r.title).trim()    : '';
      const rowText  = r.row_text ? String(r.row_text).trim() : '';
      // Content-based dedup (primary) — stable even when the table re-indexes
      if (title    && keySet.has(`title:${dateKey}|${title}`))    return false;
      if (rowText  && keySet.has(`row:${dateKey}|${rowText}`))     return false;
      // Index-based fallback — only when no content keys were available for stored items
      if (!title && !rowText && keySet.has(`idx:${dateKey}|${r.index}`)) return false;
      return true;
    });

    // Apply limit: only download this many (oldest first = natural table order)
    const toDownload = (limit && limit > 0) ? newRecords.slice(0, limit) : newRecords;
    console.log(`[CHECK_STATUS] Letters: ${records.length} total, ${newRecords.length} new, downloading ${toDownload.length} (limit=${limit ?? 'none'})`);

    // Register ALL records for metadata mapping before any button is clicked.
    // background.js uses this to look up meta (title, date…) when BTL_PDF_CAPTURED fires.
    const allPlainRecords = records.map(({ downloadBtn, ...rest }) => rest);
    chrome.runtime.sendMessage({ action: 'REGISTER_LETTER_FILES', caseId, records: allPlainRecords });

    // Trigger downloads and wait for all expected PDF captures before closing the tab.
    // Without this wait the tab would be closed by LETTERS_SYNC_RESULT before the XHR
    // intercept fires, and no file ever reaches the backend.
    const expectedCaptures = toDownload.filter((r) => r.downloadBtn).length;
    let capturedSoFar = 0;

    const allCaptured = expectedCaptures === 0
      ? Promise.resolve()
      : new Promise((resolve) => {
          const CAPTURE_TIMEOUT_MS = 45000; // 45 s max per file
          const timer = setTimeout(() => {
            console.warn(`[CHECK_STATUS] PDF capture timeout — got ${capturedSoFar}/${expectedCaptures}`);
            window.removeEventListener('message', onCapture);
            resolve();
          }, CAPTURE_TIMEOUT_MS);

          function onCapture(ev) {
            if (ev.source !== window || !ev.data?.__BTL_PDF_CAPTURED__) return;
            capturedSoFar++;
            console.log(`[CHECK_STATUS] PDF captures: ${capturedSoFar}/${expectedCaptures}`);
            if (capturedSoFar >= expectedCaptures) {
              clearTimeout(timer);
              window.removeEventListener('message', onCapture);
              resolve();
            }
          }
          window.addEventListener('message', onCapture);
        });

    for (const rec of toDownload) {
      if (rec.downloadBtn) {
        rec.downloadBtn.click();
        await sleep(1500);
      }
    }

    // Wait until every clicked button has produced a captured PDF (or timeout)
    await allCaptured;
    // Small buffer so background.js sendMessage calls finish before tab is torn down
    await sleep(500);

    // Build plainRecords: strip DOM refs and remove attempted-but-uncaptured letters
    // so they are NOT stored in the DB and can be retried on the next sync.
    const allCapturedSuccess = capturedSoFar >= expectedCaptures;
    const attemptedIndices = new Set(toDownload.map((r) => r.index));
    const plainRecords = allPlainRecords.filter((r) =>
      // Keep letters that were not attempted (already-known letters, not downloaded).
      // Also keep attempted letters ONLY when their PDF was successfully captured.
      !attemptedIndices.has(r.index) || allCapturedSuccess
    );

    const result = {
      action: 'LETTERS_SYNC_RESULT',
      caseId,
      records: plainRecords,
      newRecords: toDownload.map(({ downloadBtn, ...rest }) => rest),
      newCount: toDownload.length,
      totalFound: records.length,
      syncedAt: syncedAt || new Date().toISOString(),
      trigger,
      automationRan: true  // tells background this was a real completed run, not a partial/failed attempt
    };

    chrome.runtime.sendMessage({ action: 'LETTERS_SYNC_RESULT', result });
    return result;
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.action === "RUN_CHECK_STATUS") {
      automateLogin()
        .then((ok) => sendResponse({ success: true, result: !!ok }))
        .catch((e) => sendResponse({ success: false, error: e.message }));
      return true;
    }

    if (msg?.action === 'SYNC_LETTERS') {
      runLettersSync(msg.existingLetters || {}, msg.caseId, msg.trigger, msg.syncedAt, msg.limit || null)
        .then(() => sendResponse({ success: true }))
        .catch((e) => sendResponse({ success: false, error: e.message }));
      return true;
    }
  });

  // ── Auto-start from storage flag ────────────────────────────────────────────
  // Background writes btl_pending_sync to storage before opening the tab.
  // We read it here and self-start — no dependency on message timing at all.
  async function checkAndRunPendingSync() {
    return new Promise((resolve) => {
      chrome.storage.local.get('btl_pending_sync', async (res) => {
        const pending = res.btl_pending_sync;
        if (!pending || !pending.caseId) return resolve(false);

        // Ignore stale requests (older than 5 minutes)
        if (pending.requestedAt && Date.now() - pending.requestedAt > 5 * 60 * 1000) {
          console.log('[CHECK_STATUS] Stale btl_pending_sync, clearing');
          chrome.storage.local.remove('btl_pending_sync');
          return resolve(false);
        }

        console.log('[CHECK_STATUS] Found pending sync request:', pending);

        // Clear immediately so re-loads don't re-trigger
        chrome.storage.local.remove('btl_pending_sync');

        try {
          await runLettersSync(
            pending.existingLetters || {},
            pending.caseId,
            pending.trigger || 'notification',
            pending.syncedAt || new Date().toISOString(),
            pending.limit || null
          );
          resolve(true);
        } catch (e) {
          console.error('[CHECK_STATUS] Pending sync failed:', e);
          resolve(false);
        }
      });
    });
  }

  // Run immediately on load, then poll once per second for up to 60s
  // (handles SPA navigation where checkStatus.js is already injected)
  let _pollCount = 0;
  async function pollPendingSync() {
    const ran = await checkAndRunPendingSync();
    if (ran) return;
    _pollCount++;
    if (_pollCount < 60) setTimeout(pollPendingSync, 1000);
  }
  pollPendingSync();

  // If already on Michtavim, just install hooks
  if (window.location.href.includes("/My/Michtavim")) {
    setTimeout(() => requestPageHookInjection(), 500);
  }
})();

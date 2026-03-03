// ===== BTL Letters Silent Capture (NO open, NO download) =====
(function inject() {
  const s = document.createElement("script");
  s.textContent = `(${function () {
    // -----------------------------
    // 1) Block site's window.open (to stop auto open/download)
    // -----------------------------
    const realOpen = window.open;
    let suppressNextOpen = false;

    window.open = function (...args) {
      if (suppressNextOpen) {
        console.log("⛔ Blocked site window.open()");
        suppressNextOpen = false;
        return null;
      }
      return realOpen.apply(window, args);
    };

    // -----------------------------
    // 2) Storage for captured PDFs (in memory only)
    // -----------------------------
    window.__capturedPDFs = [];
    window.__lastCapturedPDF = null;

    // -----------------------------
    // 3) Hook XHR to capture authorized PDF response
    // -----------------------------
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this.___url = url;
      try { this.responseType = "arraybuffer"; } catch (e) {}
      return origOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (...args) {
      this.addEventListener("load", () => {
        try {
          if (this.___url && this.___url.includes("/Michtavim/GetMichtav")) {
            const buf = this.response;
            if (!(buf instanceof ArrayBuffer)) return;

            const blob = new Blob([buf], { type: "application/pdf" });

            const record = {
              url: this.___url,
              size: blob.size,
              blob, // PDF bytes in memory
              time: new Date().toISOString()
            };

            window.__capturedPDFs.push(record);
            window.__lastCapturedPDF = record;

            // Block the site's attempt to open/download
            suppressNextOpen = true;

            console.log("✅ PDF captured in memory only:", {
              size: blob.size,
              totalCaptured: window.__capturedPDFs.length
            });
          }
        } catch (e) {
          console.error("❌ PDF hook error:", e);
        }
      });

      return origSend.apply(this, args);
    };

    console.log("✅ Silent PDF capture hook installed (NO open, NO download)");

    // -----------------------------
    // 4) Helper: list letters grouped by date
    // -----------------------------
    window.listLetters = function () {
      const rows = Array.from(document.querySelectorAll("table.table-letter1 tbody tr"));

      const items = rows.map((tr, i) => {
        const tds = tr.querySelectorAll("td");
        const date = tds[1]?.innerText.trim() || "";
        const subject = tds[2]?.innerText.trim() || "";
        return { rowIndex: i, date, subject };
      });

      const byDate = {};
      for (const item of items) {
        if (!byDate[item.date]) byDate[item.date] = [];
        byDate[item.date].push(item);
      }

      console.log("📋 Letters grouped by date:", byDate);
      return byDate;
    };

    // -----------------------------
    // 5) Helper: capture by date + index (NO real download)
    // -----------------------------
    window.captureByDateAndIndex = function (date, indexInThatDate) {
      const rows = Array.from(document.querySelectorAll("table.table-letter1 tbody tr"));

      const matching = rows.filter(tr => {
        const tds = tr.querySelectorAll("td");
        const d = tds[1]?.innerText.trim();
        return d === date;
      });

      if (matching.length === 0) {
        console.error("❌ No letters found for date:", date);
        return;
      }

      if (indexInThatDate < 0 || indexInThatDate >= matching.length) {
        console.error("❌ Invalid index. Available:", matching.length);
        return;
      }

      const targetRow = matching[indexInThatDate];
      const subject = targetRow.querySelectorAll("td")[2]?.innerText.trim();

      const downloadBtn = targetRow.querySelector("button[ng-click^='downloadLetter']");
      if (!downloadBtn) {
        console.error("❌ Download button not found for:", date, indexInThatDate);
        return;
      }

      console.log("🧲 Capturing (no download):", { date, indexInThatDate, subject });
      downloadBtn.click(); // Site makes request, we intercept & store blob
    };

    // -----------------------------
    // 6) Helper: demo random capture
    // -----------------------------
    window.demoCaptureRandom = function () {
      const rows = Array.from(document.querySelectorAll("table.table-letter1 tbody tr"));
      if (rows.length === 0) {
        console.error("❌ No rows found");
        return;
      }

      const randRow = rows[Math.floor(Math.random() * rows.length)];
      const tds = randRow.querySelectorAll("td");
      const date = tds[1]?.innerText.trim();
      const subject = tds[2]?.innerText.trim();

      const btn = randRow.querySelector("button[ng-click^='downloadLetter']");
      if (!btn) {
        console.error("❌ No download button in random row");
        return;
      }

      console.log("🎲 Random capture (no download):", { date, subject });
      btn.click();
    };

    // -----------------------------
    // 7) Helper: inspect captured PDFs
    // -----------------------------
    window.listCapturedPDFs = function () {
      console.log("📦 Captured PDFs:", window.__capturedPDFs);
      return window.__capturedPDFs;
    };

    console.log("✅ Helpers ready:");
    console.log(" - listLetters()");
    console.log(" - captureByDateAndIndex(date, idx)");
    console.log(" - demoCaptureRandom()");
    console.log(" - listCapturedPDFs()");
  }.toString()})();`;
  document.documentElement.appendChild(s);
  s.remove();
})();
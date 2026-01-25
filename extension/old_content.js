// content-script.js
// Listens for a message { action: "startFlow" } and then runs the automation orchestrator.
// All the same helper functions and orchestrator logic are here, but NOT auto-run.

(function () {
  // Utility wait
  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Helper functions (same as before)
  function findFormContaining(text) {
    const forms = Array.from(document.querySelectorAll("form"));
    return forms.find((f) => (f.textContent || "").includes(text));
  }

  async function simulateTypingInput(input, value, charDelay = 20) {
    if (!input) return;
    input.focus();
    input.value = "";
    for (const ch of value) {
      input.value += ch;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await wait(charDelay);
    }
    input.blur();
    await wait(50);
  }

  function clickElement(elem) {
    if (!elem) return false;
    try {
      elem.click();
      return true;
    } catch (e) {
      const evt = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      return elem.dispatchEvent(evt);
    }
  }

  function findButtonByText(container = document, text) {
    const candidates = Array.from(
      container.querySelectorAll(
        'button, input[type="submit"], input[type="button"]'
      )
    );
    return candidates.find((b) => {
      const t = (b.textContent || b.value || "").trim();
      return t.includes(text);
    });
  }

  function findElementByTagContains(container = document, tag = "span", text) {
    const elems = Array.from(container.querySelectorAll(tag));
    return elems.find((e) => (e.textContent || "").includes(text));
  }

  // AUTH Flow
  async function runAuthFlow() {
    console.log("[BTL Auto] Starting auth flow...");
    const targetForm = findFormContaining("כניסה עם סיסמה");

    if (!targetForm) {
      console.error("[BTL Auto] auth form not found.");
      return false;
    }

    const formGroups = targetForm.querySelectorAll(".form-group.tipped");
    if (formGroups.length >= 3) {
      const values = ["203488051", "E6KPFHMT", "Sk1991"];
      for (let i = 0; i < 3; i++) {
        const fg = formGroups[i];
        if (!fg) continue;
        const input = fg.querySelector("input");
        if (input) {
          await simulateTypingInput(input, values[i], 40);
        }
      }
    } else {
      console.warn(
        "[BTL Auto] Less than 3 form-group.tipped elements found (found " +
          formGroups.length +
          ")"
      );
    }

    const label = Array.from(targetForm.querySelectorAll("label")).find((l) =>
      (l.textContent || "").includes("אני מאשר.ת שקראתי את")
    );
    if (label) {
      const checkbox = label.querySelector(
        'input[type="checkbox"], input[type="radio"]'
      );
      if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
        console.log("[BTL Auto] consent checkbox marked.");
      }
    } else {
      console.warn("[BTL Auto] consent label not found.");
    }

    const loginButton = findButtonByText(targetForm, "כניסה");
    if (loginButton) {
      clickElement(loginButton);
      console.log("[BTL Auto] clicked login.");
    } else {
      console.error("[BTL Auto] login button not found in form.");
      return false;
    }

    return true;
  }

  // Post-auth sequence
  async function runPostAuthSequence() {
    async function clickSpanThenNext(spanText, waitAfterClick = 800) {
      const span = findElementByTagContains(document, "span", spanText);
      if (span) {
        clickElement(span);
        console.log("[BTL Auto] clicked span with text:", spanText);
        await wait(waitAfterClick);
      } else {
        console.warn("[BTL Auto] span not found for:", spanText);
      }

      const nextBtn = findButtonByText(document, "הבא");
      if (nextBtn) {
        clickElement(nextBtn);
        console.log("[BTL Auto] clicked הבא button");
        await wait(700);
      } else {
        console.warn(
          "[BTL Auto] הבא button not found after clicking span:",
          spanText
        );
      }
    }

    await clickSpanThenNext("אני מאשר/ת שכתובת הדואר האלקטרוני שלי היא: ");
    await wait(300);
    await clickSpanThenNext("אני מאשר/ת שמספר הטלפון הנייד שלי הוא");
    await wait(300);
    await clickSpanThenNext("אין לי טלפון נייח או שאיני מעוניין/ת להשתמש בו");
    await wait(300);
    await clickSpanThenNext("הכתובת למשלוח דואר שלי");
  }

  function goToDocumentsUpload() {
    const target = "https://ps.btl.gov.il/#/DocumentsUpload///";
    console.log("[BTL Auto] Navigating to", target);
    location.href = target;
  }

  // Image generation & attach logic
  async function createPngBlobAtLeast(targetBytes = 10 * 1024, minSide = 400) {
    let side = Math.max(minSide, 400);

    while (true) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = Math.round(side);
      const ctx = canvas.getContext("2d");

      const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      g.addColorStop(0, "#e9f0ff");
      g.addColorStop(1, "#b6d4ff");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalAlpha = 0.18;
      for (let i = 0; i < Math.floor(canvas.width / 6); i++) {
        ctx.fillStyle = `rgba(${(i * 37) % 255}, ${(i * 57) % 255}, ${
          (i * 97) % 255
        }, 0.4)`;
        ctx.fillRect(
          (i * 7) % canvas.width,
          0,
          Math.ceil(canvas.width / 8),
          canvas.height
        );
      }
      ctx.globalAlpha = 1;

      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixelsToNoise = Math.floor(canvas.width * canvas.height * 0.02);
      for (let i = 0; i < pixelsToNoise; i++) {
        const x = Math.floor(Math.random() * canvas.width);
        const y = Math.floor(Math.random() * canvas.height);
        const idx = (y * canvas.width + x) * 4;
        img.data[idx] = Math.floor(Math.random() * 256);
        img.data[idx + 1] = Math.floor(Math.random() * 256);
        img.data[idx + 2] = Math.floor(Math.random() * 256);
        img.data[idx + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Canvas toBlob returned null");

      if (blob.size >= targetBytes) {
        return blob;
      }

      side *= 1.5;
      if (side > 4096) {
        console.warn(
          "[BTL Auto] reached max canvas side while trying to reach target bytes"
        );
        return blob;
      }
    }
  }

  async function attachDummyPngToInput(
    selector = "#inpFileUploadNotIE9",
    filename = "dummy-10kb.png"
  ) {
    const input = document.querySelector(selector);
    if (!input) {
      throw new Error(`File input not found for selector: ${selector}`);
    }
    if (!(input instanceof HTMLInputElement) || input.type !== "file") {
      throw new Error('Selected element is not an <input type="file">');
    }

    const pngBlob = await createPngBlobAtLeast(10 * 1024, 400);
    const file = new File([pngBlob], filename, { type: "image/png" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;

    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("input", { bubbles: true }));

    console.log("[BTL Auto] attached file:", filename, "size:", file.size);
    return { input, file, size: file.size };
  }

  // Orchestrator
  async function orchestrate() {
    try {
      const href = location.href;
      console.log("[BTL Auto] current href", href);

      // Handle login page
      if (href.includes("/login")) {
        console.log("[BTL Auto] on login page, waiting 8s...");
        await wait(8000);

        const ok = await runAuthFlow(); // fill auth form and click login

        // After login, navigate to target if not already there
        await wait(8000); // wait for potential redirect
        if (!location.href.includes("/#/Mevutach/MevutachConfirmDetails")) {
          console.log("[BTL Auto] redirecting to target page after login");
          location.href =
            "https://ps.btl.gov.il/#/Mevutach/MevutachConfirmDetails";
        }
      }

      // Now handle MevutachConfirmDetails page
      if (true) {
        console.log(
          "[BTL Auto] on MevutachConfirmDetails - waiting 5s then post-auth steps"
        );
        await wait(5000);
        const buttons = document.querySelectorAll("button");

        // Find the button whose text includes "שינוי פרטי התקשרות" (Change contact details)
        const changeContactBtn = Array.from(buttons).find((btn) => {
          console.log(btn.textContent.includes("שינוי פרטי התקשרות"));
          return btn.textContent.includes("שינוי פרטי התקשרות");
        });
        if (changeContactBtn) {
          changeContactBtn.click();
          console.log("[BTL Auto] clicked 'שינוי פרטי התקשרות' button");
          await wait(3000); // small wait after click
        } else {
          console.warn("[BTL Auto] 'שינוי פרטי התקשרות' button not found");
        }
        await wait(4000);
        await runPostAuthSequence();
        await wait(8000);
        goToDocumentsUpload();
      }

      // Handle DocumentsUpload page
      if (location.href.includes("/#/DocumentsUpload")) {
        console.log(
          "[BTL Auto] on DocumentsUpload - waiting 8s then attach file"
        );
        await wait(8000);
        try {
          await attachDummyPngToInput("#inpFileUploadNotIE9", "btl-auto.png");
        } catch (err) {
          console.error("[BTL Auto] failed to attach file:", err);
        }
        return;
      }

      console.log("[BTL Auto] no matching route for automation at this URL.");
    } catch (err) {
      console.error("[BTL Auto] orchestrator error:", err);
    }
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.action === "startFlow") {
      console.log("[BTL Auto] Received startFlow message from popup");
      // Run orchestrator (don't block the message channel)
      orchestrate();
      sendResponse({ started: true });
      return true; // keep channel open for async response (not used here)
    }
    return false;
  });

  // Optional: expose orchestrate for debugging in console
  window.__BTL_AUTO_ORCHESTRATE = orchestrate;
})();

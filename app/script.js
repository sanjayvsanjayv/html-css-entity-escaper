/**
 * Entity Escaper — client-side only.
 * Exposes escapeHtml / unescapeHtml on window so tests/test.js can reuse
 * the exact same logic that ships in the app (no duplicated rules).
 */
(function () {
  "use strict";

  // Order matters: & must be escaped first, or we'd double-escape
  // the ampersands produced by the other replacements.
  const ESCAPE_MAP = [
    ["&", "&amp;"],
    ["<", "&lt;"],
    [">", "&gt;"],
    ['"', "&quot;"],
    ["'", "&#39;"],
  ];

  const UNESCAPE_MAP = [
    ["&amp;", "&"],
    ["&lt;", "<"],
    ["&gt;", ">"],
    ["&quot;", '"'],
    ["&#39;", "'"],
    ["&#x27;", "'"],
    ["&apos;", "'"],
  ];

  function escapeHtml(input) {
    let out = input;
    for (const [char, entity] of ESCAPE_MAP) {
      out = out.split(char).join(entity);
    }
    return out;
  }

  function unescapeHtml(input) {
    let out = input;
    for (const [entity, char] of UNESCAPE_MAP) {
      out = out.split(entity).join(char);
    }
    return out;
  }

  // Expose for tests/test.js (Node) and for reuse in-page.
  const api = { escapeHtml, unescapeHtml };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    window.EntityEscaper = api;
  }

  // ---------------- DOM wiring (browser only) ----------------
  if (typeof document === "undefined") return;

  document.addEventListener("DOMContentLoaded", () => {
    const inputArea = document.getElementById("inputArea");
    const outputArea = document.getElementById("outputArea");
    const charCount = document.getElementById("charCount");
    const errorMsg = document.getElementById("errorMsg");
    const copyStatus = document.getElementById("copyStatus");
    const copyBtn = document.getElementById("copyBtn");
    const themeToggle = document.getElementById("themeToggle");

    const REFERENCE = [
      ["<", "&lt;", "Less-than sign"],
      [">", "&gt;", "Greater-than sign"],
      ["&", "&amp;", "Ampersand"],
      ['"', "&quot;", "Double quote"],
      ["'", "&#39;", "Single quote / apostrophe"],
    ];

    function renderReference() {
      const body = document.getElementById("referenceBody");
      body.innerHTML = REFERENCE.map(
        ([ch, entity, meaning]) =>
          `<tr><td>${escapeHtml(ch)}</td><td>${entity.replace("&", "&amp;")}</td><td>${meaning}</td></tr>`
      ).join("");
    }

    function updateCharCount() {
      const n = inputArea.value.length;
      charCount.textContent = `${n} character${n === 1 ? "" : "s"}`;
    }

    function showError(message) {
      errorMsg.textContent = message;
      errorMsg.hidden = false;
    }

    function clearError() {
      errorMsg.hidden = true;
      errorMsg.textContent = "";
    }

    // Highlight escaped entities (&amp; &lt; &gt; &quot; &#39;) so the
    // learning/visualizer intent of the tool is visible in the output.
    function renderOutput(text, mode) {
      if (mode === "escape") {
        const highlighted = text.replace(
          /(&amp;|&lt;|&gt;|&quot;|&#39;)/g,
          '<span class="entity-hl">$1</span>'
        );
        outputArea.innerHTML = highlighted || '<span class="placeholder">Nothing to show.</span>';
      } else {
        outputArea.textContent = text;
      }
    }

    function runEscape() {
      clearError();
      const value = inputArea.value;
      if (!value.trim()) {
        showError("Enter some text or markup before escaping.");
        return;
      }
      renderOutput(escapeHtml(value), "escape");
      copyBtn.disabled = false;
      copyStatus.textContent = "";
    }

    function runUnescape() {
      clearError();
      const value = inputArea.value;
      if (!value.trim()) {
        showError("Enter some text or entities before unescaping.");
        return;
      }
      renderOutput(unescapeHtml(value), "unescape");
      copyBtn.disabled = false;
      copyStatus.textContent = "";
    }

    function clearAll() {
      inputArea.value = "";
      outputArea.innerHTML = '<span class="placeholder">Escaped or unescaped text will appear here.</span>';
      copyBtn.disabled = true;
      copyStatus.textContent = "";
      clearError();
      updateCharCount();
      inputArea.focus();
    }

    async function copyOutput() {
      const text = outputArea.textContent || "";
      try {
        await navigator.clipboard.writeText(text);
        copyStatus.textContent = "Copied to clipboard.";
      } catch (e) {
        copyStatus.textContent = "Copy failed — select the text manually.";
      }
      setTimeout(() => (copyStatus.textContent = ""), 2500);
    }

    function toggleTheme() {
      const root = document.documentElement;
      const current = root.getAttribute("data-theme") === "light" ? "light" : "dark";
      const next = current === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("entity-escaper-theme", next);
      } catch (e) {
        /* storage unavailable — theme just won't persist */
      }
    }

    // Restore saved theme preference, if any.
    try {
      const saved = localStorage.getItem("entity-escaper-theme");
      if (saved) document.documentElement.setAttribute("data-theme", saved);
    } catch (e) {
      /* ignore */
    }

    document.getElementById("escapeBtn").addEventListener("click", runEscape);
    document.getElementById("unescapeBtn").addEventListener("click", runUnescape);
    document.getElementById("clearBtn").addEventListener("click", clearAll);
    copyBtn.addEventListener("click", copyOutput);
    themeToggle.addEventListener("click", toggleTheme);
    inputArea.addEventListener("input", updateCharCount);

    renderReference();
    updateCharCount();
  });
})();

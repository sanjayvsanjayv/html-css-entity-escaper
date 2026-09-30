/**
 * Entity Escaper — client-side only.
 *
 * Exposes escapeHtml / unescapeHtml on window so tests/test.js
 * can reuse the exact same logic that ships in the app.
 */
(function () {
  "use strict";

  // ============================================================
  // ESCAPE MAP
  // ============================================================

  const ESCAPE_MAP = [
    ["&", "&amp;"],
    ["<", "&lt;"],
    [">", "&gt;"],
    ['"', "&quot;"],
    ["'", "&#39;"],
  ];

  // ============================================================
  // UNESCAPE MAP
  // ============================================================

  const UNESCAPE_MAP = [
    ["&amp;", "&"],
    ["&lt;", "<"],
    ["&gt;", ">"],
    ["&quot;", '"'],
    ["&#39;", "'"],
    ["&#x27;", "'"],
    ["&apos;", "'"],
  ];

  // ============================================================
  // ESCAPE HTML
  // ============================================================

  function escapeHtml(input) {
    /*
     * Escape:
     *   &
     *   <
     *   >
     *   "
     *   '
     *
     * But DO NOT escape an entity that is already escaped.
     *
     * Example:
     *
     * &lt;h1&gt;
     *
     * stays:
     *
     * &lt;h1&gt;
     *
     * instead of becoming:
     *
     * &amp;lt;h1&amp;gt;
     */

    return input.replace(
      /&(?!(?:amp|lt|gt|quot|#39|#x27|apos);)|<|>|"|'/g,
      function (char) {
        switch (char) {
          case "&":
            return "&amp;";

          case "<":
            return "&lt;";

          case ">":
            return "&gt;";

          case '"':
            return "&quot;";

          case "'":
            return "&#39;";

          default:
            return char;
        }
      }
    );
  }

  // ============================================================
  // UNESCAPE HTML
  // ============================================================

  function unescapeHtml(input) {
    let output = input;

    for (const [entity, character] of UNESCAPE_MAP) {
      output = output.split(entity).join(character);
    }

    return output;
  }

  // ============================================================
  // EXPORT FOR TESTS
  // ============================================================

  const api = {
    escapeHtml,
    unescapeHtml,
  };

  // Node.js
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  // Browser
  if (typeof window !== "undefined") {
    window.EntityEscaper = api;
  }

  // ============================================================
  // BROWSER ONLY
  // ============================================================

  if (typeof document === "undefined") {
    return;
  }

  document.addEventListener("DOMContentLoaded", () => {
    // ==========================================================
    // GET HTML ELEMENTS
    // ==========================================================

    const inputArea = document.getElementById("inputArea");
    const outputArea = document.getElementById("outputArea");
    const charCount = document.getElementById("charCount");
    const errorMsg = document.getElementById("errorMsg");
    const copyStatus = document.getElementById("copyStatus");
    const copyBtn = document.getElementById("copyBtn");
    const themeToggle = document.getElementById("themeToggle");

    // ==========================================================
    // REFERENCE TABLE
    // ==========================================================

    const REFERENCE = [
      ["<", "&lt;", "Less-than sign"],
      [">", "&gt;", "Greater-than sign"],
      ["&", "&amp;", "Ampersand"],
      ['"', "&quot;", "Double quote"],
      ["'", "&#39;", "Single quote / apostrophe"],
    ];

    function renderReference() {
      const body = document.getElementById("referenceBody");

      if (!body) {
        return;
      }

      body.innerHTML = REFERENCE.map(
        ([character, entity, meaning]) => `
          <tr>
            <td>${escapeHtml(character)}</td>
            <td>${entity.replace("&", "&amp;")}</td>
            <td>${meaning}</td>
          </tr>
        `
      ).join("");
    }

    // ==========================================================
    // CHARACTER COUNT
    // ==========================================================

    function updateCharCount() {
      const count = inputArea.value.length;

      charCount.textContent =
        `${count} character${count === 1 ? "" : "s"}`;
    }

    // ==========================================================
    // ERROR HANDLING
    // ==========================================================

    function showError(message) {
      errorMsg.textContent = message;
      errorMsg.hidden = false;
    }

    function clearError() {
      errorMsg.textContent = "";
      errorMsg.hidden = true;
    }

    // ==========================================================
    // OUTPUT
    // ==========================================================

    function renderOutput(text) {
      /*
       * IMPORTANT:
       *
       * DO NOT use:
       *
       * outputArea.innerHTML = text;
       *
       * because the browser would interpret:
       *
       * &lt;
       *
       * as:
       *
       * <
       *
       * We use textContent so the escaped characters are shown
       * literally on the screen.
       */

      outputArea.textContent = text || "";
    }

    // ==========================================================
    // ESCAPE BUTTON
    // ==========================================================

    function runEscape() {
  clearError();

  const value = inputArea.value;

  if (!value.trim()) {
    showError("Enter some text or markup before escaping.");
    return;
  }

  const escaped = escapeHtml(value);

  console.log("INPUT:", value);
  console.log("ESCAPED:", escaped);

  renderOutput(escaped, "escape");

  copyBtn.disabled = false;
  copyStatus.textContent = "";
}

    // ==========================================================
    // UNESCAPE BUTTON
    // ==========================================================

    function runUnescape() {
      clearError();

      const value = inputArea.value;

      if (!value.trim()) {
        showError("Enter some text or entities before unescaping.");
        return;
      }

      const unescaped = unescapeHtml(value);

      renderOutput(unescaped);

      copyBtn.disabled = false;
      copyStatus.textContent = "";
    }

    // ==========================================================
    // CLEAR BUTTON
    // ==========================================================

    function clearAll() {
      inputArea.value = "";

      outputArea.textContent = "";

      copyBtn.disabled = true;
      copyStatus.textContent = "";

      clearError();

      updateCharCount();

      inputArea.focus();
    }

    // ==========================================================
    // COPY OUTPUT
    // ==========================================================

    async function copyOutput() {
      const text = outputArea.textContent || "";

      try {
        await navigator.clipboard.writeText(text);

        copyStatus.textContent = "Copied to clipboard.";
      } catch (error) {
        copyStatus.textContent =
          "Copy failed — select the text manually.";
      }

      setTimeout(() => {
        copyStatus.textContent = "";
      }, 2500);
    }

    // ==========================================================
    // THEME
    // ==========================================================

    function toggleTheme() {
      const root = document.documentElement;

      const current =
        root.getAttribute("data-theme") === "light"
          ? "light"
          : "dark";

      const next =
        current === "light"
          ? "dark"
          : "light";

      root.setAttribute("data-theme", next);

      try {
        localStorage.setItem(
          "entity-escaper-theme",
          next
        );
      } catch (error) {
        // Theme still works even if storage is unavailable.
      }
    }

    // ==========================================================
    // RESTORE THEME
    // ==========================================================

    try {
      const savedTheme =
        localStorage.getItem("entity-escaper-theme");

      if (savedTheme) {
        document.documentElement.setAttribute(
          "data-theme",
          savedTheme
        );
      }
    } catch (error) {
      // Ignore localStorage errors.
    }

    // ==========================================================
    // BUTTON EVENTS
    // ==========================================================

    document
      .getElementById("escapeBtn")
      .addEventListener("click", runEscape);

    document
      .getElementById("unescapeBtn")
      .addEventListener("click", runUnescape);

    document
      .getElementById("clearBtn")
      .addEventListener("click", clearAll);

    copyBtn.addEventListener("click", copyOutput);

    themeToggle.addEventListener("click", toggleTheme);

    inputArea.addEventListener("input", updateCharCount);

    // ==========================================================
    // INITIALIZE
    // ==========================================================

    renderReference();

    updateCharCount();
  });
})();
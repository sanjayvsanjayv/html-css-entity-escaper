/**
 * Lightweight, dependency-free test runner for the Entity Escaper.
 * No test framework required — run with: node tests/test.js
 * Exits with code 0 on success, 1 on any failure, so Jenkins/CI can
 * gate the pipeline on it directly.
 */
const path = require("path");
const { escapeHtml, unescapeHtml } = require(path.join(__dirname, "..", "app", "script.js"));

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, label) {
  if (actual === expected) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}`);
    console.log(`        expected: ${JSON.stringify(expected)}`);
    console.log(`        actual:   ${JSON.stringify(actual)}`);
  }
}

console.log("Entity Escaper — test suite\n");

// --- escapeHtml ---
console.log("escapeHtml()");
assertEqual(escapeHtml("<"), "&lt;", "escapes <");
assertEqual(escapeHtml(">"), "&gt;", "escapes >");
assertEqual(escapeHtml("&"), "&amp;", "escapes &");
assertEqual(escapeHtml('"'), "&quot;", "escapes \"");
assertEqual(escapeHtml("'"), "&#39;", "escapes '");
assertEqual(
  escapeHtml('<div class="test">Hello & Welcome</div>'),
  "&lt;div class=&quot;test&quot;&gt;Hello &amp; Welcome&lt;/div&gt;",
  "escapes a full HTML snippet"
);
assertEqual(escapeHtml("plain text"), "plain text", "leaves plain text unchanged");
assertEqual(escapeHtml(""), "", "handles empty string");

// --- unescapeHtml ---
console.log("\nunescapeHtml()");
assertEqual(unescapeHtml("&lt;"), "<", "unescapes &lt;");
assertEqual(unescapeHtml("&gt;"), ">", "unescapes &gt;");
assertEqual(unescapeHtml("&amp;"), "&", "unescapes &amp;");
assertEqual(unescapeHtml("&quot;"), '"', "unescapes &quot;");
assertEqual(unescapeHtml("&#39;"), "'", "unescapes &#39;");
assertEqual(
  unescapeHtml("&lt;div class=&quot;test&quot;&gt;Hello &amp; Welcome&lt;/div&gt;"),
  '<div class="test">Hello & Welcome</div>',
  "unescapes a full HTML snippet"
);

// --- round trip ---
console.log("\nround trip");
const sample = '<script>alert("hi & bye")</script>';
assertEqual(unescapeHtml(escapeHtml(sample)), sample, "escape then unescape returns the original");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

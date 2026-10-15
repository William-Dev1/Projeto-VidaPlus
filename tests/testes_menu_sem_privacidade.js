const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const pages = path.join(__dirname, "..", "pages");
const patientPages = fs.readdirSync(pages).filter(f => /^paciente-.*\.html$/.test(f));
assert.equal(patientPages.length, 8);
for (const file of patientPages) {
    const html = fs.readFileSync(path.join(pages, file), "utf8");
    assert.doesNotMatch(html, /<a\s+[^>]*href="paciente-privacidade\.html"/);
    assert.match(html, /<nav\b[^>]*class="menu"/);
    assert.match(html, /href="paciente-dashboard\.html"/);
}
assert(fs.existsSync(path.join(pages, "paciente-privacidade.html")));
console.log("PASS: Privacidade removida de todos os menus do paciente; recursos internos preservados.");

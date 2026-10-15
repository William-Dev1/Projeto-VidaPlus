const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(home, /<option(?=[^>]*value="Administrador")(?=[^>]*\bselected\b)[^>]*>/);
const db = new Map();
const fields = {
    tipoLogin: { value: "Administrador", focus() { } },
    emailLogin: { value: "", focus() { } },
    senhaLogin: { value: "", focus() { } }
};

const handlers = [];
const alerts = [];
const ctx = {
    document: {
        addEventListener(event, fn) {
            if (event === "DOMContentLoaded") {
                handlers.push(fn);
            }
        },
        getElementById(id) { return fields[id] || null; },
        querySelector() { return null; },
        querySelectorAll() { return []; },
        body: { dataset: {} }
    },
    localStorage: {
        getItem(k) { return db.has(k) ? db.get(k) : null; },
        setItem(k, v) { db.set(k, String(v)); },
        removeItem(k) { db.delete(k); }
    },
    window: { location: { href: "" } },
    alert(msg) { alerts.push(msg); },
    console
};
vm.createContext(ctx);
for (const file of ["js/main.js", "js/usuarios.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), ctx, { filename: file });
}
handlers.forEach(fn => fn());
assert.equal(fields.emailLogin.value, "admin@vidaplus.com.br");
assert.equal(fields.senhaLogin.value, "123456");
console.log("PASS Acesso administrador preenchido ao abrir login");
ctx.fazerLogin();
assert.equal(ctx.window.location.href, "pages/admin-dashboard.html");
console.log("PASS Um clique entra no painel administrativo de demonstração");
fields.tipoLogin.value = "Paciente";
ctx.preencherEmailAdministrador();
assert.equal(fields.emailLogin.value, "");
assert.equal(fields.senhaLogin.value, "");
console.log("PASS Trocar perfil limpa credenciais automáticas");
fields.tipoLogin.value = "Administrador";
ctx.preencherEmailAdministrador();
assert.equal(fields.emailLogin.value, "admin@vidaplus.com.br");
assert.equal(fields.senhaLogin.value, "123456");
console.log("PASS Voltar a administrador restaura os dados de demonstração");
let usuarios = JSON.parse(db.get("sghss_usuarios_v1"));
usuarios[0].senha = "senha-alterada";
db.set("sghss_usuarios_v1", JSON.stringify(usuarios));
ctx.window.location.href = "";
ctx.fazerLogin();
assert.equal(ctx.window.location.href, "");
assert(alerts.some(a => a.includes("incorreto")));
console.log("PASS Login não ignora alteração de senha no cadastro");
console.log("TODOS OS TESTES DO LOGIN ADMIN SALVO PASSARAM");

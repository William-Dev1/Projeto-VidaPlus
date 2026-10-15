const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = path.resolve(__dirname, "..");
const db = new Map();
const dom = new Map();
const elem = (id, value = "") => { const el = { value, innerHTML: "", textContent: "", reset() { }, options: [] }; dom.set(id, el); return el; };
const sandbox = {
    document: { getElementById: id => dom.get(id) || null, addEventListener() { } },
    localStorage: { getItem: k => db.get(k) ?? null, setItem: (k, v) => db.set(k, String(v)), removeItem: k => db.delete(k) },
    console, alert() { }, confirm() { return true; }, window: { location: { href: "" } }
};
vm.createContext(sandbox);
for (const js of ["main.js", "usuarios.js", "admin.js", "hospital.js"]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, "js", js), "utf8"), sandbox, { filename: js });
}
sandbox.inicializarDadosProjeto();
const users = JSON.parse(db.get("sghss_usuarios_v1"));
const admin = users.find(x => x.tipo === "Administrador");
db.set("sghss_usuario_logado_v1", JSON.stringify(admin));
for (const id of ["finTipo", "finCategoria", "finData", "finDescricao", "finValor", "corpoFinanceiro", "totalReceitasFinanceiro", "totalDespesasFinanceiro", "saldoFinanceiro", "resultadoFinanceiro", "formFinanceiro"]) {
    elem(id);
}
dom.get("finTipo").value = "Receita";
sandbox.atualizarCategoriasFinanceiro();
assert(dom.get("finCategoria").innerHTML.includes("Recebimentos gerais"));
dom.get("finTipo").value = "Despesa";
sandbox.atualizarCategoriasFinanceiro();
assert(dom.get("finCategoria").innerHTML.includes("Despesas operacionais"));
assert(!dom.get("finCategoria").innerHTML.includes("Recebimentos gerais"));
console.log("PASS Categorias genéricas mudam com o tipo de lançamento");
sandbox.carregarFinanceiro();
const stored = () => JSON.parse(db.get("sghss_financeiro_v1") || "[]");
assert.equal(stored().length, 0);
assert(dom.get("corpoFinanceiro").innerHTML.includes("Nenhum lançamento"));
assert.equal(dom.get("saldoFinanceiro").textContent.includes("0,00"), true);
sandbox.carregarFinanceiro();
assert.equal(stored().length, 0, "Nunca criar lançamentos automáticos");
console.log("PASS Financeiro começa vazio e permanece vazio sem cadastro");
// Preserve previously saved financial entries or cleared list.
db.set("sghss_financeiro_v1", "[]");
sandbox.carregarFinanceiro();
assert.equal(stored().length, 0);
console.log("PASS Lançamentos anteriores preservados; lista intencionalmente vazia não reinicia");
for (const id of ["corpoSuprimentos", "movItem", "totalItensEstoque", "totalBaixoEstoque", "totalUnidadesEstoque"]) {
    elem(id);
}
db.set("sghss_suprimentos_v1", JSON.stringify([
    { id: 11, nome: "Soro", categoria: "Materiais", unidade: "fr", quantidade: 2, minimo: 1 },
    { id: 12, nome: "Luvas", categoria: "Materiais", unidade: "cx", quantidade: 1, minimo: 1 },
    { id: 13, nome: "Esparadrapo", categoria: "Materiais", unidade: "pct", quantidade: 5, minimo: 2 },
    { id: 14, nome: "Aparelho", categoria: "Equipamentos", unidade: "un", quantidade: 0, minimo: 1 }
]));
sandbox.carregarSuprimentos();
const items = JSON.parse(db.get("sghss_suprimentos_v1"));
assert.deepEqual(items.map(x => x.unidade), ["Frasco", "Caixa", "Pacote", "Unidade"]);
for (const txt of ["2 frascos", "1 caixa", "5 pacotes", "0 unidades"]) {
    assert(dom.get("corpoSuprimentos").innerHTML.includes(txt), txt);
}
console.log("PASS Migração das abreviações e exibição por extenso, com plural correto");
for (const file of fs.readdirSync(path.join(ROOT, "pages")).filter(f => /^admin-.*\.html$/.test(f))) {
    assert(!/<a[^>]*href="admin-privacidade\.html"/.test(fs.readFileSync(path.join(ROOT, "pages", file), "utf8")));
}
assert(fs.existsSync(path.join(ROOT, "pages", "admin-privacidade.html")));
console.log("PASS Atalho LGPD retirado do menu e funcionalidade preservada");
console.log("TODOS OS TESTES ESPECÍFICOS PASSARAM");

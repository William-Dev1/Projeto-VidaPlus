const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const raiz = path.resolve(__dirname, "..");
const db = new Map([
    ["sghss_usuarios_v1", JSON.stringify([
            { id: 1, nome: "Administrador VidaPlus", tipo: "Administrador", status: "Ativo", email: "admin@vidaplus.com.br", senha: "123456" },
            { id: 10, nome: "Dra. Teste", tipo: "Profissional", status: "Ativo" },
            { id: 11, nome: "Paciente Teste", tipo: "Paciente", status: "Ativo" }
        ])],
    ["sghss_consultas_v1", JSON.stringify([{ id: 21, pacienteId: 11, profissionalId: 10 }])],
    ["sghss_suprimentos_v1", JSON.stringify([{ id: 31, nome: "Gaze" }])],
    ["sghss_financeiro_v1", JSON.stringify([{ id: 41, tipo: "Receita" }])],
    ["sghss_auditoria_v2", JSON.stringify([{ acao: "Ação já registrada" }])],
    ["sghss_perfil_paciente_11", JSON.stringify({ nome: "Paciente Teste" })],
    ["outro_sistema", "manter"]
]);
const localStorage = {
    get length() { return db.size; },
    key(i) { return [...db.keys()][i] ?? null; },
    getItem(k) { return db.get(k) ?? null; },
    setItem(k, v) { db.set(k, String(v)); },
    removeItem(k) { db.delete(k); }
};

const contexto = {
    localStorage,
    document: { addEventListener() { }, querySelector() { return null; }, querySelectorAll() { return []; } },
    window: { location: { href: "" } },
    alert() { },
    console
};
vm.createContext(contexto);
for (const nome of ["main.js", "usuarios.js", "hospital.js"]) {
    vm.runInContext(fs.readFileSync(path.join(raiz, "js", nome), "utf8"), contexto, { filename: nome });
}

const antes = new Map(db);
contexto.inicializarDadosProjeto();
contexto.inicializarDadosProjeto();
for (const [chave, valor] of antes) {
    assert.equal(db.get(chave), valor, `Registro anterior alterado: ${chave}`);
}
assert.equal(JSON.parse(db.get("sghss_usuarios_v1")).length, 3);
assert.equal(JSON.parse(db.get("sghss_consultas_v1")).length, 1);
assert.equal(JSON.parse(db.get("sghss_financeiro_v1")).length, 1);
assert.equal(JSON.parse(db.get("sghss_leitos_v1")).length, 8);
console.log("PASS A inicialização conserva médicos, pacientes, consultas, financeiro, auditoria e perfil");
const painel = fs.readFileSync(path.join(raiz, "pages/admin-dashboard.html"), "utf8");
const main = fs.readFileSync(path.join(raiz, "js/main.js"), "utf8");
assert.doesNotMatch(painel, /Reiniciar demonstração|reiniciarDemonstracao/);
assert.doesNotMatch(main, /reiniciarDemonstracao|prepararVersaoParaCapturas|limparArmazenamentoVidaPlus/);
console.log("PASS Painel e scripts não oferecem exclusão geral dos dados");
const vazio = new Map();
const localNovo = {
    getItem(k) { return vazio.get(k) ?? null; },
    setItem(k, v) { vazio.set(k, String(v)); },
    removeItem(k) { vazio.delete(k); }
};

const novo = { ...contexto, localStorage: localNovo };
vm.createContext(novo);
vm.runInContext(fs.readFileSync(path.join(raiz, "js/main.js"), "utf8"), novo);
novo.inicializarDadosProjeto();
assert.equal(JSON.parse(vazio.get("sghss_usuarios_v1")).length, 1);
assert.equal(JSON.parse(vazio.get("sghss_leitos_v1")).length, 8);
console.log("PASS Novo navegador inicia somente com administrador e oito leitos livres");
console.log("TODOS OS TESTES DE PRESERVAÇÃO DE DADOS PASSARAM");

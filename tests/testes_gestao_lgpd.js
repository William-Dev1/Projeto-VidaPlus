const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const db = new Map(), fields = {}, alerts = [];
const fakeDocument = {
    addEventListener() { }, querySelector() { return null; }, querySelectorAll() { return []; },
    getElementById(id) { return fields[id] || null; },
    createElement() { return { style: {}, appendChild() { }, setAttribute() { } }; },
    body: { dataset: { perfil: "Administrador" } }
};

function element(id, value = "") {
    const e = { value, textContent: "", innerHTML: "", checked: false, options: [], style: {}, focus() { }, reset() { }, setAttribute() { }, appendChild() { } };
    fields[id] = e;
    return e;
}

const env = {
    document: fakeDocument,
    localStorage: {
        getItem(k) { return db.has(k) ? db.get(k) : null; },
        setItem(k, v) { db.set(k, String(v)); },
        removeItem(k) { db.delete(k); }
    },
    window: { location: { href: "" } },
    alert(x) { alerts.push(x); }, confirm() { return true; }, console
};
vm.createContext(env);
for (const f of ["main.js", "usuarios.js", "admin.js", "hospital.js", "privacidade.js"]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, "js", f), "utf8"), env, { filename: f });
}

function put(key, val) { db.set(key, JSON.stringify(val)); }
function list(key) { return JSON.parse(db.get(key) || "[]"); }
function logged(id) { db.set("sghss_usuario_logado_v1", JSON.stringify(list("sghss_usuarios_v1").find(u => u.id === id))); }
const evento = { preventDefault() { } };
const done = label => console.log("PASS", label);
env.inicializarDadosProjeto();
// Pacientes criados apenas deste teste.
put("sghss_usuarios_v1", [...list("sghss_usuarios_v1"),
    { id: 101, nome: "Paciente Um", cpf: "000.000.000-00", email: "um@example.test", senha: "123456", tipo: "Paciente", status: "Ativo" },
    { id: 102, nome: "Paciente Dois", cpf: "111.111.111-11", email: "dois@example.test", senha: "123456", tipo: "Paciente", status: "Ativo" }]);
logged(101);
for (const id of ["finData", "finTipo", "finCategoria", "finDescricao", "finValor"]) {
    element(id);
}
Object.assign(fields.finData, { value: "2026-10-09" });
Object.assign(fields.finTipo, { value: "Receita" });
Object.assign(fields.finCategoria, { value: "Recebimentos gerais" });
Object.assign(fields.finDescricao, { value: "Teste" });
Object.assign(fields.finValor, { value: "250.90" });
assert.equal(env.cadastrarLancamento(evento), false);
assert.equal(list("sghss_financeiro_v1").length, 0);
done("Paciente não altera lançamentos financeiros");
element("lgpdComunicacoes").checked = true;
element("statusPreferenciaLgpd");
assert.equal(env.salvarPreferenciasLgpd(), true);
assert.equal(list("sghss_lgpd_preferencias_v1")[0].comunicacoes, true);
element("tipoDireitoLgpd", "Acesso aos dados");
element("detalheDireitoLgpd", "Quero ver meus dados cadastrados.");
element("statusSolicitacaoLgpd");
assert.equal(env.solicitarDireitoLgpd(evento), true);
const pedido = list("sghss_lgpd_solicitacoes_v1")[0];
assert.equal(pedido.pacienteId, 101);
assert.equal(pedido.status, "Em análise");
assert.equal(env.solicitarDireitoLgpd(evento), false);
done("Consentimento opcional e solicitação LGPD; bloqueia duplicação em análise");
// Pacientes não têm permissão para responder a nenhuma solicitação.
element("resposta-lgpd-" + pedido.id, "Resposta registrada.");
assert.equal(env.responderSolicitacaoLgpd(pedido.id), false);
logged(1);
element("corpoSolicitacoesLgpd");
element("totalLgpd");
element("pendentesLgpd");
element("respondidasLgpd");
assert.equal(env.responderSolicitacaoLgpd(pedido.id), true);
assert.equal(list("sghss_lgpd_solicitacoes_v1")[0].status, "Respondida");
assert.equal(fields.pendentesLgpd.textContent, "0");
done("Admin responde à solicitação, registrando-a na auditoria");
// Validação financeira e soma em centavos.
element("resultadoFinanceiro");
element("corpoFinanceiro");
element("totalReceitasFinanceiro");
element("totalDespesasFinanceiro");
element("saldoFinanceiro");
assert.equal(env.cadastrarLancamento(evento), true);
assert.equal(list("sghss_financeiro_v1")[0].centavos, 25090);
assert.equal(list("sghss_financeiro_v1").length, 1); // sem lançamentos pré-cadastrados.
fields.finTipo.value = "Despesa";
fields.finCategoria.value = "Despesas operacionais";
fields.finValor.value = "50";
assert.equal(env.cadastrarLancamento(evento), true);
assert.equal(fields.saldoFinanceiro.textContent.includes("200,90"), true);
fields.finValor.value = "-25";
assert.equal(env.cadastrarLancamento(evento), false);
assert.equal(list("sghss_financeiro_v1").length, 2);
done("Financeiro soma receitas/despesas e rejeita valores negativos");
// Estoque inicial vazio. O próprio teste cria essas fixtures.
for (const id of ["corpoSuprimentos", "movItem", "totalItensEstoque", "totalBaixoEstoque", "totalUnidadesEstoque", "resultadoSuprimento"]) {
    element(id);
}
env.carregarSuprimentos();
assert.equal(list("sghss_suprimentos_v1").length, 0);
put("sghss_suprimentos_v1", [
    { id: 301, nome: "Luvas descartáveis", categoria: "Materiais", unidade: "Caixa", quantidade: 18, minimo: 10 },
    { id: 302, nome: "Soro fisiológico", categoria: "Medicamentos", unidade: "Frasco", quantidade: 6, minimo: 12 },
    { id: 303, nome: "Máscara cirúrgica", categoria: "Materiais", unidade: "Caixa", quantidade: 24, minimo: 10 }
]);
env.carregarSuprimentos();
assert.equal(list("sghss_suprimentos_v1").length, 3);
assert.equal(fields.totalBaixoEstoque.textContent, "1");
assert(fields.corpoSuprimentos.innerHTML.includes("caixas"));
assert(fields.corpoSuprimentos.innerHTML.includes("frascos"));
for (const [id, v] of Object.entries({ supNome: "Gaze", supCategoria: "Materiais", supUnidade: "Pacote", supQuantidade: "8", supMinimo: "10" })) {
    element(id, v);
}
assert.equal(env.cadastrarSuprimento(evento), true);
const gaze = list("sghss_suprimentos_v1").find(i => i.nome === "Gaze");
assert.equal(fields.totalBaixoEstoque.textContent, "2");
assert.equal(gaze.unidade, "Pacote");
fields.supNome.value = "Gaze";
assert.equal(env.cadastrarSuprimento(evento), false);
for (const [id, v] of Object.entries({ movTipo: "Saída", movQuantidade: "10" })) {
    element(id, v);
}
fields.movItem.value = String(gaze.id);
assert.equal(env.movimentarSuprimento(evento), false);
fields.movQuantidade.value = "3";
assert.equal(env.movimentarSuprimento(evento), true);
assert.equal(list("sghss_suprimentos_v1").find(i => i.id === gaze.id).quantidade, 5);
done("Suprimentos: cadastro único, estoque mínimo e bloqueio de saída excessiva");
// Leitos e internações.
for (const id of ["internarPaciente", "internarLeito", "resultadoInternacao", "corpoInternacoes", "listaLeitos", "leitosDisponiveis", "leitosOcupados", "taxaOcupacao"]) {
    element(id);
}
fields.internarPaciente.value = "101";
fields.internarLeito.value = "102";
assert.equal(env.registrarInternacao(evento), true);
assert.equal(list("sghss_internacoes_v1").length, 1);
assert.equal(list("sghss_leitos_v1").find(l => l.id === 102).status, "Ocupado");
assert.equal(env.registrarInternacao(evento), false);
env.alterarStatusLeito(102, "Disponível");
assert.equal(list("sghss_leitos_v1").find(l => l.id === 102).status, "Ocupado");
assert.equal(env.darAltaInternacao(list("sghss_internacoes_v1")[0].id), true);
assert.equal(list("sghss_leitos_v1").find(l => l.id === 102).status, "Limpeza");
env.alterarStatusLeito(102, "Disponível");
assert.equal(list("sghss_leitos_v1").find(l => l.id === 102).status, "Disponível");
done("Internação reserva leito, impede liberação sem alta, alta libera para limpeza");
// Audit logs and sanitization
const logs = list("sghss_auditoria_v2");
for (const termo of ["lançamento financeiro", "suprimento", "internação", "solicitação LGPD"]) {
    assert(logs.some(l => l.acao.includes(termo)), "Sem auditoria: " + termo);
}
assert.equal(env.escaparHTML("<img src=x>"), "&lt;img src=x&gt;");
done("Registros de auditoria e escapamento de HTML nas tabelas");
logged(102);
element("corpoMinhasSolicitacoesLgpd");
env.carregarPrivacidadePaciente();
assert(!fields.corpoMinhasSolicitacoesLgpd.innerHTML.includes("Acesso aos dados"));
done("Privacidade do paciente não expõe solicitações de outro titular");
const { JSDOM } = {};
for (const folder of ["", "pages/"]) {
    for (const f of fs.readdirSync(path.join(ROOT, folder))) {
        if (!f.endsWith(".html")) {
            continue;
        }
        const content = fs.readFileSync(path.join(ROOT, folder, f), "utf8");
        const regex = /(?:href|src)="([^"]+)"/g;
        let m;
        while ((m = regex.exec(content)) !== null) {
            const r = m[1];
            if (r.startsWith("#") || r.startsWith("http") || r.startsWith("data:")) {
                continue;
            }
            assert(fs.existsSync(path.resolve(ROOT, folder, r)), "Rota quebrada: " + folder + f + " -> " + r);
        }
    }
}
done("Links e arquivos internos de todas as páginas resolvidos");
console.log("TODOS OS TESTES DE GESTÃO E LGPD PASSARAM");

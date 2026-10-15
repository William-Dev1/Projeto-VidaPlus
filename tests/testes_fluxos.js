const fs = require("fs");
const vm = require("vm");
const assert = require("assert");
const root = require("path").resolve(__dirname, "..") + "/";
const db = new Map();
const fields = {};
const alerts = [];
const anchors = [];
const prints = [];
const objectURLs = [];
let downloads = 0;
const fakeDocument = {
    addEventListener() { }, querySelector() { return null; }, querySelectorAll() { return []; },
    getElementById(id) { return fields[id] || null; },
    createElement(tag) {
        let el = { tagName: tag.toUpperCase(), style: {}, className: "", dataset: {}, value: "", textContent: "", innerHTML: "", children: [],
            setAttribute(k, v) { this[k] = v; }, appendChild(node) { this.children.push(node); },
            click() { downloads++; }, remove() { }, focus() { } };
        return el;
    },
    body: { appendChild(n) { anchors.push(n); } }
};

const s = { document: fakeDocument, localStorage: { getItem(k) { return db.has(k) ? db.get(k) : null; }, setItem(k, v) { db.set(k, String(v)); }, removeItem(k) { db.delete(k); } },
    alert(msg) { alerts.push(msg); }, confirm() { return true; }, prompt() { return "Conflito de horário"; },
    window: { location: { href: "" }, print() { prints.push(true); } },
    Blob: class {
        constructor(d, o) { this.parts = d; this.opts = o; }
    },
    URL: { createObjectURL(b) { objectURLs.push(b); return "blob:teste"; }, revokeObjectURL() { } },
    setTimeout() { }, console };
vm.createContext(s);
for (const file of ["js/main.js", "js/usuarios.js", "js/paciente.js", "js/profissional.js", "js/admin.js"]) {
    vm.runInContext(fs.readFileSync(root + file, "utf8"), s, { filename: file });
}

function list(key) { return JSON.parse(db.get(key)); }
function put(key, value) { db.set(key, JSON.stringify(value)); }
function field(id, val) { fields[id] = { value: val, innerHTML: "", textContent: "", style: {}, focus() { }, appendChild() { }, reset() { } }; return fields[id]; }
function todayPlus(days) { const d = new Date(); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function success(msg) { console.log("PASS", msg); }
s.inicializarDadosProjeto();
assert.equal(list("sghss_usuarios_v1").length, 1);
assert.equal(list("sghss_consultas_v1").length, 0);
success("Somente administrador na base inicial");
put("sghss_consultas_v1", []);
put("sghss_usuarios_v1", []);
s.inicializarDadosProjeto();
assert.equal(list("sghss_consultas_v1").length, 0);
assert.equal(list("sghss_usuarios_v1").length, 0);
success("Listas esvaziadas não são reintroduzidas");
put("sghss_usuarios_v1", [
    { id: 1, nome: "Administrador VidaPlus", email: "admin@vidaplus.com.br", senha: "123456", tipo: "Administrador", status: "Ativo" },
    { id: 101, nome: "João da Silva", email: "joao@paciente.com", cpf: "000.000.000-00", senha: "123456", tipo: "Paciente", status: "Ativo" },
    { id: 201, nome: "Dra. Mariana Lopes", email: "mariana@vidaplus.com.br", senha: "123456", tipo: "Profissional", especialidade: "Clínica Geral", registro: "CRM 12345", status: "Ativo" }
]);
field("tipoLogin", "Paciente");
field("emailLogin", "joao@paciente.com");
field("senhaLogin", "123456");
s.fazerLogin();
assert(s.window.location.href.includes("paciente-dashboard"));
success("Login do paciente");
assert(!s.dataHoraFutura("2000-01-01", "10:00"));
assert(!s.dataHoraFutura("2030-02-31", "10:00"));
assert(s.dataHoraFutura(todayPlus(10), "10:00"));
success("Validação de data, incluindo data impossível");
field("especialidade", "Clínica Geral");
field("profissional", "201");
field("unidade", "VidaPlus Centro");
field("tipo", "Teleconsulta");
field("data", "2000-01-01");
field("horario", "14:00");
field("observacoes", "Teste <img src=x onerror=alert(1)>");
s.agendarConsulta();
assert.equal(list("sghss_consultas_v1").length, 0);
success("Agendamento passado recusado");
field("data", todayPlus(10));
// O médico deve publicar o dia/horário antes de o paciente agendar.
s.agendarConsulta();
assert.equal(list("sghss_consultas_v1").length, 0);
s.localStorage.setItem("sghss_usuario_logado_v1", JSON.stringify(list("sghss_usuarios_v1").find(u => u.id === 201)));
field("dataDisponibilidade", todayPlus(10));
field("dataFimDisponibilidade", todayPlus(10));
field("inicioDisponibilidade", "14:00");
field("fimDisponibilidade", "15:00");
field("intervaloDisponibilidade", "30");
s.publicarDisponibilidade();
assert.equal(list("sghss_disponibilidades_v1").length, 2);
s.localStorage.setItem("sghss_usuario_logado_v1", JSON.stringify(list("sghss_usuarios_v1").find(u => u.id === 101)));
s.agendarConsulta();
assert.equal(list("sghss_consultas_v1").length, 1);
assert.equal(list("sghss_consultas_v1")[0].status, "Pendente");
success("Agendamento futuro cria solicitação pendente");
s.agendarConsulta();
assert.equal(list("sghss_consultas_v1").length, 1);
success("Horário ocupado não é duplicado");
// Testa se o HTML malicioso na tabela é escapado corretamente.
const consultas = list("sghss_consultas_v1");
consultas[0].profissionalNome = "<img src=x onerror=\"alert(1)\">";
put("sghss_consultas_v1", consultas);
field("corpoConsultasPaciente", "");
s.carregarConsultasPaciente();
assert(fields.corpoConsultasPaciente.innerHTML.includes("&lt;img"));
assert(!fields.corpoConsultasPaciente.innerHTML.includes("<img"));
success("Dados de consulta escapados na tabela do paciente");
field("tipoLogin", "Profissional");
field("emailLogin", "mariana@vidaplus.com.br");
s.fazerLogin();
assert(s.window.location.href.includes("profissional-dashboard"));
field("corpoAgendaProfissional", "");
s.carregarAgendaProfissional();
assert(fields.corpoAgendaProfissional.innerHTML.includes("&lt;img"));
assert(!fields.corpoAgendaProfissional.innerHTML.includes("<img"));
s.aceitarConsulta(list("sghss_consultas_v1")[0].id);
assert.equal(list("sghss_consultas_v1")[0].status, "Confirmada");
success("Fluxo profissional: visualiza e aceita a consulta");
field("tipoLogin", "Paciente");
field("emailLogin", "joao@paciente.com");
s.fazerLogin();
field("totalConfirmadasPaciente", "");
field("totalPendentesPaciente", "");
field("proximaConsultaPaciente", "");
s.carregarDashboardPaciente();
assert.equal(fields.totalConfirmadasPaciente.textContent, 1);
assert(fields.proximaConsultaPaciente.innerHTML.includes("Clínica Geral"));
success("Dashboard do paciente reflete status confirmado");
s.cancelarConsultaPaciente(list("sghss_consultas_v1")[0].id);
assert.equal(list("sghss_consultas_v1")[0].status, "Cancelada");
success("Paciente cancela consulta e atualiza dados");
// Texto malicioso em registros clínicos não pode gerar uma tag executável.
field("corpoHistoricoPaciente", "");
s.carregarHistoricoPaciente();
assert(fields.corpoHistoricoPaciente.innerHTML.includes("&lt;img"));
success("Histórico clínico exibe dados como texto");
field("nomeCadastro", "Nova Pessoa");
field("cpfCadastro", "123.123.123-12");
field("tipoCadastro", "Paciente");
field("nascimentoCadastro", "15/08/1998");
field("telefoneCadastro", "(47) 99999-8888");
field("emailCadastro", "usuario@example.com");
field("senhaCadastro", "123");
field("confirmarSenhaCadastro", "123");
s.criarConta();
assert(!list("sghss_usuarios_v1").some(u => u.email === "usuario@example.com"));
field("senhaCadastro", "123456");
field("confirmarSenhaCadastro", "123456");
s.criarConta();
assert(list("sghss_usuarios_v1").some(u => u.email === "usuario@example.com"));
success("Cadastro valida senha e salva conta válida");
field("corpoCadastros", "");
field("corpoAuditoria", "");
field("listaLeitos", "");
field("relPendentes", "");
field("relConfirmadas", "");
field("relRecusadas", "");
field("relCanceladas", "");
field("relConcluidas", "");
field("totalPacientes", "");
field("totalProfissionais", "");
field("totalPendentesAdmin", "");
field("totalConfirmadasAdmin", "");
field("tipoLogin", "Administrador");
field("emailLogin", "admin@vidaplus.com.br");
s.fazerLogin();
s.carregarDashboardAdmin();
s.carregarUsuariosAdmin();
s.carregarRelatoriosAdmin();
s.carregarAuditoriaAdmin();
s.carregarLeitosAdmin();
assert(fields.corpoCadastros.innerHTML.includes("Nova Pessoa"));
assert(fields.listaLeitos.innerHTML.includes("Leito"));
success("Módulo administrativo renderiza cadastros, leitos e relatórios");
// A seção visual de exportação foi retirada dos relatórios.
assert(!require("fs").readFileSync(root + "pages/admin-relatorios.html", "utf8").includes("Exportar CSV"));
success("Relatórios não exibem mais a área de exportação");
console.log("TODOS OS TESTES DE FLUXO PASSARAM");

// Teste de regressão, sem dependências externas.

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const db = new Map();
const campos = {};
const alertas = [];
const doc = {
    addEventListener() { },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    getElementById(id) { return campos[id] ?? null; },
    createElement(tag) { return { tagName: tag, value: "", innerHTML: "", textContent: "", appendChild() { }, setAttribute() { } }; }
};

const sandbox = {
    document: doc,
    localStorage: { getItem(k) { return db.has(k) ? db.get(k) : null; }, setItem(k, v) { db.set(k, String(v)); }, removeItem(k) { db.delete(k); } },
    alert(m) { alertas.push(m); }, confirm() { return true; }, console,
    window: { location: { href: "" } }
};
vm.createContext(sandbox);
for (const f of ["js/main.js", "js/usuarios.js", "js/paciente.js", "js/profissional.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), sandbox, { filename: f });
}

const ler = key => JSON.parse(db.get(key));
const gravar = (key, val) => db.set(key, JSON.stringify(val));
const usar = u => gravar("sghss_usuario_logado_v1", u);
const field = (id, value) => (campos[id] = { value, focus() { }, appendChild() { }, innerHTML: "", textContent: "", style: {} });
const depois = days => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};

const data = depois(12);
sandbox.inicializarDadosProjeto();
// Contas fictícias criadas explicitamente no teste.
const admin = ler("sghss_usuarios_v1")[0];
const pacienteFixture = { id: 101, nome: "João da Silva", cpf: "000.000.000-00", email: "joao@paciente.com", senha: "123456", tipo: "Paciente", status: "Ativo" };
const medicoFixture = { id: 201, nome: "Dra. Mariana Lopes", cpf: "222.222.222-22", email: "mariana@vidaplus.com.br", senha: "123456", tipo: "Profissional", especialidade: "Clínica Geral", registro: "CRM 12345", status: "Ativo" };
const medicoFixture2 = { id: 202, nome: "Dr. Carlos Mendes", cpf: "333.333.333-33", email: "carlos@vidaplus.com.br", senha: "123456", tipo: "Profissional", especialidade: "Cardiologia", registro: "CRM 67890", status: "Ativo" };
gravar("sghss_usuarios_v1", [admin, pacienteFixture, medicoFixture, medicoFixture2]);
const medico = ler("sghss_usuarios_v1").find(x => x.id === 201);
const medico2 = ler("sghss_usuarios_v1").find(x => x.id === 202);
const paciente = ler("sghss_usuarios_v1").find(x => x.id === 101);
gravar("sghss_consultas_v1", []);
assert.equal(sandbox.mascararNascimento("29022024"), "29/02/2024");
assert.equal(sandbox.mascararNascimento("1a2b0c21999"), "12/02/1999");
assert.equal(sandbox.nascimentoValido("29/02/2024"), true);
assert.equal(sandbox.nascimentoValido("29/02/2025"), false);
assert.equal(sandbox.nascimentoValido("31/04/1999"), false);
assert.equal(sandbox.nascimentoValido("10/10/1899"), false);
assert.equal(sandbox.nascimentoValido("10/10/2099"), false);
assert.equal(sandbox.mascararCelular("47999998888"), "(47) 99999-8888");
assert.equal(sandbox.mascararCelular("(47) 99999-8888"), "(47) 99999-8888");
assert.equal(sandbox.celularValido("(47) 99999-8888"), true);
assert.equal(sandbox.celularValido("(00) 99999-8888"), false);
assert.equal(sandbox.celularValido("(47) 88888-8888"), false);
assert.equal(sandbox.celularValido("(47) 9999-8888"), false);
console.log("PASS Máscaras e validações de data/telefone");
usar(paciente);
field("especialidade", "Clínica Geral");
field("profissional", "201");
field("unidade", "VidaPlus Centro");
field("tipo", "Presencial");
field("data", data);
field("horario", "09:00");
field("observacoes", "Teste");
sandbox.agendarConsulta();
assert.equal(ler("sghss_consultas_v1").length, 0);
console.log("PASS Sem publicação, paciente não consegue agendar");
usar(medico);
field("dataDisponibilidade", data);
field("dataFimDisponibilidade", data);
field("inicioDisponibilidade", "09:00");
field("fimDisponibilidade", "11:00");
field("intervaloDisponibilidade", "30");
sandbox.publicarDisponibilidade();
assert.equal(ler("sghss_disponibilidades_v1").length, 4);
assert.equal(sandbox.disponibilidadesDoProfissional(201, true).length, 4);
assert.equal(sandbox.disponibilidadesDoProfissional(202, true).length, 0);
sandbox.publicarDisponibilidade(); // não duplica
assert.equal(ler("sghss_disponibilidades_v1").length, 4);
console.log("PASS Publicação de quatro horários, sem duplicações e separação por médico");
usar(medico2);
field("inicioDisponibilidade", "10:00");
field("fimDisponibilidade", "11:00");
sandbox.publicarDisponibilidade();
assert.equal(sandbox.disponibilidadesDoProfissional(201, true).length, 4);
assert.equal(sandbox.disponibilidadesDoProfissional(202, true).length, 2);
console.log("PASS Cada médico tem sua agenda independente");
usar(paciente);
sandbox.agendarConsulta();
assert.equal(ler("sghss_consultas_v1").length, 1);
assert.equal(sandbox.disponibilidadesDoProfissional(201, true).length, 3);
sandbox.agendarConsulta();
assert.equal(ler("sghss_consultas_v1").length, 1);
console.log("PASS Consulta ocupa vaga e evita dupla reserva");
usar(medico);
let vaga = ler("sghss_disponibilidades_v1").find(x => x.profissionalId === 201 && x.horario === "09:00");
sandbox.removerHorarioDisponivel(vaga.id);
assert.equal(ler("sghss_disponibilidades_v1").length, 6);
sandbox.removerDiaDisponivel(data);
assert.equal(ler("sghss_disponibilidades_v1").length, 6);
const outro = ler("sghss_disponibilidades_v1").find(x => x.profissionalId === 201 && x.horario === "09:30");
sandbox.removerHorarioDisponivel(outro.id);
assert.equal(ler("sghss_disponibilidades_v1").length, 5);
console.log("PASS Remoção bloqueia reservas ativas e permite remover vagas livres");
usar(paciente);
const c = ler("sghss_consultas_v1");
c[0].status = "Cancelada";
gravar("sghss_consultas_v1", c);
assert.equal(sandbox.horarioLiberado(201, data, "09:00"), true);
sandbox.agendarConsulta();
assert.equal(ler("sghss_consultas_v1").length, 2);
console.log("PASS Cancelamento devolve a vaga para novo agendamento");
usar(medico);
const consultas = ler("sghss_consultas_v1");
consultas[1].status = "Recusada";
gravar("sghss_consultas_v1", consultas);
sandbox.removerDiaDisponivel(data);
assert.equal(sandbox.disponibilidadesDoProfissional(201).length, 0);
assert.equal(sandbox.disponibilidadesDoProfissional(202).length, 2);
console.log("PASS Recusa permite remover o dia sem afetar outros médicos");
usar(paciente);
field("nome", "João da Silva");
field("cpf", "000.000.000-00");
field("nascimento", "31/02/2000");
field("telefone", "(47) 99999-8888");
field("emailPaciente", "joao@paciente.com");
field("convenio", "");
field("endereco", "");
sandbox.salvarPerfilPaciente();
assert.equal(ler("sghss_usuarios_v1").find(x => x.id === 101).nascimento, undefined);
campos.nascimento.value = "15/08/1998";
campos.telefone.value = "47999998888";
sandbox.salvarPerfilPaciente();
assert.equal(ler("sghss_usuarios_v1").find(x => x.id === 101).telefone, "(47) 99999-8888");
assert.equal(ler("sghss_usuarios_v1").find(x => x.id === 101).nascimento, "15/08/1998");
console.log("PASS Perfil rejeita data impossível e persiste formato correto");
console.log("TODOS OS TESTES DE DISPONIBILIDADE E MÁSCARAS PASSARAM");

// Testes do período de disponibilidade e da formatação do CPF.

const fs = require("fs");
const vm = require("vm");
const path = require("path");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const dados = new Map(), elementos = {}, mensagens = [];
const doc = {
    addEventListener() { }, querySelector() { return null; }, querySelectorAll() { return []; },
    getElementById(id) { return elementos[id] || null; },
    createElement() { return { innerHTML: "", className: "", textContent: "", appendChild() { }, setAttribute() { } }; }
};

const s = {
    document: doc, console, confirm() { return true; },
    alert(msg) { mensagens.push(msg); },
    localStorage: { getItem(k) { return dados.has(k) ? dados.get(k) : null; }, setItem(k, v) { dados.set(k, String(v)); }, removeItem(k) { dados.delete(k); } },
    window: { location: { href: "" } }
};
vm.createContext(s);
for (const file of ["js/main.js", "js/usuarios.js", "js/paciente.js", "js/profissional.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), s, { filename: file });
}

const ler = k => JSON.parse(dados.get(k));
const salvar = (k, v) => dados.set(k, JSON.stringify(v));
const usar = u => salvar("sghss_usuario_logado_v1", u);
const campo = (id, value = "") => (elementos[id] = { value, style: {}, focus() { }, appendChild() { }, addEventListener() { }, innerHTML: "", textContent: "" });
const futuradata = days => { const d = new Date(); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const usuariosKey = "sghss_usuarios_v1", consultasKey = "sghss_consultas_v1", vagasKey = "sghss_disponibilidades_v1";
assert.equal(s.mascararCPF("12345678900"), "123.456.789-00");
assert.equal(s.mascararCPF("123.456.789-00"), "123.456.789-00");
assert.equal(s.mascararCPF("123a456b789c001234"), "123.456.789-00");
assert.equal(s.mascararCPF("1234"), "123.4");
assert.equal(s.formatoCPFValido("123.456.789-00"), true);
assert.equal(s.formatoCPFValido("123.456.78"), false);
console.log("PASS CPF: máscara progressiva, limite de 11 números e formato completo");
const dt1 = futuradata(15), dt2 = futuradata(20), fora = futuradata(14), dt3 = futuradata(21);
assert.equal(s.gerarDatasDoPeriodo(dt1, dt2).length, 6);
assert.equal(s.gerarDatasDoPeriodo(dt1, dt2)[0], dt1);
assert.equal(s.gerarDatasDoPeriodo(dt1, dt2).at(-1), dt2);
assert.equal(s.gerarDatasDoPeriodo(dt1, dt1).length, 1);
assert.equal(s.gerarDatasDoPeriodo(dt2, dt1), null);
assert.equal(s.gerarDatasDoPeriodo("2028-02-28", "2028-03-01").join(","), "2028-02-28,2028-02-29,2028-03-01");
assert.equal(s.gerarDatasDoPeriodo("2029-02-29", "2029-03-02"), null);
assert.equal(s.gerarDatasDoPeriodo("2027-01-01", "2027-07-01"), null); // mais de 180 dias
console.log("PASS Intervalos inclusivos, dia único, ordem invertida, ano bissexto e limite de dias");
s.inicializarDadosProjeto();
// Usuários criados apenas para o teste.
salvar(usuariosKey, [...ler(usuariosKey),
    { id: 101, nome: "João da Silva", cpf: "000.000.000-00", email: "joao@paciente.com", senha: "123456", tipo: "Paciente", status: "Ativo" },
    { id: 201, nome: "Dra. Mariana Lopes", email: "mariana@vidaplus.com.br", senha: "123456", tipo: "Profissional", status: "Ativo", especialidade: "Clínica Geral", registro: "CRM 12345" }]);
const medico = ler(usuariosKey).find(x => x.id === 201);
const paciente = ler(usuariosKey).find(x => x.id === 101);
salvar(consultasKey, []);
usar(medico);
campo("dataDisponibilidade", dt1);
campo("dataFimDisponibilidade", dt2);
campo("inicioDisponibilidade", "09:00");
campo("fimDisponibilidade", "10:00");
campo("intervaloDisponibilidade", "30");
s.publicarDisponibilidade();
assert.equal(ler(vagasKey).length, 12);
assert.equal(new Set(ler(vagasKey).map(x => x.data)).size, 6);
assert.equal(s.disponibilidadesDoProfissional(201, true).length, 12);
s.publicarDisponibilidade();
assert.equal(ler(vagasKey).length, 12);
console.log("PASS Médico publica dois horários em cada um de seis dias, sem duplicações");
const outrasDatas = ler(vagasKey).slice();
elementos.dataDisponibilidade.value = dt2;
elementos.dataFimDisponibilidade.value = dt3;
s.publicarDisponibilidade();
assert.equal(ler(vagasKey).length, 14); // dia 20 não duplica, dia 21 adiciona
assert.equal(ler(vagasKey).filter(x => x.data === dt3).length, 2);
console.log("PASS Períodos sobrepostos não duplicam vagas existentes");
usar(paciente);
campo("especialidade", "Clínica Geral");
campo("profissional", "201");
campo("unidade", "VidaPlus Centro");
campo("tipo", "Presencial");
campo("data", dt2);
campo("horario", "09:00");
campo("observacoes", "Teste");
s.agendarConsulta();
assert.equal(ler(consultasKey).length, 1);
assert.equal(s.horarioLiberado(201, dt2, "09:00"), false);
assert.equal(s.horarioLiberado(201, dt2, "09:30"), true);
assert.equal(s.horarioLiberado(201, fora, "09:00"), false);
console.log("PASS Paciente agenda em data do período, reserva uma vaga e não vê dias externos");
usar(medico);
elementos.dataDisponibilidade.value = dt3;
elementos.dataFimDisponibilidade.value = dt1;
const antes = ler(vagasKey).length;
s.publicarDisponibilidade();
assert.equal(ler(vagasKey).length, antes);
assert(mensagens.at(-1).includes("período válido"));
console.log("PASS Período invertido é recusado sem alterar a agenda");
campo("tipoCadastro", "Paciente");
campo("nomeCadastro", "Pessoa Teste");
campo("cpfCadastro", "1234567890");
campo("nascimentoCadastro", "15081998");
campo("telefoneCadastro", "47999998888");
campo("emailCadastro", "novo.paciente@example.com");
campo("senhaCadastro", "123456");
campo("confirmarSenhaCadastro", "123456");
s.criarConta();
assert(!ler(usuariosKey).some(u => u.email === "novo.paciente@example.com"));
assert(mensagens.at(-1).includes("11 dígitos"));
elementos.cpfCadastro.value = "12345678901";
s.criarConta();
assert.equal(ler(usuariosKey).find(u => u.email === "novo.paciente@example.com").cpf, "123.456.789-01");
console.log("PASS Cadastro rejeita CPF incompleto e salva CPF com máscara mesmo sem pontuação digitada");
usar(paciente);
campo("nome", "João da Silva");
campo("cpf", "98765432");
campo("nascimento", "");
campo("telefone", "");
campo("emailPaciente", paciente.email);
campo("convenio", "");
campo("endereco", "");
s.salvarPerfilPaciente();
assert.equal(ler(usuariosKey).find(u => u.id === paciente.id).cpf, "000.000.000-00");
elementos.cpf.value = "98765432100";
s.salvarPerfilPaciente();
assert.equal(ler(usuariosKey).find(u => u.id === paciente.id).cpf, "987.654.321-00");
console.log("PASS Perfil rejeita CPF incompleto e salva máscara corretamente");
const htmlRelatorio = fs.readFileSync(path.join(root, "pages/admin-relatorios.html"), "utf8");
assert(!htmlRelatorio.includes("<h3>Exportação</h3>"));
assert(!htmlRelatorio.includes("Exportar CSV"));
assert(htmlRelatorio.includes("relConfirmadas"));
const formAgenda = fs.readFileSync(path.join(root, "pages/profissional-agenda.html"), "utf8");
assert(formAgenda.includes("id=\"dataFimDisponibilidade\""));
console.log("PASS Bloco de exportação removido e indicadores preservados");
console.log("TODOS OS TESTES DE PERÍODO E CPF PASSARAM");

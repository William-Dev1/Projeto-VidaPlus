// Verificação estática das mensagens explicativas removidas da interface.
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const raiz = path.resolve(__dirname, "..");
const paginas = [
    ...fs.readdirSync(raiz).filter(f => f.endsWith(".html")).map(f => path.join(raiz, f)),
    ...fs.readdirSync(path.join(raiz, "pages")).filter(f => f.endsWith(".html")).map(f => path.join(raiz, "pages", f))
];
assert.equal(paginas.length, 25, "Quantidade inesperada de páginas HTML");
for (const arquivo of paginas) {
    const html = fs.readFileSync(arquivo, "utf8");
    assert(!/class="(?:aviso|aviso-amarelo|indicador-rolagem-mobile|ajuda-campo)"/.test(html), `Aviso explicativo remanescente: ${arquivo}`);
    assert(!/Arraste a barra horizontal|Use os botões Aceitar|Seus pacientes só poderão agendar|Ao emitir, a receita ficará|Digite os 11 números/.test(html), `Instrução desnecessária em ${arquivo}`);
    if (arquivo.includes("/pages/")) {
        assert(/<main\b[^>]*\bid="conteudo-principal"/.test(html), `Estrutura principal ausente em ${arquivo}`);
    }
}

const agenda = fs.readFileSync(path.join(raiz, "pages", "profissional-agenda.html"), "utf8");
const receita = fs.readFileSync(path.join(raiz, "pages", "profissional-receita.html"), "utf8");
const cadastro = fs.readFileSync(path.join(raiz, "criar-conta.html"), "utf8");
const perfil = fs.readFileSync(path.join(raiz, "pages", "paciente-perfil.html"), "utf8");
assert(agenda.includes("id=\"dataFimDisponibilidade\""));
assert(agenda.includes("id=\"formDisponibilidade\""));
assert(agenda.includes("id=\"listaDisponibilidadesProfissional\""));
assert(receita.includes("id=\"pacienteReceita\""));
for (const html of [cadastro, perfil]) {
    assert(/id="(?:cpfCadastro|cpf)"/.test(html));
}
assert(cadastro.includes("id=\"nascimentoCadastro\""));
assert(cadastro.includes("id=\"telefoneCadastro\""));
console.log(`PASS Limpeza de instruções nas ${paginas.length} páginas HTML`);
console.log("PASS Agenda por intervalo, paciente da receita e máscaras preservados");

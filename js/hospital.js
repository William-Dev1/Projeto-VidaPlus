// Gestão Hospitalar.

const CHAVE_FINANCEIRO = "sghss_financeiro_v1";
const CHAVE_SUPRIMENTOS = "sghss_suprimentos_v1";
const CHAVE_INTERNACOES = "sghss_internacoes_v1";
function administradorAtivo() {
    // Confere o cadastro atual.
    const sessao = pegarUsuarioLogado();
    if (!sessao || sessao.tipo !== "Administrador") {
        return null;
    }
    return lerLista(CHAVE_USUARIOS).find(u => u.id === sessao.id && u.tipo === "Administrador" && u.status === "Ativo") || null;
}

function atualizarTexto(id, texto) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = String(texto);
    }
}

function formatoMoeda(centavos) {
    return (Number(centavos || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataISOValida(data) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return false;
    }
    const d = new Date(data + "T12:00:00");
    return !Number.isNaN(d.getTime()) &&
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` === data;
}

// Demonstrativo financeiro.
const CATEGORIAS_FINANCEIRAS = {
    Receita: ["Recebimentos gerais", "Serviços prestados", "Outras receitas"],
    Despesa: ["Despesas operacionais", "Fornecedores", "Manutenção", "Outras despesas"]
};

function atualizarCategoriasFinanceiro() {
    const tipo = document.getElementById("finTipo")?.value || "Receita";
    const campo = document.getElementById("finCategoria");
    if (!campo || !CATEGORIAS_FINANCEIRAS[tipo]) {
        return;
    }
    const anterior = campo.value;
    campo.innerHTML = CATEGORIAS_FINANCEIRAS[tipo].map(c => `<option value="${escaparHTML(c)}">${escaparHTML(c)}</option>`).join("");
    campo.value = CATEGORIAS_FINANCEIRAS[tipo].includes(anterior) ? anterior : CATEGORIAS_FINANCEIRAS[tipo][0];
}

function dataFinanceiroExemplo(diasAtras) {
    const d = new Date();
    d.setDate(d.getDate() - diasAtras);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function iniciarFinanceiro() {
    // Inicia vazio para permitir capturar o primeiro lançamento.
    if (localStorage.getItem(CHAVE_FINANCEIRO) === null) {
        salvarLista(CHAVE_FINANCEIRO, []);
    }
}

function cadastrarLancamento(evento) {
    if (evento?.preventDefault) {
        evento.preventDefault();
    }
    const admin = administradorAtivo();
    if (!admin) {
        return false;
    }
    const data = document.getElementById("finData")?.value || "";
    const tipo = document.getElementById("finTipo")?.value || "";
    const categoria = document.getElementById("finCategoria")?.value || "";
    const descricao = document.getElementById("finDescricao")?.value.trim() || "";
    const valor = Number(document.getElementById("finValor")?.value);
    const centavos = Math.round(valor * 100);
    if (!dataISOValida(data) || !["Receita", "Despesa"].includes(tipo) ||
        !CATEGORIAS_FINANCEIRAS[tipo]?.includes(categoria) ||
        !descricao || descricao.length > 100 || !Number.isFinite(valor) || valor <= 0 ||
        !Number.isSafeInteger(centavos) || centavos <= 0 || Math.abs(valor * 100 - centavos) > 0.001) {
        atualizarTexto("resultadoFinanceiro", "Confira data, categoria, descrição e valor do lançamento.");
        return false;
    }
    iniciarFinanceiro();
    const registros = lerLista(CHAVE_FINANCEIRO);
    registros.unshift({ id: gerarId(), data, tipo, categoria, descricao, centavos });
    salvarLista(CHAVE_FINANCEIRO, registros);
    registrarAuditoria("Registrou lançamento financeiro de " + tipo.toLowerCase() + ".", admin);
    const form = document.getElementById("formFinanceiro");
    if (form) {
        form.reset();
    }
    atualizarCategoriasFinanceiro();
    const inputData = document.getElementById("finData");
    if (inputData) {
        inputData.value = dataFinanceiroExemplo(0);
    }
    atualizarTexto("resultadoFinanceiro", "Lançamento registrado.");
    carregarFinanceiro();
    return true;
}

function carregarFinanceiro() {
    if (!document.getElementById("corpoFinanceiro") || !administradorAtivo()) {
        return;
    }
    iniciarFinanceiro();
    const inicio = document.getElementById("finInicio")?.value || "";
    const fim = document.getElementById("finFim")?.value || "";
    const registros = lerLista(CHAVE_FINANCEIRO).filter(r => (!inicio || r.data >= inicio) && (!fim || r.data <= fim));
    const receitas = registros.filter(r => r.tipo === "Receita").reduce((s, r) => s + (Number(r.centavos) || 0), 0);
    const despesas = registros.filter(r => r.tipo === "Despesa").reduce((s, r) => s + (Number(r.centavos) || 0), 0);
    atualizarTexto("totalReceitasFinanceiro", formatoMoeda(receitas));
    atualizarTexto("totalDespesasFinanceiro", formatoMoeda(despesas));
    atualizarTexto("saldoFinanceiro", formatoMoeda(receitas - despesas));
    const corpo = document.getElementById("corpoFinanceiro");
    corpo.innerHTML = registros.length ? registros.map(r => `
    <tr><td>${escaparHTML(formatarData(r.data))}</td>
    <td><span class="status ${r.tipo === "Receita" ? "status-verde" : "status-amarelo"}">${escaparHTML(r.tipo)}</span></td>
    <td>${escaparHTML(r.categoria)}</td><td>${escaparHTML(r.descricao)}</td><td>${escaparHTML(formatoMoeda(r.centavos))}</td></tr>`).join("") :
        "<tr><td colspan=\"5\" class=\"vazio\">Nenhum lançamento no período.</td></tr>";
}

// Apresenta e salva as unidades, inclusive registros antigos.
const UNIDADES_SUPRIMENTO = {
    un: "Unidade", unidade: "Unidade",
    cx: "Caixa", caixa: "Caixa",
    pct: "Pacote", pacote: "Pacote",
    fr: "Frasco", frasco: "Frasco"
};

function unidadeSuprimento(unidade) {
    return UNIDADES_SUPRIMENTO[String(unidade || "").toLowerCase()] || "";
}

function unidadeSuprimentoExibicao(unidade, quantidade) {
    const nome = unidadeSuprimento(unidade);
    if (!nome) {
        return "unidade não informada";
    }
    const singular = nome.toLowerCase();
    if (Number(quantidade) === 1) {
        return singular;
    }
    return { unidade: "unidades", caixa: "caixas", pacote: "pacotes", frasco: "frascos" }[singular];
}

function iniciarSuprimentos() {
    if (localStorage.getItem(CHAVE_SUPRIMENTOS) === null) {
        salvarLista(CHAVE_SUPRIMENTOS, []);
    } else {
        // Mantém compatibilidade com unidades abreviadas de arquivos anteriores.
        const itens = lerLista(CHAVE_SUPRIMENTOS);
        let houveAlteracao = false;
        itens.forEach(item => {
            const extenso = unidadeSuprimento(item.unidade);
            if (extenso && item.unidade !== extenso) {
                item.unidade = extenso;
                houveAlteracao = true;
            }
        });
        if (houveAlteracao) {
            salvarLista(CHAVE_SUPRIMENTOS, itens);
        }
    }
}

function inteiroNaoNegativo(n) { return Number.isSafeInteger(n) && n >= 0; }
function cadastrarSuprimento(evento) {
    evento?.preventDefault?.();
    const admin = administradorAtivo();
    if (!admin) {
        return false;
    }
    const nome = document.getElementById("supNome")?.value.trim() || "";
    const categoria = document.getElementById("supCategoria")?.value || "";
    const unidade = document.getElementById("supUnidade")?.value || "";
    const quantidade = Number(document.getElementById("supQuantidade")?.value);
    const minimo = Number(document.getElementById("supMinimo")?.value);
    iniciarSuprimentos();
    const itens = lerLista(CHAVE_SUPRIMENTOS);
    if (!nome || nome.length > 80 || !["Materiais", "Medicamentos", "Higiene", "Equipamentos"].includes(categoria) ||
        !["Unidade", "Caixa", "Pacote", "Frasco"].includes(unidade) || !inteiroNaoNegativo(quantidade) ||
        !inteiroNaoNegativo(minimo) || itens.some(i => i.nome.toLowerCase() === nome.toLowerCase())) {
        atualizarTexto("resultadoSuprimento", "Confira os dados: nome único, quantidades inteiras e não negativas.");
        return false;
    }
    itens.push({ id: gerarId(), nome, categoria, unidade, quantidade, minimo });
    salvarLista(CHAVE_SUPRIMENTOS, itens);
    registrarAuditoria("Cadastrou suprimento no estoque.", admin);
    document.getElementById("formSuprimento")?.reset?.();
    atualizarTexto("resultadoSuprimento", "Suprimento cadastrado.");
    carregarSuprimentos();
    return true;
}

function movimentarSuprimento(evento) {
    evento?.preventDefault?.();
    const admin = administradorAtivo();
    if (!admin) {
        return false;
    }
    const id = Number(document.getElementById("movItem")?.value);
    const tipo = document.getElementById("movTipo")?.value;
    const quantidade = Number(document.getElementById("movQuantidade")?.value);
    const itens = lerLista(CHAVE_SUPRIMENTOS);
    const item = itens.find(i => i.id === id);
    if (!item || !["Entrada", "Saída"].includes(tipo) || !inteiroNaoNegativo(quantidade) || quantidade === 0 ||
        (tipo === "Saída" && item.quantidade < quantidade) ||
        (tipo === "Entrada" && !Number.isSafeInteger(item.quantidade + quantidade))) {
        atualizarTexto("resultadoSuprimento", "Movimentação inválida ou quantidade superior ao estoque.");
        return false;
    }
    item.quantidade += (tipo === "Entrada" ? quantidade : -quantidade);
    salvarLista(CHAVE_SUPRIMENTOS, itens);
    registrarAuditoria("Registrou " + tipo.toLowerCase() + " no estoque do item #" + id + ".", admin);
    const campo = document.getElementById("movQuantidade");
    if (campo) {
        campo.value = "";
    }
    atualizarTexto("resultadoSuprimento", "Movimentação registrada.");
    carregarSuprimentos();
    return true;
}

function carregarSuprimentos() {
    const corpo = document.getElementById("corpoSuprimentos");
    if (!corpo || !administradorAtivo()) {
        return;
    }
    iniciarSuprimentos();
    const itens = lerLista(CHAVE_SUPRIMENTOS);
    const busca = (document.getElementById("supBusca")?.value || "").toLowerCase();
    const filtrados = itens.filter(i => (i.nome + " " + i.categoria).toLowerCase().includes(busca));
    atualizarTexto("totalItensEstoque", itens.length);
    atualizarTexto("totalBaixoEstoque", itens.filter(i => i.quantidade <= i.minimo).length);
    atualizarTexto("totalUnidadesEstoque", itens.reduce((n, i) => n + Number(i.quantidade || 0), 0));
    corpo.innerHTML = filtrados.length ? filtrados.map(i => `
    <tr><td>${escaparHTML(i.nome)}</td><td>${escaparHTML(i.categoria)}</td>
    <td>${Number(i.quantidade)} ${escaparHTML(unidadeSuprimentoExibicao(i.unidade, i.quantidade))}</td><td>${Number(i.minimo)} ${escaparHTML(unidadeSuprimentoExibicao(i.unidade, i.minimo))}</td>
    <td><span class="status ${i.quantidade <= i.minimo ? "status-amarelo" : "status-verde"}">${i.quantidade <= i.minimo ? "Baixo" : "Regular"}</span></td></tr>`).join("") :
        "<tr><td colspan=\"5\" class=\"vazio\">Nenhum suprimento encontrado.</td></tr>";
    const campo = document.getElementById("movItem");
    if (campo) {
        const anterior = campo.value;
        campo.innerHTML = itens.map(i => `<option value="${Number(i.id)}">${escaparHTML(i.nome)}</option>`).join("");
        if (itens.some(i => String(i.id) === anterior)) {
            campo.value = anterior;
        }
    }
}

function carregarInternacoes() {
    if (!document.getElementById("corpoInternacoes") || !administradorAtivo()) {
        return;
    }
    const leitos = lerLista(CHAVE_LEITOS);
    const usuarios = lerLista(CHAVE_USUARIOS);
    const internacoes = lerLista(CHAVE_INTERNACOES);
    atualizarTexto("leitosDisponiveis", leitos.filter(l => l.status === "Disponível").length);
    atualizarTexto("leitosOcupados", leitos.filter(l => l.status === "Ocupado").length);
    atualizarTexto("taxaOcupacao", leitos.length ? Math.round(leitos.filter(l => l.status === "Ocupado").length / leitos.length * 100) + "%" : "0%");
    const p = document.getElementById("internarPaciente");
    const l = document.getElementById("internarLeito");
    if (p) {
        const selected = p.value;
        p.innerHTML = "<option value=\"\">Selecione o paciente</option>" + usuarios.filter(u => u.tipo === "Paciente" && u.status === "Ativo" && !internacoes.some(i => i.pacienteId === u.id && i.status === "Ativa"))
            .map(u => `<option value="${Number(u.id)}">${escaparHTML(u.nome)}</option>`).join("");
        if ([...p.options].some(o => o.value === selected)) {
            p.value = selected;
        }
    }
    if (l) {
        const selected = l.value;
        l.innerHTML = "<option value=\"\">Selecione o leito</option>" + leitos.filter(u => u.status === "Disponível")
            .map(u => `<option value="${Number(u.id)}">Leito ${Number(u.id)} - ${escaparHTML(u.ala)}</option>`).join("");
        if ([...l.options].some(o => o.value === selected)) {
            l.value = selected;
        }
    }
    const tbody = document.getElementById("corpoInternacoes");
    tbody.innerHTML = internacoes.length ? internacoes.map(i => {
        const paciente = usuarios.find(u => u.id === i.pacienteId);
        const acao = i.status === "Ativa" ? `<button type="button" class="botao botao-branco botao-pequeno" onclick="darAltaInternacao(${Number(i.id)})">Registrar alta</button>` : "-";
        return `<tr><td>${escaparHTML(paciente?.nome || "Paciente removido")}</td><td>${Number(i.leitoId)}</td>
      <td>${escaparHTML(new Date(i.entrada).toLocaleString("pt-BR"))}</td><td>${i.saida ? escaparHTML(new Date(i.saida).toLocaleString("pt-BR")) : "-"}</td>
      <td><span class="status ${i.status === "Ativa" ? "status-amarelo" : "status-verde"}">${escaparHTML(i.status)}</span></td><td>${acao}</td></tr>`;
    }).join("") : "<tr><td colspan=\"6\" class=\"vazio\">Nenhuma internação registrada.</td></tr>";
}

function registrarInternacao(evento) {
    evento?.preventDefault?.();
    const admin = administradorAtivo();
    if (!admin) {
        return false;
    }
    const pacienteId = Number(document.getElementById("internarPaciente")?.value);
    const leitoId = Number(document.getElementById("internarLeito")?.value);
    const paciente = lerLista(CHAVE_USUARIOS).find(u => u.id === pacienteId && u.tipo === "Paciente" && u.status === "Ativo");
    const leitos = lerLista(CHAVE_LEITOS);
    const leito = leitos.find(l => l.id === leitoId);
    const internacoes = lerLista(CHAVE_INTERNACOES);
    if (!paciente || !leito || leito.status !== "Disponível" || internacoes.some(i => i.status === "Ativa" && (i.leitoId === leitoId || i.pacienteId === pacienteId))) {
        atualizarTexto("resultadoInternacao", "Selecione um paciente ativo e um leito disponível.");
        return false;
    }
    leito.status = "Ocupado";
    internacoes.unshift({ id: gerarId(), pacienteId, leitoId, entrada: new Date().toISOString(), saida: null, status: "Ativa" });
    salvarLista(CHAVE_LEITOS, leitos);
    salvarLista(CHAVE_INTERNACOES, internacoes);
    registrarAuditoria("Registrou internação no leito " + leitoId + ".", admin);
    atualizarTexto("resultadoInternacao", "Internação registrada.");
    carregarLeitosAdmin();
    carregarInternacoes();
    return true;
}

function darAltaInternacao(id) {
    const admin = administradorAtivo();
    if (!admin) {
        return false;
    }
    const internacoes = lerLista(CHAVE_INTERNACOES);
    const internacao = internacoes.find(i => i.id === Number(id) && i.status === "Ativa");
    if (!internacao) {
        return false;
    }
    const leitos = lerLista(CHAVE_LEITOS);
    const leito = leitos.find(l => l.id === internacao.leitoId);
    if (!leito || leito.status !== "Ocupado") {
        return false;
    }
    internacao.status = "Alta";
    internacao.saida = new Date().toISOString();
    leito.status = "Limpeza";
    salvarLista(CHAVE_INTERNACOES, internacoes);
    salvarLista(CHAVE_LEITOS, leitos);
    registrarAuditoria("Registrou alta do leito " + internacao.leitoId + ".", admin);
    atualizarTexto("resultadoInternacao", "Alta registrada. Leito encaminhado para limpeza.");
    carregarLeitosAdmin();
    carregarInternacoes();
    return true;
}

function carregarResumoRelatorioFinanceiro() {
    if (!document.getElementById("relFinanceiroSaldo") || !administradorAtivo()) {
        return;
    }
    iniciarFinanceiro();
    const dados = lerLista(CHAVE_FINANCEIRO);
    const receitas = dados.filter(x => x.tipo === "Receita").reduce((s, x) => s + x.centavos, 0);
    const despesas = dados.filter(x => x.tipo === "Despesa").reduce((s, x) => s + x.centavos, 0);
    atualizarTexto("relFinanceiroReceitas", formatoMoeda(receitas));
    atualizarTexto("relFinanceiroDespesas", formatoMoeda(despesas));
    atualizarTexto("relFinanceiroSaldo", formatoMoeda(receitas - despesas));
}

document.addEventListener("DOMContentLoaded", function () {
    if (!administradorAtivo()) {
        return;
    }
    if (document.getElementById("finData")) {
        const data = document.getElementById("finData");
        if (!data.value) {
            data.value = dataFinanceiroExemplo(0);
        }
        atualizarCategoriasFinanceiro();
        carregarFinanceiro();
    }
    carregarSuprimentos();
    carregarInternacoes();
    carregarResumoRelatorioFinanceiro();
});

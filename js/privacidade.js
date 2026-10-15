//LGPD: Apenas demonstração.

const CHAVE_SOLICITACOES_LGPD = "sghss_lgpd_solicitacoes_v1";
const CHAVE_PREFERENCIAS_LGPD = "sghss_lgpd_preferencias_v1";
function pacienteAtivoLgpd() {
    const sessao = pegarUsuarioLogado();
    if (!sessao || sessao.tipo !== "Paciente") {
        return null;
    }
    return lerLista(CHAVE_USUARIOS).find(u => u.id === sessao.id && u.tipo === "Paciente" && u.status === "Ativo") || null;
}

function adminAtivoLgpd() {
    const sessao = pegarUsuarioLogado();
    if (!sessao || sessao.tipo !== "Administrador") {
        return null;
    }
    return lerLista(CHAVE_USUARIOS).find(u => u.id === sessao.id && u.tipo === "Administrador" && u.status === "Ativo") || null;
}

function salvarPreferenciasLgpd() {
    const paciente = pacienteAtivoLgpd();
    if (!paciente) {
        return false;
    }
    const campo = document.getElementById("lgpdComunicacoes");
    if (!campo) {
        return false;
    }
    const preferencia = lerLista(CHAVE_PREFERENCIAS_LGPD).filter(p => p.pacienteId !== paciente.id);
    preferencia.push({ pacienteId: paciente.id, comunicacoes: !!campo.checked, alteradaEm: new Date().toISOString() });
    salvarLista(CHAVE_PREFERENCIAS_LGPD, preferencia);
    registrarAuditoria("Atualizou preferências de comunicações opcionais.", paciente);
    const status = document.getElementById("statusPreferenciaLgpd");
    if (status) {
        status.textContent = "Preferência salva.";
    }
    return true;
}

function solicitarDireitoLgpd(evento) {
    evento?.preventDefault?.();
    const paciente = pacienteAtivoLgpd();
    if (!paciente) {
        return false;
    }
    const tipo = document.getElementById("tipoDireitoLgpd")?.value;
    const detalhe = (document.getElementById("detalheDireitoLgpd")?.value || "").trim();
    const tipos = ["Acesso aos dados", "Correção de dados", "Exclusão de dados", "Revogação de consentimento"];
    const status = document.getElementById("statusSolicitacaoLgpd");
    if (!tipos.includes(tipo) || detalhe.length > 500) {
        if (status) {
            status.textContent = "Solicitação inválida.";
        }
        return false;
    }
    const pedidos = lerLista(CHAVE_SOLICITACOES_LGPD);
    if (pedidos.some(p => p.pacienteId === paciente.id && p.tipo === tipo && p.status === "Em análise")) {
        if (status) {
            status.textContent = "Já existe uma solicitação deste tipo em análise.";
        }
        return false;
    }
    pedidos.unshift({ id: gerarId(), pacienteId: paciente.id, tipo, detalhe, data: new Date().toISOString(), status: "Em análise", resposta: "", respondidaEm: null });
    salvarLista(CHAVE_SOLICITACOES_LGPD, pedidos);
    registrarAuditoria("Abriu solicitação de privacidade: " + tipo + ".", paciente);
    document.getElementById("formSolicitacaoLgpd")?.reset?.();
    if (status) {
        status.textContent = "Solicitação enviada.";
    }
    carregarPrivacidadePaciente();
    return true;
}

function carregarPrivacidadePaciente() {
    const corpo = document.getElementById("corpoMinhasSolicitacoesLgpd");
    if (!corpo) {
        return;
    }
    const paciente = pacienteAtivoLgpd();
    if (!paciente) {
        return;
    }
    const dados = lerLista(CHAVE_PREFERENCIAS_LGPD).find(i => i.pacienteId === paciente.id);
    const campo = document.getElementById("lgpdComunicacoes");
    if (campo) {
        campo.checked = !!dados?.comunicacoes;
    }
    const pedidos = lerLista(CHAVE_SOLICITACOES_LGPD).filter(p => p.pacienteId === paciente.id);
    corpo.innerHTML = pedidos.length ? pedidos.map(p => `<tr><td>${escaparHTML(new Date(p.data).toLocaleDateString("pt-BR"))}</td>
    <td>${escaparHTML(p.tipo)}</td><td><span class="status ${p.status === "Respondida" ? "status-verde" : "status-amarelo"}">${escaparHTML(p.status)}</span></td>
    <td>${escaparHTML(p.resposta || "-")}</td></tr>`).join("") :
        "<tr><td colspan=\"4\" class=\"vazio\">Nenhuma solicitação registrada.</td></tr>";
}

function carregarPrivacidadeAdmin() {
    const corpo = document.getElementById("corpoSolicitacoesLgpd");
    if (!corpo || !adminAtivoLgpd()) {
        return;
    }
    const pedidos = lerLista(CHAVE_SOLICITACOES_LGPD);
    const usuarios = lerLista(CHAVE_USUARIOS);
    const update = (id, t) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = String(t);
        }
    };
    update("totalLgpd", pedidos.length);
    update("pendentesLgpd", pedidos.filter(p => p.status === "Em análise").length);
    update("respondidasLgpd", pedidos.filter(p => p.status === "Respondida").length);
    corpo.innerHTML = pedidos.length ? pedidos.map(p => {
        const usuario = usuarios.find(u => u.id === p.pacienteId);
        const acao = p.status === "Em análise" ? `<label class="sr-only" for="resposta-lgpd-${Number(p.id)}">Resposta para ${escaparHTML(p.tipo)}</label><textarea id="resposta-lgpd-${Number(p.id)}" class="campo campo-resposta" maxlength="500" placeholder="Resposta ao titular"></textarea><button type="button" class="botao botao-azul botao-pequeno" onclick="responderSolicitacaoLgpd(${Number(p.id)})">Registrar resposta</button>` : escaparHTML(p.resposta || "-");
        return `<tr><td>${escaparHTML(new Date(p.data).toLocaleDateString("pt-BR"))}</td>
     <td>${escaparHTML(usuario?.nome || "Conta excluída")}</td><td>${escaparHTML(p.tipo)}</td>
     <td><span class="status ${p.status === "Respondida" ? "status-verde" : "status-amarelo"}">${escaparHTML(p.status)}</span></td><td>${acao}</td></tr>`;
    }).join("") : "<tr><td colspan=\"5\" class=\"vazio\">Nenhuma solicitação recebida.</td></tr>";
}

function responderSolicitacaoLgpd(id) {
    const admin = adminAtivoLgpd();
    if (!admin) {
        return false;
    }
    const pedidos = lerLista(CHAVE_SOLICITACOES_LGPD);
    const pedido = pedidos.find(p => p.id === Number(id) && p.status === "Em análise");
    const texto = document.getElementById("resposta-lgpd-" + Number(id))?.value.trim() || "";
    if (!pedido || texto.length < 5 || texto.length > 500) {
        alert("Informe uma resposta com pelo menos 5 caracteres.");
        return false;
    }
    pedido.resposta = texto;
    pedido.status = "Respondida";
    pedido.respondidaEm = new Date().toISOString();
    salvarLista(CHAVE_SOLICITACOES_LGPD, pedidos);
    registrarAuditoria("Registrou resposta à solicitação LGPD #" + Number(id) + ".", admin);
    carregarPrivacidadeAdmin();
    return true;
}

document.addEventListener("DOMContentLoaded", () => { carregarPrivacidadePaciente(); carregarPrivacidadeAdmin(); });

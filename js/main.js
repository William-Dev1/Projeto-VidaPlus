// Funções gerais do VidaPlus.

const CHAVE_USUARIOS = "sghss_usuarios_v1";
const CHAVE_CONSULTAS = "sghss_consultas_v1";
const CHAVE_DISPONIBILIDADES = "sghss_disponibilidades_v1";
const CHAVE_RECEITAS = "sghss_receitas_v1";
const CHAVE_PRONTUARIOS = "sghss_prontuarios_v1";
const CHAVE_AUDITORIA = "sghss_auditoria_v2";
const CHAVE_LEITOS = "sghss_leitos_v1";
const CHAVE_LOGADO = "sghss_usuario_logado_v1";
const CHAVE_PACIENTE_SELECIONADO = "sghss_paciente_selecionado_v1";
const CHAVE_TELECONSULTA = "sghss_teleconsulta_atual_v1";

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, function (caractere) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[caractere];
    });
}

function dataHoraFutura(data, horario) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(horario)) {
        return false;
    }
    const instante = new Date(data + "T" + horario + ":00");
    if (Number.isNaN(instante.getTime())) {
        return false;
    }
    // Garante que o navegador não normalize uma data inválida (como 31/02).
    const ano = instante.getFullYear();
    const mes = String(instante.getMonth() + 1).padStart(2, "0");
    const dia = String(instante.getDate()).padStart(2, "0");
    const hora = String(instante.getHours()).padStart(2, "0");
    const minuto = String(instante.getMinutes()).padStart(2, "0");
    return `${ano}-${mes}-${dia}` === data && `${hora}:${minuto}` === horario && instante > new Date();
}

// Horários liberados individualmente por profissional.
function horarioOcupadoProfissional(profissionalId, data, horario) {
    return lerLista(CHAVE_CONSULTAS).some(function (consulta) {
        return consulta.profissionalId === Number(profissionalId) &&
            consulta.data === data && consulta.horario === horario &&
            ["Pendente", "Confirmada"].includes(consulta.status);
    });
}

function disponibilidadesDoProfissional(profissionalId, apenasLivres = false) {
    return lerLista(CHAVE_DISPONIBILIDADES).filter(function (vaga) {
        return vaga.profissionalId === Number(profissionalId) &&
            dataHoraFutura(vaga.data, vaga.horario) &&
            (!apenasLivres || !horarioOcupadoProfissional(profissionalId, vaga.data, vaga.horario));
    }).sort(function (a, b) {
        return (a.data + a.horario).localeCompare(b.data + b.horario);
    });
}

function horarioLiberado(profissionalId, data, horario) {
    return disponibilidadesDoProfissional(profissionalId, true).some(function (vaga) {
        return vaga.data === data && vaga.horario === horario;
    });
}

// Cadastro e perfil do paciente.
function mascararCPF(valor) {
    const digitos = String(valor || "").replace(/\D/g, "").slice(0, 11);
    if (digitos.length <= 3) {
        return digitos;
    }
    if (digitos.length <= 6) {
        return digitos.slice(0, 3) + "." + digitos.slice(3);
    }
    if (digitos.length <= 9) {
        return digitos.slice(0, 3) + "." + digitos.slice(3, 6) + "." + digitos.slice(6);
    }
    return digitos.slice(0, 3) + "." + digitos.slice(3, 6) + "." + digitos.slice(6, 9) + "-" + digitos.slice(9);
}

function formatoCPFValido(valor) {
    return /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(valor || "");
}

function mascararNascimento(valor) {
    const digitos = String(valor || "").replace(/\D/g, "").slice(0, 8);
    return digitos.slice(0, 2) + (digitos.length > 2 ? "/" + digitos.slice(2, 4) : "") +
        (digitos.length > 4 ? "/" + digitos.slice(4) : "");
}

function nascimentoValido(valor) {
    const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor || "");
    if (!partes) {
        return false;
    }
    const dia = Number(partes[1]), mes = Number(partes[2]), ano = Number(partes[3]);
    if (ano < 1900) {
        return false;
    }
    const data = new Date(ano, mes - 1, dia);
    return data.getFullYear() === ano && data.getMonth() === mes - 1 &&
        data.getDate() === dia && data <= new Date();
}

function mascararCelular(valor) {
    const digitos = String(valor || "").replace(/\D/g, "").slice(0, 11);
    if (!digitos) {
        return "";
    }
    if (digitos.length < 3) {
        return "(" + digitos;
    }
    if (digitos.length <= 7) {
        return "(" + digitos.slice(0, 2) + ") " + digitos.slice(2);
    }
    return "(" + digitos.slice(0, 2) + ") " + digitos.slice(2, 7) + "-" + digitos.slice(7);
}

function celularValido(valor) {
    const digitos = String(valor || "").replace(/\D/g, "");
    return /^[1-9]{2}9\d{8}$/.test(digitos);
}

function configurarMascarasPaciente() {
    ["cpf", "cpfCadastro"].forEach(function (id) {
        const campo = document.getElementById(id);
        if (!campo) {
            return;
        }
        campo.value = mascararCPF(campo.value);
        campo.addEventListener("input", function () {
            campo.value = mascararCPF(campo.value);
        });
    });
    ["nascimento", "nascimentoCadastro"].forEach(function (id) {
        const campo = document.getElementById(id);
        if (!campo) {
            return;
        }
        campo.value = mascararNascimento(campo.value);
        campo.addEventListener("input", function () {
            campo.value = mascararNascimento(campo.value);
        });
    });
    ["telefone", "telefoneCadastro"].forEach(function (id) {
        const campo = document.getElementById(id);
        if (!campo) {
            return;
        }
        campo.value = mascararCelular(campo.value);
        campo.addEventListener("input", function () {
            campo.value = mascararCelular(campo.value);
        });
    });
}

function configurarMenuMobile() {
    const menu = document.querySelector(".menu");
    const logo = menu?.querySelector(".menu-logo");
    if (!menu || !logo) {
        return;
    }
    menu.id = "menu-principal";
    menu.setAttribute("aria-label", "Navegação do sistema");
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "alternar-menu";
    botao.textContent = "Menu";
    botao.setAttribute("aria-controls", "menu-principal");
    botao.setAttribute("aria-expanded", "false");
    botao.setAttribute("aria-label", "Abrir menu de navegação");
    logo.appendChild(botao);
    function fecharMenu() {
        menu.classList.remove("menu-aberto");
        botao.setAttribute("aria-expanded", "false");
        botao.setAttribute("aria-label", "Abrir menu de navegação");
    }
    botao.addEventListener("click", function () {
        const aberto = menu.classList.toggle("menu-aberto");
        botao.setAttribute("aria-expanded", String(aberto));
        botao.setAttribute("aria-label", aberto ? "Fechar menu de navegação" : "Abrir menu de navegação");
    });
    document.addEventListener("keydown", function (evento) {
        if (evento.key === "Escape" && menu.classList.contains("menu-aberto")) {
            fecharMenu();
            botao.focus();
        }
    });
    menu.querySelectorAll("a.ativo").forEach(function (link) {
        link.setAttribute("aria-current", "page");
    });
}

document.addEventListener("DOMContentLoaded", function () {
    inicializarDadosProjeto();
    configurarMenuMobile();
    configurarMascarasPaciente();
});

function lerLista(chave) {
    let dados = localStorage.getItem(chave);
    if (!dados) {
        return [];
    }
    try {
        const resultado = JSON.parse(dados);
        return Array.isArray(resultado) ? resultado : [];
    } catch (erro) {
        return [];
    }
}

function salvarLista(chave, lista) {
    localStorage.setItem(chave, JSON.stringify(lista));
}

function gerarId() {
    return Date.now() + Math.floor(Math.random() * 10000);
}

function mostrarMensagem(texto) {
    alert(texto);
}

function formatarData(data) {
    if (!data) {
        return "-";
    }
    let partes = data.split("-");
    if (partes.length !== 3) {
        return data;
    }
    return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function classeStatus(status) {
    if (status === "Confirmada" || status === "Concluída" || status === "Ativo" || status === "Disponível") {
        return "status-verde";
    }
    if (status === "Pendente" || status === "Limpeza" || status === "Manutenção") {
        return "status-amarelo";
    }
    if (status === "Recusada" || status === "Cancelada" || status === "Inativo" || status === "Ocupado") {
        return "status-vermelho";
    }
    return "status-azul";
}

function registrarAuditoria(acao, usuario) {
    let registros = lerLista(CHAVE_AUDITORIA);
    let nomeUsuario = "Sistema";
    let perfilUsuario = "Sistema";
    if (usuario) {
        nomeUsuario = usuario.nome || "Usuário";
        perfilUsuario = usuario.tipo || "Usuário";
    }
    registros.unshift({
        id: gerarId(),
        dataHora: new Date().toLocaleString("pt-BR"),
        dataISO: new Date().toISOString(),
        usuarioId: usuario?.id ?? null,
        usuario: nomeUsuario,
        perfil: perfilUsuario,
        acao: acao
    });
    salvarLista(CHAVE_AUDITORIA, registros.slice(0, 300));
}

//Apenas o administrador permanece na base inicial.
function inicializarDadosProjeto() {
    if (localStorage.getItem(CHAVE_USUARIOS) === null) {
        salvarLista(CHAVE_USUARIOS, [{
                id: 1,
                nome: "Administrador VidaPlus",
                cpf: "",
                email: "admin@vidaplus.com.br",
                senha: "123456",
                tipo: "Administrador",
                especialidade: "",
                registro: "",
                status: "Ativo"
            }]);
    }
    [
        CHAVE_CONSULTAS, CHAVE_DISPONIBILIDADES, CHAVE_RECEITAS,
        CHAVE_PRONTUARIOS, CHAVE_AUDITORIA,
        "sghss_financeiro_v1",
        "sghss_suprimentos_v1",
        "sghss_internacoes_v1",
        "sghss_lgpd_solicitacoes_v1",
        "sghss_lgpd_preferencias_v1"
    ].forEach(function (chave) {
        if (localStorage.getItem(chave) === null) {
            salvarLista(chave, []);
        }
    });
    // A infraestrutura de 8 leitos existe.
    if (localStorage.getItem(CHAVE_LEITOS) === null) {
        salvarLista(CHAVE_LEITOS, [
            { id: 101, ala: "Ala A", status: "Disponível" },
            { id: 102, ala: "Ala A", status: "Disponível" },
            { id: 103, ala: "Ala A", status: "Disponível" },
            { id: 104, ala: "Ala A", status: "Disponível" },
            { id: 105, ala: "Ala B", status: "Disponível" },
            { id: 106, ala: "Ala B", status: "Disponível" },
            { id: 107, ala: "Ala B", status: "Disponível" },
            { id: 108, ala: "Ala B", status: "Disponível" }
        ]);
    }
}

// Funções do administrador.

document.addEventListener("DOMContentLoaded", function () {
    carregarDashboardAdmin();
    carregarUsuariosAdmin();
    carregarRelatoriosAdmin();
    carregarAuditoriaAdmin();
    carregarLeitosAdmin();
});

function usuarioAdmin() {
    let usuario = pegarUsuarioLogado();
    if (!usuario || usuario.tipo !== "Administrador") {
        return null;
    }
    // Confere se o cadastro continua ativo.
    return lerLista(CHAVE_USUARIOS).find(u => u.id === usuario.id && u.tipo === "Administrador" && u.status === "Ativo") || null;
}

function carregarDashboardAdmin() {
    let usuarios = lerLista(CHAVE_USUARIOS);
    let consultas = lerLista(CHAVE_CONSULTAS);
    let pacientes = usuarios.filter(function (item) {
        return item.tipo === "Paciente" && item.status === "Ativo";
    }).length;
    let profissionais = usuarios.filter(function (item) {
        return item.tipo === "Profissional" && item.status === "Ativo";
    }).length;
    let pendentes = consultas.filter(function (item) {
        return item.status === "Pendente";
    }).length;
    let confirmadas = consultas.filter(function (item) {
        return item.status === "Confirmada";
    }).length;
    let el1 = document.getElementById("totalPacientes");
    let el2 = document.getElementById("totalProfissionais");
    let el3 = document.getElementById("totalPendentesAdmin");
    let el4 = document.getElementById("totalConfirmadasAdmin");
    if (el1) {
        el1.textContent = pacientes;
    }
    if (el2) {
        el2.textContent = profissionais;
    }
    if (el3) {
        el3.textContent = pendentes;
    }
    if (el4) {
        el4.textContent = confirmadas;
    }
}

function carregarUsuariosAdmin() {
    let corpo = document.getElementById("corpoCadastros");
    if (!corpo) {
        return;
    }
    let usuarios = lerLista(CHAVE_USUARIOS);
    corpo.innerHTML = "";
    usuarios.forEach(function (usuario) {
        let detalhe = usuario.tipo === "Profissional"
            ? (usuario.especialidade + " • " + usuario.registro)
            : "-";
        let acoes = "";
        if (usuario.email === "admin@vidaplus.com.br") {
            acoes = "<span class=\"status status-azul\">Administrador principal</span>";
        } else {
            acoes = `
        <button class="botao botao-branco botao-pequeno" onclick="alterarStatusUsuario(${Number(usuario.id)})">
          ${usuario.status === "Ativo" ? "Desativar" : "Ativar"}
        </button>
        <button class="botao botao-vermelho botao-pequeno" onclick="excluirUsuario(${Number(usuario.id)})">
          Excluir
        </button>
      `;
        }
        corpo.innerHTML += `
      <tr>
        <td>${escaparHTML(usuario.nome)}</td>
        <td>${escaparHTML(usuario.email)}</td>
        <td>${escaparHTML(usuario.tipo)}</td>
        <td>${escaparHTML(detalhe)}</td>
        <td><span class="status ${classeStatus(usuario.status)}">${escaparHTML(usuario.status)}</span></td>
        <td><div class="acoes" style="margin-top:0">${acoes}</div></td>
      </tr>
    `;
    });
}

function alterarStatusUsuario(id) {
    let admin = usuarioAdmin();
    if (!admin) {
        return;
    }
    let usuarios = lerLista(CHAVE_USUARIOS);
    let usuario = usuarios.find(function (item) {
        return item.id === id;
    });
    if (!usuario || usuario.email === "admin@vidaplus.com.br") {
        return;
    }
    usuario.status = usuario.status === "Ativo" ? "Inativo" : "Ativo";
    salvarLista(CHAVE_USUARIOS, usuarios);
    registrarAuditoria((usuario.status === "Ativo" ? "Ativou" : "Desativou") + " a conta de " + usuario.nome + ".", admin);
    carregarUsuariosAdmin();
    carregarDashboardAdmin();
}

function excluirUsuario(id) {
    let admin = usuarioAdmin();
    if (!admin) {
        return;
    }
    let usuarios = lerLista(CHAVE_USUARIOS);
    let usuario = usuarios.find(function (item) {
        return item.id === id;
    });
    if (!usuario || usuario.email === "admin@vidaplus.com.br") {
        alert("O administrador principal não pode ser excluído.");
        return;
    }
    if (usuario.tipo === "Paciente" && lerLista("sghss_internacoes_v1").some(i => i.pacienteId === id && i.status === "Ativa")) {
        alert("Registre a alta do paciente antes de excluir a conta.");
        return;
    }
    if (!confirm("Deseja excluir definitivamente a conta de " + usuario.nome + "?")) {
        return;
    }
    usuarios = usuarios.filter(function (item) {
        return item.id !== id;
    });
    salvarLista(CHAVE_USUARIOS, usuarios);
    let consultas = lerLista(CHAVE_CONSULTAS);
    if (usuario.tipo === "Profissional") {
        salvarLista(CHAVE_DISPONIBILIDADES, lerLista(CHAVE_DISPONIBILIDADES).filter(function (vaga) {
            return vaga.profissionalId !== usuario.id;
        }));
        consultas.forEach(function (consulta) {
            if (consulta.profissionalId === usuario.id &&
                ["Pendente", "Confirmada"].includes(consulta.status)) {
                consulta.status = "Cancelada";
                consulta.motivoRecusa = "Profissional removido do sistema pelo administrador.";
            }
        });
    }
    if (usuario.tipo === "Paciente") {
        consultas = consultas.filter(function (consulta) {
            return consulta.pacienteId !== usuario.id;
        });
        let receitas = lerLista(CHAVE_RECEITAS).filter(function (receita) {
            return receita.pacienteId !== usuario.id;
        });
        let prontuarios = lerLista(CHAVE_PRONTUARIOS).filter(function (registro) {
            return registro.pacienteId !== usuario.id;
        });
        salvarLista(CHAVE_RECEITAS, receitas);
        salvarLista(CHAVE_PRONTUARIOS, prontuarios);
        localStorage.removeItem("sghss_perfil_paciente_" + usuario.id);
        salvarLista("sghss_lgpd_preferencias_v1", lerLista("sghss_lgpd_preferencias_v1").filter(p => p.pacienteId !== usuario.id));
        // Registros administrativos de antigas internações são anonimizados.
        const historicoInternacoes = lerLista("sghss_internacoes_v1");
        historicoInternacoes.forEach(i => {
            if (i.pacienteId === usuario.id) {
                i.pacienteId = null;
            }
        });
        salvarLista("sghss_internacoes_v1", historicoInternacoes);
        salvarLista("sghss_lgpd_solicitacoes_v1", lerLista("sghss_lgpd_solicitacoes_v1").filter(p => p.pacienteId !== usuario.id));
    }
    salvarLista(CHAVE_CONSULTAS, consultas);
    registrarAuditoria("Excluiu a conta de " + usuario.nome + " (" + usuario.tipo + ").", admin);
    carregarUsuariosAdmin();
    carregarDashboardAdmin();
    alert("Conta excluída.");
}

function buscarUsuario() {
    let campo = document.getElementById("buscaUsuario");
    let linhas = document.querySelectorAll("#tabelaUsuarios tbody tr");
    if (!campo) {
        return;
    }
    let termo = campo.value.toLowerCase();
    linhas.forEach(function (linha) {
        linha.style.display = linha.textContent.toLowerCase().includes(termo) ? "" : "none";
    });
}

function carregarRelatoriosAdmin() {
    let consultas = lerLista(CHAVE_CONSULTAS);
    let totais = {
        Pendente: 0,
        Confirmada: 0,
        Recusada: 0,
        Cancelada: 0,
        Concluída: 0
    };
    consultas.forEach(function (consulta) {
        if (totais[consulta.status] !== undefined) {
            totais[consulta.status]++;
        }
    });
    let ids = {
        relPendentes: totais.Pendente,
        relConfirmadas: totais.Confirmada,
        relRecusadas: totais.Recusada,
        relCanceladas: totais.Cancelada,
        relConcluidas: totais.Concluída
    };
    Object.keys(ids).forEach(function (id) {
        let elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = ids[id];
        }
    });
}

function carregarAuditoriaAdmin() {
    let corpo = document.getElementById("corpoAuditoria");
    if (!corpo) {
        return;
    }
    let registros = lerLista(CHAVE_AUDITORIA);
    corpo.innerHTML = "";
    if (registros.length === 0) {
        corpo.innerHTML = "<tr><td colspan=\"4\" class=\"vazio\">Nenhum registro de auditoria.</td></tr>";
        return;
    }
    registros.forEach(function (registro) {
        corpo.innerHTML += `
      <tr>
        <td>${escaparHTML(registro.dataHora)}</td>
        <td>${escaparHTML(registro.usuario)}</td>
        <td>${escaparHTML(registro.perfil)}</td>
        <td>${escaparHTML(registro.acao)}</td>
      </tr>
    `;
    });
}

function filtrarAuditoria() {
    let campo = document.getElementById("buscaAuditoria");
    let linhas = document.querySelectorAll("#tabelaAuditoria tbody tr");
    if (!campo) {
        return;
    }
    let termo = campo.value.toLowerCase();
    linhas.forEach(function (linha) {
        linha.style.display = linha.textContent.toLowerCase().includes(termo) ? "" : "none";
    });
}

function carregarLeitosAdmin() {
    let container = document.getElementById("listaLeitos");
    if (!container) {
        return;
    }
    let leitos = lerLista(CHAVE_LEITOS);
    container.innerHTML = "";
    leitos.forEach(function (leito) {
        container.innerHTML += `
      <div class="card">
        <h3>Leito ${Number(leito.id)}</h3>
        <p>${escaparHTML(leito.ala)}</p>
        <span class="status ${classeStatus(leito.status)}">${escaparHTML(leito.status)}</span>

        <div class="grupo" style="margin-top:16px">
          <label for="status-leito-${Number(leito.id)}">Alterar status</label>
          <select id="status-leito-${Number(leito.id)}" class="campo" onchange="alterarStatusLeito(${Number(leito.id)}, this.value)">
            <option value="">Selecione</option>
            <option value="Disponível">Disponível</option>
            <option value="Ocupado">Ocupado</option>
            <option value="Limpeza">Limpeza</option>
            <option value="Manutenção">Manutenção</option>
          </select>
        </div>
      </div>
    `;
    });
}

function alterarStatusLeito(id, novoStatus) {
    if (!novoStatus) {
        return;
    }
    const admin = usuarioAdmin();
    if (!admin || !["Disponível", "Ocupado", "Limpeza", "Manutenção"].includes(novoStatus)) {
        return;
    }
    let leitos = lerLista(CHAVE_LEITOS);
    let leito = leitos.find(function (item) {
        return item.id === id;
    });
    if (!leito) {
        return;
    }
    const internacoes = lerLista("sghss_internacoes_v1");
    if (internacoes.some(i => i.leitoId === id && i.status === "Ativa") && novoStatus !== "Ocupado") {
        alert("Registre a alta antes de alterar o status deste leito.");
        carregarLeitosAdmin();
        return;
    }
    if (novoStatus === "Ocupado" && leito.status !== "Ocupado") {
        alert("Para ocupar um leito, use Registrar internação.");
        carregarLeitosAdmin();
        return;
    }
    if (leito.status === novoStatus) {
        return;
    }
    leito.status = novoStatus;
    salvarLista(CHAVE_LEITOS, leitos);
    registrarAuditoria("Alterou o leito " + id + " para " + novoStatus + ".", admin);
    carregarLeitosAdmin();
    if (typeof carregarInternacoes === "function") {
        carregarInternacoes();
    }
}

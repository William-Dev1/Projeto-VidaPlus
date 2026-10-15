// Funções do paciente.

document.addEventListener("DOMContentLoaded", function () {
    carregarDashboardPaciente();
    carregarPerfilPaciente();
    carregarEspecialidades();
    carregarConsultasPaciente();
    carregarHistoricoPaciente();
    carregarReceitasPaciente();
    carregarNotificacoesPaciente();
    carregarTeleconsultasPaciente();
    configurarDataMinima();
});

function usuarioPaciente() {
    let usuario = pegarUsuarioLogado();
    if (!usuario || usuario.tipo !== "Paciente") {
        return null;
    }
    return usuario;
}

function configurarDataMinima() {
    // Datas são preenchidas a partir das vagas publicadas pelo médico.
    const seletor = document.getElementById("profissional");
    if (seletor) {
        seletor.addEventListener("change", carregarDatasDisponiveis);
    }
}

function carregarDatasDisponiveis() {
    const selectData = document.getElementById("data");
    const selectHorario = document.getElementById("horario");
    if (!selectData || !selectHorario) {
        return;
    }
    selectData.innerHTML = "<option value=\"\">Selecione uma data</option>";
    selectHorario.innerHTML = "<option value=\"\">Escolha primeiro uma data</option>";
    const profissionalId = Number(document.getElementById("profissional")?.value);
    const profissional = pegarProfissionaisAtivos().find(function (item) { return item.id === profissionalId; });
    const vagas = profissional ? disponibilidadesDoProfissional(profissionalId, true) : [];
    const dias = [...new Set(vagas.map(function (vaga) { return vaga.data; }))];
    dias.forEach(function (dia) {
        const opcao = document.createElement("option");
        opcao.value = dia;
        opcao.textContent = formatarData(dia);
        selectData.appendChild(opcao);
    });
    selectData.disabled = !dias.length;
    selectHorario.disabled = true;
}

function carregarHorariosDisponiveis() {
    const selectData = document.getElementById("data");
    const selectHorario = document.getElementById("horario");
    if (!selectData || !selectHorario) {
        return;
    }
    const profissionalId = Number(document.getElementById("profissional")?.value);
    const data = selectData.value;
    selectHorario.innerHTML = "<option value=\"\">Selecione um horário</option>";
    const vagas = disponibilidadesDoProfissional(profissionalId, true).filter(function (vaga) { return vaga.data === data; });
    vagas.forEach(function (vaga) {
        const opcao = document.createElement("option");
        opcao.value = vaga.horario;
        opcao.textContent = vaga.horario;
        selectHorario.appendChild(opcao);
    });
    selectHorario.disabled = !vagas.length;
    if (!vagas.length) {
        selectHorario.innerHTML = "<option value=\"\">Nenhum horário livre nesta data</option>";
    }
}

function pegarProfissionaisAtivos() {
    let usuarios = lerLista(CHAVE_USUARIOS);
    return usuarios.filter(function (usuario) {
        return usuario.tipo === "Profissional" &&
            usuario.status === "Ativo" &&
            usuario.especialidade.trim() !== "";
    });
}

function carregarEspecialidades() {
    let selectEspecialidade = document.getElementById("especialidade");
    if (!selectEspecialidade) {
        return;
    }
    let profissionais = pegarProfissionaisAtivos();
    let especialidades = [];
    profissionais.forEach(function (profissional) {
        if (!especialidades.includes(profissional.especialidade)) {
            especialidades.push(profissional.especialidade);
        }
    });
    especialidades.sort();
    selectEspecialidade.innerHTML = "";
    if (especialidades.length === 0) {
        selectEspecialidade.innerHTML = "<option value=\"\">Nenhuma especialidade disponível</option>";
        carregarProfissionaisDaEspecialidade();
        return;
    }
    especialidades.forEach(function (especialidade) {
        let opcao = document.createElement("option");
        opcao.value = especialidade;
        opcao.textContent = especialidade;
        selectEspecialidade.appendChild(opcao);
    });
    carregarProfissionaisDaEspecialidade();
}

function carregarProfissionaisDaEspecialidade() {
    let selectEspecialidade = document.getElementById("especialidade");
    let selectProfissional = document.getElementById("profissional");
    if (!selectEspecialidade || !selectProfissional) {
        return;
    }
    let especialidade = selectEspecialidade.value;
    let profissionais = pegarProfissionaisAtivos().filter(function (profissional) {
        return profissional.especialidade === especialidade;
    });
    selectProfissional.innerHTML = "";
    if (profissionais.length === 0) {
        selectProfissional.innerHTML = "<option value=\"\">Nenhum profissional disponível</option>";
        carregarDatasDisponiveis();
        return;
    }
    profissionais.forEach(function (profissional) {
        let opcao = document.createElement("option");
        opcao.value = profissional.id;
        opcao.textContent = profissional.nome;
        selectProfissional.appendChild(opcao);
    });
    carregarDatasDisponiveis();
}

function agendarConsulta() {
    let paciente = usuarioPaciente();
    if (!paciente) {
        return;
    }
    let especialidade = document.getElementById("especialidade").value;
    let profissionalId = Number(document.getElementById("profissional").value);
    let unidade = document.getElementById("unidade").value;
    let tipo = document.getElementById("tipo").value;
    let data = document.getElementById("data").value;
    let horario = document.getElementById("horario").value;
    let observacoes = document.getElementById("observacoes").value.trim();
    if (!especialidade || !profissionalId || !data || !horario) {
        alert("Preencha a especialidade, profissional, data e horário.");
        return;
    }
    if (!dataHoraFutura(data, horario)) {
        alert("Escolha uma data e um horário futuros e válidos.");
        return;
    }
    let profissionais = pegarProfissionaisAtivos();
    let profissional = profissionais.find(function (item) {
        return item.id === profissionalId && item.especialidade === especialidade;
    });
    if (!profissional) {
        alert("O profissional selecionado não está mais disponível.");
        carregarEspecialidades();
        return;
    }
    // Confere no momento de salvar.
    if (!horarioLiberado(profissionalId, data, horario)) {
        alert("Este horário não está mais disponível. Atualize a agenda e selecione outra vaga.");
        carregarDatasDisponiveis();
        return;
    }
    let consultas = lerLista(CHAVE_CONSULTAS);
    let novaConsulta = {
        id: gerarId(),
        pacienteId: paciente.id,
        pacienteNome: paciente.nome,
        profissionalId: profissional.id,
        profissionalNome: profissional.nome,
        especialidade: especialidade,
        unidade: unidade,
        tipo: tipo,
        data: data,
        horario: horario,
        observacoes: observacoes,
        status: "Pendente",
        motivoRecusa: "",
        criadaEm: new Date().toLocaleString("pt-BR")
    };
    consultas.push(novaConsulta);
    salvarLista(CHAVE_CONSULTAS, consultas);
    registrarAuditoria("Solicitou consulta com " + profissional.nome + " em " + formatarData(data) + " às " + horario + ".", paciente);
    alert("Solicitação enviada ao profissional. A consulta ficará PENDENTE até ele aceitar.");
    window.location.href = "paciente-consultas.html";
}

function consultasDoPaciente() {
    let paciente = usuarioPaciente();
    if (!paciente) {
        return [];
    }
    return lerLista(CHAVE_CONSULTAS).filter(function (consulta) {
        return consulta.pacienteId === paciente.id;
    }).sort(function (a, b) {
        return (a.data + a.horario).localeCompare(b.data + b.horario);
    });
}

function carregarConsultasPaciente() {
    let corpo = document.getElementById("corpoConsultasPaciente");
    if (!corpo) {
        return;
    }
    let consultas = consultasDoPaciente();
    corpo.innerHTML = "";
    if (consultas.length === 0) {
        corpo.innerHTML = "<tr><td colspan=\"8\" class=\"vazio\">Você ainda não possui consultas.</td></tr>";
        return;
    }
    consultas.forEach(function (consulta) {
        let podeCancelar = ["Pendente", "Confirmada"].includes(consulta.status);
        let podeTeleconsulta = consulta.status === "Confirmada" && consulta.tipo === "Teleconsulta";
        let acoes = "";
        if (podeTeleconsulta) {
            acoes += "<button class=\"botao botao-azul botao-pequeno\" onclick=\"abrirTeleconsultaPaciente(" + Number(consulta.id) + ")\">Entrar</button> ";
        }
        if (podeCancelar) {
            acoes += "<button class=\"botao botao-branco botao-pequeno\" onclick=\"cancelarConsultaPaciente(" + Number(consulta.id) + ")\">Cancelar</button>";
        }
        if (acoes === "") {
            acoes = "-";
        }
        let motivo = consulta.motivoRecusa ? "<br><small>Motivo: " + escaparHTML(consulta.motivoRecusa) + "</small>" : "";
        corpo.innerHTML += `
      <tr>
        <td>${escaparHTML(formatarData(consulta.data))}</td>
        <td>${escaparHTML(consulta.horario)}</td>
        <td>${escaparHTML(consulta.profissionalNome)}</td>
        <td>${escaparHTML(consulta.especialidade)}</td>
        <td>${escaparHTML(consulta.tipo)}</td>
        <td>${escaparHTML(consulta.unidade)}</td>
        <td>
          <span class="status ${classeStatus(consulta.status)}">${escaparHTML(consulta.status)}</span>
          ${motivo}
        </td>
        <td>${acoes}</td>
      </tr>
    `;
    });
}

function cancelarConsultaPaciente(id) {
    let paciente = usuarioPaciente();
    let consultas = lerLista(CHAVE_CONSULTAS);
    let consulta = consultas.find(function (item) {
        return item.id === id && item.pacienteId === paciente.id;
    });
    if (!consulta) {
        return;
    }
    if (!["Pendente", "Confirmada"].includes(consulta.status)) {
        alert("Esta consulta não pode mais ser cancelada.");
        return;
    }
    if (!confirm("Deseja realmente cancelar esta consulta?")) {
        return;
    }
    consulta.status = "Cancelada";
    consulta.motivoRecusa = "Cancelada pelo paciente.";
    salvarLista(CHAVE_CONSULTAS, consultas);
    registrarAuditoria("Cancelou uma consulta com " + consulta.profissionalNome + ".", paciente);
    carregarConsultasPaciente();
    carregarDashboardPaciente();
}

function carregarDashboardPaciente() {
    let paciente = usuarioPaciente();
    if (!paciente) {
        return;
    }
    let consultas = consultasDoPaciente();
    let pendentes = consultas.filter(function (item) {
        return item.status === "Pendente";
    }).length;
    let confirmadas = consultas.filter(function (item) {
        return item.status === "Confirmada";
    }).length;
    let elPendentes = document.getElementById("totalPendentesPaciente");
    let elConfirmadas = document.getElementById("totalConfirmadasPaciente");
    let proxima = document.getElementById("proximaConsultaPaciente");
    if (elPendentes) {
        elPendentes.textContent = pendentes;
    }
    if (elConfirmadas) {
        elConfirmadas.textContent = confirmadas;
    }
    if (proxima) {
        let proximas = consultas.filter(function (item) {
            return ["Pendente", "Confirmada"].includes(item.status) &&
                dataHoraFutura(item.data, item.horario);
        });
        if (proximas.length === 0) {
            proxima.innerHTML = "<p>Nenhuma consulta futura.</p>";
        } else {
            let consulta = proximas[0];
            proxima.innerHTML = `
        <strong>${escaparHTML(consulta.especialidade)}</strong>
        <p>${escaparHTML(consulta.profissionalNome)}</p>
        <p>${escaparHTML(formatarData(consulta.data))} às ${escaparHTML(consulta.horario)}</p>
        <span class="status ${classeStatus(consulta.status)}">${escaparHTML(consulta.status)}</span>
      `;
        }
    }
}

function carregarPerfilPaciente() {
    let campoNome = document.getElementById("nome");
    if (!campoNome) {
        return;
    }
    let paciente = usuarioPaciente();
    if (!paciente) {
        return;
    }
    let chave = "sghss_perfil_paciente_" + paciente.id;
    let dadosSalvos = localStorage.getItem(chave);
    let perfil;
    if (dadosSalvos) {
        perfil = JSON.parse(dadosSalvos);
    } else {
        perfil = {
            nome: paciente.nome,
            cpf: paciente.cpf,
            nascimento: paciente.nascimento || "",
            telefone: paciente.telefone || "",
            email: paciente.email,
            convenio: "",
            endereco: ""
        };
    }
    document.getElementById("nome").value = perfil.nome || "";
    document.getElementById("cpf").value = mascararCPF(perfil.cpf || "");
    document.getElementById("nascimento").value = mascararNascimento(perfil.nascimento || "");
    document.getElementById("telefone").value = mascararCelular(perfil.telefone || "");
    document.getElementById("emailPaciente").value = perfil.email || "";
    document.getElementById("convenio").value = perfil.convenio || "";
    document.getElementById("endereco").value = perfil.endereco || "";
}

function salvarPerfilPaciente() {
    let paciente = usuarioPaciente();
    if (!paciente) {
        return;
    }
    let perfil = {
        nome: document.getElementById("nome").value.trim(),
        cpf: mascararCPF(document.getElementById("cpf").value.trim()),
        nascimento: mascararNascimento(document.getElementById("nascimento").value.trim()),
        telefone: mascararCelular(document.getElementById("telefone").value.trim()),
        email: document.getElementById("emailPaciente").value.trim().toLowerCase(),
        convenio: document.getElementById("convenio").value.trim(),
        endereco: document.getElementById("endereco").value.trim()
    };
    if (!perfil.nome || !perfil.email) {
        alert("Nome e e-mail são obrigatórios.");
        return;
    }
    if (perfil.cpf && !formatoCPFValido(perfil.cpf)) {
        alert("Informe os 11 dígitos do CPF no formato 000.000.000-00.");
        document.getElementById("cpf").focus();
        return;
    }
    if (perfil.nascimento && !nascimentoValido(perfil.nascimento)) {
        alert("Informe uma data de nascimento válida no formato DD/MM/AAAA.");
        document.getElementById("nascimento").focus();
        return;
    }
    if (perfil.telefone && !celularValido(perfil.telefone)) {
        alert("Informe um celular com DDD e 9 dígitos: (47) 99999-9999.");
        document.getElementById("telefone").focus();
        return;
    }
    let usuarios = lerLista(CHAVE_USUARIOS);
    let outroComEmail = usuarios.some(function (usuario) {
        return usuario.email === perfil.email && usuario.id !== paciente.id;
    });
    if (outroComEmail) {
        alert("Já existe outro usuário com este e-mail.");
        return;
    }
    let indice = usuarios.findIndex(function (usuario) {
        return usuario.id === paciente.id;
    });
    if (indice !== -1) {
        usuarios[indice].nome = perfil.nome;
        usuarios[indice].cpf = perfil.cpf;
        usuarios[indice].email = perfil.email;
        usuarios[indice].nascimento = perfil.nascimento;
        usuarios[indice].telefone = perfil.telefone;
        salvarLista(CHAVE_USUARIOS, usuarios);
        localStorage.setItem(CHAVE_LOGADO, JSON.stringify(usuarios[indice]));
    }
    localStorage.setItem("sghss_perfil_paciente_" + paciente.id, JSON.stringify(perfil));
    let consultas = lerLista(CHAVE_CONSULTAS);
    consultas.forEach(function (consulta) {
        if (consulta.pacienteId === paciente.id) {
            consulta.pacienteNome = perfil.nome;
        }
    });
    salvarLista(CHAVE_CONSULTAS, consultas);
    registrarAuditoria("Atualizou os dados do próprio perfil.", pegarUsuarioLogado());
    alert("Perfil atualizado com sucesso.");
    mostrarNomeUsuarioLogado();
}

function carregarHistoricoPaciente() {
    let corpo = document.getElementById("corpoHistoricoPaciente");
    if (!corpo) {
        return;
    }
    let paciente = usuarioPaciente();
    let consultas = consultasDoPaciente();
    let receitas = lerLista(CHAVE_RECEITAS).filter(function (receita) {
        return receita.pacienteId === paciente.id;
    });
    let registros = [];
    consultas.forEach(function (consulta) {
        registros.push({
            data: consulta.data,
            tipo: "Consulta",
            descricao: consulta.especialidade + " com " + consulta.profissionalNome,
            status: consulta.status
        });
    });
    receitas.forEach(function (receita) {
        registros.push({
            data: receita.dataISO,
            tipo: "Receita",
            descricao: receita.medicamento + " • " + receita.profissionalNome,
            status: "Emitida"
        });
    });
    registros.sort(function (a, b) {
        return b.data.localeCompare(a.data);
    });
    corpo.innerHTML = "";
    if (registros.length === 0) {
        corpo.innerHTML = "<tr><td colspan=\"4\" class=\"vazio\">Nenhum registro encontrado.</td></tr>";
        return;
    }
    registros.forEach(function (registro) {
        corpo.innerHTML += `
      <tr>
        <td>${escaparHTML(formatarData(registro.data))}</td>
        <td>${escaparHTML(registro.tipo)}</td>
        <td>${escaparHTML(registro.descricao)}</td>
        <td><span class="status ${classeStatus(registro.status)}">${escaparHTML(registro.status)}</span></td>
      </tr>
    `;
    });
}

function carregarNotificacoesPaciente() {
    let lista = document.getElementById("listaNotificacoesPaciente");
    if (!lista) {
        return;
    }
    let consultas = consultasDoPaciente().slice().reverse();
    lista.innerHTML = "";
    if (consultas.length === 0) {
        lista.innerHTML = "<div class=\"card\"><p>Nenhuma notificação no momento.</p></div>";
        return;
    }
    consultas.forEach(function (consulta) {
        let titulo = "Solicitação de consulta";
        if (consulta.status === "Confirmada") {
            titulo = "Consulta confirmada";
        }
        if (consulta.status === "Recusada") {
            titulo = "Consulta recusada";
        }
        if (consulta.status === "Cancelada") {
            titulo = "Consulta cancelada";
        }
        lista.innerHTML += `
      <div class="card">
        <h3>${escaparHTML(titulo)}</h3>
        <p>${escaparHTML(consulta.especialidade)} com ${escaparHTML(consulta.profissionalNome)} em ${escaparHTML(formatarData(consulta.data))} às ${escaparHTML(consulta.horario)}.</p>
        <span class="status ${classeStatus(consulta.status)}">${escaparHTML(consulta.status)}</span>
        ${consulta.motivoRecusa ? "<p><strong>Observação:</strong> " + escaparHTML(consulta.motivoRecusa) + "</p>" : ""}
      </div>
    `;
    });
}

function abrirTeleconsultaPaciente(id) {
    localStorage.setItem(CHAVE_TELECONSULTA, String(id));
    window.location.href = "paciente-teleconsulta.html";
}

function carregarTeleconsultasPaciente() {
    let detalhes = document.getElementById("dadosTeleconsultaPaciente");
    if (!detalhes) {
        return;
    }
    let paciente = usuarioPaciente();
    let consultas = lerLista(CHAVE_CONSULTAS);
    let idAtual = Number(localStorage.getItem(CHAVE_TELECONSULTA));
    let consulta = consultas.find(function (item) {
        return item.id === idAtual &&
            item.pacienteId === paciente.id &&
            item.tipo === "Teleconsulta" &&
            item.status === "Confirmada";
    });
    if (!consulta) {
        consulta = consultas.find(function (item) {
            return item.pacienteId === paciente.id &&
                item.tipo === "Teleconsulta" &&
                item.status === "Confirmada";
        });
    }
    let area = document.getElementById("areaVideoPaciente");
    if (!consulta) {
        detalhes.innerHTML = "<p>Você não possui teleconsulta confirmada.</p>";
        if (area) {
            area.innerHTML = "<div><h2>Teleconsulta indisponível</h2><p>A consulta precisa estar confirmada pelo profissional.</p></div>";
        }
        let controles = document.getElementById("controlesTeleconsultaPaciente");
        if (controles) {
            controles.style.display = "none";
        }
        return;
    }
    localStorage.setItem(CHAVE_TELECONSULTA, String(consulta.id));
    detalhes.innerHTML = `
    <h3>${escaparHTML(consulta.profissionalNome)}</h3>
    <p>${escaparHTML(consulta.especialidade)}</p>
    <p>${escaparHTML(formatarData(consulta.data))} às ${escaparHTML(consulta.horario)}</p>
    <span class="status status-verde">Confirmada</span>
  `;
}

function enviarMensagemPaciente() {
    let campo = document.getElementById("mensagemPaciente");
    let chat = document.getElementById("chatPaciente");
    if (!campo || !chat || campo.value.trim() === "") {
        return;
    }
    let mensagem = document.createElement("div");
    mensagem.className = "mensagem-chat";
    mensagem.textContent = "Você: " + campo.value.trim();
    chat.appendChild(mensagem);
    campo.value = "";
}

function encerrarTeleconsultaPaciente() {
    if (confirm("Deseja sair da teleconsulta?")) {
        localStorage.removeItem(CHAVE_TELECONSULTA);
        window.location.href = "paciente-dashboard.html";
    }
}

// Mostra no perfil do paciente todas as receitas digitais emitidas.
function carregarReceitasPaciente() {
    let corpo = document.getElementById("corpoReceitasPaciente");
    if (!corpo) {
        return;
    }
    let paciente = usuarioPaciente();
    if (!paciente) {
        return;
    }
    let receitas = lerLista(CHAVE_RECEITAS).filter(function (receita) {
        return receita.pacienteId === paciente.id;
    });
    receitas.sort(function (a, b) {
        return b.dataISO.localeCompare(a.dataISO);
    });
    corpo.innerHTML = "";
    if (receitas.length === 0) {
        corpo.innerHTML = `
      <tr>
        <td colspan="8" class="vazio">
          Nenhuma receita digital foi emitida para você.
        </td>
      </tr>
    `;
        return;
    }
    receitas.forEach(function (receita) {
        corpo.innerHTML += `
      <tr>
        <td>${escaparHTML(formatarData(receita.dataISO))}</td>
        <td>${escaparHTML(receita.profissionalNome)}</td>
        <td><strong>${escaparHTML(receita.medicamento)}</strong></td>
        <td>${escaparHTML(receita.dosagem || "-")}</td>
        <td>${escaparHTML(receita.frequencia || "-")}</td>
        <td>${escaparHTML(receita.duracao || "-")}</td>
        <td>${escaparHTML(receita.orientacoes || "-")}</td>
        <td>
          <span class="status status-azul">Receita emitida</span>
        </td>
      </tr>
    `;
    });
}

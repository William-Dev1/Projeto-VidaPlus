// Funções do profissional de saúde.

document.addEventListener("DOMContentLoaded", function () {
    carregarDashboardProfissional();
    carregarAgendaProfissional();
    configurarDisponibilidadeProfissional();
    carregarPacientesProfissional();
    carregarProntuarioSelecionado();
    carregarPacienteNaReceita();
    carregarTeleconsultasProfissional();
});

//O profissional publica datas e horários.
function configurarDisponibilidadeProfissional() {
    const dataInicio = document.getElementById("dataDisponibilidade");
    const dataFim = document.getElementById("dataFimDisponibilidade");
    if (!dataInicio || !dataFim) {
        return;
    }
    const hoje = new Date();
    const formatarISO = function (data) {
        return data.getFullYear() + "-" + String(data.getMonth() + 1).padStart(2, "0") + "-" + String(data.getDate()).padStart(2, "0");
    };
    const hojeISO = formatarISO(hoje);
    dataInicio.min = hojeISO;
    dataFim.min = hojeISO;
    if (!dataInicio.value) {
        const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
        dataInicio.value = formatarISO(amanha);
    }
    if (!dataFim.value || dataFim.value < dataInicio.value) {
        dataFim.value = dataInicio.value;
    }
    dataFim.min = dataInicio.value;
    dataInicio.addEventListener("change", function () {
        dataFim.min = dataInicio.value || hojeISO;
        if (dataFim.value && dataFim.value < dataFim.min) {
            dataFim.value = dataFim.min;
        }
    });
    carregarDisponibilidadesProfissional();
}

// Publica os horários de todo o período (incluindo o último dia).
function gerarDatasDoPeriodo(inicioISO, fimISO) {
    function interpretarISO(valor) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(valor || "")) {
            return null;
        }
        const [ano, mes, dia] = valor.split("-").map(Number);
        const data = new Date(ano, mes - 1, dia, 12, 0, 0);
        if (data.getFullYear() !== ano || data.getMonth() + 1 !== mes || data.getDate() !== dia) {
            return null;
        }
        return data;
    }
    const inicio = interpretarISO(inicioISO);
    const fim = interpretarISO(fimISO);
    if (!inicio || !fim || fim < inicio) {
        return null;
    }
    const resultado = [];
    const data = new Date(inicio.getTime());
    for (; data <= fim; data.setDate(data.getDate() + 1)) {
        if (resultado.length >= 180) {
            return null;
        } // Evita publicar milhares de vagas sem querer.
        resultado.push(data.getFullYear() + "-" + String(data.getMonth() + 1).padStart(2, "0") + "-" + String(data.getDate()).padStart(2, "0"));
    }
    return resultado;
}

function publicarDisponibilidade() {
    const profissional = usuarioProfissional();
    if (!profissional) {
        return;
    }
    const dataInicial = document.getElementById("dataDisponibilidade").value;
    const dataFinal = document.getElementById("dataFimDisponibilidade").value;
    const inicio = document.getElementById("inicioDisponibilidade").value;
    const fim = document.getElementById("fimDisponibilidade").value;
    const intervalo = Number(document.getElementById("intervaloDisponibilidade").value);
    const datas = gerarDatasDoPeriodo(dataInicial, dataFinal);
    if (!datas) {
        alert("Informe um período válido: a data final deve ser igual ou posterior à inicial, com no máximo 180 dias.");
        return;
    }
    const horaValida = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if (!horaValida.test(inicio) || !horaValida.test(fim) || ![30, 60].includes(intervalo)) {
        alert("Preencha uma faixa de horários válida e escolha a duração da consulta.");
        return;
    }
    const inicioMinutos = Number(inicio.slice(0, 2)) * 60 + Number(inicio.slice(3));
    const fimMinutos = Number(fim.slice(0, 2)) * 60 + Number(fim.slice(3));
    if (inicioMinutos >= fimMinutos || fimMinutos - inicioMinutos < intervalo) {
        alert("O horário final deve ser maior que o inicial e conter ao menos uma consulta inteira.");
        return;
    }
    // A lista de vagas de cada profissional continua individual e sem duplicações.
    const lista = lerLista(CHAVE_DISPONIBILIDADES);
    const existentes = new Set(lista.filter(function (vaga) {
        return vaga.profissionalId === profissional.id;
    }).map(function (vaga) { return vaga.data + "|" + vaga.horario; }));
    let adicionados = 0;
    const diasPublicados = new Set();
    datas.forEach(function (data) {
        for (let minuto = inicioMinutos; minuto + intervalo <= fimMinutos; minuto += intervalo) {
            const horario = String(Math.floor(minuto / 60)).padStart(2, "0") + ":" + String(minuto % 60).padStart(2, "0");
            const chave = data + "|" + horario;
            if (!dataHoraFutura(data, horario) || existentes.has(chave)) {
                continue;
            }
            lista.push({ id: gerarId(), profissionalId: profissional.id, data: data, horario: horario });
            existentes.add(chave);
            adicionados++;
            diasPublicados.add(data);
        }
    });
    if (!adicionados) {
        alert("Nenhum horário novo foi criado. Confira se as datas e horários são futuros ou se as vagas já estão publicadas.");
        return;
    }
    salvarLista(CHAVE_DISPONIBILIDADES, lista);
    registrarAuditoria("Publicou " + adicionados + " horários de " + formatarData(dataInicial) + " a " + formatarData(dataFinal) + ".", profissional);
    carregarDisponibilidadesProfissional();
    alert(adicionados + " horários publicados em " + diasPublicados.size + (diasPublicados.size === 1 ? " dia." : " dias.") + " Os pacientes já podem escolher as vagas livres.");
}

function carregarDisponibilidadesProfissional() {
    const container = document.getElementById("listaDisponibilidadesProfissional");
    if (!container) {
        return;
    }
    const profissional = usuarioProfissional();
    if (!profissional) {
        return;
    }
    const vagas = disponibilidadesDoProfissional(profissional.id);
    container.innerHTML = "";
    if (!vagas.length) {
        container.innerHTML = "<p class=\"mensagem-agenda-vazia\">Nenhum horário futuro publicado.</p>";
        return;
    }
    const dias = [...new Set(vagas.map(function (vaga) { return vaga.data; }))];
    dias.forEach(function (dia) {
        const vagasDoDia = vagas.filter(function (vaga) { return vaga.data === dia; });
        const temOcupados = vagasDoDia.some(function (vaga) { return horarioOcupadoProfissional(profissional.id, dia, vaga.horario); });
        const cartao = document.createElement("section");
        cartao.className = "dia-disponibilidade";
        cartao.innerHTML = `<div class="dia-disponibilidade-titulo"><strong>${escaparHTML(formatarData(dia))}</strong><button type="button" class="botao botao-branco botao-pequeno" onclick="removerDiaDisponivel('${dia}')" ${temOcupados ? "disabled title=\"Existem consultas pendentes ou confirmadas neste dia\"" : ""}>Remover dia</button></div>`;
        const horarios = document.createElement("div");
        horarios.className = "lista-horarios";
        vagasDoDia.forEach(function (vaga) {
            const ocupado = horarioOcupadoProfissional(profissional.id, vaga.data, vaga.horario);
            const tag = document.createElement("span");
            tag.className = "tag-horario" + (ocupado ? " tag-horario-ocupado" : "");
            tag.innerHTML = `<span>${escaparHTML(vaga.horario)} ${ocupado ? "· reservado" : "· livre"}</span>` +
                (ocupado ? "" : `<button type="button" class="remover-horario" onclick="removerHorarioDisponivel(${Number(vaga.id)})" aria-label="Remover horário ${escaparHTML(vaga.horario)}">×</button>`);
            horarios.appendChild(tag);
        });
        cartao.appendChild(horarios);
        container.appendChild(cartao);
    });
}

function removerHorarioDisponivel(id) {
    const profissional = usuarioProfissional();
    if (!profissional) {
        return;
    }
    const vagas = lerLista(CHAVE_DISPONIBILIDADES);
    const vaga = vagas.find(function (item) { return item.id === id && item.profissionalId === profissional.id; });
    if (!vaga) {
        return;
    }
    if (horarioOcupadoProfissional(profissional.id, vaga.data, vaga.horario)) {
        alert("Há uma consulta pendente ou confirmada neste horário. Não é possível removê-lo.");
        return;
    }
    salvarLista(CHAVE_DISPONIBILIDADES, vagas.filter(function (item) { return item.id !== id; }));
    registrarAuditoria("Removeu o horário " + vaga.horario + " de " + formatarData(vaga.data) + ".", profissional);
    carregarDisponibilidadesProfissional();
}

function removerDiaDisponivel(data) {
    const profissional = usuarioProfissional();
    if (!profissional) {
        return;
    }
    const vagas = lerLista(CHAVE_DISPONIBILIDADES);
    const doDia = vagas.filter(function (vaga) { return vaga.profissionalId === profissional.id && vaga.data === data; });
    if (!doDia.length) {
        return;
    }
    if (doDia.some(function (vaga) { return horarioOcupadoProfissional(profissional.id, data, vaga.horario); })) {
        alert("Este dia tem consultas pendentes ou confirmadas. Cancele ou resolva essas consultas antes de remover o dia.");
        return;
    }
    if (!confirm("Remover todos os horários de " + formatarData(data) + "?")) {
        return;
    }
    salvarLista(CHAVE_DISPONIBILIDADES, vagas.filter(function (vaga) {
        return vaga.profissionalId !== profissional.id || vaga.data !== data;
    }));
    registrarAuditoria("Removeu disponibilidade de " + formatarData(data) + ".", profissional);
    carregarDisponibilidadesProfissional();
}

function usuarioProfissional() {
    let usuario = pegarUsuarioLogado();
    if (!usuario || usuario.tipo !== "Profissional") {
        return null;
    }
    return usuario;
}

function consultasDoProfissional() {
    let profissional = usuarioProfissional();
    if (!profissional) {
        return [];
    }
    return lerLista(CHAVE_CONSULTAS).filter(function (consulta) {
        return consulta.profissionalId === profissional.id;
    }).sort(function (a, b) {
        return (a.data + a.horario).localeCompare(b.data + b.horario);
    });
}

function carregarDashboardProfissional() {
    let profissional = usuarioProfissional();
    if (!profissional) {
        return;
    }
    let consultas = consultasDoProfissional();
    let pendentes = consultas.filter(function (item) {
        return item.status === "Pendente";
    }).length;
    let confirmadas = consultas.filter(function (item) {
        return item.status === "Confirmada";
    }).length;
    let concluidas = consultas.filter(function (item) {
        return item.status === "Concluída";
    }).length;
    let p = document.getElementById("totalPendentesProfissional");
    let c = document.getElementById("totalConfirmadasProfissional");
    let f = document.getElementById("totalConcluidasProfissional");
    if (p) {
        p.textContent = pendentes;
    }
    if (c) {
        c.textContent = confirmadas;
    }
    if (f) {
        f.textContent = concluidas;
    }
    let corpo = document.getElementById("resumoAgendaProfissional");
    if (!corpo) {
        return;
    }
    corpo.innerHTML = "";
    let proximas = consultas.filter(function (consulta) {
        return ["Pendente", "Confirmada"].includes(consulta.status);
    }).slice(0, 5);
    if (proximas.length === 0) {
        corpo.innerHTML = "<tr><td colspan=\"5\" class=\"vazio\">Nenhuma consulta pendente ou confirmada.</td></tr>";
        return;
    }
    proximas.forEach(function (consulta) {
        corpo.innerHTML += `
      <tr>
        <td>${escaparHTML(formatarData(consulta.data))} ${escaparHTML(consulta.horario)}</td>
        <td>${escaparHTML(consulta.pacienteNome)}</td>
        <td>${escaparHTML(consulta.tipo)}</td>
        <td><span class="status ${classeStatus(consulta.status)}">${escaparHTML(consulta.status)}</span></td>
        <td><a class="botao botao-branco botao-pequeno" href="profissional-agenda.html">Abrir agenda</a></td>
      </tr>
    `;
    });
}

function carregarAgendaProfissional() {
    let corpo = document.getElementById("corpoAgendaProfissional");
    if (!corpo) {
        return;
    }
    let consultas = consultasDoProfissional();
    corpo.innerHTML = "";
    if (consultas.length === 0) {
        corpo.innerHTML = "<tr><td colspan=\"8\" class=\"vazio\">Nenhuma consulta foi solicitada para você.</td></tr>";
        return;
    }
    consultas.forEach(function (consulta) {
        let acoes = "";
        if (consulta.status === "Pendente") {
            acoes = `
        <button class="botao botao-verde botao-pequeno" onclick="aceitarConsulta(${Number(consulta.id)})">Aceitar</button>
        <button class="botao botao-vermelho botao-pequeno" onclick="recusarConsulta(${Number(consulta.id)})">Recusar</button>
      `;
        }
        if (consulta.status === "Confirmada") {
            acoes = `
        <button class="botao botao-branco botao-pequeno" onclick="selecionarPaciente(${Number(consulta.pacienteId)}, 'profissional-prontuario.html')">Prontuário</button>
      `;
            if (consulta.tipo === "Teleconsulta") {
                acoes += ` <button class="botao botao-azul botao-pequeno" onclick="abrirTeleconsultaProfissional(${Number(consulta.id)})">Teleconsulta</button>`;
            }
            acoes += ` <button class="botao botao-verde botao-pequeno" onclick="concluirConsulta(${Number(consulta.id)})">Concluir</button>`;
        }
        if (acoes === "") {
            acoes = "-";
        }
        corpo.innerHTML += `
      <tr>
        <td>${escaparHTML(formatarData(consulta.data))}</td>
        <td>${escaparHTML(consulta.horario)}</td>
        <td>${escaparHTML(consulta.pacienteNome)}</td>
        <td>${escaparHTML(consulta.tipo)}</td>
        <td>${escaparHTML(consulta.unidade)}</td>
        <td>${escaparHTML(consulta.observacoes || "-")}</td>
        <td><span class="status ${classeStatus(consulta.status)}">${escaparHTML(consulta.status)}</span></td>
        <td><div class="acoes" style="margin-top:0">${acoes}</div></td>
      </tr>
    `;
    });
}

function aceitarConsulta(id) {
    let profissional = usuarioProfissional();
    let consultas = lerLista(CHAVE_CONSULTAS);
    let consulta = consultas.find(function (item) {
        return item.id === id && item.profissionalId === profissional.id;
    });
    if (!consulta || consulta.status !== "Pendente") {
        alert("Esta solicitação não está mais pendente.");
        carregarAgendaProfissional();
        return;
    }
    if (!confirm("Deseja aceitar a consulta de " + consulta.pacienteNome + "?")) {
        return;
    }
    consulta.status = "Confirmada";
    consulta.motivoRecusa = "";
    salvarLista(CHAVE_CONSULTAS, consultas);
    registrarAuditoria("Aceitou a consulta de " + consulta.pacienteNome + " para " + formatarData(consulta.data) + " às " + consulta.horario + ".", profissional);
    alert("Consulta confirmada. O paciente verá o status como CONFIRMADA.");
    carregarAgendaProfissional();
    carregarDashboardProfissional();
}

function recusarConsulta(id) {
    let profissional = usuarioProfissional();
    let consultas = lerLista(CHAVE_CONSULTAS);
    let consulta = consultas.find(function (item) {
        return item.id === id && item.profissionalId === profissional.id;
    });
    if (!consulta || consulta.status !== "Pendente") {
        alert("Esta solicitação não está mais pendente.");
        carregarAgendaProfissional();
        return;
    }
    let motivo = prompt("Informe o motivo da recusa:");
    if (motivo === null) {
        return;
    }
    if (motivo.trim() === "") {
        motivo = "Solicitação não aceita pelo profissional.";
    }
    consulta.status = "Recusada";
    consulta.motivoRecusa = motivo.trim();
    salvarLista(CHAVE_CONSULTAS, consultas);
    registrarAuditoria("Recusou uma solicitação de consulta de " + consulta.pacienteNome + ".", profissional);
    alert("Consulta recusada. O paciente verá a atualização no perfil.");
    carregarAgendaProfissional();
    carregarDashboardProfissional();
}

function concluirConsulta(id) {
    let profissional = usuarioProfissional();
    let consultas = lerLista(CHAVE_CONSULTAS);
    let consulta = consultas.find(function (item) {
        return item.id === id && item.profissionalId === profissional.id;
    });
    if (!consulta || consulta.status !== "Confirmada") {
        alert("Somente consultas confirmadas podem ser concluídas.");
        return;
    }
    if (!confirm("Deseja marcar esta consulta como concluída?")) {
        return;
    }
    consulta.status = "Concluída";
    salvarLista(CHAVE_CONSULTAS, consultas);
    registrarAuditoria("Concluiu a consulta de " + consulta.pacienteNome + ".", profissional);
    carregarAgendaProfissional();
    carregarDashboardProfissional();
}

function pacientesDoProfissional() {
    let consultas = consultasDoProfissional();
    let usuarios = lerLista(CHAVE_USUARIOS);
    let ids = [];
    consultas.forEach(function (consulta) {
        if (!ids.includes(consulta.pacienteId)) {
            ids.push(consulta.pacienteId);
        }
    });
    return usuarios.filter(function (usuario) {
        return usuario.tipo === "Paciente" && ids.includes(usuario.id);
    });
}

function carregarPacientesProfissional() {
    let corpo = document.getElementById("corpoPacientesProfissional");
    if (!corpo) {
        return;
    }
    let pacientes = pacientesDoProfissional();
    let consultas = consultasDoProfissional();
    corpo.innerHTML = "";
    if (pacientes.length === 0) {
        corpo.innerHTML = "<tr><td colspan=\"4\" class=\"vazio\">Nenhum paciente possui consulta vinculada a você.</td></tr>";
        return;
    }
    pacientes.forEach(function (paciente) {
        let consultasPaciente = consultas.filter(function (consulta) {
            return consulta.pacienteId === paciente.id;
        });
        let ultima = consultasPaciente.slice().sort(function (a, b) {
            return b.data.localeCompare(a.data);
        })[0];
        corpo.innerHTML += `
      <tr>
        <td>${escaparHTML(paciente.nome)}</td>
        <td>${escaparHTML(paciente.cpf || "-")}</td>
        <td>${escaparHTML(ultima ? formatarData(ultima.data) : "-")}</td>
        <td>
          <button class="botao botao-branco botao-pequeno" onclick="selecionarPaciente(${Number(paciente.id)}, 'profissional-prontuario.html')">
            Abrir prontuário
          </button>
        </td>
      </tr>
    `;
    });
}

function selecionarPaciente(id, destino) {
    localStorage.setItem(CHAVE_PACIENTE_SELECIONADO, String(id));
    window.location.href = destino;
}

function pegarPacienteSelecionado() {
    let id = Number(localStorage.getItem(CHAVE_PACIENTE_SELECIONADO));
    let pacientes = pacientesDoProfissional();
    let paciente = pacientes.find(function (item) {
        return item.id === id;
    });
    if (!paciente && pacientes.length > 0) {
        paciente = pacientes[0];
        localStorage.setItem(CHAVE_PACIENTE_SELECIONADO, String(paciente.id));
    }
    return paciente || null;
}

function carregarProntuarioSelecionado() {
    let nome = document.getElementById("nomePacienteProntuario");
    if (!nome) {
        return;
    }
    let paciente = pegarPacienteSelecionado();
    let container = document.getElementById("dadosPacienteProntuario");
    let lista = document.getElementById("listaEvolucoes");
    if (!paciente) {
        nome.textContent = "Nenhum paciente selecionado";
        if (container) {
            container.innerHTML = "<p>Nenhum paciente selecionado.</p>";
        }
        return;
    }
    nome.textContent = paciente.nome;
    if (container) {
        container.innerHTML = `
      <div class="detalhes">
        <strong>Nome</strong><span>${escaparHTML(paciente.nome)}</span>
        <strong>CPF</strong><span>${escaparHTML(paciente.cpf || "-")}</span>
        <strong>E-mail</strong><span>${escaparHTML(paciente.email)}</span>
      </div>
    `;
    }
    if (lista) {
        let registros = lerLista(CHAVE_PRONTUARIOS).filter(function (registro) {
            return registro.pacienteId === paciente.id;
        }).reverse();
        lista.innerHTML = "";
        if (registros.length === 0) {
            lista.innerHTML = "<p>Nenhuma evolução registrada.</p>";
        } else {
            registros.forEach(function (registro) {
                lista.innerHTML += `
          <div class="card">
            <strong>${escaparHTML(registro.data)}</strong>
            <p>${escaparHTML(registro.texto)}</p>
            <small>${escaparHTML(registro.profissionalNome)}</small>
          </div>
        `;
            });
        }
    }
}

function salvarEvolucao() {
    let profissional = usuarioProfissional();
    let paciente = pegarPacienteSelecionado();
    let campo = document.getElementById("evolucao");
    if (!paciente) {
        alert("Selecione um paciente antes de registrar a evolução.");
        return;
    }
    if (!campo || campo.value.trim() === "") {
        alert("Digite a evolução clínica.");
        return;
    }
    let registros = lerLista(CHAVE_PRONTUARIOS);
    registros.push({
        id: gerarId(),
        pacienteId: paciente.id,
        pacienteNome: paciente.nome,
        profissionalId: profissional.id,
        profissionalNome: profissional.nome,
        data: new Date().toLocaleString("pt-BR"),
        texto: campo.value.trim()
    });
    salvarLista(CHAVE_PRONTUARIOS, registros);
    registrarAuditoria("Atualizou o prontuário de " + paciente.nome + ".", profissional);
    campo.value = "";
    alert("Evolução salva no prontuário.");
    carregarProntuarioSelecionado();
}

function carregarPacienteNaReceita() {
    let elemento = document.getElementById("pacienteReceita");
    if (!elemento) {
        return;
    }
    let paciente = pegarPacienteSelecionado();
    if (!paciente) {
        elemento.textContent = "Nenhum paciente selecionado";
        return;
    }
    elemento.textContent = paciente.nome;
}

function emitirReceita() {
    let profissional = usuarioProfissional();
    let paciente = pegarPacienteSelecionado();
    if (!paciente) {
        alert("Selecione um paciente na página Pacientes antes de emitir a receita.");
        return;
    }
    let medicamento = document.getElementById("medicamento").value.trim();
    let dosagem = document.getElementById("dosagem").value.trim();
    let frequencia = document.getElementById("frequencia").value.trim();
    let duracao = document.getElementById("duracao").value.trim();
    let orientacoes = document.getElementById("orientacoes").value.trim();
    if (!medicamento || !dosagem || !frequencia) {
        alert("Preencha medicamento, dosagem e frequência.");
        return;
    }
    let receitas = lerLista(CHAVE_RECEITAS);
    let hoje = new Date();
    let dataISO = hoje.getFullYear() + "-" +
        String(hoje.getMonth() + 1).padStart(2, "0") + "-" +
        String(hoje.getDate()).padStart(2, "0");
    receitas.push({
        id: gerarId(),
        pacienteId: paciente.id,
        pacienteNome: paciente.nome,
        profissionalId: profissional.id,
        profissionalNome: profissional.nome,
        profissionalEspecialidade: profissional.especialidade || "",
        medicamento: medicamento,
        dosagem: dosagem,
        frequencia: frequencia,
        duracao: duracao,
        orientacoes: orientacoes,
        dataISO: dataISO,
        dataHora: new Date().toLocaleString("pt-BR")
    });
    salvarLista(CHAVE_RECEITAS, receitas);
    registrarAuditoria("Emitiu receita digital para " + paciente.nome + ".", profissional);
    alert("Receita digital emitida com sucesso.");
    document.getElementById("formReceita").reset();
}

function abrirTeleconsultaProfissional(id) {
    localStorage.setItem(CHAVE_TELECONSULTA, String(id));
    window.location.href = "profissional-teleconsulta.html";
}

function carregarTeleconsultasProfissional() {
    let lista = document.getElementById("listaTeleconsultasProfissional");
    if (!lista) {
        return;
    }
    let profissional = usuarioProfissional();
    let consultas = consultasDoProfissional().filter(function (consulta) {
        return consulta.tipo === "Teleconsulta" && consulta.status === "Confirmada";
    });
    lista.innerHTML = "";
    if (consultas.length === 0) {
        lista.innerHTML = "<div class=\"card\"><p>Nenhuma teleconsulta confirmada.</p></div>";
        return;
    }
    consultas.forEach(function (consulta) {
        lista.innerHTML += `
      <div class="card">
        <h3>${escaparHTML(consulta.pacienteNome)}</h3>
        <p>${escaparHTML(formatarData(consulta.data))} às ${escaparHTML(consulta.horario)}</p>
        <span class="status status-verde">Confirmada</span>
        <div class="acoes">
          <button class="botao botao-azul" onclick="iniciarTeleconsultaProfissional(${Number(consulta.id)})">Iniciar</button>
        </div>
      </div>
    `;
    });
    let idAtual = Number(localStorage.getItem(CHAVE_TELECONSULTA));
    if (idAtual) {
        mostrarTeleconsultaProfissional(idAtual);
    }
}

function iniciarTeleconsultaProfissional(id) {
    localStorage.setItem(CHAVE_TELECONSULTA, String(id));
    mostrarTeleconsultaProfissional(id);
}

function mostrarTeleconsultaProfissional(id) {
    let profissional = usuarioProfissional();
    let consulta = lerLista(CHAVE_CONSULTAS).find(function (item) {
        return item.id === id &&
            item.profissionalId === profissional.id &&
            item.tipo === "Teleconsulta" &&
            item.status === "Confirmada";
    });
    let area = document.getElementById("areaTeleconsultaProfissional");
    let dados = document.getElementById("dadosTeleconsultaProfissional");
    if (!area || !dados) {
        return;
    }
    if (!consulta) {
        area.innerHTML = "<div><h2>Nenhuma teleconsulta selecionada</h2></div>";
        dados.innerHTML = "<p>Nenhum atendimento selecionado.</p>";
        return;
    }
    area.innerHTML = "<div><h2>Vídeo do paciente</h2><p>Simulação de videochamada</p></div>";
    dados.innerHTML = `
    <h3>${escaparHTML(consulta.pacienteNome)}</h3>
    <p>${escaparHTML(consulta.especialidade)}</p>
    <p>${escaparHTML(formatarData(consulta.data))} às ${escaparHTML(consulta.horario)}</p>
    <span class="status status-verde">Confirmada</span>
    <div class="acoes">
      <button class="botao botao-branco" onclick="selecionarPaciente(${Number(consulta.pacienteId)}, 'profissional-prontuario.html')">Abrir prontuário</button>
      <button class="botao botao-verde" onclick="concluirConsulta(${Number(consulta.id)}); carregarTeleconsultasProfissional();">Concluir atendimento</button>
    </div>
  `;
}

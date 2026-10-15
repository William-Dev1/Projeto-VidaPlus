// Cadastro, login e controle de acesso.

document.addEventListener("DOMContentLoaded", function () {
    inicializarDadosProjeto();
    mostrarCamposProfissional();
    mostrarNomeUsuarioLogado();
    protegerPaginaAtual();
    preencherEmailAdministrador();
});

function pegarUsuarioLogado() {
    let dados = localStorage.getItem(CHAVE_LOGADO);
    if (!dados) {
        return null;
    }
    try {
        return JSON.parse(dados);
    } catch (erro) {
        return null;
    }
}

function protegerPaginaAtual() {
    let perfilNecessario = document.body.dataset.perfil;
    if (!perfilNecessario) {
        return;
    }
    let usuario = pegarUsuarioLogado();
    let usuarios = lerLista(CHAVE_USUARIOS);
    let contaAtual = null;
    if (usuario) {
        contaAtual = usuarios.find(function (item) {
            return item.id === usuario.id;
        });
    }
    if (!contaAtual || contaAtual.tipo !== perfilNecessario || contaAtual.status !== "Ativo") {
        localStorage.removeItem(CHAVE_LOGADO);
        alert("Faça login com um usuário ativo do perfil correto para acessar esta página.");
        window.location.href = "../index.html";
        return;
    }
    // Mantém os dados da sessão sincronizados com o cadastro atual.
    localStorage.setItem(CHAVE_LOGADO, JSON.stringify(contaAtual));
}

function mostrarNomeUsuarioLogado() {
    let usuario = pegarUsuarioLogado();
    if (!usuario) {
        return;
    }
    let elementosNome = document.querySelectorAll(".nome-usuario-logado");
    elementosNome.forEach(function (elemento) {
        elemento.textContent = usuario.nome;
    });
    let elementosDetalhe = document.querySelectorAll(".detalhe-usuario-logado");
    elementosDetalhe.forEach(function (elemento) {
        if (usuario.tipo === "Profissional") {
            elemento.textContent = usuario.especialidade + " • " + usuario.registro;
        } else {
            elemento.textContent = usuario.tipo;
        }
    });
}

function preencherEmailAdministrador() {
    let tipo = document.getElementById("tipoLogin");
    let email = document.getElementById("emailLogin");
    let senha = document.getElementById("senhaLogin");
    if (!tipo || !email || !senha) {
        return;
    }
    if (tipo.value === "Administrador") {
        // Libera o login admin com um clique para facilitar a demonstração.
        email.value = "admin@vidaplus.com.br";
        senha.value = "123456";
    } else {
        // Ao trocar de perfil, limpa apenas os dados automáticos do administrador.
        if (email.value === "admin@vidaplus.com.br") {
            email.value = "";
        }
        if (senha.value === "123456") {
            senha.value = "";
        }
        email.focus();
    }
}

function fazerLogin() {
    let tipo = document.getElementById("tipoLogin").value;
    let email = document.getElementById("emailLogin").value.trim().toLowerCase();
    let senha = document.getElementById("senhaLogin").value;
    if (email === "" || senha === "") {
        alert("Digite o e-mail e a senha.");
        return;
    }
    let usuarios = lerLista(CHAVE_USUARIOS);
    let usuario = usuarios.find(function (item) {
        return item.email === email &&
            item.senha === senha &&
            item.tipo === tipo &&
            item.status === "Ativo";
    });
    if (!usuario) {
        alert("E-mail, senha ou tipo de acesso incorreto.");
        return;
    }
    localStorage.setItem(CHAVE_LOGADO, JSON.stringify(usuario));
    registrarAuditoria("Realizou login no sistema.", usuario);
    if (usuario.tipo === "Paciente") {
        window.location.href = "pages/paciente-dashboard.html";
    }
    if (usuario.tipo === "Profissional") {
        window.location.href = "pages/profissional-dashboard.html";
    }
    if (usuario.tipo === "Administrador") {
        window.location.href = "pages/admin-dashboard.html";
    }
}

function sairDoSistema() {
    let usuario = pegarUsuarioLogado();
    if (usuario) {
        registrarAuditoria("Saiu do sistema.", usuario);
    }
    localStorage.removeItem(CHAVE_LOGADO);
    localStorage.removeItem(CHAVE_PACIENTE_SELECIONADO);
    localStorage.removeItem(CHAVE_TELECONSULTA);
    window.location.href = "../index.html";
}

function mostrarCamposProfissional() {
    let tipo = document.getElementById("tipoCadastro");
    let campos = document.getElementById("camposProfissional");
    if (!tipo || !campos) {
        return;
    }
    campos.style.display = tipo.value === "Profissional" ? "block" : "none";
    const paciente = document.getElementById("camposPacienteCadastro");
    if (paciente) {
        paciente.style.display = tipo.value === "Paciente" ? "block" : "none";
        paciente.querySelectorAll("input").forEach(function (campo) {
            campo.required = tipo.value === "Paciente";
        });
    }
}

function criarConta() {
    let tipo = document.getElementById("tipoCadastro").value;
    let nome = document.getElementById("nomeCadastro").value.trim();
    let cpf = mascararCPF(document.getElementById("cpfCadastro").value);
    let email = document.getElementById("emailCadastro").value.trim().toLowerCase();
    let senha = document.getElementById("senhaCadastro").value;
    let confirmar = document.getElementById("confirmarSenhaCadastro").value;
    let especialidade = "";
    let registro = "";
    let nascimento = "";
    let telefone = "";
    if (tipo === "Paciente") {
        nascimento = mascararNascimento(document.getElementById("nascimentoCadastro").value);
        telefone = mascararCelular(document.getElementById("telefoneCadastro").value);
    }
    if (tipo === "Profissional") {
        especialidade = document.getElementById("especialidadeCadastro").value.trim();
        registro = document.getElementById("registroCadastro").value.trim();
    }
    if (nome === "" || cpf === "" || email === "" || senha === "") {
        alert("Preencha todos os campos obrigatórios.");
        return;
    }
    if (!formatoCPFValido(cpf)) {
        alert("Informe os 11 dígitos do CPF no formato 000.000.000-00.");
        document.getElementById("cpfCadastro").focus();
        return;
    }
    if (tipo === "Profissional" && (especialidade === "" || registro === "")) {
        alert("Informe a especialidade e o registro profissional.");
        return;
    }
    if (tipo === "Paciente" && !nascimentoValido(nascimento)) {
        alert("Informe a data de nascimento correta no formato DD/MM/AAAA.");
        return;
    }
    if (tipo === "Paciente" && !celularValido(telefone)) {
        alert("Informe um celular válido com DDD: (47) 99999-9999.");
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert("Informe um e-mail válido.");
        return;
    }
    if (senha.length < 6) {
        alert("A senha deve ter pelo menos 6 caracteres.");
        return;
    }
    if (senha !== confirmar) {
        alert("As senhas não são iguais.");
        return;
    }
    let usuarios = lerLista(CHAVE_USUARIOS);
    let emailExiste = usuarios.some(function (usuario) {
        return usuario.email === email;
    });
    if (emailExiste) {
        alert("Já existe uma conta com este e-mail.");
        return;
    }
    let novoUsuario = {
        id: gerarId(),
        nome: nome,
        cpf: cpf,
        email: email,
        senha: senha,
        tipo: tipo,
        especialidade: especialidade,
        registro: registro,
        nascimento: nascimento,
        telefone: telefone,
        status: "Ativo"
    };
    usuarios.push(novoUsuario);
    salvarLista(CHAVE_USUARIOS, usuarios);
    registrarAuditoria("Criou uma nova conta de " + tipo + ": " + nome + ".", novoUsuario);
    alert("Conta criada com sucesso. Agora você já pode fazer login.");
    window.location.href = "index.html";
}

// Mostra ou oculta o conteúdo de um campo de senha.
function alternarVisibilidadeSenha(idCampo, botao) {
    let campo = document.getElementById(idCampo);
    if (!campo) {
        return;
    }
    if (campo.type === "password") {
        campo.type = "text";
        botao.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 3l18 18"></path>
        <path d="M10.6 10.7a2 2 0 002.7 2.7"></path>
        <path d="M9.9 4.2A10.8 10.8 0 0112 4c5.5 0 9 5 9 5a16.5 16.5 0 01-3 3.6"></path>
        <path d="M6.6 6.6C4.4 8 3 10 3 10s3.5 5 9 5a10.4 10.4 0 003.4-.6"></path>
      </svg>
    `;
        botao.title = "Ocultar senha";
        botao.setAttribute("aria-label", "Ocultar senha");
    } else {
        campo.type = "password";
        botao.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;
        botao.title = "Mostrar senha";
        botao.setAttribute("aria-label", "Mostrar senha");
    }
}

// Redefine a senha quando o usuário esquece o acesso.
function alterarSenhaEsquecida() {
    let tipo = document.getElementById("tipoRecuperacao").value;
    let email = document.getElementById("emailRecuperacao").value.trim().toLowerCase();
    let novaSenha = document.getElementById("novaSenha").value;
    let confirmarNovaSenha = document.getElementById("confirmarNovaSenha").value;
    if (email === "" || novaSenha === "" || confirmarNovaSenha === "") {
        alert("Preencha todos os campos.");
        return;
    }
    if (novaSenha.length < 6) {
        alert("A nova senha deve ter pelo menos 6 caracteres.");
        return;
    }
    if (novaSenha !== confirmarNovaSenha) {
        alert("As senhas não são iguais.");
        return;
    }
    let usuarios = lerLista(CHAVE_USUARIOS);
    let usuario = usuarios.find(function (item) {
        return item.email === email && item.tipo === tipo;
    });
    if (!usuario) {
        alert("Não foi encontrada uma conta com este e-mail e tipo de acesso.");
        return;
    }
    usuario.senha = novaSenha;
    salvarLista(CHAVE_USUARIOS, usuarios);
    registrarAuditoria("Redefiniu a senha de acesso.", usuario);
    alert("Senha alterada com sucesso! Você já pode entrar com a nova senha.");
    window.location.href = "index.html";
}

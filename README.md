# VidaPlus

**Projeto Multidisciplinar - Desenvolvimento Front-end | Uninter**

## Sobre o projeto

O VidaPlus é um protótipo de sistema de gestão hospitalar desenvolvido como parte do Projeto Multidisciplinar do curso de Análise e Desenvolvimento de Sistemas da Uninter, com foco em Desenvolvimento Front-end.

O projeto utiliza HTML, CSS e JavaScript para representar processos hospitalares por meio de interfaces responsivas e funcionalidades interativas.

O sistema possui três perfis de acesso: paciente, profissional de saúde e administrador. Cada perfil oferece funcionalidades específicas, permitindo simular desde o cadastro de usuários e o agendamento de consultas até o gerenciamento de processos administrativos.

Como o trabalho tem foco em Front-end, os registros são armazenados localmente no navegador, sem servidor ou banco de dados externo.

## Tecnologias utilizadas

- **HTML:** estrutura das páginas, formulários e elementos da interface.
- **CSS:** estilização, organização visual e responsividade das telas.
- **JavaScript:** validação de formulários, navegação, agendamentos e outras funcionalidades.
- **LocalStorage:** armazenamento dos registros demonstrativos no navegador.

## Funcionamento inicial do sistema

O VidaPlus foi configurado para iniciar com apenas uma conta de administrador. Médicos, pacientes e outros registros são criados durante a utilização do sistema.

Essa configuração permite demonstrar o projeto desde o início, acompanhando o cadastro dos usuários e a realização das operações.

### Acesso inicial do administrador

- **Perfil:** Administrador
- **E-mail:** `admin@vidaplus.com.br`
- **Senha:** `123456`

O administrador acessa o painel de gestão hospitalar, onde pode acompanhar cadastros, consultas, internações, suprimentos, informações financeiras, relatórios e registros demonstrativos de auditoria.

Os demais usuários podem criar suas contas pela opção **Criar conta**, disponível na tela inicial. Após o cadastro, entram no sistema com o e-mail e a senha informados.

O sistema também inicia com oito leitos disponíveis para a demonstração dos processos de internação e alta.

> **Importante:** essa é a configuração inicial do protótipo. Se já houver informações cadastradas no mesmo navegador e endereço, elas poderão aparecer normalmente ao abrir o sistema novamente.

## Armazenamento dos dados

O VidaPlus utiliza o **LocalStorage do navegador** para armazenar os registros criados durante a utilização do sistema.

Quando um paciente ou profissional cria uma conta, as informações são salvas no armazenamento local. O mesmo acontece com agendamentos, prontuários, receitas, movimentações de estoque e registros administrativos.

Esses dados **não são gravados diretamente nos arquivos HTML, CSS ou JavaScript**. Eles ficam guardados direto no seu navegador, vinculados ao seu perfil e ao endereço do site.

Por exemplo, depois de cadastrar um médico, é possível sair da conta e entrar como administrador no mesmo ambiente para consultar o cadastro. Ao fechar e abrir o navegador, os registros continuam disponíveis enquanto o armazenamento do site for mantido.

Algumas características desse armazenamento:

- Os registros permanecem salvos mesmo após fechar a página.
- O armazenamento depende do navegador e do endereço utilizado para acessar o sistema.
- Navegadores, computadores ou endereços diferentes não compartilham automaticamente os mesmos dados.
- Se os dados do site forem apagados, os registros locais poderão ser perdidos.

Essa solução foi escolhida para permitir a demonstração das funcionalidades sem desenvolver um Back-end ou Banco de dados, de acordo com a ênfase Front-end do trabalho.

## Funcionalidades do sistema

### Paciente

- Criar uma conta e realizar login.
- Consultar e atualizar informações cadastrais.
- Preencher CPF, celular e data de nascimento com formatação automática.
- Consultar profissionais, datas e horários disponíveis.
- Agendar e cancelar consultas.
- Acompanhar o andamento dos agendamentos e as notificações.
- Visualizar histórico clínico e receitas.
- Acessar a interface demonstrativa de teleconsulta.

### Profissional de saúde

- Criar uma conta com especialidade e registro profissional.
- Consultar e atualizar informações do perfil.
- Configurar disponibilidade por período de datas.
- Definir os horários e a duração das consultas.
- Visualizar, aceitar, recusar e concluir consultas.
- Registrar informações em prontuários.
- Emitir receitas digitais demonstrativas.
- Utilizar a interface demonstrativa de teleconsulta.

### Administrador

- Visualizar o dashboard com indicadores hospitalares.
- Consultar e gerenciar cadastros de pacientes e profissionais.
- Acompanhar os indicadores de consultas.
- Gerenciar internações, altas e ocupação de leitos.
- Cadastrar e movimentar suprimentos hospitalares.
- Controlar quantidades e alertas de estoque.
- Registrar receitas e despesas financeiras.
- Consultar saldos e relatórios administrativos.
- Visualizar registros demonstrativos de auditoria.

## Estrutura do projeto

```text
VidaPlus/
├── css/
├── imagens/
├── js/
├── pages/
├── tests/
├── .gitignore
├── criar-conta.html
├── esqueci-senha.html
├── index.html
└── README.md
```

As pastas estão separadas por responsabilidade:

- **css:** estilos e regras de responsividade.
- **imagens:** elementos visuais utilizados nas páginas.
- **js:** funcionalidades, validações e manipulação dos registros.
- **pages:** páginas dos perfis de paciente, profissional e administrador.
- **tests:** testes automatizados do protótipo.
- **README.md:** documentação geral do projeto.

## Testes realizados

Durante o desenvolvimento, foram realizados testes automatizados para verificar as principais funcionalidades do VidaPlus, incluindo:

- Login e navegação entre os perfis.
- Cadastro de pacientes e profissionais.
- Formatação e validação de CPF, celular e data de nascimento.
- Publicação de horários disponíveis pelos profissionais.
- Agendamento, confirmação e cancelamento de consultas.
- Bloqueio de horários ocupados e prevenção de agendamentos duplicados.
- Gerenciamento de leitos e internações.
- Cadastro e movimentação de suprimentos.
- Lançamentos e cálculos financeiros.
- Controle de acesso, privacidade e registros de auditoria.
- Preservação dos dados armazenados no navegador.

Os testes automatizados foram desenvolvidos em JavaScript e estão disponíveis na pasta `tests`.

Para executá-los, é necessário ter o Node.js instalado e utilizar o terminal **PowerShell do Visual Studio Code**, com a pasta principal do projeto aberta.

Execute o comando:

```powershell
Get-ChildItem tests/*.js | ForEach-Object { node $_.FullName }
```

Durante a execução, o terminal apresenta os resultados de cada verificação. Nos testes realizados, todas as verificações apresentaram o resultado `PASS`, sem falhas registradas.

## Considerações finais

O desenvolvimento do VidaPlus permitiu aplicar conhecimentos de HTML, CSS e JavaScript na construção de interfaces funcionais e responsivas. O projeto demonstra a interação entre pacientes, profissionais de saúde e administradores, além da organização de processos de atendimento e gestão hospitalar. O uso do LocalStorage possibilitou desenvolver e testar os fluxos do sistema sem depender de um servidor, atendendo ao objetivo acadêmico da trilha de Desenvolvimento Front-end. O VidaPlus representa uma base para futuras melhorias e integrações e contribui para a aplicação prática dos conhecimentos adquiridos no curso de Análise e Desenvolvimento de Sistemas.

// =========================
// ESTADO
// =========================
let clientes = JSON.parse(localStorage.getItem("clientes")) || [];
let editandoIndex = null;

// =========================
// UTILIDADES
// =========================
function salvarDados() {
  localStorage.setItem("clientes", JSON.stringify(clientes));
}

function limparCampos() {
  document.getElementById("nome").value = "";
  document.getElementById("contato").value = "";
  document.getElementById("dia").value = "";
}

// =========================
// RESET MENSAL AUTOMÁTICO
// =========================
function resetMensal() {
  const mesAtual = new Date().getMonth();
  const ultimoMesSalvo = localStorage.getItem("mesAtual");

  if (ultimoMesSalvo == null || Number(ultimoMesSalvo) !== mesAtual) {
    clientes.forEach((cliente) => {
      cliente.mensagemEnviada = false;
      cliente.enviadoPor = null;
    });

    localStorage.setItem("mesAtual", mesAtual);
    salvarDados();
  }
}

// =========================
// STATUS
// =========================
function obterStatus(cliente) {
  const hoje = new Date().getDate();

  if (cliente.mensagemEnviada) {
    return { texto: `Resolvido por ${cliente.enviadoPor}`, cor: "green" };
  }

  if (cliente.diaVencimento === hoje) {
    return { texto: "Vence hoje", cor: "orange" };
  }

  if (cliente.diaVencimento < hoje) {
    return { texto: "Atrasado", cor: "red" };
  }

  return { texto: "Em dia", cor: "blue" };
}

// =========================
// AÇÕES
// =========================
function adicionarCliente() {
  const nome = document.getElementById("nome").value.trim();
  const contato = document.getElementById("contato").value.trim();
  const dia = Number(document.getElementById("dia").value);

  if (!nome || !contato || !dia) {
    alert("Preencha todos os campos!");
    return;
  }

  if (editandoIndex !== null) {
    clientes[editandoIndex] = {
      ...clientes[editandoIndex],
      nome,
      contato,
      diaVencimento: dia,
    };

    editandoIndex = null;
  } else {
    clientes.push({
      nome,
      contato,
      diaVencimento: dia,
      mensagemEnviada: false,
      enviadoPor: null,
    });
  }

  salvarDados();
  limparCampos();
  renderizarLista();
}

function editarClientes(index) {
  const cliente = clientes[index];

  document.getElementById("nome").value = cliente.nome;
  document.getElementById("contato").value = cliente.contato;
  document.getElementById("dia").value = cliente.diaVencimento;

  editandoIndex = index;
}

function marcarEnviado(index) {
  const nomePessoa = prompt("Quem enviou?");
  if (!nomePessoa) return;

  clientes[index].mensagemEnviada = true;
  clientes[index].enviadoPor = nomePessoa;

  salvarDados();
  renderizarLista();
}

function removerCliente(index) {
  if (!confirm("Tem certeza?")) return;

  clientes.splice(index, 1);
  salvarDados();
  renderizarLista();
}

// =========================
// RENDER
// =========================
function renderizarLista() {
  const lista = document.getElementById("listaClientes");
  lista.innerHTML = "";

  clientes.forEach((cliente, index) => {
    const li = document.createElement("li");
    const status = obterStatus(cliente);

    li.innerHTML = `
      <strong>${cliente.nome}</strong><br>
      📞 ${cliente.contato}<br>
      📅 Dia ${cliente.diaVencimento}<br>

      <span style="color:${status.cor}">
        ${status.texto}
      </span>

      <div class="actions">
        <button class="btn-success"onclick="marcarEnviado(${index})">✔</button>
        <button class="btn-danger"onclick="removerCliente(${index})">🗑</button>
        <button class="" onclick="editarClientes(${index})">✏</button>
      </div>
    `;

    lista.appendChild(li);
  });
}

// =========================
// TEMA
// =========================
function toggleTema() {
  document.body.classList.toggle("light");
  const tema = document.body.classList.contains("light") ? "light" : "dark";
  localStorage.setItem("tema", tema);
}

function carregarTema() {
  const tema = localStorage.getItem("tema");
  if (tema === "light") {
    document.body.classList.add("light");
  }
}

// =========================
// ALERTAS
// =========================
function verificarVencimentos() {
  const hoje = new Date().getDate();

  clientes.forEach((cliente) => {
    if (!cliente.mensagemEnviada && cliente.diaVencimento === hoje) {
      alert(`⚠️ ${cliente.nome} vence hoje!`);
    }
  });
}

// =========================
// INIT
// =========================
function init() {
  carregarTema();
  resetMensal(); // 🔥 aqui entra o reset automático
  renderizarLista();
  verificarVencimentos();
}

init();

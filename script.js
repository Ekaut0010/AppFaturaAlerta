// =========================
// ESTADO (dados)
// =========================
let clientes = JSON.parse(localStorage.getItem("clientes")) || [];

// =========================
// UTILIDADES
// =========================

// salvar dados
function salvarDados() {
  localStorage.setItem("clientes", JSON.stringify(clientes));
}

// limpar inputs
function limparCampos() {
  document.getElementById("nome").value = "";
  document.getElementById("contato").value = "";
  document.getElementById("vencimento").value = "";
}

// formatar data
function formatarData(dataStr) {
  const data = new Date(dataStr + "T00:00:00");

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

// obter status
function obterStatus(cliente) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const data = new Date(cliente.vencimento + "T00:00:00");

  if (cliente.mensagemEnviada) {
    return {
      texto: `Resolvido por ${cliente.enviadoPor}`,
      cor: "green",
    };
  }

  if (data.getTime() === hoje.getTime()) {
    return { texto: "Vence hoje", cor: "orange" };
  }

  if (data < hoje) {
    return { texto: "Atrasado", cor: "red" };
  }

  return { texto: "Em dia", cor: "blue" };
}

// =========================
// AÇÕES
// =========================

// adicionar cliente
function adicionarCliente() {
  const nome = document.getElementById("nome").value.trim();
  const contato = document.getElementById("contato").value.trim();
  const vencimento = document.getElementById("vencimento").value;

  if (!nome || !contato || !vencimento) {
    alert("Preencha todos os campos!");
    return;
  }

  const cliente = {
    nome,
    contato,
    vencimento,
    mensagemEnviada: false,
    enviadoPor: null,
  };

  clientes.push(cliente);

  salvarDados();
  limparCampos();
  renderizarLista();
}

// marcar como enviado
function marcarEnviado(index) {
  const nomePessoa = prompt("Quem enviou?");
  if (!nomePessoa) return;

  clientes[index].mensagemEnviada = true;
  clientes[index].enviadoPor = nomePessoa;

  salvarDados();
  renderizarLista();
}

// remover cliente
function removerCliente(index) {
  const confirmar = confirm("Tem certeza que deseja excluir?");
  if (!confirmar) return;

  clientes.splice(index, 1);

  salvarDados();
  renderizarLista();
}

// =========================
// RENDERIZAÇÃO
// =========================
function renderizarLista() {
  const lista = document.getElementById("listaClientes");
  lista.innerHTML = "";

  clientes.forEach((cliente, index) => {
    const li = document.createElement("li");

    const dataFormatada = formatarData(cliente.vencimento);
    const status = obterStatus(cliente);

    li.classList.add(status.cor);

    li.innerHTML = `
      <strong>${cliente.nome}</strong><br>
      📞 ${cliente.contato}<br>
      📅 ${dataFormatada}<br>

      <span class="status" style="color: ${status.cor}">
        ${status.texto}
      </span>

      <div class="actions">
        <button class="btn-success" onclick="marcarEnviado(${index})">✔</button>
        <button class="btn-danger" onclick="removerCliente(${index})">🗑</button>
      </div>
    `;

    lista.appendChild(li);
  });
}

// =========================
// TEMA (dark/light)
// =========================
function toggleTema() {
  document.body.classList.toggle("light");

  const tema = document.body.classList.contains("light") ? "light" : "dark";
  localStorage.setItem("tema", tema);
}

// carregar tema salvo
function carregarTema() {
  const temaSalvo = localStorage.getItem("tema");
  if (temaSalvo === "light") {
    document.body.classList.add("light");
  }
}

// =========================
// INICIALIZAÇÃO
// =========================
function init() {
  carregarTema();
  renderizarLista();
  verificarVencimentos();
}

init();

// =========================
// Verificar Vencimentos
// =========================
function verificarVencimentos() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  clientes.forEach((cliente) => {
    const data = new Date(cliente.vencimento + "T00:00:00");

    if (!cliente.mensagemEnviada && data.getTime() === hoje.getTime()) {
      alert(`⚠️ ${cliente.nome} vence hoje!`);
    }
  });
}

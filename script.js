// =========================
// FIREBASE
// =========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getMessaging,
  getToken,
  onMessage,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

// =========================
// CONFIG
// =========================
const firebaseConfig = {
  apiKey: "AIzaSyBLeiDpZp2AZ-m_yM1C63OqFx0p7HGZLDc",
  authDomain: "faturaapp-49a98.firebaseapp.com",
  projectId: "faturaapp-49a98",
  storageBucket: "faturaapp-49a98.firebasestorage.app",
  messagingSenderId: "120182099403",
  appId: "1:120182099403:web:7f313c0713f582de71fa4e",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const messaging = getMessaging(firebaseApp);

// =========================
// ESTADO
// =========================
let clientes = [];
let editandoId = null;
let unsubscribeClientes = null;
let deferredPrompt = null;
let swRegistration = null;
let intervaloCobrancas = null;

// =========================
// DOM
// =========================
const el = {
  auth: document.getElementById("auth"),
  app: document.getElementById("app"),

  formLogin: document.getElementById("formLogin"),
  formCliente: document.getElementById("formCliente"),

  email: document.getElementById("email"),
  senha: document.getElementById("senha"),

  nome: document.getElementById("nome"),
  contato: document.getElementById("contato"),
  dia: document.getElementById("dia"),

  lista: document.getElementById("listaClientes"),

  btnCadastrar: document.getElementById("btnCadastrar"),
  btnLogout: document.getElementById("btnLogout"),
  btnTema: document.getElementById("btnTema"),
  btnDiminuirDia: document.getElementById("btnDiminuirDia"),
  btnAumentarDia: document.getElementById("btnAumentarDia"),
  btnSalvar: document.getElementById("btnSalvar"),
  installBtn: document.querySelector(".install-btn"),
};

// =========================
// UI
// =========================
function mostrarAuth() {
  el.auth.style.display = "flex";
  el.app.style.display = "none";
}

function mostrarApp() {
  el.auth.style.display = "none";
  el.app.style.display = "flex";
}

function atualizarTextoBotaoSalvar() {
  if (!el.btnSalvar) return;

  if (editandoId) {
    el.btnSalvar.innerHTML =
      '<i class="bi bi-pencil-square"></i> <span>Atualizar cliente</span>';
    return;
  }

  el.btnSalvar.innerHTML =
    '<i class="bi bi-save"></i> <span>Salvar cliente</span>';
}

function setLoadingGlobal() {
  if (document.querySelector(".app-loader")) return;

  const loader = document.createElement("div");
  loader.className = "app-loader";
  loader.textContent = "Carregando...";
  document.body.appendChild(loader);
}

function removeLoadingGlobal() {
  document.querySelector(".app-loader")?.remove();
}

function mostrarToast(mensagem, erro = false) {
  const toast = document.createElement("div");
  toast.className = `toast ${erro ? "error" : ""}`.trim();
  toast.textContent = mensagem;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 200);
  }, 2200);
}

function setLoading(ativo) {
  if (!el.btnSalvar) return;

  if (ativo) {
    el.btnSalvar.classList.add("loading");
    el.btnSalvar.disabled = true;
    el.btnSalvar.dataset.originalText = el.btnSalvar.innerHTML;
    el.btnSalvar.innerHTML = "Salvando...";
    return;
  }

  el.btnSalvar.classList.remove("loading");
  el.btnSalvar.disabled = false;
  atualizarTextoBotaoSalvar();
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
  const temaSalvo = localStorage.getItem("tema");
  if (temaSalvo === "light") {
    document.body.classList.add("light");
  }
}

// =========================
// UTIL
// =========================
function limparCampos() {
  el.nome.value = "";
  el.contato.value = "";
  el.dia.value = "1";
  editandoId = null;
  atualizarTextoBotaoSalvar();
}

function aumentarDia() {
  const valor = Number(el.dia.value) || 1;
  if (valor < 31) {
    el.dia.value = String(valor + 1);
  }
}

function diminuirDia() {
  const valor = Number(el.dia.value) || 1;
  if (valor > 1) {
    el.dia.value = String(valor - 1);
  }
}

function escaparHTML(texto = "") {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function obterMesAtual() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

function obterDataHojeISO() {
  return new Date().toISOString().split("T")[0];
}

function obterStatus(cliente) {
  const hoje = new Date().getDate();
  const mesAtual = obterMesAtual();
  const enviadoNesteMes = cliente.ultimaCobrancaEm === mesAtual;

  if (enviadoNesteMes) {
    return { texto: "Resolvido", cor: "green" };
  }

  if (cliente.diaVencimento === hoje) {
    return { texto: "Hoje", cor: "orange" };
  }

  if (cliente.diaVencimento < hoje) {
    return { texto: "Atrasado", cor: "red" };
  }

  return { texto: "Em dia", cor: "blue" };
}

// =========================
// AUTH
// =========================
async function cadastrar() {
  const email = el.email.value.trim();
  const senha = el.senha.value.trim();

  if (!email || !senha) {
    return mostrarToast("Preencha email e senha", true);
  }

  try {
    setLoadingGlobal();

    const cred = await createUserWithEmailAndPassword(auth, email, senha);

    await setDoc(doc(db, "users", cred.user.uid), {
      email: cred.user.email,
      fcmToken: null,
      createdAt: new Date().toISOString(),
    });

    mostrarToast("Conta criada com sucesso");
  } catch (erro) {
    console.error(erro);
    mostrarToast("Erro ao criar conta", true);
  } finally {
    removeLoadingGlobal();
  }
}

async function login() {
  const email = el.email.value.trim();
  const senha = el.senha.value.trim();

  if (!email || !senha) {
    return mostrarToast("Preencha email e senha", true);
  }

  try {
    setLoadingGlobal();

    await signInWithEmailAndPassword(auth, email, senha);

    mostrarToast("Login realizado");

    // 🔔 garante notificação ativa
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
    }
  } catch (erro) {
    console.error(erro);
    mostrarToast("Email ou senha inválidos", true);
  } finally {
    removeLoadingGlobal();
  }
}

async function logout() {
  try {
    setLoadingGlobal();

    await signOut(auth);

    mostrarToast("Sessão encerrada");

    // 🧹 limpa interface
    el.lista.innerHTML = "";
    clientes = [];
  } catch (erro) {
    console.error(erro);
    mostrarToast("Erro ao sair", true);
  } finally {
    removeLoadingGlobal();
  }
}
// =========================
// NOTIFICAÇÕES
// =========================
async function registrarSWMensageria() {
  if (!("serviceWorker" in navigator)) return null;

  try {
    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.register(
        "./firebase-messaging-sw.js",
      );
    }
    return swRegistration;
  } catch (erro) {
    console.error("Erro ao registrar SW de mensageria:", erro);
    return null;
  }
}

async function ativarNotificacao() {
  if (!("Notification" in window)) return;
  if (!auth.currentUser) return;

  try {
    let permission = Notification.permission;

    if (permission !== "granted") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      return;
    }

    const registration = await registrarSWMensageria();
    if (!registration) return;

    const token = await getToken(messaging, {
      vapidKey:
        "BLp-Ne9os-V__uVv3tafA41DF4eLZiVScun5FSc3H2GbyOlcjIo5yglOtpvzzO0V9DnRXDoT8xIiv9FChxUEEYM",
      serviceWorkerRegistration: registration,
    });

    if (!token) return;

    await setDoc(
      doc(db, "users", auth.currentUser.uid),
      { fcmToken: token },
      { merge: true },
    );

    mostrarToast("Notificações ativadas");
  } catch (erro) {
    console.error("Erro ao ativar notificações:", erro);
    mostrarToast("Erro ao ativar notificações", true);
  }
}

function escutarNotificacao() {
  onMessage(messaging, (payload) => {
    const titulo = payload.notification?.title || "Notificação";
    const corpo = payload.notification?.body || "";

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(titulo, {
        body: corpo,
        icon: "./icons/icon-192.png",
      });
      return;
    }

    mostrarToast(`${titulo}${corpo ? ` - ${corpo}` : ""}`);
  });
}

// =========================
// COBRANÇAS
// =========================
function notificar(cliente, tipo) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  let mensagem = "";

  if (tipo === "hoje") mensagem = `💰 Hoje vence: ${cliente.nome}`;
  if (tipo === "amanha") mensagem = `⏰ Amanhã vence: ${cliente.nome}`;
  if (tipo === "atrasado") mensagem = `⚠️ ${cliente.nome} está atrasado`;

  if (!mensagem) return;

  // 🔔 NOTIFICAÇÃO
  new Notification("Cobrança", {
    body: mensagem,
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    vibrate: [200, 100, 200],
    tag: "cobranca",
    renotify: true,
    requireInteraction: true,
  });

  // 📳 vibração extra (Android)
  navigator.vibrate?.([200, 100, 200]);

  salvarNotificacao(cliente.id).catch(console.error);
}

// =========================
// CLIENTES
// =========================
async function criarCliente(nome, contato, dia) {
  if (!auth.currentUser) {
    throw new Error("Usuário não autenticado.");
  }

  await addDoc(collection(db, "clientes"), {
    uid: auth.currentUser.uid,
    nome: nome.trim(),
    contato: contato.trim(),
    diaVencimento: Number(dia),
    enviadoPor: null,
    ultimaCobrancaEm: null,
    ultimaNotificacaoEm: null,
  });

  mostrarToast("Cliente salvo com sucesso");
}

async function atualizarCliente(nome, contato, dia) {
  if (!editandoId) {
    throw new Error("Nenhum cliente selecionado para edição.");
  }

  await updateDoc(doc(db, "clientes", editandoId), {
    nome: nome.trim(),
    contato: contato.trim(),
    diaVencimento: Number(dia),
  });

  editandoId = null;
  mostrarToast("Cliente atualizado");
}

async function salvarCliente() {
  const nome = el.nome.value.trim();
  const contato = el.contato.value.trim();
  const dia = Number(el.dia.value);

  if (!nome || !contato || !dia) {
    mostrarToast("Preencha todos os campos", true);
    return;
  }

  setLoading(true);

  try {
    if (editandoId) {
      await atualizarCliente(nome, contato, dia);
    } else {
      await criarCliente(nome, contato, dia);
    }

    limparCampos();
    el.nome.focus();
  } catch (erro) {
    console.error(erro);
    mostrarToast(erro.message || "Erro ao salvar cliente", true);
  } finally {
    setLoading(false);
  }
}

function escutarClientes(uid) {
  if (unsubscribeClientes) {
    unsubscribeClientes();
    unsubscribeClientes = null;
  }

  const q = query(collection(db, "clientes"), where("uid", "==", uid));

  unsubscribeClientes = onSnapshot(q, (snap) => {
    clientes = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    renderizarLista();
    verificarCobrancas();
  });
}

async function remover(id) {
  const confirmar = window.confirm("Excluir este cliente?");
  if (!confirmar) return;

  try {
    await deleteDoc(doc(db, "clientes", id));
    mostrarToast("Cliente removido");
  } catch (erro) {
    console.error(erro);
    mostrarToast("Erro ao remover cliente", true);
  }
}

async function marcarEnviado(id) {
  const nomePessoa = window.prompt("Quem enviou?");
  if (!nomePessoa || !nomePessoa.trim()) return;

  try {
    await updateDoc(doc(db, "clientes", id), {
      enviadoPor: nomePessoa.trim(),
      ultimaCobrancaEm: obterMesAtual(),
    });

    mostrarToast("Cobrança registrada");
  } catch (erro) {
    console.error(erro);
    mostrarToast("Erro ao atualizar", true);
  }
}

function editar(id) {
  const cliente = clientes.find((item) => item.id === id);
  if (!cliente) return;

  el.nome.value = cliente.nome || "";
  el.contato.value = cliente.contato || "";
  el.dia.value = String(cliente.diaVencimento || 1);

  editandoId = id;
  atualizarTextoBotaoSalvar();
  el.nome.focus();

  mostrarToast("Modo edição ativado");
}

function resetarEstadoApp() {
  clientes = [];
  editandoId = null;
  limparCampos();
  renderizarLista();

  if (unsubscribeClientes) {
    unsubscribeClientes();
    unsubscribeClientes = null;
  }
}

// =========================
// RENDER
// =========================
function renderizarEstadoVazio() {
  el.lista.innerHTML = `
    <div class="empty-state">
      <i class="bi bi-inbox"></i>
      <p>Nenhum cliente cadastrado.</p>
    </div>
  `;
}

function criarCardCliente(cliente) {
  const status = obterStatus(cliente);

  const li = document.createElement("li");
  li.className = status.cor;

  li.innerHTML = `
    <strong>${escaparHTML(cliente.nome)}</strong><br>
    📞 ${escaparHTML(cliente.contato)}<br>
    📅 Dia ${Number(cliente.diaVencimento)}<br>

    <span class="status">${status.texto}</span>

    <div class="actions">
      <button class="btn-check" data-id="${cliente.id}" type="button" aria-label="Marcar como enviado">✔</button>
      <button class="btn-edit" data-id="${cliente.id}" type="button" aria-label="Editar cliente">✏</button>
      <button class="btn-delete" data-id="${cliente.id}" type="button" aria-label="Excluir cliente">🗑</button>
    </div>
  `;

  return li;
}

function renderizarLista() {
  if (!el.lista) return;

  el.lista.innerHTML = "";

  if (clientes.length === 0) {
    renderizarEstadoVazio();
    return;
  }

  const fragment = document.createDocumentFragment();

  clientes.forEach((cliente) => {
    fragment.appendChild(criarCardCliente(cliente));
  });

  el.lista.appendChild(fragment);
}

// =========================
// EVENTOS
// =========================
function handleListaClick(event) {
  const btn = event.target.closest("button");
  if (!btn) return;

  const id = btn.dataset.id;
  if (!id) return;

  if (btn.classList.contains("btn-delete")) {
    remover(id);
    return;
  }

  if (btn.classList.contains("btn-edit")) {
    editar(id);
    return;
  }

  if (btn.classList.contains("btn-check")) {
    marcarEnviado(id);
  }
}

function bindEvents() {
  el.formLogin?.addEventListener("submit", (event) => {
    event.preventDefault();
    login();
  });

  el.formCliente?.addEventListener("submit", (event) => {
    event.preventDefault();
    salvarCliente();
  });

  el.btnCadastrar?.addEventListener("click", cadastrar);
  el.btnLogout?.addEventListener("click", logout);
  el.btnTema?.addEventListener("click", toggleTema);
  el.btnAumentarDia?.addEventListener("click", aumentarDia);
  el.btnDiminuirDia?.addEventListener("click", diminuirDia);
  el.lista?.addEventListener("click", handleListaClick);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;

    if (el.installBtn) {
      el.installBtn.style.display = "block";
    }

    console.log("Pode instalar o app!");
  });

  window.addEventListener("load", () => {
    document.body.classList.add("loaded");
  });
}

// =========================
// PWA
// =========================
async function instalarApp() {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();

  const { outcome } = await deferredPrompt.userChoice;
  console.log("Resultado da instalação:", outcome);

  deferredPrompt = null;

  if (el.installBtn) {
    el.installBtn.style.display = "none";
  }
}

window.instalarApp = instalarApp;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then(() => console.log("PWA pronto"))
      .catch((erro) => console.error("Erro no service worker:", erro));
  });
}

// =========================
// INIT
// =========================
function init() {
  carregarTema();
  bindEvents();
  escutarNotificacao();
  mostrarAuth();

  verificarCobrancas();

  if (intervaloCobrancas) {
    clearInterval(intervaloCobrancas);
  }

  intervaloCobrancas = setInterval(verificarCobrancas, 60000);
}

function verificarCobrancas() {
  const hoje = new Date();
  const diaHoje = hoje.getDate();
  const dataHoje = obterDataHojeISO();
  const mesAtual = obterMesAtual();

  clientes.forEach((cliente) => {
    const jaNotificadoHoje = cliente.ultimaNotificacaoEm === dataHoje;
    const jaCobrado = cliente.ultimaCobrancaEm === mesAtual;

    if (jaNotificadoHoje || jaCobrado) return;

    const diasRestantes = Number(cliente.diaVencimento) - diaHoje;

    if (diasRestantes === 0) {
      notificar(cliente, "hoje");
      return;
    }

    if (diasRestantes === 1) {
      notificar(cliente, "amanha");
      return;
    }

    if (diasRestantes < 0) {
      notificar(cliente, "atrasado");
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    mostrarApp();
    escutarClientes(user.uid);

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists() || !userSnap.data().fcmToken) {
        await ativarNotificacao();
      }
    } catch (erro) {
      console.error("Erro ao verificar token do usuário:", erro);
    }

    return;
  }

  resetarEstadoApp();
  mostrarAuth();
});

init();

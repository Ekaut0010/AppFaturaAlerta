// =========================
// FIREBASE — IMPORTS
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
// FIREBASE — CONFIG
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
// CONSTANTES
// =========================

const THEME_KEY = "theme";
const VAPID_KEY =
  "BLp-Ne9os-V__uVv3tafA41DF4eLZiVScun5FSc3H2GbyOlcjIo5yglOtpvzzO0V9DnRXDoT8xIiv9FChxUEEYM";
const CHECK_INTERVAL_MS = 60_000;

// =========================
// ESTADO
// =========================

const state = {
  clientes: [],
  editandoId: null,

  unsubscribeClientes: null,
  deferredPrompt: null,
  swRegistration: null,
  intervaloCobrancas: null,
  jaEscutandoNotificacao: false,
};

// =========================
// DOM
// =========================

/** @param {string} id */
const $ = (id) => document.getElementById(id);

const el = {
  screens: {
    auth: $("auth"),
    app: $("app"),
  },
  forms: {
    login: $("formLogin"),
    cliente: $("formCliente"),
  },
  inputs: {
    email: $("email"),
    senha: $("senha"),
    nome: $("nome"),
    contato: $("contato"),
    dia: $("dia"),
  },
  lista: $("listaClientes"),
  buttons: {
    cadastrar: $("btnCadastrar"),
    logout: $("btnLogout"),
    tema: $("btnTema"),
    diminuirDia: $("btnDiminuirDia"),
    aumentarDia: $("btnAumentarDia"),
    salvar: $("btnSalvar"),
    instalar: document.querySelector(".install-btn"),
  },
};

// =========================
// UTILITÁRIOS
// =========================

/** Escapa HTML para evitar XSS. */
const escaparHTML = (texto = "") =>
  String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

/** Retorna o mês atual no formato YYYY-MM. */
const obterMesAtual = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

/** Retorna a data de hoje no formato YYYY-MM-DD. */
const obterDataHojeISO = () => new Date().toISOString().split("T")[0];

// =========================
// STATUS DO CLIENTE
// =========================

const STATUS_MAP = {
  resolvido: { texto: "Resolvido", cor: "green" },
  hoje: { texto: "Hoje", cor: "orange" },
  atrasado: { texto: "Atrasado", cor: "red" },
  emDia: { texto: "Em dia", cor: "blue" },
};

/** Deriva o status visual de um cliente. */
function obterStatus(cliente) {
  const hoje = new Date().getDate();

  if (cliente.ultimaCobrancaEm === obterMesAtual()) return STATUS_MAP.resolvido;

  const dia = Number(cliente.diaVencimento);
  if (dia === hoje) return STATUS_MAP.hoje;
  if (dia < hoje) return STATUS_MAP.atrasado;
  return STATUS_MAP.emDia;
}

// =========================
// UI — TELAS
// =========================

const mostrarAuth = () => {
  el.screens.auth.style.display = "flex";
  el.screens.app.style.display = "none";
};

const mostrarApp = () => {
  el.screens.auth.style.display = "none";
  el.screens.app.style.display = "flex";
};

// =========================
// UI — TOAST
// =========================

function mostrarToast(mensagem, erro = false) {
  const toast = Object.assign(document.createElement("div"), {
    className: `toast${erro ? " error" : ""}`,
    textContent: mensagem,
  });

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 200);
  }, 2200);
}

// =========================
// UI — LOADER GLOBAL
// =========================

function setLoadingGlobal(ativo = true) {
  if (ativo) {
    if (document.querySelector(".app-loader")) return;

    const loader = Object.assign(document.createElement("div"), {
      className: "app-loader",
      textContent: "Carregando...",
    });
    document.body.appendChild(loader);
    return;
  }

  document.querySelector(".app-loader")?.remove();
}

// =========================
// UI — BOTÃO SALVAR
// =========================

function atualizarTextoBotaoSalvar() {
  const btn = el.buttons.salvar;
  if (!btn) return;

  btn.innerHTML = state.editandoId
    ? '<i class="bi bi-pencil-square"></i> <span>Atualizar cliente</span>'
    : '<i class="bi bi-save"></i> <span>Salvar cliente</span>';
}

function setLoadingBotao(ativo) {
  const btn = el.buttons.salvar;
  if (!btn) return;

  if (ativo) {
    btn.classList.add("loading");
    btn.disabled = true;
    btn.innerHTML = "Salvando...";
    return;
  }

  btn.classList.remove("loading");
  btn.disabled = false;
  atualizarTextoBotaoSalvar();
}

// =========================
// TEMA
// =========================

const isLightMode = () => document.body.classList.contains("light");
const aplicarTema = (tema) =>
  document.body.classList.toggle("light", tema === "light");

function toggleTema() {
  const novoTema = isLightMode() ? "dark" : "light";
  aplicarTema(novoTema);
  localStorage.setItem(THEME_KEY, novoTema);
}

function carregarTema() {
  aplicarTema(localStorage.getItem(THEME_KEY) ?? "dark");
}

// =========================
// FORMULÁRIO — HELPERS
// =========================

function limparCampos() {
  el.inputs.nome.value = "";
  el.inputs.contato.value = "";
  el.inputs.dia.value = "1";

  state.editandoId = null;
  atualizarTextoBotaoSalvar();
}

function alterarDia(delta) {
  const atual = Number(el.inputs.dia.value) || 1;
  const novo = atual + delta;

  if (novo >= 1 && novo <= 31) el.inputs.dia.value = String(novo);
}

const obterCredenciais = () => ({
  email: el.inputs.email.value.trim(),
  senha: el.inputs.senha.value.trim(),
});

const obterDadosCliente = () => ({
  nome: el.inputs.nome.value.trim(),
  contato: el.inputs.contato.value.trim(),
  dia: Number(el.inputs.dia.value),
});

// =========================
// AUTH
// =========================

async function cadastrar() {
  const { email, senha } = obterCredenciais();

  if (!email || !senha) return mostrarToast("Preencha email e senha", true);

  try {
    setLoadingGlobal(true);

    const { user } = await createUserWithEmailAndPassword(auth, email, senha);

    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      fcmToken: null,
      createdAt: new Date().toISOString(),
    });

    mostrarToast("Conta criada com sucesso");
  } catch (erro) {
    console.error(erro);
    mostrarToast("Erro ao criar conta", true);
  } finally {
    setLoadingGlobal(false);
  }
}

async function login() {
  const { email, senha } = obterCredenciais();

  if (!email || !senha) return mostrarToast("Preencha email e senha", true);

  try {
    setLoadingGlobal(true);
    await signInWithEmailAndPassword(auth, email, senha);
    mostrarToast("Login realizado");
  } catch (erro) {
    console.error(erro);
    mostrarToast("Email ou senha inválidos", true);
  } finally {
    setLoadingGlobal(false);
  }
}

async function logout() {
  try {
    setLoadingGlobal(true);
    await signOut(auth);
    mostrarToast("Sessão encerrada");
  } catch (erro) {
    console.error(erro);
    mostrarToast("Erro ao sair", true);
  } finally {
    setLoadingGlobal(false);
  }
}

// =========================
// NOTIFICAÇÕES
// =========================

const temSuporteNotificacao = () => "Notification" in window;

async function garantirPermissao() {
  if (!temSuporteNotificacao()) {
    console.warn("Notificações não suportadas");
    return false;
  }

  const { permission } = Notification;

  if (permission === "granted") return true;
  if (permission !== "default") {
    console.warn("Notificações bloqueadas");
    return false;
  }

  return (await Notification.requestPermission()) === "granted";
}

async function registrarSWMensageria() {
  if (!("serviceWorker" in navigator)) return null;

  try {
    state.swRegistration ??= await navigator.serviceWorker.register(
      "./firebase-messaging-sw.js",
    );
    return state.swRegistration;
  } catch (erro) {
    console.error("Erro ao registrar SW:", erro);
    return null;
  }
}

async function ativarNotificacao() {
  if (!auth.currentUser) return;

  try {
    const [permitido, registration] = await Promise.all([
      garantirPermissao(),
      registrarSWMensageria(),
    ]);

    if (!permitido || !registration) return;

    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data()?.fcmToken) return;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn("Token não gerado");
      return;
    }

    await setDoc(userRef, { fcmToken: token }, { merge: true });
    mostrarToast("Notificações ativadas");
  } catch (erro) {
    console.error("Erro ao ativar notificações:", erro);
    mostrarToast("Erro ao ativar notificações", true);
  }
}

function mostrarNotificacao(titulo, corpo) {
  if (!temSuporteNotificacao() || Notification.permission !== "granted") return;

  new Notification(titulo, {
    body: corpo,
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    vibrate: [200, 100, 200],
    tag: "cobranca",
    renotify: true,
  });
}

function escutarNotificacao() {
  onMessage(messaging, ({ notification = {} }) => {
    const titulo = notification.title || "Notificação";
    const corpo = notification.body || "";

    mostrarNotificacao(titulo, corpo);

    if (Notification.permission !== "granted") {
      mostrarToast(`${titulo}${corpo ? ` – ${corpo}` : ""}`);
    }
  });
}

// =========================
// COBRANÇAS
// =========================

const MENSAGENS_COBRANCA = {
  hoje: (nome) => `💰 Hoje vence: ${nome}`,
  amanha: (nome) => `⏰ Amanhã vence: ${nome}`,
  atrasado: (nome) => `⚠️ ${nome} está atrasado`,
};

async function notificar(cliente, tipo) {
  if (!temSuporteNotificacao() || Notification.permission !== "granted") return;

  const mensagem = MENSAGENS_COBRANCA[tipo]?.(cliente.nome);
  if (!mensagem) return;

  new Notification("Cobrança", {
    body: mensagem,
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    vibrate: [200, 100, 200],
    tag: "cobranca",
    renotify: true,
    requireInteraction: true,
  });

  navigator.vibrate?.([200, 100, 200]);

  try {
    await updateDoc(doc(db, "clientes", cliente.id), {
      ultimaNotificacaoEm: obterDataHojeISO(),
    });
  } catch (erro) {
    console.error("Erro ao salvar notificação:", erro);
  }
}

function verificarCobrancas() {
  const diaHoje = new Date().getDate();
  const dataHoje = obterDataHojeISO();
  const mes = obterMesAtual();

  for (const cliente of state.clientes) {
    if (cliente.ultimaNotificacaoEm === dataHoje) continue;
    if (cliente.ultimaCobrancaEm === mes) continue;

    const diff = Number(cliente.diaVencimento) - diaHoje;

    if (diff === 0) notificar(cliente, "hoje");
    else if (diff === 1) notificar(cliente, "amanha");
    else if (diff < 0) notificar(cliente, "atrasado");
  }
}

function iniciarVerificacaoCobrancas() {
  if (state.intervaloCobrancas) return;
  verificarCobrancas();
  state.intervaloCobrancas = setInterval(verificarCobrancas, CHECK_INTERVAL_MS);
}

function pararVerificacaoCobrancas() {
  clearInterval(state.intervaloCobrancas);
  state.intervaloCobrancas = null;
}

// =========================
// CLIENTES — CRUD
// =========================

async function criarCliente({ nome, contato, dia }) {
  if (!auth.currentUser) throw new Error("Usuário não autenticado.");

  await addDoc(collection(db, "clientes"), {
    uid: auth.currentUser.uid,
    nome,
    contato,
    diaVencimento: dia,
    enviadoPor: null,
    ultimaCobrancaEm: null,
    ultimaNotificacaoEm: null,
  });

  mostrarToast("Cliente salvo com sucesso");
}

async function atualizarCliente({ nome, contato, dia }) {
  if (!state.editandoId)
    throw new Error("Nenhum cliente selecionado para edição.");

  await updateDoc(doc(db, "clientes", state.editandoId), {
    nome,
    contato,
    diaVencimento: dia,
  });

  state.editandoId = null;
  mostrarToast("Cliente atualizado");
}

async function salvarCliente() {
  const dados = obterDadosCliente();

  if (!dados.nome || !dados.contato || !dados.dia) {
    return mostrarToast("Preencha todos os campos", true);
  }

  setLoadingBotao(true);

  try {
    await (state.editandoId ? atualizarCliente(dados) : criarCliente(dados));
    limparCampos();
    el.inputs.nome.focus();
  } catch (erro) {
    console.error(erro);
    mostrarToast(erro.message || "Erro ao salvar cliente", true);
  } finally {
    setLoadingBotao(false);
  }
}

function escutarClientes(uid) {
  state.unsubscribeClientes?.();

  const q = query(collection(db, "clientes"), where("uid", "==", uid));

  state.unsubscribeClientes = onSnapshot(q, (snap) => {
    state.clientes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderizarLista();
    verificarCobrancas();
  });
}

async function remover(id) {
  if (!confirm("Excluir este cliente?")) return;

  try {
    await deleteDoc(doc(db, "clientes", id));
    mostrarToast("Cliente removido");
  } catch (erro) {
    console.error(erro);
    mostrarToast("Erro ao remover cliente", true);
  }
}

async function marcarEnviado(id) {
  const nomePessoa = prompt("Quem enviou?")?.trim();
  if (!nomePessoa) return;

  try {
    await updateDoc(doc(db, "clientes", id), {
      enviadoPor: nomePessoa,
      ultimaCobrancaEm: obterMesAtual(),
    });
    mostrarToast("Cobrança registrada");
  } catch (erro) {
    console.error(erro);
    mostrarToast("Erro ao atualizar", true);
  }
}

function editar(id) {
  const cliente = state.clientes.find((c) => c.id === id);
  if (!cliente) return;

  el.inputs.nome.value = cliente.nome ?? "";
  el.inputs.contato.value = cliente.contato ?? "";
  el.inputs.dia.value = String(cliente.diaVencimento ?? 1);

  state.editandoId = id;
  atualizarTextoBotaoSalvar();
  el.inputs.nome.focus();

  mostrarToast("Modo edição ativado");
}

function resetarEstadoApp() {
  state.clientes = [];
  state.editandoId = null;

  state.unsubscribeClientes?.();
  state.unsubscribeClientes = null;

  limparCampos();
  renderizarLista();
}

// =========================
// RENDER
// =========================

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
      <button class="btn-check"  data-id="${cliente.id}" type="button" aria-label="Marcar como enviado">✔</button>
      <button class="btn-edit"   data-id="${cliente.id}" type="button" aria-label="Editar cliente">✏</button>
      <button class="btn-delete" data-id="${cliente.id}" type="button" aria-label="Excluir cliente">🗑</button>
    </div>
  `;

  return li;
}

function renderizarLista() {
  const lista = el.lista;
  if (!lista) return;

  if (state.clientes.length === 0) {
    lista.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-inbox"></i>
        <p>Nenhum cliente cadastrado.</p>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();
  state.clientes.forEach((c) => fragment.appendChild(criarCardCliente(c)));

  lista.innerHTML = "";
  lista.appendChild(fragment);
}

// =========================
// EVENTOS
// =========================

function handleListaClick({ target }) {
  const btn = target.closest("button[data-id]");
  if (!btn) return;

  const { id } = btn.dataset;

  if (btn.classList.contains("btn-delete")) remover(id);
  else if (btn.classList.contains("btn-edit")) editar(id);
  else if (btn.classList.contains("btn-check")) marcarEnviado(id);
}

function bindEvents() {
  el.forms.login?.addEventListener("submit", (e) => {
    e.preventDefault();
    login();
  });
  el.forms.cliente?.addEventListener("submit", (e) => {
    e.preventDefault();
    salvarCliente();
  });

  el.buttons.cadastrar?.addEventListener("click", cadastrar);
  el.buttons.logout?.addEventListener("click", logout);
  el.buttons.tema?.addEventListener("click", toggleTema);
  el.buttons.aumentarDia?.addEventListener("click", () => alterarDia(+1));
  el.buttons.diminuirDia?.addEventListener("click", () => alterarDia(-1));

  el.lista?.addEventListener("click", handleListaClick);

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    state.deferredPrompt = e;
    if (el.buttons.instalar) el.buttons.instalar.style.display = "block";
  });

  window.addEventListener("load", () => document.body.classList.add("loaded"));
}

// =========================
// PWA
// =========================

async function instalarApp() {
  const prompt = state.deferredPrompt;
  if (!prompt) return;

  prompt.prompt();

  const { outcome } = await prompt.userChoice;
  console.log("Resultado da instalação:", outcome);

  state.deferredPrompt = null;
  if (el.buttons.instalar) el.buttons.instalar.style.display = "none";
}

window.instalarApp = instalarApp;

function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker
    .register("./service-worker.js")
    .then(() => console.log("✅ PWA pronto"))
    .catch((e) => console.error("❌ Erro no service worker:", e));
}

window.addEventListener("load", registrarServiceWorker);

// =========================
// AUTH STATE
// =========================

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    pararVerificacaoCobrancas();
    resetarEstadoApp();
    mostrarAuth();
    return;
  }

  mostrarApp();
  escutarClientes(user.uid);

  if (!state.jaEscutandoNotificacao) {
    escutarNotificacao();
    state.jaEscutandoNotificacao = true;
  }

  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (!userSnap.exists() || !userSnap.data()?.fcmToken)
      await ativarNotificacao();
  } catch (erro) {
    console.error("Erro ao verificar token:", erro);
  }

  iniciarVerificacaoCobrancas();
});

// =========================
// INIT
// =========================

function init() {
  carregarTema();
  bindEvents();
  mostrarAuth();
}

init();

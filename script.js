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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const messaging = getMessaging(app);

// =========================
// ESTADO
// =========================
let clientes = [];
let editandoId = null;

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
};

// =========================
// TEMA
// =========================
function setLoadingGlobal() {
  const loader = document.createElement("div");
  loader.className = "app-loader";
  loader.innerHTML = "Carregando...";
  document.body.appendChild(loader);
}

function removeLoadingGlobal() {
  document.querySelector(".app-loader")?.remove();
}

window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});

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
// TOAST
// =========================
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

// =========================
// LOADING
// =========================
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
  el.btnSalvar.innerHTML =
    el.btnSalvar.dataset.originalText ||
    '<i class="bi bi-save"></i> Salvar cliente';
}

// =========================
// UTIL
// =========================
function limparCampos() {
  el.nome.value = "";
  el.contato.value = "";
  el.dia.value = "1";
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

function obterStatus(cliente) {
  const hoje = new Date().getDate();

  const agora = new Date();
  const mesAtual = `${agora.getFullYear()}-${String(
    agora.getMonth() + 1,
  ).padStart(2, "0")}`;

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
    const cred = await createUserWithEmailAndPassword(auth, email, senha);

    await setDoc(doc(db, "users", cred.user.uid), {
      email: cred.user.email,
      fcmToken: null,
      createdAt: new Date().toISOString(),
    });

    mostrarToast("Conta criada com sucesso");
  } catch (erro) {
    console.error(erro);
    mostrarToast(erro.message || "Erro ao criar conta", true);
  }
}

async function login() {
  const email = el.email.value.trim();
  const senha = el.senha.value.trim();

  if (!email || !senha) {
    return mostrarToast("Preencha email e senha", true);
  }

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    mostrarToast("Login realizado");
  } catch (erro) {
    console.error(erro);
    mostrarToast(erro.message || "Erro ao entrar", true);
  }
}

async function logout() {
  try {
    await signOut(auth);
    mostrarToast("Sessão encerrada");
  } catch (erro) {
    console.error(erro);
    mostrarToast("Erro ao sair", true);
  }
}

// =========================
// NOTIFICAÇÕES
// =========================
let swRegistration = null;

async function registrarSW() {
  if (!("serviceWorker" in navigator)) return null;

  try {
    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.register(
        "./firebase-messaging-sw.js",
      );
    }
    return swRegistration;
  } catch (erro) {
    console.error("Erro ao registrar SW:", erro);
    return null;
  }
}

async function ativarNotificacao() {
  if (!("Notification" in window)) {
    console.warn("Notificações não suportadas");
    return;
  }

  if (!auth.currentUser) return;

  try {
    // 👇 evita pedir permissão toda hora
    let permission = Notification.permission;

    if (permission !== "granted") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      console.warn("Permissão negada");
      return;
    }

    const registration = await registrarSW();
    if (!registration) return;

    const token = await getToken(messaging, {
      vapidKey:
        "BLp-Ne9os-V__uVv3tafA41DF4eLZiVScun5FSc3H2GbyOlcjIo5yglOtpvzzO0V9DnRXDoT8xIiv9FChxUEEYM",
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn("Token não gerado");
      return;
    }

    await setDoc(
      doc(db, "users", auth.currentUser.uid),
      { fcmToken: token },
      { merge: true },
    );

    console.log("🔥 Token salvo:", token);
    mostrarToast("Notificações ativadas");
  } catch (erro) {
    console.error("Erro ao ativar notificações:", erro);
    mostrarToast("Erro ao ativar notificações", true);
  }
}

// =========================
// RECEBER NOTIFICAÇÃO
// =========================
function escutarNotificacao() {
  onMessage(messaging, (payload) => {
    const titulo = payload.notification?.title || "Notificação";
    const corpo = payload.notification?.body || "";

    console.log("📩 Notificação recebida:", payload);

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(titulo, {
        body: corpo,
        icon: "./icons/icon-192.png",
      });
      return;
    }

    // fallback
    mostrarToast(`${titulo}${corpo ? ` - ${corpo}` : ""}`);
  });
}

// =========================
// NOTIFICAÇÃO INTELIGENTE
// =========================

function verificarCobrancas() {
  const hoje = new Date();
  const diaHoje = hoje.getDate();
  const dataHoje = hoje.toISOString().split("T")[0];

  const mesAtual = `${hoje.getFullYear()}-${String(
    hoje.getMonth() + 1,
  ).padStart(2, "0")}`;

  clientes.forEach((cliente) => {
    const jaNotificadoHoje = cliente.ultimaNotificacaoEm === dataHoje;

    const jaCobrado = cliente.ultimaCobrancaEm === mesAtual;

    if (jaNotificadoHoje || jaCobrado) return;

    const diasRestantes = cliente.diaVencimento - diaHoje;

    if (diasRestantes === 0) {
      notificar(cliente, "hoje");
    } else if (diasRestantes === 1) {
      notificar(cliente, "amanha");
    } else if (diasRestantes < 0) {
      notificar(cliente, "atrasado");
    }
  });
}

function notificar(cliente, tipo) {
  if (Notification.permission !== "granted") return;

  let mensagem = "";

  if (tipo === "hoje") {
    mensagem = `${cliente.nome} vence hoje`;
  }

  if (tipo === "amanha") {
    mensagem = `${cliente.nome} vence amanhã`;
  }

  if (tipo === "atrasado") {
    mensagem = `${cliente.nome} está atrasado`;
  }

  new Notification("💰 Cobrança", {
    body: mensagem,
    icon: "./icons/icon-192.png",
  });

  salvarNotificacao(cliente.id);
}

async function salvarNotificacao(id) {
  const hoje = new Date().toISOString().split("T")[0];

  await updateDoc(doc(db, "clientes", id), {
    ultimaNotificacaoEm: hoje,
  });
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
    return mostrarToast("Preencha todos os campos", true);
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
  const q = query(collection(db, "clientes"), where("uid", "==", uid));

  onSnapshot(q, (snap) => {
    clientes = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

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
  const nomePessoa = prompt("Quem enviou?");
  if (!nomePessoa) return;

  const agora = new Date();
  const referenciaMes = `${agora.getFullYear()}-${String(
    agora.getMonth() + 1,
  ).padStart(2, "0")}`;

  try {
    await updateDoc(doc(db, "clientes", id), {
      enviadoPor: nomePessoa.trim(),
      ultimaCobrancaEm: referenciaMes,
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

  el.nome.value = cliente.nome;
  el.contato.value = cliente.contato;
  el.dia.value = String(cliente.diaVencimento);
  editandoId = id;

  el.nome.focus();
  mostrarToast("Modo edição ativado");
  el.btnSalvar.innerHTML = "Atualizar cliente";
  el.btnSalvar.innerHTML = '<i class="bi bi-save"></i> Salvar cliente';
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
    <strong>${cliente.nome}</strong><br>
    📞 ${cliente.contato}<br>
    📅 Dia ${cliente.diaVencimento}<br>

    <span class="status">${status.texto}</span>

    <div class="actions">
      <button class="btn-check" data-id="${cliente.id}" type="button">✔</button>
      <button class="btn-edit" data-id="${cliente.id}" type="button">✏</button>
      <button class="btn-delete" data-id="${cliente.id}" type="button">🗑</button>
    </div>
  `;

  return li;
}

function renderizarLista() {
  el.lista.innerHTML = "";

  if (clientes.length === 0) {
    return renderizarEstadoVazio();
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
    return remover(id);
  }

  if (btn.classList.contains("btn-edit")) {
    return editar(id);
  }

  if (btn.classList.contains("btn-check")) {
    return marcarEnviado(id);
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
}

// =========================
// INIT
// =========================
function init() {
  carregarTema();
  bindEvents();
  escutarNotificacao();

  verificarCobrancas(); // 🔥 imediato
  setInterval(verificarCobrancas, 60000); // 🔥 automático
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    el.auth.style.display = "none";
    el.app.style.display = "block";

    escutarClientes(user.uid);
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || !userSnap.data().fcmToken) {
      await ativarNotificacao();
    }
    return;
  }

  el.auth.hidden = false;
  el.app.hidden = true;

  el.auth.style.display = "flex";
  el.app.style.display = "none";
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then(() => console.log("PWA pronto"))
      .catch(console.error);
  });
}
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  console.log("Pode instalar o app!");
});
async function instalarApp() {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();

  const { outcome } = await deferredPrompt.userChoice;
  console.log("Resultado:", outcome);

  deferredPrompt = null;
}

window.instalarApp = instalarApp;
init();

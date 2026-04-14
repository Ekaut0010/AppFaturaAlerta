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
  nome: document.getElementById("nome"),
  contato: document.getElementById("contato"),
  dia: document.getElementById("dia"),
  lista: document.getElementById("listaClientes"),
  auth: document.getElementById("auth"),
  app: document.getElementById("app"),
  email: document.getElementById("email"),
  senha: document.getElementById("senha"),
  btnLogin: document.getElementById("btnLogin"),
  btnCadastrar: document.getElementById("btnCadastrar"),
  btnTema: document.getElementById("btnTema"),
  btnLogout: document.getElementById("btnLogout"),
  btnDiminuirDia: document.getElementById("btnDiminuirDia"),
  btnAumentarDia: document.getElementById("btnAumentarDia"),
  btnSalvar: document.getElementById("btnSalvar"),
};

// =========================
// UI / TEMA
// =========================
function toggleTema() {
  document.body.classList.toggle("light");
  localStorage.setItem(
    "tema",
    document.body.classList.contains("light") ? "light" : "dark",
  );
}

function carregarTema() {
  if (localStorage.getItem("tema") === "light") {
    document.body.classList.add("light");
  }
}

// =========================
// AUTH
// =========================
async function cadastrar() {
  try {
    const cred = await createUserWithEmailAndPassword(
      auth,
      el.email.value.trim(),
      el.senha.value.trim(),
    );

    await setDoc(doc(db, "users", cred.user.uid), {
      email: cred.user.email,
      fcmToken: null,
    });

    alert("Conta criada!");
  } catch (e) {
    alert(e.message);
  }
}

async function login() {
  try {
    await signInWithEmailAndPassword(
      auth,
      el.email.value.trim(),
      el.senha.value.trim(),
    );
  } catch (e) {
    alert(e.message);
  }
}

function logout() {
  signOut(auth);
}

// =========================
// NOTIFICAÇÕES
// =========================
async function ativarNotificacao() {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  const token = await getToken(messaging, {
    vapidKey: "SUA_VAPID_KEY",
  });

  if (!token || !auth.currentUser) return;

  await setDoc(
    doc(db, "users", auth.currentUser.uid),
    { fcmToken: token },
    { merge: true },
  );
}

function escutarNotificacao() {
  onMessage(messaging, (payload) => {
    new Notification(payload.notification.title, {
      body: payload.notification.body,
    });
  });
}

function setLoading(estado) {
  if (estado) {
    el.btnSalvar.classList.add("loading");
    el.btnSalvar.dataset.text = el.btnSalvar.innerHTML;
    el.btnSalvar.innerHTML = "Salvando...";
  } else {
    el.btnSalvar.classList.remove("loading");
    el.btnSalvar.innerHTML = el.btnSalvar.dataset.text;
  }
}
// =========================
// CLIENTES
// =========================
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
    mostrarToast("Erro ao salvar cliente", true);
  } finally {
    setLoading(false);
  }
}

async function criarCliente(nome, contato, dia) {
  if (!auth.currentUser) {
    throw new Error("Usuário não autenticado.");
  }

  await addDoc(collection(db, "clientes"), {
    uid: auth.currentUser.uid,
    nome: nome.trim(),
    contato: contato.trim(),
    diaVencimento: Number(dia),
    mensagemEnviada: false,
    enviadoPor: null,
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

function escutarClientes(uid) {
  const q = query(collection(db, "clientes"), where("uid", "==", uid));

  onSnapshot(q, (snap) => {
    clientes = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    renderizarLista();
  });
}
// =========================
// TOAST
// =========================

function mostrarToast(msg, erro = false) {
  const toast = document.createElement("div");
  toast.className = `toast ${erro ? "error" : ""}`;
  toast.textContent = msg;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 200);
  }, 2200);
}
// =========================
// STATUS
// =========================
function obterStatus(c) {
  const hoje = new Date().getDate();

  if (c.mensagemEnviada) return { txt: "Resolvido", cor: "green" };
  if (c.diaVencimento === hoje) return { txt: "Hoje", cor: "orange" };
  if (c.diaVencimento < hoje) return { txt: "Atrasado", cor: "red" };

  return { txt: "Em dia", cor: "blue" };
}

// =========================
// RENDER
// =========================
function renderizarLista() {
  el.lista.innerHTML = "";

  if (clientes.length === 0) {
    el.lista.innerHTML = `<div class="empty-state">Sem clientes</div>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  clientes.forEach((c) => {
    const s = obterStatus(c);

    const li = document.createElement("li");
    li.className = s.cor;

    li.innerHTML = `
      <strong>${c.nome}</strong><br>
      📞 ${c.contato}<br>
      📅 Dia ${c.diaVencimento}<br>

      <span class="status">${s.txt}</span>

      <div class="actions">
        <button class="btn-check" data-id="${c.id}">✔</button>
        <button class="btn-edit" data-id="${c.id}">✏</button>
        <button class="btn-delete" data-id="${c.id}">🗑</button>
      </div>
    `;

    fragment.appendChild(li);
  });

  el.lista.appendChild(fragment);
}

// =========================
// AÇÕES
// =========================
async function remover(id) {
  if (!confirm("Excluir?")) return;
  await deleteDoc(doc(db, "clientes", id));
}

async function marcarEnviado(id) {
  const nome = prompt("Quem enviou?");
  if (!nome) return;

  await updateDoc(doc(db, "clientes", id), {
    mensagemEnviada: true,
    enviadoPor: nome,
  });
}

function editar(id) {
  const c = clientes.find((x) => x.id === id);

  el.nome.value = c.nome;
  el.contato.value = c.contato;
  el.dia.value = c.diaVencimento;

  editandoId = id;
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
  const v = Number(el.dia.value);
  if (v < 31) el.dia.value = v + 1;
}

function diminuirDia() {
  const v = Number(el.dia.value);
  if (v > 1) el.dia.value = v - 1;
}

// =========================
// EVENTOS
// =========================
// =========================
// EVENTOS (PROFISSIONAL)
// =========================
function bindEvents() {
  // LOGIN
  document.getElementById("formLogin").addEventListener("submit", (e) => {
    e.preventDefault();
    login();
  });

  // CADASTRO
  el.btnCadastrar.addEventListener("click", cadastrar);

  // LOGOUT
  el.btnLogout.addEventListener("click", logout);

  // FORM CLIENTE
  document.getElementById("formCliente").addEventListener("submit", (e) => {
    e.preventDefault();
    salvarCliente();
  });

  // DIA
  el.btnAumentarDia.addEventListener("click", aumentarDia);
  el.btnDiminuirDia.addEventListener("click", diminuirDia);

  // TEMA
  el.btnTema.addEventListener("click", toggleTema);

  // 🔥 EVENT DELEGATION (IMPORTANTE)
  el.lista.addEventListener("click", handleListaClick);
}

function handleListaClick(e) {
  const btn = e.target.closest("button");
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
// =========================
// INIT
// =========================
function init() {
  carregarTema();
  bindEvents();
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    el.auth.style.display = "none";
    el.app.style.display = "block";

    escutarClientes(user.uid);
    escutarNotificacao();
    await ativarNotificacao();
  } else {
    el.auth.style.display = "block";
    el.app.style.display = "none";
  }
});

init();

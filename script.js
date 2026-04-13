console.log("SCRIPT CARREGOU");
window.adicionarCliente = () => console.log("clicou salvar");

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
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// =========================
// CONFIG
// =========================
const firebaseConfig = {
  apiKey: "AIzaSyBLeiDpZp2AZ-m_yM1C63OqFx0p7HGZLDc", // 🔥 SUA KEY REAL
  authDomain: "faturaapp-49a98.firebaseapp.com",
  projectId: "faturaapp-49a98",
  storageBucket: "faturaapp-49a98.firebasestorage.app",
  messagingSenderId: "120182099403",
  appId: "1:120182099403:web:7f313c0713f582de71fa4e",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// =========================
// ESTADO
// =========================
let clientes = [];
let editandoId = null;

// =========================
// DOM (centralizado)
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
// TEMA
// =========================
function toggleTema() {
  document.body.classList.toggle("light");

  const tema = document.body.classList.contains("light") ? "light" : "dark";

  localStorage.setItem("tema", tema);
}

function carregarTema() {
  const tema = localStorage.getItem("tema");
  if (tema === "light") document.body.classList.add("light");
}

// =========================
// AUTH
// =========================
async function cadastrar() {
  try {
    await createUserWithEmailAndPassword(auth, el.email.value, el.senha.value);
    alert("Conta criada!");
  } catch (erro) {
    alert(erro.message);
  }
}

async function login() {
  try {
    await signInWithEmailAndPassword(auth, el.email.value, el.senha.value);
  } catch (erro) {
    alert(erro.message);
  }
}

function logout() {
  signOut(auth);
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    el.auth.style.display = "none";
    el.app.style.display = "block";
    escutarClientes(user.uid);
  } else {
    el.auth.style.display = "block";
    el.app.style.display = "none";
  }
});

// =========================
// INPUT DIA
// =========================
function aumentarDia() {
  const valor = Number(el.dia.value) || 1;
  if (valor < 31) el.dia.value = valor + 1;
}

function diminuirDia() {
  const valor = Number(el.dia.value) || 1;
  if (valor > 1) el.dia.value = valor - 1;
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
// CRUD
// =========================
async function adicionarCliente() {
  const nome = el.nome.value.trim();
  const contato = el.contato.value.trim();
  const dia = Number(el.dia.value);

  if (!nome || !contato || !dia) {
    alert("Preencha tudo!");
    return;
  }

  try {
    if (editandoId) {
      await updateDoc(doc(db, "clientes", editandoId), {
        nome,
        contato,
        diaVencimento: dia,
      });
      editandoId = null;
    } else {
      await addDoc(collection(db, "clientes"), {
        uid: auth.currentUser.uid,
        nome,
        contato,
        diaVencimento: dia,
        mensagemEnviada: false,
        enviadoPor: null,
      });
    }

    limparCampos();
  } catch (erro) {
    console.error(erro);
    alert("Erro ao salvar");
  }
}

async function removerCliente(id) {
  if (!confirm("Tem certeza?")) return;
  await deleteDoc(doc(db, "clientes", id));
}

async function marcarEnviado(id) {
  const nomePessoa = prompt("Quem enviou?");
  if (!nomePessoa) return;

  await updateDoc(doc(db, "clientes", id), {
    mensagemEnviada: true,
    enviadoPor: nomePessoa,
  });
}

// =========================
// TEMPO REAL
// =========================
function escutarClientes(uid) {
  const q = query(collection(db, "clientes"), where("uid", "==", uid));

  onSnapshot(q, (snapshot) => {
    clientes = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    renderizarLista();
  });
}

// =========================
// RENDER
// =========================
function renderizarLista() {
  el.lista.innerHTML = "";

  clientes.forEach((cliente) => {
    const status = obterStatus(cliente);

    const li = document.createElement("li");
    li.classList.add(status.cor);

    li.innerHTML = `
  <strong>${cliente.nome}</strong><br>
  📞 ${cliente.contato}<br>
  📅 Dia ${cliente.diaVencimento}<br>

  <span class="status" style="color:${status.cor}">
    ${status.texto}
  </span>

  <div class="actions">
    <button class="btn-check" onclick="marcarEnviado('${cliente.id}')">✔</button>
    <button class="btn-edit" onclick="editarClientes('${cliente.id}')">✏</button>
    <button class="btn-delete" onclick="removerCliente('${cliente.id}')">🗑</button>
  </div>
`;

    el.lista.appendChild(li);
  });
}

// =========================
// EDITAR
// =========================
function editarClientes(id) {
  const cliente = clientes.find((c) => c.id === id);

  el.nome.value = cliente.nome;
  el.contato.value = cliente.contato;
  el.dia.value = cliente.diaVencimento;

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

// =========================
// INIT
// =========================
function configurarEventos() {
  el.btnLogin?.addEventListener("click", login);
  el.btnCadastrar?.addEventListener("click", cadastrar);
  el.btnTema?.addEventListener("click", toggleTema);
  el.btnLogout?.addEventListener("click", logout);

  el.btnDiminuirDia?.addEventListener("click", diminuirDia);
  el.btnAumentarDia?.addEventListener("click", aumentarDia);
  el.btnSalvar?.addEventListener("click", adicionarCliente);
}

function init() {
  carregarTema();
  configurarEventos();
}

init();
// =========================
// GLOBAL (necessário por causa do HTML)
// =========================
window.marcarEnviado = marcarEnviado;
window.removerCliente = removerCliente;
window.editarClientes = editarClientes;

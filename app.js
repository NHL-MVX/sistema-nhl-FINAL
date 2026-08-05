// ===== CONFIGURAÇÃO SUPABASE =====
const SUPABASE_URL = "https://lmjvuaitfwtxmehlphcw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtanZ1YWl0Znd0eG1laGxwaGN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NTQ1NTIsImV4cCI6MjEwMTUzMDU1Mn0.nz_u6xGlHzey-c_6r-URGvmtlKMGNXcB091dofKGwhs";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== LOGIN =====
const USUARIO = "NHL-MASTER";
const SENHA = "NHL123MVX456ADRIANO789GUSTAVO101112";

function fazerLogin() {
  const u = document.getElementById("loginUser").value;
  const p = document.getElementById("loginPass").value;
  if (u === USUARIO && p === SENHA) {
    sessionStorage.setItem("logado", "1");
    iniciarApp();
  } else {
    document.getElementById("loginErro").innerText = "Usuário ou senha incorretos.";
  }
}

function logout() {
  sessionStorage.removeItem("logado");
  location.reload();
}

function iniciarApp() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("appScreen").classList.remove("hidden");
  carregarCompras();
  carregarVendas();
}

if (sessionStorage.getItem("logado") === "1") {
  window.onload = iniciarApp;
}

// ===== NAVEGAÇÃO =====
function mostrarAba(nome) {
  document.getElementById("abaCompras").classList.add("hidden");
  document.getElementById("abaVendas").classList.add("hidden");
  document.getElementById("aba" + nome[0].toUpperCase() + nome.slice(1)).classList.remove("hidden");
}

function fecharModal() {
  document.getElementById("modal").classList.add("hidden");
}

// ===== HELPERS =====
function numOrNull(v) {
  return v === "" || v === undefined ? null : v;
}

// ===== CÁLCULOS AUTOMÁTICOS =====
function calcularTotalCompra() {
  const qtde = parseFloat(document.getElementById("c_quantidade").value) || 0;
  const custo = parseFloat(document.getElementById("c_custo").value) || 0;
  const valorPago = parseFloat(document.getElementById("c_valor_pago").value) || 0;

  const total = qtde * custo;
  document.getElementById("c_total").value = total.toFixed(2);
  document.getElementById("c_a_pagar").value = (total - valorPago).toFixed(2);
}

function calcularTotalVenda() {
  const qtde = parseFloat(document.getElementById("v_quantidade").value) || 0;
  const custo = parseFloat(document.getElementById("v_custo").value) || 0;
  const venda = parseFloat(document.getElementById("v_venda").value) || 0;
  const recebido = parseFloat(document.getElementById("v_recebido").value) || 0;

  const totalCusto = qtde * custo;
  const totalVenda = qtde * venda;

  document.getElementById("v_total_custo").value = totalCusto.toFixed(2);
  document.getElementById("v_total_venda").value = totalVenda.toFixed(2);
  document.getElementById("v_margem").value = (venda - custo).toFixed(2);
  document.getElementById("v_restante").value = (totalVenda - recebido).toFixed(2);
}

// ===== UPLOAD DE ANEXO =====
async function uploadArquivo(file, pasta) {
  if (!file) return null;
  const nomeArquivo = `${pasta}/${Date.now()}_${file.name}`;
  const { data, error } = await sb.storage.from("anexos").upload(nomeArquivo, file);
  if (error) { alert("Erro ao subir arquivo: " + error.message); return null; }
  const { data: urlData } = sb.storage.from("anexos").getPublicUrl(nomeArquivo);
  return urlData.publicUrl;
}

function renderAnexos(urls) {
  if (!urls || urls.length === 0) return "-";
  return urls.map(u => `<a class="anexo-link" href="${u}" target="_blank">📎 Ver</a>`).join("");
}

function renderAnexoAtual(urls, tabela, id, coluna) {
  if (!urls || urls.length === 0 || !id) return "";
  return urls.map((u, i) => `
    <div class="anexo-atual">
      <a href="${u}" target="_blank">📎 Ver atual</a>
      <button type="button" onclick="removerAnexo('${tabela}', ${id}, '${coluna}', ${i})">Remover</button>
    </div>
  `).join("");
}

async function removerAnexo(tabela, id, coluna, index) {
  if (!confirm("Remover este anexo?")) return;
  const { data } = await sb.from(tabela).select(coluna).eq("id", id).single();
  const urls = data[coluna] || [];
  urls.splice(index, 1);
  await sb.from(tabela).update({ [coluna]: urls }).eq("id", id);
  if (tabela === "compras") {
    abrirFormCompra(id);
  } else {
    abrirFormVenda(id);
  }
}

// =========================================================
// ===================== COMPRAS ============================
// =========================================================

async function carregarCompras() {
  const { data, error } = await sb.from("compras").select("*").order("id", { ascending: false });
  if (error) { console.error(error); return; }
  const tbody = document.querySelector("#tabelaCompras tbody");
  tbody.innerHTML = "";
  data.forEach(c => {
    tbody.innerHTML += `
      <tr>
        <td>${c.pi_compra||""}</td><td>${c.data||""}</td><td>${c.empresa||""}</td>
        <td>${c.fornecedor||""}</td><td>${c.produto||""}</td><td>${c.quantidade||""}</td>
        <td>${c.custo||""}</td><td>${c.total||""}</td><td>${c.pgto||""}</td>
        <td>${c.valor_pago||""}</td><td>${c.a_pagar||""}</td><td>${c.status||""}</td>
        <td>${c.finalidade||""}</td>
        <td>${renderAnexos(c.anexos_pi)}${renderAnexos(c.anexos_invoice)}${renderAnexos(c.anexos_packing)}${renderAnexos(c.anexos_awb_bl)}${renderAnexos(c.anexos_pgto)}</td>
        <td>
          <button class="btn-acao" onclick="abrirFormCompra(${c.id})">Editar</button>
          <button class="btn-acao btn-excluir" onclick="excluirCompra(${c.id})">Excluir</button>
        </td>
      </tr>`;
  });
}

async function abrirFormCompra(id) {
  let c = {};
  if (id) {
    const { data } = await sb.from("compras").select("*").eq("id", id).single();
    c = data || {};
  }

  document.getElementById("modalConteudo").innerHTML = `
    <h3>${id ? "Editar Compra" : "Nova Compra"}</h3>
    <label>PI Compra</label><input id="c_pi_compra" value="${c.pi_compra||""}">
    <label>Data</label><input id="c_data" type="date" value="${c.data||""}">
    <label>Empresa</label><input id="c_empresa" value="${c.empresa||""}">
    <label>Fornecedor</label><input id="c_fornecedor" value="${c.fornecedor||""}">
    <label>Produto</label><input id="c_produto" value="${c.produto||""}">
    <label>Quantidade</label><input id="c_quantidade" type="number" value="${c.quantidade||""}" oninput="calcularTotalCompra()">
    <label>Custo</label><input id="c_custo" type="number" value="${c.custo||""}" oninput="calcularTotalCompra()">
    <label>Total</label><input id="c_total" type="number" value="${c.total||""}" readonly>
    <label>Forma de Pagamento</label><input id="c_pgto" value="${c.pgto||""}">
    <label>Valor Pago</label><input id="c_valor_pago" type="number" value="${c.valor_pago||""}" oninput="calcularTotalCompra()">
    <label>À Pagar</label><input id="c_a_pagar" type="number" value="${c.a_pagar||""}" readonly>
    <label>Status</label><input id="c_status" value="${c.status||""}">
    <label>Finalidade</label><input id="c_finalidade" value="${c.finalidade||""}">

    <label>Anexo PI</label><input id="c_anexo_pi" type="file">
    ${renderAnexoAtual(c.anexos_pi, "compras", id, "anexos_pi")}

    <label>Anexo Invoice</label><input id="c_anexo_invoice" type="file">
    ${renderAnexoAtual(c.anexos_invoice, "compras", id, "anexos_invoice")}

    <label>Anexo Packing List</label><input id="c_anexo_packing" type="file">
    ${renderAnexoAtual(c.anexos_packing, "compras", id, "anexos_packing")}

    <label>Anexo AWB/BL</label><input id="c_anexo_awb" type="file">
    ${renderAnexoAtual(c.anexos_awb_bl, "compras", id, "anexos_awb_bl")}

    <label>Anexo Pagamento</label><input id="c_anexo_pgto" type="file">
    ${renderAnexoAtual(c.anexos_pgto, "compras", id, "anexos_pgto")}

    <button class="salvar" onclick="salvarCompra(${id || "null"})">Salvar</button>
  `;
  document.getElementById("modal").classList.remove("hidden");
}

async function salvarCompra(id) {
  const val = idc => numOrNull(document.getElementById(idc).value);
  const file = idc => document.getElementById(idc).files[0];

  const payload = {
    pi_compra: val("c_pi_compra"),
    data: val("c_data"),
    empresa: val("c_empresa"),
    fornecedor: val("c_fornecedor"),
    produto: val("c_produto"),
    quantidade: val("c_quantidade"),
    custo: val("c_custo"),
    total: val("c_total"),
    pgto: val("c_pgto"),
    valor_pago: val("c_valor_pago"),
    a_pagar: val("c_a_pagar"),
    status: val("c_status"),
    finalidade: val("c_finalidade")
  };

  const anexosNovos = {
    c_anexo_pi: "anexos_pi",
    c_anexo_invoice: "anexos_invoice",
    c_anexo_packing: "anexos_packing",
    c_anexo_awb: "anexos_awb_bl",
    c_anexo_pgto: "anexos_pgto"
  };

  for (const [inputId, coluna] of Object.entries(anexosNovos)) {
    const f = file(inputId);
    if (f) {
      const url = await uploadArquivo(f, "compras");
      if (url) {
        let existentes = [];
        if (id) {
          const { data } = await sb.from("compras").select(coluna).eq("id", id).single();
          existentes = data?.[coluna] || [];
        }
        payload[coluna] = [...existentes, url];
      }
    }
  }

  let error;
  if (id) {
    ({ error } = await sb.from("compras").update(payload).eq("id", id));
  } else {
    payload.anexos_pi = payload.anexos_pi || [];
    payload.anexos_invoice = payload.anexos_invoice || [];
    payload.anexos_packing = payload.anexos_packing || [];
    payload.anexos_awb_bl = payload.anexos_awb_bl || [];
    payload.anexos_pgto = payload.anexos_pgto || [];
    ({ error } = await sb.from("compras").insert(payload));
  }

  if (error) { alert("Erro: " + error.message); return; }
  fecharModal();
  carregarCompras();
}

async function excluirCompra(id) {
  if (!confirm("Excluir esta compra?")) return;
  await sb.from("compras").delete().eq("id", id);
  carregarCompras();
}

// =========================================================
// ===================== VENDAS =============================
// =========================================================

async function carregarVendas() {
  const { data, error } = await sb.from("vendas").select("*").order("id", { ascending: false });
  if (error) { console.error(error); return; }
  const tbody = document.querySelector("#tabelaVendas tbody");
  tbody.innerHTML = "";
  data.forEach(v => {
    tbody.innerHTML += `
      <tr>
        <td>${v.pi_compra||""}</td><td>${v.pi_venda||""}</td><td>${v.data||""}</td>
        <td>${v.cliente||""}</td><td>${v.modal_venda||""}</td><td>${v.produto||""}</td>
        <td>${v.quantidade||""}</td><td>${v.custo||""}</td><td>${v.venda||""}</td>
        <td>${v.margem||""}</td><td>${v.total_custo||""}</td><td>${v.total_venda||""}</td>
        <td>${v.pgto||""}</td><td>${v.recebido||""}</td><td>${v.restante||""}</td>
        <td>${v.comissao||""}</td><td>${v.status||""}</td>
        <td>${renderAnexos(v.anexos_pi)}${renderAnexos(v.anexos_invoice)}${renderAnexos(v.anexos_packing)}${renderAnexos(v.anexos_awb_bl)}${renderAnexos(v.anexos_pagamento)}</td>
        <td>
          <button class="btn-acao" onclick="abrirFormVenda(${v.id})">Editar</button>
          <button class="btn-acao btn-excluir" onclick="excluirVenda(${v.id})">Excluir</button>
        </td>
      </tr>`;
  });
}

async function abrirFormVenda(id) {
  let v = {};
  if (id) {
    const { data } = await sb.from("vendas").select("*").eq("id", id).single();
    v = data || {};
  }

  document.getElementById("modalConteudo").innerHTML = `
    <h3>${id ? "Editar Venda FOB" : "Nova Venda FOB"}</h3>
    <label>PI Compra</label><input id="v_pi_compra" value="${v.pi_compra||""}">
    <label>PI Venda</label><input id="v_pi_venda" value="${v.pi_venda||""}">
    <label>Data</label><input id="v_data" type="date" value="${v.data||""}">
    <label>Cliente</label><input id="v_cliente" value="${v.cliente||""}">
    <label>Modal</label><input id="v_modal" value="${v.modal_venda||""}">
    <label>Produto</label><input id="v_produto" value="${v.produto||""}">
    <label>Quantidade</label><input id="v_quantidade" type="number" value="${v.quantidade||""}" oninput="calcularTotalVenda()">
    <label>Custo</label><input id="v_custo" type="number" value="${v.custo||""}" oninput="calcularTotalVenda()">
    <label>Venda</label><input id="v_venda" type="number" value="${v.venda||""}" oninput="calcularTotalVenda()">
    <label>Margem</label><input id="v_margem" type="number" value="${v.margem||""}" readonly>
    <label>Total Custo</label><input id="v_total_custo" type="number" value="${v.total_custo||""}" readonly>
    <label>Total Venda</label><input id="v_total_venda" type="number" value="${v.total_venda||""}" readonly>
    <label>Forma de Pagamento</label><input id="v_pgto" value="${v.pgto||""}">
    <label>Recebido</label><input id="v_recebido" type="number" value="${v.recebido||""}" oninput="calcularTotalVenda()">
    <label>Restante</label><input id="v_restante" type="number" value="${v.restante||""}" readonly>
    <label>Comissão</label><input id="v_comissao" type="number" value="${v.comissao||""}">
    <label>Status</label><input id="v_status" value="${v.status||""}">

    <label>Anexo PI Venda</label><input id="v_anexo_pi" type="file">
    ${renderAnexoAtual(v.anexos_pi, "vendas", id, "anexos_pi")}

    <label>Anexo Invoice</label><input id="v_anexo_invoice" type="file">
    ${renderAnexoAtual(v.anexos_invoice, "vendas", id, "anexos_invoice")}

    <label>Anexo Packing List</label><input id="v_anexo_packing" type="file">
    ${renderAnexoAtual(v.anexos_packing, "vendas", id, "anexos_packing")}

    <label>Anexo AWB/BL</label><input id="v_anexo_awb" type="file">
    ${renderAnexoAtual(v.anexos_awb_bl, "vendas", id, "anexos_awb_bl")}

    <label>Anexo Pagamento</label><input id="v_anexo_pagamento" type="file">
    ${renderAnexoAtual(v.anexos_pagamento, "vendas", id, "anexos_pagamento")}

    <button class="salvar" onclick="salvarVenda(${id || "null"})">Salvar</button>
  `;
  document.getElementById("modal").classList.remove("hidden");
}

async function salvarVenda(id) {
  const val = idc => numOrNull(document.getElementById(idc).value);
  const file = idc => document.getElementById(idc).files[0];

  const payload = {
    pi_compra: val("v_pi_compra"),
    pi_venda: val("v_pi_venda"),
    data: val("v_data"),
    cliente: val("v_cliente"),
    modal_venda: val("v_modal"),
    produto: val("v_produto"),
    quantidade: val("v_quantidade"),
    custo: val("v_custo"),
    venda: val("v_venda"),
    margem: val("v_margem"),
    total_custo: val("v_total_custo"),
    total_venda: val("v_total_venda"),
    pgto: val("v_pgto"),
    recebido: val("v_recebido"),
    restante: val("v_restante"),
    comissao: val("v_comissao"),
    status: val("v_status")
  };

  const anexosNovos = {
    v_anexo_pi: "anexos_pi",
    v_anexo_invoice: "anexos_invoice",
    v_anexo_packing: "anexos_packing",
    v_anexo_awb: "anexos_awb_bl",
    v_anexo_pagamento: "anexos_pagamento"
  };

  for (const [inputId, coluna] of Object.entries(anexosNovos)) {
    const f = file(inputId);
    if (f) {
      const url = await uploadArquivo(f, "vendas");
      if (url) {
        let existentes = [];
        if (id) {
          const { data } = await sb.from("vendas").select(coluna).eq("id", id).single();
          existentes = data?.[coluna] || [];
        }
        payload[coluna] = [...existentes, url];
      }
    }
  }

  let error;
  if (id) {
    ({ error } = await sb.from("vendas").update(payload).eq("id", id));
  } else {
    payload.anexos_pi = payload.anexos_pi || [];
    payload.anexos_invoice = payload.anexos_invoice || [];
    payload.anexos_packing = payload.anexos_packing || [];
    payload.anexos_awb_bl = payload.anexos_awb_bl || [];
    payload.anexos_pagamento = payload.anexos_pagamento || [];
    ({ error } = await sb.from("vendas").insert(payload));
  }

  if (error) { alert("Erro: " + error.message); return; }
  fecharModal();
  carregarVendas();
}

async function excluirVenda(id) {
  if (!confirm("Excluir esta venda?")) return;
  await sb.from("vendas").delete().eq("id", id);
  carregarVendas();
}

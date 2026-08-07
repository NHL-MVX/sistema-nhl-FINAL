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

  const { data: itensData } = await sb.from("compras_itens").select("*");
  const itensPorCompra = {};
  (itensData || []).forEach(i => {
    if (!itensPorCompra[i.compra_id]) itensPorCompra[i.compra_id] = [];
    itensPorCompra[i.compra_id].push(i);
  });

  const tbody = document.querySelector("#tabelaCompras tbody");
  tbody.innerHTML = "";
  data.forEach(c => {
    const itens = itensPorCompra[c.id] || [];
    const itensHtml = itens.length === 0
      ? "-"
      : `<table class="mini-tabela-itens">
          <thead>
            <tr><th>Produto</th><th>Qtd</th><th>Custo</th><th>Total</th></tr>
          </thead>
          <tbody>
            ${itens.map(i => `
              <tr>
                <td>${i.produto || ""}</td>
                <td>${i.quantidade || ""}</td>
                <td>${i.custo || ""}</td>
                <td>${i.total || ""}</td>
              </tr>`).join("")}
          </tbody>
        </table>`;

    tbody.innerHTML += `
      <tr>
        <td>${c.pi_compra||""}</td><td>${c.data||""}</td><td>${c.empresa||""}</td>
        <td>${c.fornecedor||""}</td>
        <td>${itensHtml}</td>
        <td>${c.total||""}</td><td>${c.pgto||""}</td>
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

function linhaItemCompra(item = {}) {
  return `
    <div class="item-row">
      <input type="text" class="it_produto" placeholder="Produto" value="${item.produto||""}">
      <input type="number" class="it_qtde" placeholder="Qtd" value="${item.quantidade||""}" oninput="calcItemCompra(this)">
      <input type="number" class="it_custo" placeholder="Custo" value="${item.custo||""}" oninput="calcItemCompra(this)">
      <input type="number" class="it_total" placeholder="Total" value="${item.total||""}" readonly>
      <button type="button" class="btn-remover-item" onclick="removerItemLinha(this)">✕</button>
    </div>`;
}

function adicionarItemCompra() {
  document.getElementById("c_itens_container").insertAdjacentHTML("beforeend", linhaItemCompra());
}

function removerItemLinha(btn) {
  btn.closest(".item-row").remove();
  const container = document.getElementById("c_itens_container") || document.getElementById("v_itens_container");
  if (container && container.id === "c_itens_container") atualizarTotalCompra();
  if (container && container.id === "v_itens_container") atualizarTotalVenda();
}

function calcItemCompra(el) {
  const row = el.closest(".item-row");
  const qtde = parseFloat(row.querySelector(".it_qtde").value) || 0;
  const custo = parseFloat(row.querySelector(".it_custo").value) || 0;
  row.querySelector(".it_total").value = (qtde * custo).toFixed(2);
  atualizarTotalCompra();
}

function atualizarTotalCompra() {
  let total = 0;
  document.querySelectorAll("#c_itens_container .it_total").forEach(inp => {
    total += parseFloat(inp.value) || 0;
  });
  document.getElementById("c_total").value = total.toFixed(2);
  const valorPago = parseFloat(document.getElementById("c_valor_pago").value) || 0;
  document.getElementById("c_a_pagar").value = (total - valorPago).toFixed(2);
}

function recalcularAPagar() {
  const total = parseFloat(document.getElementById("c_total").value) || 0;
  const valorPago = parseFloat(document.getElementById("c_valor_pago").value) || 0;
  document.getElementById("c_a_pagar").value = (total - valorPago).toFixed(2);
}

async function abrirFormCompra(id) {
  let c = {};
  let itens = [];
  if (id) {
    const { data } = await sb.from("compras").select("*").eq("id", id).single();
    c = data || {};
    const { data: itensData } = await sb.from("compras_itens").select("*").eq("compra_id", id);
    itens = itensData || [];
  }
  if (itens.length === 0) itens = [{}];

  document.getElementById("modalConteudo").innerHTML = `
    <h3>${id ? "Editar Compra" : "Nova Compra"}</h3>
    <label>PI Compra</label><input id="c_pi_compra" value="${c.pi_compra||""}">
    <label>Data</label><input id="c_data" type="date" value="${c.data||""}">
    <label>Empresa</label><input id="c_empresa" value="${c.empresa||""}">
    <label>Fornecedor</label><input id="c_fornecedor" value="${c.fornecedor||""}">

    <label>Produtos</label>
    <div id="c_itens_container">
      ${itens.map(linhaItemCompra).join("")}
    </div>
    <button type="button" class="btn-add-item" onclick="adicionarItemCompra()">+ Adicionar Produto</button>

    <label>Total</label><input id="c_total" type="number" value="${c.total||""}" readonly>
    <label>Forma de Pagamento</label><input id="c_pgto" value="${c.pgto||""}">
    <label>Valor Pago</label><input id="c_valor_pago" type="number" value="${c.valor_pago||""}" oninput="recalcularAPagar()">
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
  atualizarTotalCompra();
}

async function salvarCompra(id) {
  const val = idc => numOrNull(document.getElementById(idc).value);
  const file = idc => document.getElementById(idc).files[0];

  const payload = {
    pi_compra: val("c_pi_compra"),
    data: val("c_data"),
    empresa: val("c_empresa"),
    fornecedor: val("c_fornecedor"),
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

  let compraId = id;
  let error;
  if (id) {
    ({ error } = await sb.from("compras").update(payload).eq("id", id));
  } else {
    payload.anexos_pi = payload.anexos_pi || [];
    payload.anexos_invoice = payload.anexos_invoice || [];
    payload.anexos_packing = payload.anexos_packing || [];
    payload.anexos_awb_bl = payload.anexos_awb_bl || [];
    payload.anexos_pgto = payload.anexos_pgto || [];
    const resp = await sb.from("compras").insert(payload).select().single();
    error = resp.error;
    compraId = resp.data?.id;
  }

  if (error) { alert("Erro: " + error.message); return; }

  // Salvar itens
  const itens = [];
  document.querySelectorAll("#c_itens_container .item-row").forEach(row => {
    const produto = row.querySelector(".it_produto").value;
    const quantidade = parseFloat(row.querySelector(".it_qtde").value) || 0;
    const custo = parseFloat(row.querySelector(".it_custo").value) || 0;
    const total = parseFloat(row.querySelector(".it_total").value) || 0;
    if (produto || quantidade || custo) {
      itens.push({ compra_id: compraId, produto, quantidade, custo, total });
    }
  });

  await sb.from("compras_itens").delete().eq("compra_id", compraId);
  if (itens.length > 0) {
    const { error: errItens } = await sb.from("compras_itens").insert(itens);
    if (errItens) {
      console.error("Erro ao salvar itens da compra:", errItens);
      alert("Erro ao salvar itens: " + errItens.message);
      return;
    }
  }

  fecharModal();
  carregarCompras();
}

async function excluirCompra(id) {
  if (!confirm("Excluir esta compra?")) return;
  await sb.from("compras_itens").delete().eq("compra_id", id);
  await sb.from("compras").delete().eq("id", id);
  carregarCompras();
}

// =========================================================
// ===================== VENDAS =============================
// =========================================================

async function carregarVendas() {
  const { data, error } = await sb.from("vendas").select("*").order("id", { ascending: false });
  if (error) { console.error(error); return; }

  const { data: itensData } = await sb.from("vendas_itens").select("*");
  const itensPorVenda = {};
  (itensData || []).forEach(i => {
    if (!itensPorVenda[i.venda_id]) itensPorVenda[i.venda_id] = [];
    itensPorVenda[i.venda_id].push(i);
  });

  const tbody = document.querySelector("#tabelaVendas tbody");
  tbody.innerHTML = "";
  data.forEach(v => {
    const itens = itensPorVenda[v.id] || [];

    const itensHtml = itens.length === 0
      ? "-"
      : `<table class="mini-tabela-itens">
          <thead>
            <tr>
              <th>Produto</th><th>Qtd</th><th>Custo</th><th>Venda</th>
              <th>Margem %</th><th>Lucro</th><th>Tot. Custo</th><th>Tot. Venda</th>
            </tr>
          </thead>
          <tbody>
            ${itens.map(i => `
              <tr>
                <td>${i.produto || ""}</td>
                <td>${i.quantidade || ""}</td>
                <td>${i.custo || ""}</td>
                <td>${i.venda || ""}</td>
                <td>${i.margem || ""}</td>
                <td>${i.lucro_bruto || ""}</td>
                <td>${i.total_custo || ""}</td>
                <td>${i.total_venda || ""}</td>
              </tr>`).join("")}
          </tbody>
        </table>`;

    // Cálculo da margem total e lucro bruto total da operação
    let lucroTotal = 0;
    itens.forEach(i => { lucroTotal += parseFloat(i.lucro_bruto) || 0; });
    const totalVenda = parseFloat(v.total_venda) || 0;
    const margemTotal = totalVenda > 0 ? (lucroTotal / totalVenda) * 100 : 0;

    tbody.innerHTML += `
      <tr>
        <td>${v.pi_compra||""}</td><td>${v.pi_venda||""}</td><td>${v.data||""}</td>
        <td>${v.cliente||""}</td><td>${v.modal_venda||""}</td>
        <td>${itensHtml}</td>
        <td>${v.total_custo||""}</td><td>${v.total_venda||""}</td>
        <td>${v.pgto||""}</td><td>${v.recebido||""}</td><td>${v.restante||""}</td>
        <td>${v.comissao||""}</td>
        <td>${margemTotal.toFixed(2)}%</td>
        <td>${lucroTotal.toFixed(2)}</td>
        <td>${v.status||""}</td>
        <td>${renderAnexos(v.anexos_pi)}${renderAnexos(v.anexos_invoice)}${renderAnexos(v.anexos_packing)}${renderAnexos(v.anexos_awb_bl)}${renderAnexos(v.anexos_pagamento)}</td>
        <td>
          <button class="btn-acao" onclick="abrirFormVenda(${v.id})">Editar</button>
          <button class="btn-acao btn-excluir" onclick="excluirVenda(${v.id})">Excluir</button>
        </td>
      </tr>`;
  });
}

function linhaItemVenda(item = {}) {
  return `
    <div class="item-row item-row-venda">
      <input type="text" class="it_produto" placeholder="Produto" value="${item.produto||""}">
      <input type="number" class="it_qtde" placeholder="Qtd" value="${item.quantidade||""}" oninput="calcItemVenda(this)">
      <input type="number" class="it_custo" placeholder="Custo" value="${item.custo||""}" oninput="calcItemVenda(this)">
      <input type="number" class="it_venda" placeholder="Venda" value="${item.venda||""}" oninput="calcItemVenda(this)">
      <input type="number" class="it_margem" placeholder="Margem %" value="${item.margem||""}" readonly>
      <input type="number" class="it_lucro" placeholder="Lucro Bruto" value="${item.lucro_bruto||""}" readonly>
      <input type="number" class="it_total_custo" placeholder="Total Custo" value="${item.total_custo||""}" readonly>
      <input type="number" class="it_total_venda" placeholder="Total Venda" value="${item.total_venda||""}" readonly>
      <button type="button" class="btn-remover-item" onclick="removerItemLinha(this)">✕</button>
    </div>`;
}

function adicionarItemVenda() {
  document.getElementById("v_itens_container").insertAdjacentHTML("beforeend", linhaItemVenda());
}

function calcItemVenda(el) {
  const row = el.closest(".item-row");
  const qtde = parseFloat(row.querySelector(".it_qtde").value) || 0;
  const custo = parseFloat(row.querySelector(".it_custo").value) || 0;
  const venda = parseFloat(row.querySelector(".it_venda").value) || 0;

  const totalCusto = qtde * custo;
  const totalVenda = qtde * venda;
  const margem = venda > 0 ? (1 - (custo / venda)) * 100 : 0;
  const lucroBruto = (venda - custo) * qtde;

  row.querySelector(".it_total_custo").value = totalCusto.toFixed(2);
  row.querySelector(".it_total_venda").value = totalVenda.toFixed(2);
  row.querySelector(".it_margem").value = margem.toFixed(2);
  row.querySelector(".it_lucro").value = lucroBruto.toFixed(2);

  atualizarTotalVenda();
}

function atualizarTotalVenda() {
  let totalCusto = 0, totalVenda = 0;
  document.querySelectorAll("#v_itens_container .item-row-venda").forEach(row => {
    totalCusto += parseFloat(row.querySelector(".it_total_custo").value) || 0;
    totalVenda += parseFloat(row.querySelector(".it_total_venda").value) || 0;
  });
  document.getElementById("v_total_custo").value = totalCusto.toFixed(2);
  document.getElementById("v_total_venda").value = totalVenda.toFixed(2);
  const recebido = parseFloat(document.getElementById("v_recebido").value) || 0;
  document.getElementById("v_restante").value = (totalVenda - recebido).toFixed(2);
}

function recalcularRestante() {
  const totalVenda = parseFloat(document.getElementById("v_total_venda").value) || 0;
  const recebido = parseFloat(document.getElementById("v_recebido").value) || 0;
  document.getElementById("v_restante").value = (totalVenda - recebido).toFixed(2);
}

async function abrirFormVenda(id) {
  let v = {};
  let itens = [];
  if (id) {
    const { data } = await sb.from("vendas").select("*").eq("id", id).single();
    v = data || {};
    const { data: itensData } = await sb.from("vendas_itens").select("*").eq("venda_id", id);
    itens = itensData || [];
  }
  if (itens.length === 0) itens = [{}];

  document.getElementById("modalConteudo").innerHTML = `
    <h3>${id ? "Editar Venda FOB" : "Nova Venda FOB"}</h3>
    <label>PI Compra</label><input id="v_pi_compra" value="${v.pi_compra||""}">
    <label>PI Venda</label><input id="v_pi_venda" value="${v.pi_venda||""}">
    <label>Data</label><input id="v_data" type="date" value="${v.data||""}">
    <label>Cliente</label><input id="v_cliente" value="${v.cliente||""}">
    <label>Modal</label><input id="v_modal" value="${v.modal_venda||""}">

    <label>Produtos</label>
    <div id="v_itens_container">
      ${itens.map(linhaItemVenda).join("")}
    </div>
    <button type="button" class="btn-add-item" onclick="adicionarItemVenda()">+ Adicionar Produto</button>

    <label>Total Custo</label><input id="v_total_custo" type="number" value="${v.total_custo||""}" readonly>
    <label>Total Venda</label><input id="v_total_venda" type="number" value="${v.total_venda||""}" readonly>
    <label>Forma de Pagamento</label><input id="v_pgto" value="${v.pgto||""}">
    <label>Recebido</label><input id="v_recebido" type="number" value="${v.recebido||""}" oninput="recalcularRestante()">
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

  // Recalcular linhas já preenchidas (edição)
  document.querySelectorAll("#v_itens_container .it_qtde").forEach(inp => calcItemVenda(inp));
  atualizarTotalVenda();
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

  let vendaId = id;
  let error;
  if (id) {
    ({ error } = await sb.from("vendas").update(payload).eq("id", id));
  } else {
    payload.anexos_pi = payload.anexos_pi || [];
    payload.anexos_invoice = payload.anexos_invoice || [];
    payload.anexos_packing = payload.anexos_packing || [];
    payload.anexos_awb_bl = payload.anexos_awb_bl || [];
    payload.anexos_pagamento = payload.anexos_pagamento || [];
    const resp = await sb.from("vendas").insert(payload).select().single();
    error = resp.error;
    vendaId = resp.data?.id;
  }

  if (error) { alert("Erro: " + error.message); return; }

  // Salvar itens
  const itens = [];
  document.querySelectorAll("#v_itens_container .item-row-venda").forEach(row => {
    const produto = row.querySelector(".it_produto").value;
    const quantidade = parseFloat(row.querySelector(".it_qtde").value) || 0;
    const custo = parseFloat(row.querySelector(".it_custo").value) || 0;
    const venda = parseFloat(row.querySelector(".it_venda").value) || 0;
    const margem = parseFloat(row.querySelector(".it_margem").value) || 0;
    const lucro_bruto = parseFloat(row.querySelector(".it_lucro").value) || 0;
    const total_custo = parseFloat(row.querySelector(".it_total_custo").value) || 0;
    const total_venda = parseFloat(row.querySelector(".it_total_venda").value) || 0;
    if (produto || quantidade || custo || venda) {
      itens.push({ venda_id: vendaId, produto, quantidade, custo, venda, margem, lucro_bruto, total_custo, total_venda });
    }
  });

  await sb.from("vendas_itens").delete().eq("venda_id", vendaId);
  if (itens.length > 0) {
    const { error: errItens } = await sb.from("vendas_itens").insert(itens);
    if (errItens) {
      console.error("Erro ao salvar itens da venda:", errItens);
      alert("Erro ao salvar itens: " + errItens.message);
      return;
    }
  }

  fecharModal();
  carregarVendas();
}

async function excluirVenda(id) {
  if (!confirm("Excluir esta venda?")) return;
  await sb.from("vendas_itens").delete().eq("venda_id", id);
  await sb.from("vendas").delete().eq("id", id);
  carregarVendas();
}

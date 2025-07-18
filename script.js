const TOKEN = "EAAIyWkoZCTyQBPEQzRpMzykm81UXdgjfLGI1PCMZBdPj05KlDlb3DWSZBkKHpDArZA8F2sIE6GHuiOls2ThHyRkkZA25cZA3wKxTLx8vqQpZByk39lxiuBsMvGZCZCtbjNLkrBSA5SRJNoYEwGaMfZAaLdhhx5CHJWVz25390W5cC7dN5u0dEoi2uEHGJqsIE1A1RsWKm85CRD29Lz1FfE3ksU";

const accountSelect = document.getElementById("accountSelect");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const btnRefresh = document.getElementById("btnRefresh");

const tabs = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");

let contas = [];
let campaignsCache = [];
let adsetsCache = [];
let adsCache = [];

// Função para trocar aba
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    tabContents.forEach(tc => {
      tc.classList.remove("active");
      if(tc.id === tab.dataset.tab) tc.classList.add("active");
    });
  });
});

// Função utilitária para formatar valores
function formatCurrency(value) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR");
}

// Exibe status com cor
function renderStatus(status) {
  return `<span class="status ${status}">${status}</span>`;
}

// Converte actions para texto legível
function renderActions(actions) {
  if (!actions || !actions.length) return "<em>Sem ações registradas</em>";
  const labels = {
    "link_click": "Cliques em Links",
    "post_engagement": "Engajamento em Post",
    "page_engagement": "Engajamento na Página",
    "lead": "Leads",
    "purchase": "Compras",
    "view_content": "Visualizações",
    "add_to_cart": "Adicionados ao Carrinho",
    "initiate_checkout": "Inícios de Checkout"
  };

  return actions.map(a => `<p>• ${labels[a.action_type] || a.action_type}: ${a.value}</p>`).join("");
}

// Carrega contas do token
async function loadAccounts() {
  const url = `https://graph.facebook.com/v19.0/me/adaccounts?access_token=${TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  contas = data.data;
  if (contas.length === 0) throw new Error("Nenhuma conta de anúncio disponível para esse token.");

  accountSelect.innerHTML = contas.map(c => `<option value="${c.id}">${c.name || c.id}</option>`).join("");
}

// Busca campanhas com insights filtrando por datas
async function fetchCampaigns(accountId, since, until) {
  const url = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/campaigns`);
  url.searchParams.set("fields", "name,status,effective_status");
  url.searchParams.set("limit", "200");

  // Busca insights separadamente para melhor performance
  const insightsURL = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/insights`);
  insightsURL.searchParams.set("level", "campaign");
  insightsURL.searchParams.set("fields", "campaign_id,impressions,clicks,spend,actions,ctr,cpc,cpm,start_time,end_time");
  insightsURL.searchParams.set("time_range", JSON.stringify({ since, until }));
  insightsURL.searchParams.set("limit", "500");
  insightsURL.searchParams.set("access_token", TOKEN);

  // Fetch campanhas e insights paralelos
  const [campRes, insightsRes] = await Promise.all([
    fetch(`${url}&access_token=${TOKEN}`),
    fetch(insightsURL)
  ]);

  const campData = await campRes.json();
  if (campData.error) throw new Error(campData.error.message);

  const insightsData = await insightsRes.json();
  if (insightsData.error) throw new Error(insightsData.error.message);

  // Mapear insights por campaign_id
  const insightsMap = {};
  (insightsData.data || []).forEach(i => {
    insightsMap[i.campaign_id] = i;
  });

  // Juntar dados
  return (campData.data || []).map(camp => ({
    ...camp,
    insights: insightsMap[camp.id] || {}
  }));
}

// Busca adsets com filtro de data
async function fetchAdSets(accountId, since, until) {
  const url = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/adsets`);
  url.searchParams.set("fields", "name,status,daily_budget,start_time,end_time");
  url.searchParams.set("limit", "200");

  const insightsURL = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/insights`);
  insightsURL.searchParams.set("level", "adset");
  insightsURL.searchParams.set("fields", "adset_id,impressions,clicks,spend,actions,ctr,cpc,cpm,start_time,end_time");
  insightsURL.searchParams.set("time_range", JSON.stringify({ since, until }));
  insightsURL.searchParams.set("limit", "500");
  insightsURL.searchParams.set("access_token", TOKEN);

  const [adsetsRes, insightsRes] = await Promise.all([
    fetch(`${url}&access_token=${TOKEN}`),
    fetch(insightsURL)
  ]);

  const adsetsData = await adsetsRes.json();
  if (adsetsData.error) throw new Error(adsetsData.error.message);

  const insightsData = await insightsRes.json();
  if (insightsData.error) throw new Error(insightsData.error.message);

  const insightsMap = {};
  (insightsData.data || []).forEach(i => {
    insightsMap[i.adset_id] = i;
  });

  return (adsetsData.data || []).map(adset => ({
    ...adset,
    insights: insightsMap[adset.id] || {}
  }));
}

// Busca anúncios com filtro de data
async function fetchAds(accountId, since, until) {
  const url = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/ads`);
  url.searchParams.set("fields", "name,status,creative,start_time,end_time");
  url.searchParams.set("limit", "200");

  const insightsURL = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/insights`);
  insightsURL.searchParams.set("level", "ad");
  insightsURL.searchParams.set("fields", "ad_id,impressions,clicks,spend,actions,ctr,cpc,cpm,start_time,end_time");
  insightsURL.searchParams.set("time_range", JSON.stringify({ since, until }));
  insightsURL.searchParams.set("limit", "500");
  insightsURL.searchParams.set("access_token", TOKEN);

  const [adsRes, insightsRes] = await Promise.all([
    fetch(`${url}&access_token=${TOKEN}`),
    fetch(insightsURL)
  ]);

  const adsData = await adsRes.json();
  if (adsData.error) throw new Error(adsData.error.message);

  const insightsData = await insightsRes.json();
  if (insightsData.error) throw new Error(insightsData.error.message);

  const insightsMap = {};
  (insightsData.data || []).forEach(i => {
    insightsMap[i.ad_id] = i;
  });

  return (adsData.data || []).map(ad => ({
    ...ad,
    insights: insightsMap[ad.id] || {}
  }));
}

// Renderização geral das campanhas
function renderCampaigns(campaigns) {
  const container = document.getElementById("campanhas");
  container.innerHTML = "";

  if (!campaigns.length) {
    container.innerHTML = "<p>Nenhuma campanha encontrada para o período.</p>";
    return;
  }

  campaigns.forEach(c => {
    const ins = c.insights;
    container.innerHTML += `
      <div class="card">
        <h3>${c.name}</h3>
        ${renderStatus(c.effective_status || c.status)}
        <p><strong>Impressões:</strong> ${ins.impressions || 0}</p>
        <p><strong>Cliques:</strong> ${ins.clicks || 0}</p>
        <p><strong>Gasto:</strong> ${formatCurrency(ins.spend || 0)}</p>
        <p><strong>CTR:</strong> ${(ins.ctr || 0).toFixed(2)}%</p>
        <p><strong>CPC:</strong> ${formatCurrency(ins.cpc || 0)}</p>
        <p><strong>CPM:</strong> ${formatCurrency(ins.cpm || 0)}</p>
        <p><strong>Início:</strong> ${formatDate(ins.start_time)}</p>
        <p><strong>Fim:</strong> ${formatDate(ins.end_time)}</p>
        <div>${renderActions(ins.actions)}</div>
      </div>
    `;
  });
}

// Renderiza Ad Sets
function renderAdSets(adsets) {
  const container = document.getElementById("adsets");
  container.innerHTML = "";

  if (!adsets.length) {
    container.innerHTML = "<p>Nenhum conjunto de anúncio encontrado para o período.</p>";
    return;
  }

  adsets.forEach(a => {
    const ins = a.insights;
    container.innerHTML += `
      <div class="card">
        <h3>${a.name}</h3>
        ${renderStatus(a.status)}
        <p><strong>Budget Diário:</strong> ${formatCurrency((a.daily_budget || 0) / 100)}</p>
        <p><strong>Início:</strong> ${formatDate(a.start_time)}</p>
        <p><strong>Fim:</strong> ${formatDate(a.end_time)}</p>
        <p><strong>Impressões:</strong> ${ins.impressions || 0}</p>
        <p><strong>Cliques:</strong> ${ins.clicks || 0}</p>
        <p><strong>Gasto:</strong> ${formatCurrency(ins.spend || 0)}</p>
        <p><strong>CTR:</strong> ${(ins.ctr || 0).toFixed(2)}%</p>
        <p><strong>CPC:</strong> ${formatCurrency(ins.cpc || 0)}</p>
        <p><strong>CPM:</strong> ${formatCurrency(ins.cpm || 0)}</p>
        <div>${renderActions(ins.actions)}</div>
      </div>
    `;
  });
}

// Renderiza Ads
function renderAds(ads) {
  const container = document.getElementById("ads");
  container.innerHTML = "";

  if (!ads.length) {
    container.innerHTML = "<p>Nenhum anúncio encontrado para o período.</p>";
    return;
  }

  ads.forEach(a => {
    const ins = a.insights;
    container.innerHTML += `
      <div class="card">
        <h3>${a.name}</h3>
        ${renderStatus(a.status)}
        <p><strong>Início:</strong> ${formatDate(ins.start_time)}</p>
        <p><strong>Fim:</strong> ${formatDate(ins.end_time)}</p>
        <p><strong>Impressões:</strong> ${ins.impressions || 0}</p>
        <p><strong>Cliques:</strong> ${ins.clicks || 0}</p>
        <p><strong>Gasto:</strong> ${formatCurrency(ins.spend || 0)}</p>
        <p><strong>CTR:</strong> ${(ins.ctr || 0).toFixed(2)}%</p>
        <p><strong>CPC:</strong> ${formatCurrency(ins.cpc || 0)}</p>
        <p><strong>CPM:</strong> ${formatCurrency(ins.cpm || 0)}</p>
        <div>${renderActions(ins.actions)}</div>
      </div>
    `;
  });
}

// Função principal para carregar tudo baseado em conta + datas
async function carregarTudo() {
  const accountId = accountSelect.value;
  const since = startDateInput.value;
  const until = endDateInput.value;

  if (!accountId) return alert("Selecione uma conta de anúncio.");
  if (!since || !until) return alert("Selecione as datas inicial e final.");

  // Limpa as abas e coloca "Carregando..."
  ["campanhas", "adsets", "ads"].forEach(id => {
    document.getElementById(id).innerHTML = "<p>Carregando...</p>";
  });

  try {
    const [campaigns, adsets, ads] = await Promise.all([
      fetchCampaigns(accountId, since, until),
      fetchAdSets(accountId, since, until),
      fetchAds(accountId, since, until),
    ]);

    renderCampaigns(campaigns);
    renderAdSets(adsets);
    renderAds(ads);
  } catch (error) {
    ["campanhas", "adsets", "ads"].forEach(id => {
      document.getElementById(id).innerHTML = `<p style="color:#f44336">Erro: ${error.message}</p>`;
    });
  }
}

// Inicialização do app
async function init() {
  // Set datas default para últimos 7 dias
  const hoje = new Date();
  const semanaPassada = new Date(hoje);
  semanaPassada.setDate(hoje.getDate() - 7);
  startDateInput.value = semanaPassada.toISOString().slice(0, 10);
  endDateInput.value = hoje.toISOString().slice(0, 10);

  await loadAccounts();
  carregarTudo();
}

accountSelect.addEventListener("change", carregarTudo);
btnRefresh.addEventListener("click", carregarTudo);
init();

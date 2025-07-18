const TOKEN = "EAAIyWkoZCTyQBPIZCw3jcdHSs3qmHVgHk0hOdxw6bzSpENbnRi2vAvHzIxMq89NEfcAxAmYMB6Ne4KqlCUg2cM9LZATk4zsKEgnIGZCdqKobJynkNp869tXKwmFxr03NVMjG7qavPuphYXuTbSBViU0dKf4Qgy9MfFIKkEhHvuGWmZBvqs9A1mb0rMZCVdv2NrQBqcYvFj4mSs3tl06f8t";

const accountSelect = document.getElementById("accountSelect");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const btnRefresh = document.getElementById("btnRefresh");

const tabs = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");

let contas = [];

// Alterna abas
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

// Formatação
function formatCurrency(value) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR");
}
function renderStatus(status) {
  return `<span class="status ${status}">${status}</span>`;
}
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

// Carrega as contas via API usando token (novo)
async function loadAccounts() {
  const url = `https://graph.facebook.com/v19.0/me/adaccounts?access_token=${TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  if(data.error) {
    alert("Erro ao buscar contas: " + data.error.message);
    return;
  }
  contas = data.data || [];
  if(contas.length === 0) {
    alert("Nenhuma conta de anúncio encontrada para esse token.");
    return;
  }
  accountSelect.innerHTML = contas.map(c => `<option value="${c.id}">${c.name || c.id}</option>`).join("");
}

// Busca campanhas com insights filtrando por datas
async function fetchCampaigns(accountId, since, until) {
  const urlCampaigns = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/campaigns`);
  urlCampaigns.searchParams.set("fields", "name,status,effective_status");
  urlCampaigns.searchParams.set("limit", "200");

  const urlInsights = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/insights`);
  urlInsights.searchParams.set("level", "campaign");
  urlInsights.searchParams.set("fields", "campaign_id,impressions,clicks,spend,actions,ctr,cpc,cpm,start_time,end_time");
  urlInsights.searchParams.set("time_range", JSON.stringify({ since, until }));
  urlInsights.searchParams.set("limit", "500");
  urlInsights.searchParams.set("access_token", TOKEN);

  const [campRes, insightsRes] = await Promise.all([
    fetch(`${urlCampaigns}&access_token=${TOKEN}`),
    fetch(urlInsights)
  ]);

  const campData = await campRes.json();
  const insightsData = await insightsRes.json();

  if(campData.error) throw new Error(campData.error.message);
  if(insightsData.error) throw new Error(insightsData.error.message);

  const insightsMap = {};
  (insightsData.data || []).forEach(i => {
    insightsMap[i.campaign_id] = i;
  });

  return (campData.data || []).map(camp => ({
    ...camp,
    insights: insightsMap[camp.id] || {}
  }));
}

async function fetchAdSets(accountId, since, until) {
  const urlAdsets = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/adsets`);
  urlAdsets.searchParams.set("fields", "name,status,daily_budget,start_time,end_time");
  urlAdsets.searchParams.set("limit", "200");

  const urlInsights = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/insights`);
  urlInsights.searchParams.set("level", "adset");
  urlInsights.searchParams.set("fields", "adset_id,impressions,clicks,spend,actions,ctr,cpc,cpm,start_time,end_time");
  urlInsights.searchParams.set("time_range", JSON.stringify({ since, until }));
  urlInsights.searchParams.set("limit", "500");
  urlInsights.searchParams.set("access_token", TOKEN);

  const [adsetsRes, insightsRes] = await Promise.all([
    fetch(`${urlAdsets}&access_token=${TOKEN}`),
    fetch(urlInsights)
  ]);

  const adsetsData = await adsetsRes.json();
  const insightsData = await insightsRes.json();

  if(adsetsData.error) throw new Error(adsetsData.error.message);
  if(insightsData.error) throw new Error(insightsData.error.message);

  const insightsMap = {};
  (insightsData.data || []).forEach(i => {
    insightsMap[i.adset_id] = i;
  });

  return (adsetsData.data || []).map(adset => ({
    ...adset,
    insights: insightsMap[adset.id] || {}
  }));
}

async function fetchAds(accountId, since, until) {
  const urlAds = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/ads`);
  urlAds.searchParams.set("fields", "name,status,creative,start_time,end_time");
  urlAds.searchParams.set("limit", "200");

  const urlInsights = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/insights`);
  urlInsights.searchParams.set("level", "ad");
  urlInsights.searchParams.set("fields", "ad_id,impressions,clicks,spend,actions,ctr,cpc,cpm,start_time,end_time");
  urlInsights.searchParams.set("time_range", JSON.stringify({ since, until }));
  urlInsights.searchParams.set("limit", "500");
  urlInsights.searchParams.set("access_token", TOKEN);

  const [adsRes, insightsRes] = await Promise.all([
    fetch(`${urlAds}&access_token=${TOKEN}`),
    fetch(urlInsights)
  ]);

  const adsData = await adsRes.json();
  const insightsData = await insightsRes.json();

  if(adsData.error) throw new Error(adsData.error.message);
  if(insightsData.error) throw new Error(insightsData.error.message);

  const insightsMap = {};
  (insightsData.data || []).forEach(i => {
    insightsMap[i.ad_id] = i;
  });

  return (adsData.data || []).map(ad => ({
    ...ad,
    insights: insightsMap[ad.id] || {}
  }));
}

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

async function carregarTudo() {
  const accountId = accountSelect.value;
  const since = startDateInput.value;
  const until = endDateInput.value;

  if (!accountId) return alert("Selecione uma conta de anúncio.");
  if (!since || !until) return alert("Selecione as datas inicial e final.");

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

async function init() {
  // Datas padrão últimos 7 dias
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

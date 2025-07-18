const TOKEN = "EAAIyWkoZCTyQBPIZCw3jcdHSs3qmHVgHk0hOdxw6bzSpENbnRi2vAvHzIxMq89NEfcAxAmYMB6Ne4KqlCUg2cM9LZATk4zsKEgnIGZCdqKobJynkNp869tXKwmFxr03NVMjG7qavPuphYXuTbSBViU0dKf4Qgy9MfFIKkEhHvuGWmZBvqs9A1mb0rMZCVdv2NrQBqcYvFj4mSs3tl06f8t";

const contas = [
  { id: "507111372463621", name: "Conta 1" },
  { id: "1421566932486575", name: "Conta 2" },
  { id: "1767547067979139", name: "Conta 3" },
  { id: "1073555467565665", name: "Conta 4" },
  { id: "735462832220538", name: "Conta 5" },
];

const accountSelect = document.getElementById("accountSelect");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const btnRefresh = document.getElementById("btnRefresh");
const tabs = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");

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

function formatCurrency(value) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR");
}
function renderStatus(status) {
  if(!status) return "";
  status = status.toLowerCase();
  let cls = "";
  if(status.includes("active")) cls = "active";
  else if(status.includes("paused")) cls = "paused";
  else if(status.includes("inactive")) cls = "inactive";
  else cls = "inactive";
  return `<span class="status ${cls}">${status}</span>`;
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

function loadAccounts() {
  accountSelect.innerHTML = contas.map(c => `<option value="${c.id}">${c.name} (${c.id})</option>`).join("");
}

async function fetchCampaigns(accountId, since, until) {
  const urlCampaigns = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/campaigns`);
  urlCampaigns.searchParams.set("fields", "name,status,effective_status,start_time,stop_time");
  urlCampaigns.searchParams.set("limit", "200");
  urlCampaigns.searchParams.set("access_token", TOKEN);

  const urlInsights = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/insights`);
  urlInsights.searchParams.set("level", "campaign");
  urlInsights.searchParams.set("fields", "campaign_id,impressions,clicks,spend,actions,ctr,cpc,cpm");
  urlInsights.searchParams.set("time_range", JSON.stringify({ since, until }));
  urlInsights.searchParams.set("limit", "500");
  urlInsights.searchParams.set("access_token", TOKEN);

  const [campRes, insightsRes] = await Promise.all([
    fetch(urlCampaigns),
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
  urlAdsets.searchParams.set("access_token", TOKEN);

  const urlInsights = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/insights`);
  urlInsights.searchParams.set("level", "adset");
  urlInsights.searchParams.set("fields", "adset_id,impressions,clicks,spend,actions,ctr,cpc,cpm");
  urlInsights.searchParams.set("time_range", JSON.stringify({ since, until }));
  urlInsights.searchParams.set("limit", "500");
  urlInsights.searchParams.set("access_token", TOKEN);

  const [adsetsRes, insightsRes] = await Promise.all([
    fetch(urlAdsets),
    fetch(urlInsights)
  ]);

  const adsetsData = await adsetsRes.json();

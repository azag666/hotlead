const TOKEN = "EAAIyWkoZCTyQBPIZCw3jcdHSs3qmHVgHk0hOdxw6bzSpENbnRi2vAvHzIxMq89NEfcAxAmYMB6Ne4KqlCUg2cM9LZATk4zsKEgnIGZCdqKobJynkNp869tXKwmFxr03NVMjG7qavPuphYXuTbSBViU0dKf4Qgy9MfFIKkEhHvuGWmZBvqs9A1mb0rMZCVdv2NrQBqcYvFj4mSs3tl06f8t";

const contas = [
  { id: "507111372463621", name: "Conta 1" },
  { id: "1421566932486575", name: "Conta 2" },
  { id: "1767547067979139", name: "Conta 3" },
  { id: "1073555467565665", name: "Conta 4" },
  { id: "735462832220538", name: "Conta 5" },
];

document.addEventListener("DOMContentLoaded", () => {
  const accountSelect = document.getElementById("accountSelect");
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");
  const btnRefresh = document.getElementById("btnRefresh");
  const campaignsListContainer = document.getElementById("campaigns-list");
  const darkModeToggle = document.getElementById("darkModeToggle");

  // Load dark mode preference from localStorage
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>'; // Sun icon for light mode
  } else {
      document.documentElement.classList.remove('dark');
      darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>'; // Moon icon for dark mode
  }

  // Toggle Dark Mode
  darkModeToggle.addEventListener('click', () => {
      if (document.documentElement.classList.contains('dark')) {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
          darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
      } else {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
          darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
      }
  });

  // Populate account select
  accountSelect.innerHTML = contas.map(c => `<option value="${c.id}">${c.name} (${c.id})</option>`).join("");

  // Set default dates to last 7 days
  const hoje = new Date();
  const semanaPassada = new Date(hoje);
  semanaPassada.setDate(hoje.getDate() - 7);
  startDateInput.value = semanaPassada.toISOString().slice(0, 10);
  endDateInput.value = hoje.toISOString().slice(0, 10);

  // --- API Fetch Functions ---

  async function fetchCampaigns(accountId, since, until) {
    const urlCampaigns = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/campaigns`);
    urlCampaigns.searchParams.set("fields", "id,name,status,effective_status,start_time,stop_time");
    urlCampaigns.searchParams.set("limit", "200");
    urlCampaigns.searchParams.set("access_token", TOKEN);

    const urlInsights = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/insights`);
    urlInsights.searchParams.set("level", "campaign");
    urlInsights.searchParams.set("fields", "campaign_id,impressions,clicks,spend,actions,ctr,cpc,cpm");
    urlInsights.searchParams.set("time_range", JSON.stringify({ since, until }));
    urlInsights.searchParams.set("limit", "500");
    urlInsights.searchParams.set("access_token", TOKEN);

    try {
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
    } catch (error) {
      console.error("Erro ao buscar dados da API:", error);
      throw error;
    }
  }

  // --- Formatting Helpers ---

  function formatCurrency(value) {
    const num = Number(value);
    if (isNaN(num)) return "R$ 0,00";
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR");
  }

  function renderStatus(status) {
    if (!status) return "";
    status = status.toLowerCase();
    let cls = "";
    if (status.includes("active")) cls = "active";
    else if (status.includes("paused")) cls = "paused";
    else if (status.includes("inactive") || status.includes("archived") || status.includes("completed")) cls = "inactive";
    return `<span class="status-badge ${cls}">${status.replace(/_/g, ' ')}</span>`;
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
    return `<div class="actions-list">${actions.map(a => `<p>${labels[a.action_type] || a.action_type}: <strong>${a.value}</strong></p>`).join("")}</div>`;
  }

  // --- Render Campaigns ---

  function renderCampaigns(campaigns) {
    campaignsListContainer.innerHTML = ""; // Clear previous content

    if (!campaigns.length) {
      campaignsListContainer.innerHTML = "<p class='text-center text-gray-400 col-span-full'>Nenhuma campanha encontrada para o período selecionado.</p>";
      return;
    }

    campaigns.forEach(c => {
      const ins = c.insights || {};
      campaignsListContainer.innerHTML += `
        <div class="campaign-card">
          <h3>${c.name}</h3>
          <div class="mb-2">
            ${renderStatus(c.status)} ${renderStatus(c.effective_status)}
          </div>
          <p><strong>Início:</strong> ${formatDate(c.start_time)}</p>
          <p><strong>Fim:</strong> ${formatDate(c.stop_time)}</p>
          <p><strong>Impressões:</strong> ${ins.impressions || 0}</p>
          <p><strong>Cliques:</strong> ${ins.clicks || 0}</p>
          <p><strong>Gasto:</strong> ${formatCurrency(ins.spend || 0)}</p>
          ${renderActions(ins.actions)}
        </div>
      `;
    });
  }

  // --- Main Load Function ---

  async function loadCampaigns() {
    const accountId = accountSelect.value;
    const since = startDateInput.value;
    const until = endDateInput.value;

    if (!accountId) {
      alert("Selecione uma conta de anúncio.");
      return;
    }
    if (!since || !until) {
      alert("Selecione as datas inicial e final.");
      return;
    }

    campaignsListContainer.innerHTML = "<p class='text-center text-green-400 col-span-full'><i class='fas fa-spinner fa-spin mr-2'></i> Carregando campanhas...</p>";

    try {
      const campaigns = await fetchCampaigns(accountId, since, until);
      renderCampaigns(campaigns);
    } catch (error) {
      campaignsListContainer.innerHTML = `<p class="text-center text-red-500 col-span-full">Erro ao carregar campanhas: ${error.message}. Por favor, tente novamente.</p>`;
    }
  }

  // Event Listeners
  accountSelect.addEventListener("change", loadCampaigns);
  btnRefresh.addEventListener("click", loadCampaigns);

  // Initial Load
  loadCampaigns();
});

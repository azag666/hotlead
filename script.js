const TOKEN = "EAAIyWkoZCTyQBPIZCw3jcdHSs3qmHVgHk0hOdxw6bzSpENbnRi2vAvHzIxMq89NEfcAxAmYMB6Ne4KqlCUg2cM9LZATk4zsKEgnIGZCdqKobJynkNp869tXKwmFxr03NVMjG7qavPuphYXuTbSBViU0dKf4Qgy9MfFIKkEhHvuGWmZBvqs9A1mb0rMZCVdv2NrQBqcYvFj4mSs3tl06f8t";

const contas = [
  { id: "507111372463621", name: "Conta 1" },
  { id: "1421566932486575", name: "Conta 2" },
  { id: "1767547067979139", name: "Conta 3" },
  { id: "1073555467565665", name: "Conta 4" },
  { id: "735462832220538", name: "Conta 5" },
];

// Variáveis globais para armazenar os dados e o estado da seleção
let allCampaigns = [];
let allAdSets = [];
let allAds = [];
let selectedCampaignId = null;

window.onload = () => {
  const accountSelect = document.getElementById("accountSelect");
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");
  const btnRefresh = document.getElementById("btnRefresh");
  const tabs = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  // Preenche select com contas
  accountSelect.innerHTML = contas.map(c => `<option value="${c.id}">${c.name} (${c.id})</option>`).join("");
  console.log("Contas carregadas no select");

  // Datas padrão últimos 7 dias
  const hoje = new Date();
  const semanaPassada = new Date(hoje);
  semanaPassada.setDate(hoje.getDate() - 7);
  startDateInput.value = semanaPassada.toISOString().slice(0, 10);
  endDateInput.value = hoje.toISOString().slice(0, 10);

  // Troca abas
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      tabContents.forEach(tc => {
        tc.classList.remove("active");
        if(tc.id === tab.dataset.tab) tc.classList.add("active");
      });
      // Força a re-renderização ao trocar de aba, caso o filtro de campanha esteja ativo
      renderCurrentTabContent();
    });
  });

  // Função para renderizar o conteúdo da aba ativa
  function renderCurrentTabContent() {
    const activeTabId = document.querySelector(".tab-button.active").dataset.tab;
    if (activeTabId === "campanhas") {
      renderCampaigns(allCampaigns);
    } else if (activeTabId === "adsets") {
      renderAdSets(allAdSets);
    } else if (activeTabId === "ads") {
      renderAds(allAds);
    }
  }


  // --- Funções de busca na API ---

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
    urlAdsets.searchParams.set("fields", "id,name,status,daily_budget,start_time,end_time,campaign_id"); // Adicionado campaign_id
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
    urlAds.searchParams.set("fields", "id,name,status,creative,adset_id"); // Adicionado adset_id
    urlAds.searchParams.set("limit", "200");
    urlAds.searchParams.set("access_token", TOKEN);

    const urlInsights = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/insights`);
    urlInsights.searchParams.set("level", "ad");
    urlInsights.searchParams.set("fields", "ad_id,impressions,clicks,spend,actions,ctr,cpc,cpm");
    urlInsights.searchParams.set("time_range", JSON.stringify({ since, until }));
    urlInsights.searchParams.set("limit", "500");
    urlInsights.searchParams.set("access_token", TOKEN);

    const [adsRes, insightsRes] = await Promise.all([
      fetch(urlAds),
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
      insights: insightsMap[ad.id] || {},
      preview_url: ad.creative && ad.creative.thumbnail_url ? ad.creative.thumbnail_url : null // Adiciona URL de preview
    }));
  }

  // --- Helpers de formatação ---

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
    if(!status) return "";
    status = status.toLowerCase();
    let cls = "";
    if(status.includes("active")) cls = "active";
    else if(status.includes("paused")) cls = "paused";
    else if(status.includes("inactive") || status.includes("archived") || status.includes("completed") || status.includes("deleted")) cls = "inactive";
    else cls = "inactive"; // Default para status desconhecido
    return `<span class="status ${cls}">${status.replace(/_/g, ' ')}</span>`;
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

  // --- Funções de manipulação de eventos ---

  function handleCampaignClick(campaignId) {
      selectedCampaignId = campaignId;
      // Ativa a aba de conjuntos de anúncios programaticamente
      document.querySelector(".tab-button[data-tab='adsets']").click();
      renderAdSets(allAdSets); // Re-renderiza conjuntos de anúncios com o filtro
      renderAds(allAds); // Re-renderiza anúncios com o filtro
  }

  function handleBackToCampaigns() {
      selectedCampaignId = null;
      document.querySelector(".tab-button[data-tab='campanhas']").click();
      renderCampaigns(allCampaigns); // Re-renderiza todas as campanhas
      renderAdSets(allAdSets); // Re-renderiza todos os conjuntos de anúncios
      renderAds(allAds); // Re-renderiza todos os anúncios
  }


  // --- Renderização das abas ---

  function renderCampaigns(campaigns) {
    const container = document.getElementById("campanhas");
    container.innerHTML = "";

    // Se uma campanha está selecionada, mostre apenas ela (para navegação hierárquica)
    let campaignsToRender = campaigns;
    if (selectedCampaignId) {
        campaignsToRender = campaigns.filter(c => c.id === selectedCampaignId);
    }

    if (!campaignsToRender.length) {
      container.innerHTML = "<p>Nenhuma campanha encontrada para o período.</p>";
      return;
    }

    campaignsToRender.forEach(c => {
      const ins = c.insights || {};
      container.innerHTML += `
        <div class="card ${selectedCampaignId === c.id ? 'selected-card' : ''}" data-campaign-id="${c.id}">
          <h3>${c.name}</h3>
          ${renderStatus(c.status)} ${renderStatus(c.effective_status)}
          <p><strong>ID:</strong> ${c.id}</p>
          <p><strong>Início:</strong> ${formatDate(c.start_time)}</p>
          <p><strong>Fim:</strong> ${formatDate(c.stop_time)}</p>
          <p><strong>Impressões:</strong> ${ins.impressions || 0}</p>
          <p><strong>Cliques:</strong> ${ins.clicks || 0}</p>
          <p><strong>Gasto:</strong> ${formatCurrency(ins.spend || 0)}</p>
          <div>${renderActions(ins.actions)}</div>
        </div>
      `;
    });

    // Adiciona o evento de clique aos cards de campanha
    container.querySelectorAll(".card").forEach(card => {
        card.addEventListener("click", () => handleCampaignClick(card.dataset.campaignId));
    });
  }

  function renderAdSets(adsets) {
    const container = document.getElementById("adsets");
    container.innerHTML = "";

    // Adiciona o botão "Voltar" se uma campanha estiver selecionada
    if (selectedCampaignId) {
        const campaignName = allCampaigns.find(c => c.id === selectedCampaignId)?.name || "Campanha Desconhecida";
        container.innerHTML += `
            <button class="back-button" onclick="handleBackToCampaigns()">&#8592; Voltar para Campanhas</button>
            <h2>Conjuntos de Anúncios para: ${campaignName}</h2>
        `;
    } else {
        container.innerHTML += `<h2>Todos os Conjuntos de Anúncios</h2>`;
    }

    let adsetsToRender = adsets;
    if (selectedCampaignId) {
      adsetsToRender = adsets.filter(a => a.campaign_id === selectedCampaignId);
    }

    if (!adsetsToRender.length) {
      container.innerHTML += "<p>Nenhum conjunto de anúncios encontrado para os filtros.</p>";
      return;
    }

    adsetsToRender.forEach(a => {
      const ins = a.insights || {};
      container.innerHTML += `
        <div class="card">
          <h3>${a.name}</h3>
          ${renderStatus(a.status)}
          <p><strong>ID:</strong> ${a.id}</p>
          <p><strong>Campanha ID:</strong> ${a.campaign_id}</p>
          <p><strong>Início:</strong> ${formatDate(a.start_time)}</p>
          <p><strong>Fim:</strong> ${formatDate(a.end_time)}</p>
          <p><strong>Orçamento diário:</strong> ${formatCurrency((a.daily_budget || 0)/100)}</p>
          <p><strong>Impressões:</strong> ${ins.impressions || 0}</p>
          <p><strong>Cliques:</strong> ${ins.clicks || 0}</p>
          <p><strong>Gasto:</strong> ${formatCurrency(ins.spend || 0)}</p>
          <div>${renderActions(ins.actions)}</div>
        </div>
      `;
    });
  }

  function renderAds(ads) {
    const container = document.getElementById("ads");
    container.innerHTML = "";

    // Adiciona o botão "Voltar" se uma campanha estiver selecionada
    if (selectedCampaignId) {
        const campaignName = allCampaigns.find(c => c.id === selectedCampaignId)?.name || "Campanha Desconhecida";
        container.innerHTML += `
            <button class="back-button" onclick="handleBackToCampaigns()">&#8592; Voltar para Campanhas</button>
            <h2>Anúncios para Campanha: ${campaignName}</h2>
        `;
    } else {
        container.innerHTML += `<h2>Todos os Anúncios</h2>`;
    }

    let adsToRender = ads;
    if (selectedCampaignId) {
      // Primeiro, encontre todos os adsets da campanha selecionada
      const adsetsInSelectedCampaign = allAdSets.filter(a => a.campaign_id === selectedCampaignId).map(a => a.id);
      // Então, filtre os anúncios que pertencem a esses adsets
      adsToRender = ads.filter(ad => adsetsInSelectedCampaign.includes(ad.adset_id));
    }

    if (!adsToRender.length) {
      container.innerHTML = "<p>Nenhum anúncio encontrado para os filtros.</p>";
      return;
    }

    adsToRender.forEach(a => {
      const ins = a.insights || {};
      const ctr = parseFloat(ins.ctr);
      const ctrFormatada = !isNaN(ctr) ? ctr.toFixed(2) : "0.00";
      const cpc = parseFloat(ins.cpc);
      const cpcFormatado = !isNaN(cpc) ? formatCurrency(cpc) : formatCurrency(0);
      const cpm = parseFloat(ins.cpm);
      const cpmFormatado = !isNaN(cpm) ? formatCurrency(cpm) : formatCurrency(0);

      container.innerHTML += `
        <div class="card">
          <h3>${a.name}</h3>
          ${renderStatus(a.status)}
          <p><strong>ID:</strong> ${a.id}</p>
          <p><strong>Conjunto de Anúncios ID:</strong> ${a.adset_id}</p>
          ${a.preview_url ? `<img src="${a.preview_url}" alt="Prévia do Criativo" class="creative-preview">` : ''}
          <p><strong>Impressões:</strong> ${ins.impressions || 0}</p>
          <p><strong>Cliques:</strong> ${ins.clicks || 0}</p>
          <p><strong>Gasto:</strong> ${formatCurrency(ins.spend || 0)}</p>
          <p><strong>CTR:</strong> ${ctrFormatada}%</p>
          <p><strong>CPC:</strong> ${cpcFormatado}</p>
          <p><strong>CPM:</strong> ${cpmFormatado}</p>
          <div>${renderActions(ins.actions)}</div>
        </div>
      `;
    });
  }

  // --- Carrega tudo quando chamado ---

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
      // Reset selected campaign on full refresh
      selectedCampaignId = null;

      const [campaigns, adsets, ads] = await Promise.all([
        fetchCampaigns(accountId, since, until),
        fetchAdSets(accountId, since, until),
        fetchAds(accountId, since, until),
      ]);

      allCampaigns = campaigns; // Armazena globalmente
      allAdSets = adsets;     // Armazena globalmente
      allAds = ads;         // Armazena globalmente

      renderCampaigns(allCampaigns); // Renderiza todas as campanhas inicialmente
      renderAdSets(allAdSets);     // Renderiza todos os conjuntos de anúncios inicialmente
      renderAds(allAds);         // Renderiza todos os anúncios inicialmente

      // Define as funções de manipulação de evento globalmente para o onclick do HTML
      window.handleCampaignClick = handleCampaignClick;
      window.handleBackToCampaigns = handleBackToCampaigns;

    } catch (error) {
      ["campanhas", "adsets", "ads"].forEach(id => {
        document.getElementById(id).innerHTML = `<p style="color:#f44336">Erro: ${error.message}</p>`;
      });
    }
  }

  // Eventos
  accountSelect.addEventListener("change", carregarTudo);
  btnRefresh.addEventListener("click", carregarTudo);

  // Carregamento inicial
  carregarTudo();
};

const TOKEN = "EAAIyWkoZCTyQBPIZCw3jcdHSs3qmHVgHk0hOdxw6bzSpENbnRi2vAvHzIxMq89NEfcAxAmYMB6Ne4KqlCUg2cM9LZATk4zsKEgnIGZCdqKobJynkNp869tXKwmFxr03NVMjG7qavPuphYXuTbSBViU0dKf4Qgy9MfFIKkEhHvuGWmZBvqs9A1mb0rMZCVdv2NrQBqcYvFj4mSs3tl06f8t"; // MANTENHA SEU TOKEN PRIVADO E SEGURO!

const contas = [
  { id: "507111372463621", name: "Conta 1" },
  { id: "1421566932486575", name: "Conta 2" },
  { id: "1767547067979139", name: "Conta 3" },
  { id: "1073555467565665", name: "Conta 4" },
  { id: "735462832220538", name: "Conta 5" },
];

window.onload = () => {
  const accountSelect = document.getElementById("accountSelect");
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");
  const btnRefresh = document.getElementById("btnRefresh");
  const tabs = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");
  const kpiSummaryDiv = document.getElementById("kpiSummary");
  const globalLoadingDiv = document.getElementById("globalLoading");
  const globalErrorDiv = document.getElementById("globalError");
  const errorMessageSpan = globalErrorDiv.querySelector(".error-message");

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
    });
  });

  // --- Funções de busca na API ---

  async function fetchGraphAPI(url) {
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || "Erro desconhecido na API.");
    }
    return data;
  }

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

    const [campData, insightsData] = await Promise.all([
      fetchGraphAPI(urlCampaigns),
      fetchGraphAPI(urlInsights)
    ]);

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
    urlAdsets.searchParams.set("fields", "id,name,status,daily_budget,start_time,end_time");
    urlAdsets.searchParams.set("limit", "200");
    urlAdsets.searchParams.set("access_token", TOKEN);

    const urlInsights = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/insights`);
    urlInsights.searchParams.set("level", "adset");
    urlInsights.searchParams.set("fields", "adset_id,impressions,clicks,spend,actions,ctr,cpc,cpm");
    urlInsights.searchParams.set("time_range", JSON.stringify({ since, until }));
    urlInsights.searchParams.set("limit", "500");
    urlInsights.searchParams.set("access_token", TOKEN);

    const [adsetsData, insightsData] = await Promise.all([
      fetchGraphAPI(urlAdsets),
      fetchGraphAPI(urlInsights)
    ]);

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
    urlAds.searchParams.set("fields", "id,name,status,creative");
    urlAds.searchParams.set("limit", "200");
    urlAds.searchParams.set("access_token", TOKEN);

    const urlInsights = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/insights`);
    urlInsights.searchParams.set("level", "ad");
    urlInsights.searchParams.set("fields", "ad_id,impressions,clicks,spend,actions,ctr,cpc,cpm");
    urlInsights.searchParams.set("time_range", JSON.stringify({ since, until }));
    urlInsights.searchParams.set("limit", "500");
    urlInsights.searchParams.set("access_token", TOKEN);

    const [adsData, insightsData] = await Promise.all([
      fetchGraphAPI(urlAds),
      fetchGraphAPI(urlInsights)
    ]);

    const insightsMap = {};
    (insightsData.data || []).forEach(i => {
      insightsMap[i.ad_id] = i;
    });

    return (adsData.data || []).map(ad => ({
      ...ad,
      insights: insightsMap[ad.id] || {}
    }));
  }

  // --- Helpers de formatação ---

  function formatCurrency(value) {
    const num = Number(value);
    if (isNaN(num) || num === 0) return "R$ 0,00"; // Melhor tratamento para 0
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
    else if(status.includes("inactive")) cls = "inactive";
    else if(status.includes("archived")) cls = "inactive"; // Mapeia archived para inactive
    else if(status.includes("completed")) cls = "completed"; // Novo status
    else if(status.includes("campaign_paused")) cls = "paused"; // Exemplo de mapeamento
    else cls = "inactive"; // Default fallback
    return `<span class="status ${cls}">${status.replace(/_/g, ' ')}</span>`; // Substitui underscores
  }
  function renderActions(actions) {
    if (!actions || !actions.length) return "<p><em>Sem ações registradas</em></p>"; // Adiciona parágrafo para consistência
    const labels = {
      "link_click": "Cliques em Links",
      "post_engagement": "Engajamento em Post",
      "page_engagement": "Engajamento na Página",
      "lead": "Leads",
      "purchase": "Compras",
      "view_content": "Visualizações",
      "add_to_cart": "Adicionados ao Carrinho",
      "initiate_checkout": "Inícios de Checkout",
      // Adicione mais tipos de ações conforme necessário e seus rótulos
    };
    // Filtra ações com valor válido e mapeia
    const filteredActions = actions.filter(a => a.value && Number(a.value) > 0);
    if (filteredActions.length === 0) return "<p><em>Sem ações registradas</em></p>";
    return filteredActions.map(a => `<p>• ${labels[a.action_type] || a.action_type}: <strong>${Number(a.value).toLocaleString("pt-BR")}</strong></p>`).join("");
  }

  function calculateKpis(data) {
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalActions = 0; // Para somar todas as ações, ou podemos ser mais específicos

    data.forEach(item => {
      const ins = item.insights || {};
      totalSpend += Number(ins.spend || 0);
      totalImpressions += Number(ins.impressions || 0);
      totalClicks += Number(ins.clicks || 0);
      if (ins.actions) {
        ins.actions.forEach(action => {
          // Exemplo: somar apenas 'leads' e 'purchases' para um total de conversões
          if (action.action_type === 'lead' || action.action_type === 'purchase') {
            totalActions += Number(action.value || 0);
          }
        });
      }
    });

    const overallCtr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;
    const overallCpc = totalClicks > 0 ? (totalSpend / totalClicks) : 0;
    const overallCpm = totalImpressions > 0 ? (totalSpend / totalImpressions * 1000) : 0;

    return {
      totalSpend,
      totalImpressions,
      totalClicks,
      overallCtr,
      overallCpc,
      overallCpm,
      totalActions // Pode ser renomeado para totalConversions se o filtro for específico
    };
  }

  function renderKpis(kpis) {
    kpiSummaryDiv.innerHTML = `
      <div class="kpi-item">
        <div class="kpi-label">Gasto Total</div>
        <div class="kpi-value">${formatCurrency(kpis.totalSpend)}</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-label">Impressões Totais</div>
        <div class="kpi-value">${kpis.totalImpressions.toLocaleString("pt-BR")}</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-label">Cliques Totais</div>
        <div class="kpi-value">${kpis.totalClicks.toLocaleString("pt-BR")}</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-label">CTR Médio</div>
        <div class="kpi-value">${kpis.overallCtr.toFixed(2)}%</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-label">CPC Médio</div>
        <div class="kpi-value">${formatCurrency(kpis.overallCpc)}</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-label">CPM Médio</div>
        <div class="kpi-value">${formatCurrency(kpis.overallCpm)}</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-label">Leads/Compras</div>
        <div class="kpi-value">${kpis.totalActions.toLocaleString("pt-BR")}</div>
      </div>
    `;
  }

  // --- Renderização das abas ---

  function renderCampaigns(campaigns) {
    const container = document.getElementById("campanhas");
    container.innerHTML = "";

    if (!campaigns.length) {
      container.innerHTML = "<p class='no-data-message'><i class='fas fa-info-circle'></i> Nenhuma campanha encontrada para o período selecionado.</p>";
      return;
    }

    campaigns.forEach(c => {
      const ins = c.insights || {};
      container.innerHTML += `
        <div class="card">
          <h3>${c.name}</h3>
          <div>
            ${renderStatus(c.status)}
            ${renderStatus(c.effective_status)}
          </div>
          <p><strong>Início:</strong> ${formatDate(c.start_time)}</p>
          <p><strong>Fim:</strong> ${formatDate(c.stop_time)}</p>
          <p><strong>Impressões:</strong> <strong>${(ins.impressions || 0).toLocaleString("pt-BR")}</strong></p>
          <p><strong>Cliques:</strong> <strong>${(ins.clicks || 0).toLocaleString("pt-BR")}</strong></p>
          <p><strong>Gasto:</strong> <strong>${formatCurrency(ins.spend || 0)}</strong></p>
          <div>${renderActions(ins.actions)}</div>
        </div>
      `;
    });
  }

  function renderAdSets(adsets) {
    const container = document.getElementById("adsets");
    container.innerHTML = "";

    if (!adsets.length) {
      container.innerHTML = "<p class='no-data-message'><i class='fas fa-info-circle'></i> Nenhum conjunto de anúncios encontrado para o período selecionado.</p>";
      return;
    }

    adsets.forEach(a => {
      const ins = a.insights || {};
      container.innerHTML += `
        <div class="card">
          <h3>${a.name}</h3>
          ${renderStatus(a.status)}
          <p><strong>Início:</strong> ${formatDate(a.start_time)}</p>
          <p><strong>Fim:</strong> ${formatDate(a.end_time)}</p>
          <p><strong>Orçamento diário:</strong> <strong>${formatCurrency((a.daily_budget || 0)/100)}</strong></p>
          <p><strong>Impressões:</strong> <strong>${(ins.impressions || 0).toLocaleString("pt-BR")}</strong></p>
          <p><strong>Cliques:</strong> <strong>${(ins.clicks || 0).toLocaleString("pt-BR")}</strong></p>
          <p><strong>Gasto:</strong> <strong>${formatCurrency(ins.spend || 0)}</strong></p>
          <div>${renderActions(ins.actions)}</div>
        </div>
      `;
    });
  }

  function renderAds(ads) {
    const container = document.getElementById("ads");
    container.innerHTML = "";

    if (!ads.length) {
      container.innerHTML = "<p class='no-data-message'><i class='fas fa-info-circle'></i> Nenhum anúncio encontrado para o período selecionado.</p>";
      return;
    }

    ads.forEach(a => {
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
          <p><strong>Impressões:</strong> <strong>${(ins.impressions || 0).toLocaleString("pt-BR")}</strong></p>
          <p><strong>Cliques:</strong> <strong>${(ins.clicks || 0).toLocaleString("pt-BR")}</strong></p>
          <p><strong>Gasto:</strong> <strong>${formatCurrency(ins.spend || 0)}</strong></p>
          <p><strong>CTR:</strong> <strong>${ctrFormatada}%</strong></p>
          <p><strong>CPC:</strong> <strong>${cpcFormatado}</strong></p>
          <p><strong>CPM:</strong> <strong>${cpmFormatado}</strong></p>
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

    if (!accountId) {
      showError("Selecione uma conta de anúncio para carregar os dados.");
      return;
    }
    if (!since || !until) {
      showError("Selecione as datas inicial e final para o período.");
      return;
    }

    // Limpa conteúdo anterior e mostra carregamento
    ["campanhas", "adsets", "ads"].forEach(id => {
      document.getElementById(id).innerHTML = ""; // Limpa antes de mostrar o loader
    });
    kpiSummaryDiv.innerHTML = ""; // Limpa KPIs também
    hideError(); // Esconde qualquer erro anterior
    showLoading(); // Mostra o indicador de carregamento global

    try {
      const [campaigns, adsets, ads] = await Promise.all([
        fetchCampaigns(accountId, since, until),
        fetchAdSets(accountId, since, until),
        fetchAds(accountId, since, until),
      ]);

      const allInsights = [...campaigns, ...adsets, ...ads]; // Unifica para calcular KPIs globais
      const kpis = calculateKpis(allInsights);
      renderKpis(kpis);

      renderCampaigns(campaigns);
      renderAdSets(adsets);
      renderAds(ads);
    } catch (error) {
      showError(`Erro ao carregar dados: ${error.message}. Por favor, tente novamente.`);
      // Limpa os cards em caso de erro
      ["campanhas", "adsets", "ads"].forEach(id => {
        document.getElementById(id).innerHTML = `<p class="error-message-inline"><i class="fas fa-exclamation-circle"></i> Não foi possível carregar os dados. Detalhes: ${error.message}</p>`;
      });
    } finally {
      hideLoading(); // Sempre esconde o carregador ao finalizar
    }
  }

  // --- Funções de feedback de UI ---

  function showLoading() {
    globalLoadingDiv.classList.add("show");
  }

  function hideLoading() {
    globalLoadingDiv.classList.remove("show");
  }

  function showError(message) {
    errorMessageSpan.textContent = message;
    globalErrorDiv.classList.add("show");
    kpiSummaryDiv.innerHTML = ""; // Limpa KPIs se houver erro
  }

  function hideError() {
    globalErrorDiv.classList.remove("show");
    errorMessageSpan.textContent = "";
  }

  // Eventos
  accountSelect.addEventListener("change", carregarTudo);
  btnRefresh.addEventListener("click", carregarTudo);

  // Carregamento inicial
  carregarTudo();
};

const TOKEN = "EAAIyWkoZCTyQBPIZCw3jcdHSs3qmHVgHk0hOdxw6bzSpENbnRi2vAvHzIxMq89NEfcAxAmYMB6Ne4KqlCUg2cM9LZATk4zsKEgnIGZCdqKobJynkNp869tXKwmFxr03NVMjG7qavPuphYXuTbSBViU0dKf4Qgy9MfFIKkEhHvuGWmZBvqs9A1mb0rMZCVdv2NrQBqcYvFj4mSs3tl06f8t"; // SEU TOKEN DE ACESSO DO GERENCIADOR DE ANÚNCIOS

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

  // Popula o seletor de contas
  contas.forEach(conta => {
    const option = document.createElement("option");
    option.value = conta.id;
    option.textContent = conta.name;
    accountSelect.appendChild(option);
  });

  // Define as datas padrão (últimos 7 dias)
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  startDateInput.value = sevenDaysAgo.toISOString().split('T')[0];
  endDateInput.value = today.toISOString().split('T')[0];

  btnRefresh.addEventListener("click", carregarTudo);

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active", "bg-green-600", "text-white"));
      tabs.forEach(t => t.classList.add("bg-gray-700", "text-gray-200"));
      tabContents.forEach(tc => tc.classList.remove("active"));

      tab.classList.add("active", "bg-green-600", "text-white");
      tab.classList.remove("bg-gray-700", "text-gray-200");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });

  // Carrega os dados iniciais
  carregarTudo();

  // --- Funções de Fetch da API ---

  async function fetchAdAccounts() {
    // Esta função é mais para fins de demonstração ou para expandir,
    // pois as contas já estão hardcoded.
    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name&access_token=${TOKEN}`
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.data;
    } catch (error) {
      console.error("Erro ao buscar contas de anúncio:", error);
      alert("Erro ao carregar contas de anúncio: " + error.message);
      return [];
    }
  }

  async function fetchCampaigns(accountId, since, until) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/act_${accountId}/campaigns?fields=id,name,status,effective_status,start_time,stop_time,insights.time_range({"since":"${since}","until":"${until}"}){impressions,clicks,spend,actions,ctr,cpc,cpm}&access_token=${TOKEN}`
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.data || [];
    } catch (error) {
      console.error("Erro ao buscar campanhas:", error);
      throw error;
    }
  }

  async function fetchAdSets(accountId, since, until) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/act_${accountId}/adsets?fields=id,name,status,daily_budget,start_time,end_time,insights.time_range({"since":"${since}","until":"${until}"}){impressions,clicks,spend,actions,ctr,cpc,cpm}&access_token=${TOKEN}`
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.data || [];
    } catch (error) {
      console.error("Erro ao buscar conjuntos de anúncios:", error);
      throw error;
    }
  }

  async function fetchAds(accountId, since, until) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/act_${accountId}/ads?fields=id,name,status,creative,insights.time_range({"since":"${since}","until":"${until}"}){impressions,clicks,spend,actions,ctr,cpc,cpm}&access_token=${TOKEN}`
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.data || [];
    } catch (error) {
      console.error("Erro ao buscar anúncios:", error);
      throw error;
    }
  }

  // --- Funções de Formatação e Renderização ---

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
    if (status.includes("active") || status.includes("on")) cls = "active";
    else if (status.includes("paused")) cls = "paused";
    else if (status.includes("inactive") || status.includes("off")) cls = "inactive";
    else cls = "inactive"; // Default para outros status não mapeados
    return `<span class="status ${cls}">${status.replace(/_/g, ' ')}</span>`; // Substitui underscores por espaços
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
      "initiate_checkout": "Inícios de Checkout",
      // Adicione mais tipos de ações conforme necessário
    };
    return actions.map(a => `<p>• ${labels[a.action_type] || a.action_type}: ${a.value}</p>`).join("");
  }

  function renderCampaigns(campaigns) {
    const container = document.getElementById("campanhas");
    container.innerHTML = "";

    if (!campaigns.length) {
      container.innerHTML = "<p class='text-gray-400 text-center col-span-full'>Nenhuma campanha encontrada para o período.</p>";
      return;
    }

    const accountId = accountSelect.value;
    const since = startDateInput.value;
    const until = endDateInput.value;

    campaigns.forEach(c => {
      const ins = c.insights || {};
      container.innerHTML += `
        <a href="details.html?type=campaign&id=${c.id}&accountId=${accountId}&since=${since}&until=${until}" class="card-link block transform transition duration-300 hover:scale-105">
          <div class="card bg-gray-700 p-4 rounded-lg shadow-md hover:bg-gray-600">
            <h3 class="text-xl font-bold mb-2 text-green-300">${c.name}</h3>
            <p>${renderStatus(c.status)} ${renderStatus(c.effective_status)}</p>
            <p class="text-sm text-gray-400 mt-2"><strong>Início:</strong> ${formatDate(c.start_time)}</p>
            <p class="text-sm text-gray-400"><strong>Fim:</strong> ${formatDate(c.stop_time)}</p>
            <p class="mt-3"><strong>Impressões:</strong> ${ins.impressions || 0}</p>
            <p><strong>Cliques:</strong> ${ins.clicks || 0}</p>
            <p><strong>Gasto:</strong> ${formatCurrency(ins.spend || 0)}</p>
            <div class="text-sm mt-2">${renderActions(ins.actions)}</div>
          </div>
        </a>
      `;
    });
  }

  function renderAdSets(adsets) {
    const container = document.getElementById("adsets");
    container.innerHTML = "";

    if (!adsets.length) {
      container.innerHTML = "<p class='text-gray-400 text-center col-span-full'>Nenhum conjunto de anúncios encontrado para o período.</p>";
      return;
    }

    const accountId = accountSelect.value;
    const since = startDateInput.value;
    const until = endDateInput.value;

    adsets.forEach(a => {
      const ins = a.insights || {};
      container.innerHTML += `
        <a href="details.html?type=adset&id=${a.id}&accountId=${accountId}&since=${since}&until=${until}" class="card-link block transform transition duration-300 hover:scale-105">
          <div class="card bg-gray-700 p-4 rounded-lg shadow-md hover:bg-gray-600">
            <h3 class="text-xl font-bold mb-2 text-green-300">${a.name}</h3>
            <p>${renderStatus(a.status)}</p>
            <p class="text-sm text-gray-400 mt-2"><strong>Início:</strong> ${formatDate(a.start_time)}</p>
            <p class="text-sm text-gray-400"><strong>Fim:</strong> ${formatDate(a.end_time)}</p>
            <p><strong>Orçamento diário:</strong> ${formatCurrency((a.daily_budget || 0)/100)}</p>
            <p class="mt-3"><strong>Impressões:</strong> ${ins.impressions || 0}</p>
            <p><strong>Cliques:</strong> ${ins.clicks || 0}</p>
            <p><strong>Gasto:</strong> ${formatCurrency(ins.spend || 0)}</p>
            <div class="text-sm mt-2">${renderActions(ins.actions)}</div>
          </div>
        </a>
      `;
    });
  }

  function renderAds(ads) {
    const container = document.getElementById("ads");
    container.innerHTML = "";

    if (!ads.length) {
      container.innerHTML = "<p class='text-gray-400 text-center col-span-full'>Nenhum anúncio encontrado para o período.</p>";
      return;
    }

    const accountId = accountSelect.value;
    const since = startDateInput.value;
    const until = endDateInput.value;

    ads.forEach(a => {
      const ins = a.insights || {};
      const ctr = parseFloat(ins.ctr);
      const ctrFormatada = !isNaN(ctr) ? ctr.toFixed(2) : "0.00";
      const cpc = parseFloat(ins.cpc);
      const cpcFormatado = !isNaN(cpc) ? formatCurrency(cpc) : formatCurrency(0);
      const cpm = parseFloat(ins.cpm);
      const cpmFormatado = !isNaN(cpm) ? formatCurrency(cpm) : formatCurrency(0);

      container.innerHTML += `
        <a href="details.html?type=ad&id=${a.id}&accountId=${accountId}&since=${since}&until=${until}" class="card-link block transform transition duration-300 hover:scale-105">
          <div class="card bg-gray-700 p-4 rounded-lg shadow-md hover:bg-gray-600">
            <h3 class="text-xl font-bold mb-2 text-green-300">${a.name}</h3>
            <p>${renderStatus(a.status)}</p>
            <p class="mt-3"><strong>Impressões:</strong> ${ins.impressions || 0}</p>
            <p><strong>Cliques:</strong> ${ins.clicks || 0}</p>
            <p><strong>Gasto:</strong> ${formatCurrency(ins.spend || 0)}</p>
            <p><strong>CTR:</strong> ${ctrFormatada}%</p>
            <p><strong>CPC:</strong> ${cpcFormatado}</p>
            <p><strong>CPM:</strong> ${cpmFormatado}</p>
            <div class="text-sm mt-2">${renderActions(ins.actions)}</div>
          </div>
        </a>
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
      document.getElementById(id).innerHTML = "<p class='text-gray-400 text-center col-span-full'>Carregando...</p>";
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
        document.getElementById(id).innerHTML = `<p style="color:#f44336" class='text-center col-span-full'>Erro: ${error.message}</p>`;
      });
      console.error("Erro ao carregar dados:", error);
    }
  }
};

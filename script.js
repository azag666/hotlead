const accessToken = "EAAIyWkoZCTyQBPEQzRpMzykm81UXdgjfLGI1PCMZBdPj05KlDlb3DWSZBkKHpDArZA8F2sIE6GHuiOls2ThHyRkkZA25cZA3wKxTLx8vqQpZByk39lxiuBsMvGZCZCtbjNLkrBSA5SRJNoYEwGaMfZAaLdhhx5CHJWVz25390W5cC7dN5u0dEoi2uEHGJqsIE1A1RsWKm85CRD29Lz1FfE3ksU";
const accountIds = [
  "1073555467565665",
  "1421566932486575",
  "507111372463621",
  "735462832220538",
  "1767547067979139"
];
const container = document.getElementById("data-container");
const loading = document.getElementById("loading");

async function fetchCampaigns(accountId) {
  const url = `https://graph.facebook.com/v19.0/act_${accountId}/campaigns?fields=name,status,effective_status,insights{actions,impressions,spend,clicks}&limit=100&access_token=${accessToken}`;
  const res = await fetch(url);
  return res.json();
}

async function fetchAdSets(campaignId) {
  const url = `https://graph.facebook.com/v19.0/${campaignId}/adsets?fields=name,status,daily_budget,start_time,end_time&limit=50&access_token=${accessToken}`;
  const res = await fetch(url);
  return res.json();
}

async function fetchAds(adsetId) {
  const url = `https://graph.facebook.com/v19.0/${adsetId}/ads?fields=name,status,creative,tracking_specs&limit=50&access_token=${accessToken}`;
  const res = await fetch(url);
  return res.json();
}

function renderActionMetrics(actions) {
  if (!actions) return "<i>Nenhuma ação registrada.</i>";
  return actions.map(a => `<div><b>${a.action_type}:</b> ${a.value}</div>`).join("");
}

async function render() {
  for (const accountId of accountIds) {
    const accountDiv = document.createElement("div");
    accountDiv.className = "account";
    accountDiv.innerHTML = `<h2>🧾 Conta de Anúncio: ${accountId}</h2>`;
    container.appendChild(accountDiv);

    try {
      const campaignsData = await fetchCampaigns(accountId);
      if (!campaignsData.data || campaignsData.data.length === 0) {
        accountDiv.innerHTML += "<p>Nenhuma campanha encontrada.</p>";
        continue;
      }

      for (const campaign of campaignsData.data) {
        const insights = campaign.insights?.data?.[0] || {};
        const campaignDiv = document.createElement("div");
        campaignDiv.className = "campaign";
        campaignDiv.innerHTML = `
          <h3>📣 Campanha: ${campaign.name}</h3>
          <div class="details">
            Status: ${campaign.status} / ${campaign.effective_status}<br>
            Impressões: ${insights.impressions || 0}<br>
            Cliques: ${insights.clicks || 0}<br>
            Gasto: R$ ${insights.spend || 0}<br>
            ${renderActionMetrics(insights.actions)}
          </div>
        `;
        accountDiv.appendChild(campaignDiv);

        // AdSets
        const adsetsData = await fetchAdSets(campaign.id);
        for (const adset of adsetsData.data || []) {
          const adsetDiv = document.createElement("div");
          adsetDiv.className = "adset";
          adsetDiv.innerHTML = `
            <h4>🧪 Ad Set: ${adset.name}</h4>
            <div class="details">
              Status: ${adset.status}<br>
              Início: ${adset.start_time}<br>
              Fim: ${adset.end_time || 'Indefinido'}<br>
              Budget Diário: R$ ${(adset.daily_budget/100).toFixed(2)}
            </div>
          `;
          campaignDiv.appendChild(adsetDiv);

          // Ads
          const adsData = await fetchAds(adset.id);
          for (const ad of adsData.data || []) {
            const adDiv = document.createElement("div");
            adDiv.className = "ad";
            adDiv.innerHTML = `
              <h5>🖼️ Anúncio: ${ad.name}</h5>
              <div class="details">
                Status: ${ad.status}<br>
                ID Criativo: ${ad.creative?.id || 'N/A'}
              </div>
            `;
            adsetDiv.appendChild(adDiv);
          }
        }
      }
    } catch (err) {
      accountDiv.innerHTML += `<p style="color:red">Erro ao buscar dados da conta ${accountId}</p>`;
    }
  }

  loading.remove();
}

render();

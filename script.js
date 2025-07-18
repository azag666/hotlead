const token = "EAAIyWkoZCTyQBPEQzRpMzykm81UXdgjfLGI1PCMZBdPj05KlDlb3DWSZBkKHpDArZA8F2sIE6GHuiOls2ThHyRkkZA25cZA3wKxTLx8vqQpZByk39lxiuBsMvGZCZCtbjNLkrBSA5SRJNoYEwGaMfZAaLdhhx5CHJWVz25390W5cC7dN5u0dEoi2uEHGJqsIE1A1RsWKm85CRD29Lz1FfE3ksU";

async function buscarCampanhas() {
  const adAccount = document.getElementById("adAccount").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const container = document.getElementById("resultados");
  container.innerHTML = "⏳ Carregando campanhas...";

  const campaignsURL = `https://graph.facebook.com/v19.0/act_${adAccount}/campaigns?access_token=${token}&fields=name,status,effective_status&limit=100`;

  try {
    const campaignsRes = await fetch(campaignsURL);
    const campaignsData = await campaignsRes.json();

    if (campaignsData.error) {
      container.innerHTML = `<p style="color:red;">Erro: ${campaignsData.error.message}</p>`;
      return;
    }

    const insightsURL = `https://graph.facebook.com/v19.0/act_${adAccount}/insights?access_token=${token}&level=campaign&fields=campaign_id,campaign_name,impressions,clicks,spend,reach,actions&time_range[since]=${startDate}&time_range[until]=${endDate}&limit=500`;
    const insightsRes = await fetch(insightsURL);
    const insightsData = await insightsRes.json();

    const insightsMap = {};
    (insightsData.data || []).forEach(i => {
      insightsMap[i.campaign_id] = i;
    });

    container.innerHTML = "";
    campaignsData.data.forEach(campanha => {
      const insight = insightsMap[campanha.id] || {};

      const div = document.createElement("div");
      div.className = "campanha";
      div.innerHTML = `
        <h3>${campanha.name}</h3>
        <span class="status ${campanha.effective_status}">${campanha.effective_status}</span>
        <p><strong>Impressões:</strong> ${insight.impressions || 0}</p>
        <p><strong>Cliques:</strong> ${insight.clicks || 0}</p>
        <p><strong>Alcance:</strong> ${insight.reach || 0}</p>
        <p><strong>Gasto:</strong> R$ ${parseFloat(insight.spend || 0).toFixed(2)}</p>
        <p><strong>Ações:</strong> ${JSON.stringify(insight.actions || [])}</p>
      `;
      container.appendChild(div);
    });

    if (campaignsData.data.length === 0) {
      container.innerHTML = "<p>Nenhuma campanha encontrada.</p>";
    }

  } catch (err) {
    container.innerHTML = `<p style="color:red;">Erro ao buscar campanhas: ${err.message}</p>`;
  }
}

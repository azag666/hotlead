const token = "EAAIyWkoZCTyQBPEQzRpMzykm81UXdgjfLGI1PCMZBdPj05KlDlb3DWSZBkKHpDArZA8F2sIE6GHuiOls2ThHyRkkZA25cZA3wKxTLx8vqQpZByk39lxiuBsMvGZCZCtbjNLkrBSA5SRJNoYEwGaMfZAaLdhhx5CHJWVz25390W5cC7dN5u0dEoi2uEHGJqsIE1A1RsWKm85CRD29Lz1FfE3ksU";

async function buscarCampanhas() {
  const adAccount = document.getElementById("adAccount").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const container = document.getElementById("resultados");
  container.innerHTML = "Carregando...";

  const fields = [
    "campaign_name",
    "impressions",
    "clicks",
    "spend",
    "reach",
    "actions"
  ].join(",");

  const url = `https://graph.facebook.com/v19.0/act_${adAccount}/insights?access_token=${token}&level=campaign&fields=${fields}&time_range[since]=${startDate}&time_range[until]=${endDate}&limit=100`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      container.innerHTML = `<p style="color:red;">Erro: ${data.error.message}</p>`;
      return;
    }

    container.innerHTML = "";
    if (data.data.length === 0) {
      container.innerHTML = "<p>Nenhuma campanha encontrada nesse período.</p>";
      return;
    }

    data.data.forEach(campanha => {
      const div = document.createElement("div");
      div.className = "campanha";
      div.innerHTML = `
        <h3>${campanha.campaign_name}</h3>
        <p><strong>Impressões:</strong> ${campanha.impressions}</p>
        <p><strong>Cliques:</strong> ${campanha.clicks}</p>
        <p><strong>Alcance:</strong> ${campanha.reach}</p>
        <p><strong>Gasto:</strong> R$ ${parseFloat(campanha.spend).toFixed(2)}</p>
        <p><strong>Ações:</strong> ${JSON.stringify(campanha.actions || [])}</p>
      `;
      container.appendChild(div);
    });

  } catch (err) {
    container.innerHTML = `<p style="color:red;">Erro ao buscar campanhas: ${err.message}</p>`;
  }
}

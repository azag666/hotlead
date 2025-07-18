const TOKEN = "EAAIyWkoZCTyQBPIZCw3jcdHSs3qmHVgHk0hOdxw6bzSpENbnRi2vAvHzIxMq89NEfcAxAmYMB6Ne4KqlCUg2cM9LZATk4zsKEgnIGZCdqKobJynkNp869tXKwmFxr03NVMjG7qavPuphYXuTbSBViU0dKf4Qgy9MfFIKkEhHvuGWmZBvqs9A1mb0rMZCVdv2NrQBqcYvFj4mSs3tl06f8t";

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

  // Preenche o select de contas
  accountSelect.innerHTML = contas.map(c => `<option value="${c.id}">${c.name} (${c.id})</option>`).join("");
  console.log("Contas carregadas no select");

  // Set datas padrão últimos 7 dias
  const hoje = new Date();
  const semanaPassada = new Date(hoje);
  semanaPassada.setDate(hoje.getDate() - 7);
  startDateInput.value = semanaPassada.toISOString().slice(0, 10);
  endDateInput.value = hoje.toISOString().slice(0, 10);

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

  accountSelect.addEventListener("change", carregarTudo);
  btnRefresh.addEventListener("click", carregarTudo);

  carregarTudo();

  // Funções fetch e render (copie as que você já tem ou me avise se precisar)
};

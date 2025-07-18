document.addEventListener('DOMContentLoaded', async () => {
    // --- ATENÇÃO: SUBSTITUA ESTES VALORES ---
    const ACCESS_TOKEN = 'EAAIyWkoZCTyQBPByDoanB8niRUU3LYuIqPQqzcIvk1cfXTRKk4dqYOIyYLXwE7l1OuUraA1zYDog58YGRIe0c48O1Ub1ZAXeWAB5F77RZAL7GdhYEj6Qwbu9QFl3VVPOTZCCykA9IMfhDBxvN1cWRj284ZADX6JZAjN8lzlhiKaZA1uBCDQLr2TBME4vQHB5bLPbO8MvdZAdQ703QgsKZCD0W
'; // Seu Token de Acesso do Meta
    const AD_ACCOUNT_ID = '1421566932488575'; // Ex: 'act_1234567890'
    // --- FIM DA SEÇÃO DE SUBSTITUIÇÃO ---

    const totalSpendElement = document.getElementById('totalSpend');
    const campaignsListElement = document.getElementById('campaignsList');

    // Função para formatar valores monetários
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL', // Ou a moeda da sua conta de anúncios, ex: 'USD'
        }).format(value);
    };

    try {
        // 1. Obter dados das campanhas
        const campaignsResponse = await fetch(
            `https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/campaigns?fields=name,spend&limit=25&access_token=${ACCESS_TOKEN}`
            // Nota: v19.0 é a versão atual da API em julho de 2025. Verifique a mais recente no Facebook Developers.
            // O 'limit' pode ser ajustado para o número de campanhas que você quer carregar inicialmente.
        );

        if (!campaignsResponse.ok) {
            const errorData = await campaignsResponse.json();
            throw new Error(`Erro ao buscar campanhas: ${errorData.error.message}`);
        }

        const campaignsData = await campaignsResponse.json();
        const campaigns = campaignsData.data;

        // 2. Calcular o gasto total
        let totalSpend = 0;
        if (campaigns && campaigns.length > 0) {
            campaigns.forEach(campaign => {
                const spend = parseFloat(campaign.spend || 0); // Garante que é um número
                totalSpend += spend;

                // Adicionar a campanha à lista
                const campaignItem = document.createElement('div');
                campaignItem.classList.add('campaign-item');
                campaignItem.innerHTML = `
                    <strong>${campaign.name}</strong>
                    <span>${formatCurrency(spend)}</span>
                `;
                campaignsListElement.appendChild(campaignItem);
            });
            totalSpendElement.textContent = formatCurrency(totalSpend);
        } else {
            campaignsListElement.innerHTML = '<p>Nenhuma campanha encontrada ou dados indisponíveis.</p>';
            totalSpendElement.textContent = formatCurrency(0);
        }

    } catch (error) {
        console.error('Erro ao carregar dados do Meta Ads:', error);
        totalSpendElement.textContent = 'Erro ao carregar';
        campaignsListElement.innerHTML = `<p style="color: red;">Ocorreu um erro ao carregar os dados: ${error.message}. Verifique seu Token de Acesso e ID da Conta.</p>`;
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    // --- SEUS DADOS DE ACESSO ---
    // ATENÇÃO: Este token é sensível e não deve ser compartilhado publicamente.
    // Para uso pessoal e local, é aceitável. Para hospedagem online,
    // considere usar um backend para proteger seu token.
    const ACCESS_TOKEN = 'EAAIyWkoZCTyQBPAp1pBdNgbAUvTU8je3xvRCy2RaPRJhz0So577pnZAHHB3ZBP9Nlt8JKnG1d1okylZAU39L5sEkAoAZBmyyP4ZBF9MZCAUtTz4znZBrgWvCesnz5JQLjjDHeHrnL7LVtTLZCGuqBZB4Q3Nm1570rfRVvRzyWI9yuUTuZCUJELv2ksWTOaaXbZAAAH7ZAM5mqmCDIFro0Hi7RCqcH';
    // O ID da sua conta de anúncios, prefixado com 'act_'.
    const AD_ACCOUNT_ID = 'act_1421566932486575';
    // --- FIM DOS SEUS DADOS DE ACESSO ---

    const totalSpendElement = document.getElementById('totalSpend');
    const campaignsListElement = document.getElementById('campaignsList');

    // Função para formatar valores monetários para Real Brasileiro (BRL)
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL', // Define a moeda como Real Brasileiro
        }).format(value);
    };

    // Função principal para carregar e exibir os dados
    const loadMetaAdsData = async () => {
        try {
            // Define o estado inicial de carregamento
            totalSpendElement.textContent = 'Carregando...';
            campaignsListElement.innerHTML = '<p>Carregando campanhas...</p>';

            // 1. Constrói a URL para a API Graph do Meta
            // Estamos buscando o nome e o gasto ('spend') de cada campanha.
            // O 'limit=100' pode ser ajustado para o número máximo de campanhas que você espera.
            // A versão da API (v19.0) é a mais recente no momento. Verifique a documentação do Meta
            // para garantir que você está usando a versão mais atual se houver problemas futuros.
            const apiUrl = `https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/campaigns?fields=name,spend&limit=100&access_token=${ACCESS_TOKEN}`;

            // 2. Faz a requisição HTTP para a API do Meta
            const campaignsResponse = await fetch(apiUrl);

            // 3. Verifica se a resposta da requisição foi bem-sucedida (status 200 OK)
            if (!campaignsResponse.ok) {
                // Se a resposta não for OK, tenta extrair a mensagem de erro do Meta
                const errorData = await campaignsResponse.json();
                // Lança um erro com a mensagem da API para ser capturado pelo bloco catch
                throw new Error(`Erro da API Meta: ${errorData.error.message} (Código: ${errorData.error.code})`);
            }

            // 4. Converte a resposta para JSON
            const campaignsData = await campaignsResponse.json();
            const campaigns = campaignsData.data; // Os dados das campanhas estão na propriedade 'data'

            // 5. Inicializa o gasto total
            let totalSpend = 0;

            // Limpa a lista de campanhas para adicionar os novos dados
            campaignsListElement.innerHTML = '';

            // 6. Processa os dados das campanhas
            if (campaigns && campaigns.length > 0) {
                campaigns.forEach(campaign => {
                    // Converte o gasto da campanha para um número (pode vir como string)
                    // Usa '0' se o gasto for nulo ou indefinido
                    const spend = parseFloat(campaign.spend || 0);
                    totalSpend += spend;

                    // Cria um elemento HTML para cada campanha e adiciona à lista
                    const campaignItem = document.createElement('div');
                    campaignItem.classList.add('campaign-item'); // Adiciona a classe CSS para estilização
                    campaignItem.innerHTML = `
                        <strong>${campaign.name}</strong>
                        <span>${formatCurrency(spend)}</span>
                    `;
                    campaignsListElement.appendChild(campaignItem);
                });
                // Atualiza o elemento HTML com o gasto total formatado
                totalSpendElement.textContent = formatCurrency(totalSpend);
            } else {
                // Se nenhuma campanha for encontrada
                campaignsListElement.innerHTML = '<p>Nenhuma campanha encontrada ou dados indisponíveis.</p>';
                totalSpendElement.textContent = formatCurrency(0); // Exibe 0 se não houver gastos
            }

        } catch (error) {
            // Captura e exibe qualquer erro que ocorra durante o processo
            console.error('Erro ao carregar dados do Meta Ads:', error);
            totalSpendElement.textContent = 'Erro ao carregar';
            campaignsListElement.innerHTML = `
                <p style="color: red; padding: 10px; border: 1px solid red; border-radius: 5px;">
                    Ocorreu um erro ao carregar os dados: ${error.message}.
                    Por favor, verifique seu Token de Acesso e o ID da Conta de Anúncios.
                    Certifique-se de que o token tem as permissões corretas (ads_read, ads_management).
                </p>
            `;
        }
    };

    // Chama a função para carregar os dados quando a página for carregada
    loadMetaAdsData();
});

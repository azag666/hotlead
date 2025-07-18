document.addEventListener('DOMContentLoaded', async () => {
    // --- SEUS DADOS DE ACESSO ---
    // ATENÇÃO: Este token é sensível e não deve ser compartilhado publicamente.
    // Para uso pessoal e local, é aceitável. Para hospedagem online,
    // considere usar um backend para proteger seu token.
    const ACCESS_TOKEN = 'EAAIyWkoZCTyQBPEQzRpMzykm81UXdgjfLGI1PCMZBdPj05KlDlb3DWSZBkKHpDArZA8F2sIE6GHuiOls2ThHyRkkZA25cZA3wKxTLx8vqQpZByk39lxiuBsMvGZCZCtbjNLkrBSA5SRJNoYEwGaMfZAaLdhhx5CHJWVz25390W5cC7dN5u0dEoi2uEHGJqsIE1A1RsWKm85CRD29Lz1FfE3ksU';

    // IDs das suas contas de anúncios. Adicione todos os IDs que você deseja monitorar aqui.
    // Certifique-se de que seu Token de Acesso tem permissões para todas essas contas.
    const AD_ACCOUNT_IDS = [
        { id: 'act_1073555467565665', name: 'Conta de Anúncios 1' },
        { id: 'act_1421566932486575', name: 'Conta de Anúncios 2' },
        { id: 'act_507111372463621', name: 'Conta de Anúncios 3' },
        { id: 'act_735462832220538', name: 'Conta de Anúncios 4' },
        { id: 'act_1767547067979139', name: 'Conta de Anúncios 5' }
    ];
    // --- FIM DOS SEUS DADOS DE ACESSO ---

    // Elementos do DOM
    const adAccountSelect = document.getElementById('adAccountSelect');
    const totalSpendElement = document.getElementById('totalSpend');
    const totalRoasElement = document.getElementById('totalRoas');
    const totalPurchasesElement = document.getElementById('totalPurchases');
    const totalConversionValueElement = document.getElementById('totalConversionValue');
    const insightsDisplayElement = document.getElementById('insightsDisplay');
    const filterButtons = document.querySelectorAll('.filter-button');
    const incrementButtons = document.querySelectorAll('.increment-button');

    let currentSelectedAccountId = AD_ACCOUNT_IDS[0].id; // Define a primeira conta como padrão
    let currentTimeRange = 'today'; // Define 'today' como período padrão
    let currentTimeIncrement = 'daily'; // Define 'daily' como agrupamento padrão
    let campaignNamesMap = new Map(); // Mapa para armazenar IDs de campanha para nomes

    // Função para formatar valores monetários para Real Brasileiro (BRL)
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    // Função para formatar ROAS como porcentagem ou número
    const formatRoas = (value) => {
        if (value === null || isNaN(value)) return 'N/A';
        return value.toFixed(2); // Formata para 2 casas decimais
    };

    // Preenche o dropdown de contas de anúncios
    const populateAdAccountSelect = () => {
        adAccountSelect.innerHTML = ''; // Limpa opções existentes
        AD_ACCOUNT_IDS.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = account.name;
            adAccountSelect.appendChild(option);
        });
        adAccountSelect.value = currentSelectedAccountId; // Seleciona a conta padrão
    };

    // Função para obter a data no formato YYYY-MM-DD
    const getDateString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Função para calcular o período de tempo com base na seleção
    const getTimeRangeDates = (range) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Zera hora para consistência

        let sinceDate, untilDate;

        switch (range) {
            case 'today':
                sinceDate = today;
                untilDate = today;
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                sinceDate = yesterday;
                untilDate = yesterday;
                break;
            case 'last_7_days':
                untilDate = today;
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(today.getDate() - 6); // Inclui hoje, então 6 dias atrás
                sinceDate = sevenDaysAgo;
                break;
            default: // Padrão para hoje
                sinceDate = today;
                untilDate = today;
        }

        return {
            since: getDateString(sinceDate),
            until: getDateString(untilDate)
        };
    };

    // Função para buscar os nomes das campanhas e mapeá-los por ID
    const fetchCampaignNames = async (accountId) => {
        const campaignsUrl = `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=id,name&access_token=${ACCESS_TOKEN}`;
        const response = await fetch(campaignsUrl);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro ao buscar nomes das campanhas: ${errorData.error.message}`);
        }
        const data = await response.json();
        campaignNamesMap.clear(); // Limpa o mapa anterior
        data.data.forEach(campaign => {
            campaignNamesMap.set(campaign.id, campaign.name);
        });
    };

    // Função principal para carregar e exibir os dados do Meta Ads
    const loadMetaAdsData = async () => {
        // Define o estado inicial de carregamento para todas as métricas e display
        totalSpendElement.textContent = 'Carregando...';
        totalRoasElement.textContent = 'Carregando...';
        totalPurchasesElement.textContent = 'Carregando...';
        totalConversionValueElement.textContent = 'Carregando...';
        insightsDisplayElement.innerHTML = '<p>Carregando dados...</p>';

        try {
            // Primeiro, busca os nomes das campanhas para a conta selecionada
            await fetchCampaignNames(currentSelectedAccountId);

            const { since, until } = getTimeRangeDates(currentTimeRange);

            let apiUrl;
            const baseFields = 'spend,actions,action_values,roas'; // Campos comuns a todas as requisições

            // Lógica para construir a URL da API com base no agrupamento selecionado
            if (currentTimeIncrement === 'daily' || currentTimeIncrement === 'hourly') {
                // Para agrupamentos diários/horários, solicitamos no nível da campanha.
                // Não incluímos 'campaign_name' explicitamente nos 'fields' para evitar o erro.
                // A API deve retornar o campaign_id, que usaremos para buscar o nome do mapa.
                apiUrl = `https://graph.facebook.com/v19.0/${currentSelectedAccountId}/insights?` +
                           `fields=campaign_id,${baseFields}&` + // Solicita campaign_id, mas NÃO campaign_name
                           `time_range={'since':'${since}','until':'${until}'}&` +
                           `time_increment=${currentTimeIncrement}&` +
                           `level=campaign&` + // Nível da campanha
                           `access_token=${ACCESS_TOKEN}`;
            } else { // Isso cobre 'all_days' (Total do Período) e qualquer 'monthly' futuro
                // Para 'all_days', podemos solicitar 'campaign_name' explicitamente nos fields
                // pois essa combinação é permitida com level=campaign.
                apiUrl = `https://graph.facebook.com/v19.0/${currentSelectedAccountId}/insights?` +
                           `fields=campaign_name,campaign_id,${baseFields}&` + // Solicita campaign_name E campaign_id
                           `time_range={'since':'${since}','until':'${until}'}&` +
                           `time_increment=${currentTimeIncrement}&` + // Será 'all_days'
                           `level=campaign&` + // Nível da campanha
                           `access_token=${ACCESS_TOKEN}`;
            }

            const response = await fetch(apiUrl);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro da API Meta: ${errorData.error.message} (Código: ${errorData.error.code})`);
            }

            const data = await response.json();
            const insights = data.data; // Os dados de insights estão na propriedade 'data'

            // Inicializa totais
            let totalSpend = 0;
            let totalPurchases = 0;
            let totalConversionValue = 0;
            let totalRoasSum = 0;
            let roasCount = 0; // Para calcular a média do ROAS

            insightsDisplayElement.innerHTML = ''; // Limpa o display anterior

            if (insights && insights.length > 0) {
                // Iterar sobre cada insight (que pode ser por dia/hora ou por campanha)
                insights.forEach(insight => {
                    totalSpend += parseFloat(insight.spend || 0);

                    // Processa ações e valores de ações
                    if (insight.actions) {
                        insight.actions.forEach(action => {
                            if (action.action_type === 'purchase') {
                                totalPurchases += parseFloat(action.value || 0);
                            }
                        });
                    }
                    if (insight.action_values) {
                        insight.action_values.forEach(actionValue => {
                            if (actionValue.action_type === 'purchase') {
                                totalConversionValue += parseFloat(actionValue.value || 0);
                            }
                        });
                    }

                    // Agrega ROAS para cálculo da média
                    if (insight.roas && insight.roas.length > 0) {
                        const roasValue = parseFloat(insight.roas[0].value || 0);
                        if (roasValue > 0) { // Apenas inclui ROAS válidos na média
                            totalRoasSum += roasValue;
                            roasCount++;
                        }
                    }

                    // Exibe os detalhes por dia/hora/campanha
                    const insightItem = document.createElement('div');
                    insightItem.classList.add('insight-item');

                    // Determina a exibição do período com base no time_increment
                    let periodDisplay = `Período: ${insight.date_start}`;
                    if (currentTimeIncrement === 'hourly') {
                        periodDisplay += ` Hora: ${insight.date_stop.substring(11, 16)}`;
                    } else if (currentTimeIncrement === 'daily' && insight.date_start !== insight.date_stop) {
                        periodDisplay += ` - ${insight.date_stop}`;
                    }

                    let itemContent = `<strong>${periodDisplay}</strong><br>`;

                    // Obtém o nome da campanha usando o mapa (para daily/hourly)
                    // ou diretamente do insight (para all_days)
                    const campaignName = insight.campaign_name || campaignNamesMap.get(insight.campaign_id) || 'N/A';
                    itemContent += `<div class="label">Campanha:</div><span>${campaignName}</span>`;
                    
                    itemContent += `<div class="label">Gasto:</div><span>${formatCurrency(parseFloat(insight.spend || 0))}</span>`;
                    
                    let itemPurchases = 0;
                    let itemConversionValue = 0;
                    if (insight.actions) {
                        insight.actions.forEach(action => {
                            if (action.action_type === 'purchase') {
                                itemPurchases += parseFloat(action.value || 0);
                            }
                        });
                    }
                    if (insight.action_values) {
                        insight.action_values.forEach(actionValue => {
                            if (actionValue.action_type === 'purchase') {
                                itemConversionValue += parseFloat(actionValue.value || 0);
                            }
                        });
                    }
                    itemContent += `<div class="label">Compras:</div><span>${itemPurchases.toFixed(0)}</span>`;
                    itemContent += `<div class="label">Valor Conversão:</div><span>${formatCurrency(itemConversionValue)}</span>`;
                    itemContent += `<div class="label">ROAS:</div><span>${formatRoas(insight.roas && insight.roas.length > 0 ? parseFloat(insight.roas[0].value) : null)}</span>`;

                    insightItem.innerHTML = itemContent;
                    insightsDisplayElement.appendChild(insightItem);
                });

                // Atualiza as métricas totais no topo do dashboard
                totalSpendElement.textContent = formatCurrency(totalSpend);
                totalPurchasesElement.textContent = totalPurchases.toFixed(0);
                totalConversionValueElement.textContent = formatCurrency(totalConversionValue);
                totalRoasElement.textContent = roasCount > 0 ? formatRoas(totalRoasSum / roasCount) : 'N/A';

            } else {
                insightsDisplayElement.innerHTML = '<p>Nenhum dado encontrado para o período e conta selecionados.</p>';
                totalSpendElement.textContent = formatCurrency(0);
                totalRoasElement.textContent = 'N/A';
                totalPurchasesElement.textContent = '0';
                totalConversionValueElement.textContent = formatCurrency(0);
            }

        } catch (error) {
            console.error('Erro ao carregar dados do Meta Ads:', error);
            totalSpendElement.textContent = 'Erro';
            totalRoasElement.textContent = 'Erro';
            totalPurchasesElement.textContent = 'Erro';
            totalConversionValueElement.textContent = 'Erro';
            insightsDisplayElement.innerHTML = `
                <p style="color: red; padding: 10px; border: 1px solid red; border-radius: 5px;">
                    Ocorreu um erro ao carregar os dados: ${error.message}.
                    Por favor, verifique seu Token de Acesso, ID da(s) Conta(s) de Anúncios
                    e as permissões necessárias (ads_read, ads_management).
                </p>
            `;
        }
    };

    // --- Event Listeners para os Controles ---

    // Evento para mudança de conta de anúncio
    adAccountSelect.addEventListener('change', (event) => {
        currentSelectedAccountId = event.target.value;
        loadMetaAdsData(); // Recarrega os dados com a nova conta
    });

    // Eventos para botões de filtro de período (Hoje, Ontem, Últimos 7 Dias)
    filterButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            // Remove a classe 'active' de todos os botões e adiciona ao clicado
            filterButtons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            currentTimeRange = event.target.dataset.timeRange;
            loadMetaAdsData(); // Recarrega os dados com o novo período
        });
    });

    // Eventos para botões de agrupamento (Por Dia, Por Hora, Total do Período)
    incrementButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            // Remove a classe 'active' de todos os botões e adiciona ao clicado
            incrementButtons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            currentTimeIncrement = event.target.dataset.timeIncrement;
            loadMetaAdsData(); // Recarrega os dados com o novo agrupamento
        });
    });

    // Inicializa o dashboard ao carregar a página
    populateAdAccountSelect(); // Preenche o dropdown de contas
    loadMetaAdsData(); // Carrega os dados iniciais
});

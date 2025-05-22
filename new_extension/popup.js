document.addEventListener('DOMContentLoaded', function () {
    const loadAdsBtn = document.getElementById('loadAdsBtn');
    const blockedAdsDiv = document.getElementById('blockedAds');

    loadAdsBtn.addEventListener('click', async () => {
        try {
            // Dohvati blokirane oglase iz background skripte
            const response = await chrome.runtime.sendMessage({ action: "getBlockedAds" });
            const blockedAds = response.blockedAds;

            // Očisti postojeći sadržaj
            blockedAdsDiv.innerHTML = '';

            if (blockedAds.length === 0) {
                blockedAdsDiv.innerHTML = '<p>Nema blokiranih oglasa.</p>';
                return;
            }

            // Kreiraj listu blokiranih oglasa
            const ul = document.createElement('ul');
            ul.style.listStyle = 'none';
            ul.style.padding = '0';

            blockedAds.forEach(ad => {
                const li = document.createElement('li');
                li.style.marginBottom = '10px';
                li.style.padding = '10px';
                li.style.backgroundColor = '#f5f5f5';
                li.style.borderRadius = '4px';

                const url = document.createElement('div');
                url.textContent = `URL: ${ad.url}`;
                url.style.wordBreak = 'break-all';
                url.style.marginBottom = '5px';

                const timestamp = document.createElement('div');
                timestamp.textContent = `Vrijeme: ${new Date(ad.timestamp).toLocaleString()}`;
                timestamp.style.fontSize = '0.8em';
                timestamp.style.color = '#666';

                const type = document.createElement('div');
                type.textContent = `Tip: ${ad.type}`;
                type.style.fontSize = '0.8em';
                type.style.color = '#666';

                li.appendChild(url);
                li.appendChild(timestamp);
                li.appendChild(type);
                ul.appendChild(li);
            });

            blockedAdsDiv.appendChild(ul);
        } catch (error) {
            console.error('Error loading blocked ads:', error);
            blockedAdsDiv.innerHTML = '<p>Error while loading list.</p>';
        }
    });
});

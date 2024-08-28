const axios = require('axios');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const STORE_LIST_URL = 'https://handla.ica.se/api/store/v1?&customerType=B2C&deliveryMethods=PICKUP,HOME_DELIVERY';

// Function to fetch the list of stores
const fetchStores = async () => {
    try {
        const response = await axios.get(STORE_LIST_URL);
        return response.data;
    } catch (error) {
        console.error('Error fetching store list:', error);
        return [];
    }
};

// Function to fetch products for a specific store with retry logic
const fetchProductsForStore = async (accountId, searchTerm, retries = 3, delay = 1000) => {
    const searchUrl = `https://handlaprivatkund.ica.se/stores/${accountId}/search?q=${encodeURIComponent(searchTerm)}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.get(searchUrl);
            const $ = cheerio.load(response.data);
            const products = [];

            $('div.product-card-container').each((index, element) => {
                const productName = $(element).find('h3._text_f6lbl_1._text--m_f6lbl_23').text().trim();
                if (productName) {
                    products.push(productName);
                }
            });

            return products;
        } catch (error) {
            console.error(`Error fetching products for store ${accountId} (Attempt ${attempt}/${retries}):`, error.message);

            // If we've exhausted the retries, return an empty array
            if (attempt === retries) {
                return [];
            }

            // Wait for a delay before retrying
            await new Promise((resolve) => setTimeout(resolve, delay * attempt)); // Exponential backoff
        }
    }
};

// Function to scrape all stores concurrently
const scrapeStores = async (searchTerm) => {
    const stores = await fetchStores();
    const results = [];

    console.log("Starting scraping...");

    const fetchPromises = stores.map(async (store, index) => {
        console.log(`${store.name} (${index + 1} of ${stores.length})`);
        const products = await fetchProductsForStore(store.accountId, searchTerm);
        if (products.length > 0) {
            products.forEach((product) => {
                results.push({
                    Storename: store.name,
                    storeFormat: store.storeFormat,
                    ProductName: product,
                });
            });
        }
    });

    // Run all fetches concurrently
    await Promise.all(fetchPromises);
    console.log("Scraping completed");
    return results;
};


module.exports = {
    scrapeStores
};

// Example usage
/* (async () => {
    const searchTerm = 'Coca Cola';  // replace with your search term
    const results = await scrapeStores(searchTerm);
    await writeResultsToCsv(results);
})(); */

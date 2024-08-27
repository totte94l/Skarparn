const axios = require('axios');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const STORE_LIST_URL = 'https://handla.ica.se/api/store/v1?&customerType=B2C&deliveryMethods=PICKUP,HOME_DELIVERY';

const fetchStores = async () => {
    try {
        const response = await axios.get(STORE_LIST_URL);
        return response.data;
    } catch (error) {
        console.error('Error fetching store list:', error);
        return [];
    }
};

const fetchProductsForStore = async (accountId, searchTerm) => {
    try {
        const searchUrl = `https://handlaprivatkund.ica.se/stores/${accountId}/search?q=${encodeURIComponent(searchTerm)}`;
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
        console.error(`Error fetching products for store ${accountId}:`, error);
        return [];
    }
};

const scrapeStores = async (searchTerm) => {
    const stores = await fetchStores();
    const results = [];

    for (const store of stores) {
        console.log(store.name)
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
    }

    return results;
};

const writeResultsToCsv = async (results) => {
    const csvWriter = createCsvWriter({
        path: 'store_products.csv',
        header: [
            { id: 'Storename', title: 'Storename' },
            { id: 'storeFormat', title: 'storeFormat' },
            { id: 'ProductName', title: 'ProductName' },
        ],
    });

    try {
        await csvWriter.writeRecords(results);
        console.log('CSV file written successfully');
    } catch (error) {
        console.error('Error writing CSV file:', error);
    }
};

module.exports = {
    scrapeStores,
    writeResultsToCsv,
};


// Example usage
/* (async () => {
    const searchTerm = 'Coca Cola';  // replace with your search term
    const results = await scrapeStores(searchTerm);
    await writeResultsToCsv(results);
})(); */

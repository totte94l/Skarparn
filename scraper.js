import axios from 'axios';
import * as cheerio from 'cheerio';
import { createObjectCsvWriter } from 'csv-writer';
import pLimit from 'p-limit';

const STORE_LIST_URL = 'https://handla.ica.se/api/store/v1?&customerType=B2C&deliveryMethods=PICKUP,HOME_DELIVERY';

// Limit the number of concurrent requests to 5
const limit = pLimit(5);

const fetchStores = async () => {
    try {
        const response = await axios.get(STORE_LIST_URL);
        return response.data;
    } catch (error) {
        console.error('Error fetching store list:', error);
        return [];
    }
};

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

            if (attempt === retries) {
                return [];
            }

            await new Promise((resolve) => setTimeout(resolve, delay * attempt)); // Exponential backoff
        }
    }
};

// Scrape all stores with controlled concurrency
export const scrapeStores = async (searchTerm) => {
    const stores = await fetchStores();
    const results = [];  // Properly initialize results array

    console.log("Starting scraping...");

    const csvWriter = createObjectCsvWriter({
        path: 'store_products.csv',
        header: [
            { id: 'Storename', title: 'Storename' },
            { id: 'storeFormat', title: 'storeFormat' },
            { id: 'ProductName', title: 'ProductName' },
        ],
        append: true // Append mode to write incrementally
    });

    // Process stores with limited concurrency
    const fetchPromises = stores.map((store, index) =>
        limit(async () => {
            console.log(`${store.name} (${index + 1} of ${stores.length})`);
            const products = await fetchProductsForStore(store.accountId, searchTerm);
            if (products.length > 0) {
                const records = products.map((product) => ({
                    Storename: store.name,
                    storeFormat: store.storeFormat,
                    ProductName: product,
                }));
                
                results.push(...records);  // Collect results in memory
                
                await csvWriter.writeRecords(records);  // Write to CSV incrementally
            }
        })
    );

    await Promise.all(fetchPromises);

    console.log('Scraping completed.');

    return results; // Return the collected results
};

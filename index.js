import express from 'express';
import cors from 'cors';
import { scrapeStores } from './scraper.js';  // Correct import

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = [
    'http://localhost:5173', 
    'https://icabotten.cajander.nu',
    'https://cjnicabotten.netlify.app'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.get('/api/scrape', async (req, res) => {
    const { products } = req.query;

    if (!products) {
        return res.status(400).json({ error: 'Please provide a product list in the query parameter.' });
    }

    const productArray = products.split(',');
    const allResults = [];

    for (const product of productArray) {
        const results = await scrapeStores(product.trim());
        if (results) {
            allResults.push(...results);
        }
    }

    res.json({ message: 'Scraping completed', results: allResults });
});

app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
});

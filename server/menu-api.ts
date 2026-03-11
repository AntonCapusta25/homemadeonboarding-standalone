import express from 'express';

const router = express.Router();

// Get merchant menu (products organized by categories)
router.get('/merchant/:merchantId/menu', async (req, res) => {
    const { merchantId } = req.params;

    try {
        // Read config from environment at runtime
        const HYPERZOD_API_KEY = process.env.HYPERZOD_API_KEY || '';
        const HYPERZOD_TENANT_ID = process.env.HYPERZOD_TENANT_ID || '3331';
        const HYPERZOD_BASE_URL = process.env.HYPERZOD_BASE_URL || 'https://api.hyperzod.app';

        // Fetch products for this merchant
        const url = `${HYPERZOD_BASE_URL}/merchant/v1/product/list?merchant_id=${merchantId}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-TENANT': HYPERZOD_TENANT_ID,
                'X-API-KEY': HYPERZOD_API_KEY,
            },
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Organize products by category
        const categoriesMap = new Map();
        const products = data.data?.data || [];

        products.forEach((product: any) => {
            const categoryId = product.product_category_id || 'uncategorized';
            const categoryName = product.category_name || 'Other';

            if (!categoriesMap.has(categoryId)) {
                categoriesMap.set(categoryId, {
                    id: categoryId,
                    name: categoryName,
                    products: []
                });
            }

            categoriesMap.get(categoryId).products.push({
                id: product._id || product.id,
                name: product.name,
                description: product.description,
                price: product.price,
                image: product.images?.[0]?.image_url || product.image_url,
                available: product.is_available !== false
            });
        });

        const categories = Array.from(categoriesMap.values());

        res.json({
            merchant: {
                id: merchantId,
                name: data.merchant_name || 'Restaurant',
                address: data.merchant_address || '',
                cuisine: data.merchant_cuisine || ''
            },
            categories
        });

    } catch (error) {
        console.error('Error fetching menu:', error);
        res.status(500).json({ error: 'Failed to fetch menu' });
    }
});

export default router;

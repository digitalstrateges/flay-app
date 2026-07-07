const db = require('./db');
const crypto = require('crypto');

class MarketIntelligence {
    getSalesAnalytics(userId, period = '30d') {
        const orders = db.findAll('orders', 'userId', userId);
        const now = Date.now();
        const range = this._parsePeriod(period);
        const filtered = orders.filter(o => {
            const t = new Date(o.createdAt).getTime();
            return t >= range.start && t <= now;
        });

        const revenueStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
        const totalRevenue = filtered.filter(o => revenueStatuses.includes(o.status))
            .reduce((s, o) => s + o.total, 0);
        const totalOrders = filtered.length;
        const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

        // Payment method breakdown
        const pmBreakdown = {};
        for (const o of filtered) {
            const pm = typeof o.payment === 'string' ? JSON.parse(o.payment) : (o.payment || {});
            const method = pm.method || 'unknown';
            if (!pmBreakdown[method]) pmBreakdown[method] = { count: 0, revenue: 0 };
            pmBreakdown[method].count++;
            pmBreakdown[method].revenue += o.total;
        }

        // Daily revenue for chart
        const dailyMap = {};
        for (const o of filtered) {
            const day = o.createdAt ? o.createdAt.split('T')[0] : 'unknown';
            if (!dailyMap[day]) dailyMap[day] = { revenue: 0, orders: 0 };
            if (revenueStatuses.includes(o.status)) {
                dailyMap[day].revenue += o.total;
            }
            dailyMap[day].orders++;
        }
        const dailyRevenue = Object.entries(dailyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, d]) => ({ date, revenue: d.revenue, orders: d.orders }));

        // Period comparison (previous period)
        const prevRange = { start: range.start - (range.end - range.start), end: range.start };
        const prevFiltered = orders.filter(o => {
            const t = new Date(o.createdAt).getTime();
            return t >= prevRange.start && t < prevRange.end;
        });
        const prevRevenue = prevFiltered.filter(o => revenueStatuses.includes(o.status))
            .reduce((s, o) => s + o.total, 0);
        const revenueGrowth = prevRevenue > 0 ? Math.round((totalRevenue - prevRevenue) / prevRevenue * 100) : 0;
        const orderGrowth = prevFiltered.length > 0 ? Math.round((totalOrders - prevFiltered.length) / prevFiltered.length * 100) : 0;

        return {
            period, totalRevenue, totalOrders, averageOrderValue: avgOrderValue,
            revenueGrowth, orderGrowth,
            paymentMethods: pmBreakdown,
            dailyRevenue
        };
    }

    getProductAnalytics(userId, period = '30d') {
        const products = db.findAll('products', 'userId', userId);
        const orders = db.findAll('orders', 'userId', userId);
        const range = this._parsePeriod(period);
        const recentOrders = orders.filter(o => {
            const t = new Date(o.createdAt).getTime();
            return t >= range.start;
        });

        // Items sold in period
        const periodSales = {};
        for (const o of recentOrders) {
            const items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
            for (const item of items) {
                if (!periodSales[item.productId]) periodSales[item.productId] = { qty: 0, revenue: 0 };
                periodSales[item.productId].qty += item.quantity || 1;
                periodSales[item.productId].revenue += (item.price || 0) * (item.quantity || 1);
            }
        }

        const productList = products.map(p => {
            const stats = typeof p.stats === 'string' ? JSON.parse(p.stats) : (p.stats || {});
            const ps = periodSales[p.id] || { qty: 0, revenue: 0 };
            return {
                id: p.id, name: p.name, price: p.price, stock: p.stock,
                status: p.status, categoryId: p.categoryId,
                views: stats.views || 0,
                sales: stats.sales || 0,
                revenue: stats.revenue || 0,
                periodSales: ps.qty,
                periodRevenue: ps.revenue,
                rating: stats.rating || 0,
                reviewCount: stats.reviewCount || 0,
                createdAt: p.createdAt
            };
        });

        productList.sort((a, b) => b.periodSales - a.periodSales);

        const topSellers = productList.filter(p => p.periodSales > 0).slice(0, 10);
        const lowPerformers = productList.filter(p => p.views > 0 && p.sales === 0).slice(0, 10);
        const outOfStock = productList.filter(p => p.stock === 0 && p.status === 'active');

        // Category breakdown
        const catSales = {};
        for (const p of productList) {
            const cid = p.categoryId || 'uncategorized';
            if (!catSales[cid]) catSales[cid] = { products: 0, sales: 0, revenue: 0 };
            catSales[cid].products++;
            catSales[cid].sales += p.periodSales;
            catSales[cid].revenue += p.periodRevenue;
        }

        return {
            totalProducts: products.length,
            activeProducts: products.filter(p => p.status === 'active').length,
            topSellers, lowPerformers,
            outOfStock: outOfStock.map(p => ({ id: p.id, name: p.name, stock: p.stock })),
            categoryBreakdown: catSales
        };
    }

    getCustomerInsights(userId) {
        const orders = db.findAll('orders', 'userId', userId);
        const totalOrders = orders.length;
        if (totalOrders === 0) {
            return { totalOrders: 0, message: 'Aucune commande' };
        }

        const revStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
        const totalRevenue = orders.filter(o => revStatuses.includes(o.status))
            .reduce((s, o) => s + o.total, 0);
        const avgOrderValue = Math.round(totalRevenue / totalOrders);

        // Customer contact info from shipping addresses
        const customers = {};
        for (const o of orders) {
            const addr = typeof o.shippingAddress === 'string' ? JSON.parse(o.shippingAddress) : (o.shippingAddress || {});
            const key = addr.phone || addr.email || o.id;
            if (!customers[key]) {
                customers[key] = { firstName: addr.firstName, lastName: addr.lastName, phone: addr.phone, email: addr.email, orderCount: 0, totalSpent: 0, firstOrder: o.createdAt, lastOrder: o.createdAt };
            }
            customers[key].orderCount++;
            customers[key].totalSpent += o.total;
            if (o.createdAt < customers[key].firstOrder) customers[key].firstOrder = o.createdAt;
            if (o.createdAt > customers[key].lastOrder) customers[key].lastOrder = o.createdAt;
        }

        const customerList = Object.values(customers).sort((a, b) => b.totalSpent - a.totalSpent);
        const repeatCustomers = customerList.filter(c => c.orderCount > 1);
        const repeatRate = customerList.length > 0 ? Math.round(repeatCustomers.length / customerList.length * 100) : 0;

        return {
            totalCustomers: customerList.length,
            totalOrders, totalRevenue,
            averageOrderValue: avgOrderValue,
            customerLifetimeValue: customerList.length > 0 ? Math.round(totalRevenue / customerList.length) : 0,
            repeatRate,
            repeatCustomers: repeatCustomers.length,
            topCustomers: customerList.slice(0, 5).map(c => ({
                name: [c.firstName, c.lastName].filter(Boolean).join(' '),
                phone: c.phone, orders: c.orderCount, spent: c.totalSpent
            }))
        };
    }

    getTrends(userId) {
        const orders = db.findAll('orders', 'userId', userId);
        if (orders.length === 0) return { message: 'Aucune donnee' };

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - now.getDay());
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const todayOrders = orders.filter(o => o.createdAt && o.createdAt.startsWith(today));
        const weekOrders = orders.filter(o => o.createdAt && o.createdAt >= thisWeekStart.toISOString());
        const monthOrders = orders.filter(o => o.createdAt && o.createdAt >= thisMonthStart.toISOString());

        const rStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
        const weekRevenue = weekOrders.filter(o => rStatuses.includes(o.status))
            .reduce((s, o) => s + o.total, 0);
        const monthRevenue = monthOrders.filter(o => rStatuses.includes(o.status))
            .reduce((s, o) => s + o.total, 0);
        const todayRevenue = todayOrders.filter(o => rStatuses.includes(o.status))
            .reduce((s, o) => s + o.total, 0);

        // Daily counts for last 30 days chart
        const daily = {};
        const d30 = new Date(now); d30.setDate(now.getDate() - 30);
        for (const o of orders) {
            if (o.createdAt && o.createdAt >= d30.toISOString()) {
                const day = o.createdAt.split('T')[0];
                if (!daily[day]) daily[day] = { revenue: 0, orders: 0 };
                if (rStatuses.includes(o.status)) daily[day].revenue += o.total;
                daily[day].orders++;
            }
        }
        const dailyTrend = Object.entries(daily)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, d]) => ({ date, revenue: d.revenue, orders: d.orders }));

        // Week-over-week
        const weeks = {};
        for (const o of orders) {
            const d = new Date(o.createdAt);
            const wk = `${d.getFullYear()}-W${String(Math.ceil((d.getDate() + 6 - d.getDay()) / 7)).padStart(2, '0')}`;
                if (!weeks[wk]) weeks[wk] = { revenue: 0, orders: 0 };
            if (rStatuses.includes(o.status)) weeks[wk].revenue += o.total;
            weeks[wk].orders++;
        }
        const weeklyTrend = Object.entries(weeks)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12)
            .map(([week, d]) => ({ week, revenue: d.revenue, orders: d.orders }));

        // Month-over-month
        const months = {};
        for (const o of orders) {
            const m = o.createdAt ? o.createdAt.substring(0, 7) : 'unknown';
                if (!months[m]) months[m] = { revenue: 0, orders: 0 };
            if (rStatuses.includes(o.status)) months[m].revenue += o.total;
            months[m].orders++;
        }
        const monthlyTrend = Object.entries(months)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12)
            .map(([month, d]) => ({ month, revenue: d.revenue, orders: d.orders }));

        return {
            today: { orders: todayOrders.length, revenue: todayRevenue },
            thisWeek: { orders: weekOrders.length, revenue: weekRevenue },
            thisMonth: { orders: monthOrders.length, revenue: monthRevenue },
            dailyTrend, weeklyTrend, monthlyTrend
        };
    }

    generateReport(userId) {
        const sales = this.getSalesAnalytics(userId, '30d');
        const products = this.getProductAnalytics(userId, '30d');
        const customers = this.getCustomerInsights(userId);
        const trends = this.getTrends(userId);
        const aiAgent = require('./ai-agent');

        const insights = aiAgent.generateInsightsFromSales(sales, products, customers, trends);

        return {
            generatedAt: new Date().toISOString(),
            period: '30d',
            summary: {
                totalRevenue: sales.totalRevenue,
                totalOrders: sales.totalOrders,
                activeProducts: products.activeProducts,
                totalCustomers: customers.totalCustomers || 0,
                averageOrderValue: sales.averageOrderValue,
                revenueGrowth: sales.revenueGrowth
            },
            sales, products, customers, trends,
            insights
        };
    }

    _parsePeriod(period) {
        const now = Date.now();
        const map = {
            '24h': 86400000, '7d': 604800000, '30d': 2592000000, '90d': 7776000000, '1y': 31536000000
        };
        const ms = map[period] || 2592000000;
        return { start: now - ms, end: now };
    }
}

module.exports = new MarketIntelligence();

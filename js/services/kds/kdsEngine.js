window.kdsEngine = {

    enabled: false,

    orders: [],

    push(order) {

        this.orders.push({
            ...order,
            createdAt: new Date().toISOString(),
            status: 'pending'
        });

        console.log('[KDS]', this.orders);
    },

    updateStatus(orderId, status) {

        const order = this.orders.find(o => o.id === orderId);

        if (!order) {
            return;
        }

        order.status = status;
    }
};

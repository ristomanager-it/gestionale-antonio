window.printEngine = {

    async printKitchenTicket(payload) {

        return await window.kitchenPrinter.print(payload);
    },

    async printProductionOrder(payload) {

        return await window.kitchenPrinter.printProduction(payload);
    },

    async printLabel(payload) {

        return await window.labelPrinter.print(payload);
    }
};

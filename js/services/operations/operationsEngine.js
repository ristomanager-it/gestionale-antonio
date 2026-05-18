window.operationsEngine = {

    async dispatch(event) {

        if (!event || !event.type) {
            throw new Error('Evento non valido');
        }

        console.log('[operationsEngine]', event);

        window.eventBus.emit(event.type, event.payload);

        switch (event.type) {

            case 'comanda_inviata':

                await this.handleKitchenOrder(event.payload);

                break;

            case 'ordine_produzione_creato':

                await this.handleProductionOrder(event.payload);

                break;

            case 'etichetta_richiesta':

                await this.handleLabel(event.payload);

                break;
        }
    },

    async handleKitchenOrder(payload) {

        await window.printEngine.printKitchenTicket(payload);

        window.eventBus.emit('comanda_stampata', payload);
    },

    async handleProductionOrder(payload) {

        await window.printEngine.printProductionOrder(payload);

        window.eventBus.emit('ordine_produzione_stampato', payload);
    },

    async handleLabel(payload) {

        await window.printEngine.printLabel(payload);

        window.eventBus.emit('etichetta_stampata', payload);
    }
};

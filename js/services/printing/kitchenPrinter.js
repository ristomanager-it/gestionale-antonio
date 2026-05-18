window.kitchenPrinter = {

    printerName: 'Kitchen',

    async print(payload) {

        if (!window.qz) {
            throw new Error('QZ Tray non disponibile');
        }

        const raw = this.generateKitchenTicket(payload);

        const config = qz.configs.create(this.printerName);

        if (!qz.websocket.isActive()) {
            await qz.websocket.connect();
        }

        await qz.print(config, [{
            type: 'raw',
            format: 'plain',
            data: raw
        }]);
    },

    async printProduction(payload) {

        if (!window.qz) {
            throw new Error('QZ Tray non disponibile');
        }

        const raw = this.generateProductionTicket(payload);

        const config = qz.configs.create(this.printerName);

        if (!qz.websocket.isActive()) {
            await qz.websocket.connect();
        }

        await qz.print(config, [{
            type: 'raw',
            format: 'plain',
            data: raw
        }]);
    },

    generateKitchenTicket(payload) {

        const righe = (payload.items || [])
            .map(item => {
                return `${item.qty}x ${item.nome}`;
            })
            .join('\n');

        return `
================================
COMANDA CUCINA
================================

TAVOLO: ${payload.tavolo || ''}
OPERATORE: ${payload.operatore || ''}

--------------------------------
${righe}
--------------------------------

NOTE:
${payload.note || ''}

================================



`;
    },

    generateProductionTicket(payload) {

        const righe = (payload.items || [])
            .map(item => {
                return `${item.qty}x ${item.nome}`;
            })
            .join('\n');

        return `
================================
ORDINE PRODUZIONE
================================

ORIGINE: ${payload.origine || ''}
DESTINAZIONE: ${payload.destinazione || ''}

--------------------------------
${righe}
--------------------------------

NOTE:
${payload.note || ''}

================================



`;
    }
};

window.labelPrinter = {

    printerName: 'T003',

    async print(payload) {

        if (!window.qz) {
            throw new Error('QZ Tray non disponibile');
        }

        const raw = this.generateTSPL(payload);

        const config = qz.configs.create(this.printerName);

        if (!qz.websocket.isActive()) {
            await qz.websocket.connect();
        }

        await qz.print(config, [raw]);
    },

    generateTSPL(payload) {

        return `
SIZE 60 mm,40 mm
GAP 2 mm,0 mm
DIRECTION 1
CLS

TEXT 20,20,"3",0,1,1,"${payload.nome || ''}"
TEXT 20,60,"3",0,1,1,"LOTTO: ${payload.lotto || ''}"
TEXT 20,100,"3",0,1,1,"SCAD: ${payload.scadenza || ''}"

PRINT 1
`;
    }
};

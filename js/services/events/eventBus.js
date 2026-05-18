window.eventBus = {

    listeners: {},

    on(eventName, callback) {

        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }

        this.listeners[eventName].push(callback);
    },

    off(eventName, callback) {

        if (!this.listeners[eventName]) {
            return;
        }

        this.listeners[eventName] = this.listeners[eventName]
            .filter(cb => cb !== callback);
    },

    emit(eventName, payload = {}) {

        console.log('[eventBus]', eventName, payload);

        if (!this.listeners[eventName]) {
            return;
        }

        this.listeners[eventName]
            .forEach(callback => {
                callback(payload);
            });
    }
};

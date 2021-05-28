import { LightningElement, api } from "lwc";
import {
    subscribe,
    unsubscribe,
    onError,
    isEmpEnabled
} from "lightning/empApi";

export default class EventListener extends LightningElement {
    @api channelName;

    subscription;

    connectedCallback() {
        if (isEmpEnabled) {
            this.subscribeToEvent();
        }
    }

    disconnectedCallback() {
        this.unsubscribeFromEvent();
    }

    subscribeToEvent() {
        if (!this.subscription) {
            const messageCallback = (response) => {
                const event = new CustomEvent("message", {
                    detail: { data: response.data }
                });
                this.dispatchEvent(event);
            };

            // Invoke subscribe method of empApi. Pass reference to messageCallback
            subscribe(this.channelName, -1, messageCallback).then(
                (response) => {
                    this.subscription = response;
                }
            );
        }

        onError((error) => {
            console.log("Received error from server: ", JSON.stringify(error));
        });
    }

    unsubscribeFromEvent() {
        unsubscribe(this.subscription, (response) => {
            if(response){
                console.log("Unsubscribed from channel");
                this.subscription = undefined;
            }
        });
    }
}

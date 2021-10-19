import { LightningElement, api } from "lwc";

export default class Card extends LightningElement {
    @api description;
    @api cardId;

    @api
    get background() {
        return this.cardBg;
    }

    set background(color) {
        if (color) {
            this.cardBg = color;
        }
    }

    get cardClass() {
        return `card ${this.cardBg}`;
    }

    cardBg = "yellow";

    /* Removing because window.location is unsupported in LWR - https://developer.salesforce.com/docs/atlas.en-us.232.0.exp_cloud_lwr.meta/exp_cloud_lwr/template_limitations.htm
    connectedCallback() {
        if (window.self !== window.top) {
            window.top.location = window.self.location;
        }
    }
    */

    handleDelete() {
        const event = new CustomEvent("deletecard", {
            detail: { cardId: this.cardId }
        });
        this.dispatchEvent(event);
    }

    handleEdit() {
        const event = new CustomEvent("editcard", {
            detail: { cardId: this.cardId }
        });
        this.dispatchEvent(event);
    }

    handleClone() {
        const event = new CustomEvent("clonecard", {
            detail: { cardId: this.cardId }
        });
        this.dispatchEvent(event);
    }
}

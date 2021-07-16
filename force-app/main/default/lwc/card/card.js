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
}

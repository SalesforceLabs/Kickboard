import { LightningElement, api } from "lwc";

export default class Card extends LightningElement {
    @api description;
    @api cardId;

    @api get w() {
        if( window.self !== window.top ){
            window.top.location = window.self.location;
        }
    }

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
        if( window.self === window.top ) {
            return `card ${this.cardBg}`;
        }else{
            return `hidden`;
        }
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

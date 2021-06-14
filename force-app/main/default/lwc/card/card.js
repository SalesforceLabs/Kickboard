import { LightningElement, api } from "lwc";
import saveCard from "@salesforce/apex/StickyNotesWithoutSharingCtrl.saveCard";

const DELAY = 1000;

export default class Card extends LightningElement {
    @api description;
    @api cardId;
    @api laneGuestUserId;

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

    cardDescription;
    cardBg = "yellow";

    handleDelete() {
        const event = new CustomEvent("deletecard", {
            detail: { cardId: this.cardId }
        });
        this.dispatchEvent(event);
    }

    handleChange(event) {
        this.cardDescription = event.target.value;
        window.clearTimeout(this.delayTimeout);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this.delayTimeout = setTimeout(() => {
            saveCard({
                cardId: this.cardId,
                description: this.cardDescription,
                guestUserId: this.laneGuestUserId
            }).catch((error) => {
                console.log(error);
            });
        }, DELAY);
    }

    changeBg(event) {
        this.cardBg = event.target.classList.value;
        saveCard({
            cardId: this.cardId,
            color: this.cardBg,
            guestUserId: this.laneGuestUserId
        }).catch((error) => {
            console.log(error);
        });
    }

    handleTextAreaClick() {
        this.dispatchEvent(new CustomEvent("textareaselection"));
    }
}

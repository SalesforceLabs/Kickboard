import { LightningElement, api } from "lwc";

import { ShowToastEvent } from "lightning/platformShowToastEvent";

import saveCard from "@salesforce/apex/KickboardCtrl.saveCard";
import getCardDetails from "@salesforce/apex/KickboardCtrl.getCardDetails";

import ISGUEST from "@salesforce/user/isGuest";

export default class NewCardModal extends LightningElement {
    @api boardId;
    @api laneGuestUserId;
    @api isTemplate;
    @api namespace;

    showModal = false;
    cardId;
    xPos;
    yPos;
    bgcolor = "yellow";
    description = "";
    loaded = false;
    setFocus = false;

    isGuest = ISGUEST;

    get formats() {
        return this.isGuest
            ? "font, bold, italic, underline, strike, list, indent, align, link, clean, color"
            : "font, bold, italic, underline, strike, list, indent, align, link, clean, color, image";
    }

    get cardTitle() {
        return this.cardId ? "Edit Card" : "New Card";
    }

    get modalBg() {
        return `slds-modal__content ${this.bgcolor}`;
    }

    get showEntryForm() {
        return (this.cardId && this.loaded) || !this.cardId;
    }

    @api
    createNewCard(xPos, yPos) {
        this.xPos = xPos;
        this.yPos = yPos;
        this.showModal = true;
        this.bgcolor = "yellow";
    }

    @api
    editCard(cardId) {
        this.cardId = cardId;
        getCardDetails({ cardId: this.cardId })
            .then((result) => {
                this.description = result[`${this.namespace}Description__c`];
                this.bgcolor = result[`${this.namespace}Color__c`];
                this.loaded = true;
            })
            .catch(() => {
                this.loaded = false;
            });
        this.showModal = true;
    }

    renderedCallback() {
        if (
            !this.setFocus &&
            this.template.querySelector("lightning-input-rich-text")
        ) {
            this.template.querySelector("lightning-input-rich-text").focus();
            this.setFocus = true;
        }
    }

    closeModal() {
        this.showModal = false;
        this.cardId = undefined;
        this.xPos = undefined;
        this.yPos = undefined;
        this.bgcolor = undefined;
        this.description = "";
        this.loaded = false;
        this.setFocus = false;
    }

    saveCard() {
        if (!this.isTemplate) {
            if (!this.cardId) {
                saveCard({
                    boardId: this.boardId,
                    cardId: this.cardId,
                    xPos: this.xPos,
                    yPos: this.yPos,
                    color: this.bgcolor,
                    guestUserId: this.laneGuestUserId,
                    description: this.template.querySelector(
                        "lightning-input-rich-text"
                    ).value
                })
                    .then(() => {
                        this.closeModal();
                        this.dispatchEvent(new CustomEvent("savecard"));
                    })
                    .catch((error) => {
                        this.dispatchEvent(
                            new ShowToastEvent({
                                title: "An error occurred when creating a card",
                                message: error.message,
                                variant: "error"
                            })
                        );
                    });
            } else {
                saveCard({
                    cardId: this.cardId,
                    description: this.template.querySelector(
                        "lightning-input-rich-text"
                    ).value,
                    color: this.bgcolor,
                    guestUserId: this.laneGuestUserId
                })
                    .then(() => {
                        this.closeModal();
                        this.dispatchEvent(new CustomEvent("savecard"));
                    })
                    .catch((error) => {
                        this.dispatchEvent(
                            new ShowToastEvent({
                                title: "An error occurred when saving the card",
                                message: error.message,
                                variant: "error"
                            })
                        );
                    });
            }
        } else {
            this.closeModal();
        }
    }

    changeBg(event) {
        this.bgcolor = event.target.classList.value;
    }
}

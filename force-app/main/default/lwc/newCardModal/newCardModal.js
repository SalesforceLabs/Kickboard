import { LightningElement, api, wire } from "lwc";

import { getRecord, getFieldValue } from "lightning/uiRecordApi";

import CARD_DESCRIPTION from "@salesforce/schema/Card__c.Description__c";
import CARD_COLOR from "@salesforce/schema/Card__c.Color__c";

import saveCard from "@salesforce/apex/KickboardCtrl.saveCard";

import { ShowToastEvent } from "lightning/platformShowToastEvent";

export default class NewCardModal extends LightningElement {
    @api boardId;
    @api laneGuestUserId;
    @api isTemplate;

    showModal = false;
    cardId;
    xPos;
    yPos;
    cardBg;
    cardDescription = "";

    get cardTitle() {
        return this.cardId ? "Edit Card" : "New Card";
    }

    get modalBg() {
        return `slds-modal__content ${this.cardBg}`;
    }

    @api
    createNewCard(xPos, yPos) {
        this.xPos = xPos;
        this.yPos = yPos;
        this.cardBg = "yellow";
        this.showModal = true;
    }

    @api
    editCard(cardId) {
        this.cardId = cardId;
        this.showModal = true;
    }

    @wire(getRecord, {
        recordId: "$cardId",
        fields: [CARD_DESCRIPTION, CARD_COLOR]
    })
    wiredRecord({ data }) {
        if (data) {
            this.cardBg = getFieldValue(data, CARD_COLOR);
            this.cardDescription = getFieldValue(data, CARD_DESCRIPTION);
        }
    }

    closeModal() {
        this.showModal = false;
        this.cardId = undefined;
        this.xPos = undefined;
        this.yPos = undefined;
        this.cardBg = undefined;
        this.cardDescription = "";
    }

    saveCard() {
        if (!this.isTemplate) {
            if (!this.cardId) {
                saveCard({
                    boardId: this.boardId,
                    cardId: this.cardId,
                    xPos: this.xPos,
                    yPos: this.yPos,
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
                    color: this.cardBg,
                    guestUserId: this.laneGuestUserId
                })
                    .then(() => {
                        this.closeModal();
                        this.dispatchEvent(new CustomEvent("savecard"));
                    })
                    .catch((error) => {
                        console.error(error);
                    });
            }
        } else {
            this.closeModal();
        }
    }

    changeBg(event) {
        this.cardBg = event.target.classList.value;
    }
}

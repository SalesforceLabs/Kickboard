import { LightningElement, api, wire } from "lwc";
import { refreshApex } from '@salesforce/apex';

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
    wiredCard;

    get cardTitle() {
        return this.cardId ? "Edit Card" : "New Card";
    }

    get modalBg() {
        return `slds-modal__content ${this.bgcolor}`;
    }

    @api
    createNewCard(xPos, yPos) {
        this.xPos = xPos;
        this.yPos = yPos;
        this.bgcolor = "yellow";
        this.showModal = true;
    }

    @api
    editCard(cardId) {
        this.cardId = cardId;
        this.showModal = true;
        
    }

    /*
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
    */
    @wire(getRecord, {
        recordId: "$cardId",
        fields: [CARD_DESCRIPTION, CARD_COLOR]
    })
    wiredRecord( response ) {
        
        this.wiredCard = response;
        refreshApex( this.wiredCard );
        this.description = getFieldValue(this.wiredCard.data, CARD_DESCRIPTION);
        this.bgcolor = getFieldValue(this.wiredCard.data, CARD_COLOR);
    }

    get description(){
        
        return this.cardDescription;
    }

    set description(value) {
        this.cardDescription = value;
    }

    get bgcolor(){
        return this.cardBg;
    }

    set bgcolor(value) {
        this.cardBg = value;
    }



    closeModal() {
        this.showModal = false;
        this.cardId = undefined;
        this.xPos = undefined;
        this.yPos = undefined;
        this.bgcolor = undefined;
        this.description = "";
        this.wiredCard = {};
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
                        console.error(error);
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

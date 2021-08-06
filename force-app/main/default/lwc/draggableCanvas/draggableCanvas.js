import { LightningElement, wire, api } from "lwc";
import { getRecord, getFieldValue } from "lightning/uiRecordApi";

import BOARD_OBJECT from "@salesforce/schema/Board__c";
import BOARD_NAME from "@salesforce/schema/Board__c.Name";
import BOARD_PREREQ from "@salesforce/schema/Board__c.Prerequisites__c";
import BOARD_DESC from "@salesforce/schema/Board__c.Description__c";
import BOARD_INSTR from "@salesforce/schema/Board__c.Instructions__c";
import BOARD_OBJ from "@salesforce/schema/Board__c.Objective__c";
import BG_IMG from "@salesforce/schema/Board__c.Background_Image__c";
import BOARD_ORDER from "@salesforce/schema/Board__c.Order__c";
import BOARD_TIMETOCOMPLETE from "@salesforce/schema/Board__c.Time_to_Complete_in_minutes__c";

import getCards from "@salesforce/apex/KickboardCtrl.getCards";
import deleteCard from "@salesforce/apex/KickboardCtrl.deleteCard";
import saveCard from "@salesforce/apex/KickboardCtrl.saveCard";
import cloneCard from "@salesforce/apex/KickboardCtrl.cloneCard";

import ISGUEST from "@salesforce/user/isGuest";

import { refreshApex } from "@salesforce/apex";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

import { renderer } from "./renderer";

export default class DraggableCanvas extends LightningElement {
    @api recordId;
    @api laneId;
    @api laneGuestUserId;
    @api isTemplate;
    @api namespace;
    @api boardsList;

    isGuest = ISGUEST;
    isDragging = false;
    isPanning = false;
    addedPan = false;
    isTextSelection = false;

    showDetails = false;
    iconName = "utility:chevronright";

    fields = [
        BOARD_DESC,
        BOARD_OBJ,
        BOARD_PREREQ,
        BOARD_INSTR,
        BOARD_TIMETOCOMPLETE
    ];
    boardObj = BOARD_OBJECT;

    dragItem;
    currentX;
    currentY;
    lastOffsetX = 0;
    lastOffsetY = 0;
    boundingRect;
    panZoomInstance;

    cards;
    wiredCards;
    offlineCards = [];

    intervalId;
    activity = {};
    inactiveMessage;

    cardTitle;
    bgImage;

    get shouldListenToChanges() {
        return !this.isGuest && this.recordId;
    }

    disconnectedCallback() {
        this.stopRefresh();
    }

    renderedCallback() {
        if (!this.addedPan) {
            const container = this.template.querySelector(".container");
            this.panZoomInstance = renderer({
                scaleSensitivity: 50,
                minScale: 0.1,
                maxScale: 30,
                element: container.children[0]
            });
            /*container.addEventListener("wheel", (event) => {
                if (!event.ctrlKey) {
                    return;
                }
                event.preventDefault();
                this.panZoomInstance.zoom({
                    deltaScale: Math.sign(event.deltaY) > 0 ? -1 : 1,
                    x: event.pageX,
                    y: event.pageY
                });
            });*/
            container.addEventListener("dblclick", (event) => {
                if (!this.isTemplate) {
                    this.template
                        .querySelector("c-new-card-modal")
                        .createNewCard(
                            Math.round(event.clientX - this.boundingRect.left),
                            Math.round(event.clientY - this.boundingRect.top)
                        );
                }
            });
            container.addEventListener("mousemove", (event) => {
                if (this.isTextSelection) return;
                if (this.isPanning && !this.isDragging) {
                    event.preventDefault();
                    this.panZoomInstance.panBy({
                        originX: event.movementX,
                        originY: event.movementY
                    });
                }
            });
            if (this.laneId && !this.isTemplate) {
                this.startRefresh();
            }

            this.addedPan = true;
        }
    }

    @wire(getCards, { boardId: "$recordId" })
    handleCards(result) {
        const d = new Date();
        this.activity.lastDataChangedTimestamp = d.getTime();
        this.activity.nodata = false;
        this.wiredCards = result;
        if (result.data) {
            this.cards = result.data.map((record) => {
                return {
                    ...record,
                    style: `margin-left:${
                        record[`${this.namespace}X_Position__c`]
                    }px; margin-top:${
                        record[`${this.namespace}Y_Position__c`]
                    }px;`,
                    description: record[`${this.namespace}Description__c`],
                    color: record[`${this.namespace}Color__c`]
                };
            });
        }
    }

    @wire(getRecord, {
        recordId: "$recordId",
        fields: [BG_IMG, BOARD_NAME, BOARD_ORDER]
    })
    boardRecord({ data, error }) {
        if (data) {
            this.cardTitle =
                getFieldValue(data, BOARD_ORDER) +
                ". " +
                getFieldValue(data, BOARD_NAME);

            this.bgImage = getFieldValue(data, BG_IMG);

            if( this.bgImage && this.bgImage.startsWith('/') && window.location.pathname.includes('/s/') ){
                this.bgImage = window.location.pathname.substring(0,window.location.pathname.indexOf('/s')) + this.bgImage;
            }

        } else if (error) {
            console.error(error);
        }
    }

    @api
    resetBoard() {
        if (this.panZoomInstance) {
            this.panZoomInstance.panTo({
                originX: 0,
                originY: 0,
                scale: 1
            });
        }
        if (this.wiredCards) {
            this.refreshCards();
        }
    }

    panToOrigin() {
        if (this.panZoomInstance) {
            this.panZoomInstance.panTo({
                originX: 0,
                originY: 0,
                scale: 1
            });
        }
    }

    toggleVisibility() {
        if (this.showDetails) {
            this.showDetails = false;
            this.iconName = "utility:chevronright";
            this.template
                .querySelector(".slds-accordion__section")
                .classList.remove("slds-is-open");
        } else {
            this.showDetails = true;
            this.iconName = "utility:chevrondown";
            this.template
                .querySelector(".slds-accordion__section")
                .classList.add("slds-is-open");
        }
    }

    startRefresh() {
        this.stopRefresh();

        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this.intervalId = window.setInterval(() => {
            let inactive = false;
            const d = new Date();
            const currentTimeStamp = d.getTime();
            if (
                currentTimeStamp - this.activity.lastMouseMoveTimestamp >
                5 * 60 * 1000
            ) {
                inactive = true;
                this.activity.nomousemovement = true;
            } else if (
                currentTimeStamp - this.activity.lastDataChangedTimestamp >
                5 * 60 * 1000
            ) {
                inactive = true;
                this.activity.nodata = true;
            }
            if (!inactive) {
                this.refreshCards();
                this.inactiveMessage = "";
            } else {
                this.stopRefresh();
                if (this.activity.nomousemovement) {
                    this.inactiveMessage =
                        "Auto-Refresh paused due to inactivity.";
                }
                if (this.activity.nodata) {
                    this.inactiveMessage =
                        "Auto-Refresh paused due to no data changes detected.";
                }
            }
        }, 5000);
    }

    stopRefresh() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
    }

    refreshCards() {
        refreshApex(this.wiredCards);
    }

    addCard() {
        let xPos = this.panZoomInstance.transformation.translateX * -1;
        let yPos = this.panZoomInstance.transformation.translateY * -1;

        let samePos = [];

        do {
            samePos = this.cards.filter(
                // eslint-disable-next-line no-loop-func
                (card) =>
                    card[`${this.namespace}X_Position__c`] === xPos &&
                    card[`${this.namespace}Y_Position__c`] === yPos
            );
            if (samePos.length > 0) {
                xPos += 15;
                yPos += 15;
            }
        } while (samePos.length > 0);

        this.template
            .querySelector("c-new-card-modal")
            .createNewCard(xPos, yPos);

        /*if (!this.isTemplate) {
        } else {
            let card = {};
            card[`${this.namespace}X_Position__c`] = xPos;
            card[`${this.namespace}Y_Position__c`] = yPos;
            card[`${this.namespace}Color__c`] = "yellow";
            card[`${this.namespace}Board__c`] = this.recordId;
            card.Id = Math.floor(Math.random() * 100) + 1;
            this.offlineCards.push(card);
            this.cards = null;
            this.cards = this.offlineCards;
        }*/
    }

    dragStart(e) {
        const container = this.template.querySelector(".canvas");
        this.boundingRect = container.getBoundingClientRect();
        if (e.target.tagName === "C-CARD") {
            this.isDragging = true;
            this.dragItem = e.target;
            this.dragItem.style.zIndex = 1;
            this.lastOffsetX = e.offsetX;
            this.lastOffsetY = e.offsetY;
        }
    }

    panStart() {
        this.isPanning = true;
    }

    dragEnd() {
        if (this.dragItem) {
            this.dragItem.style.zIndex = 0;
        }
        if (this.isDragging && this.currentX && this.currentY) {
            if (!this.isTemplate) {
                saveCard({
                    cardId: this.dragItem.dataset.cardid,
                    xPos: this.currentX,
                    yPos: this.currentY,
                    guestUserId: this.laneGuestUserId
                })
                    .then(() => {
                        this.currentY = undefined;
                        this.currentX = undefined;
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
            } else {
                this.currentY = undefined;
                this.currentX = undefined;
            }
        }
        this.isDragging = false;
        this.isTextSelection = false;
    }

    panEnd() {
        this.isPanning = false;
        this.isTextSelection = false;
    }

    handleTextAreaSelection() {
        this.isTextSelection = true;
    }

    drag(e) {
        if (this.isTextSelection) return;
        if (!this.isDragging) return;
        e.preventDefault();
        this.currentX = Math.round(
            (e.clientX - this.lastOffsetX - this.boundingRect.left) *
                this.panZoomInstance.transformation.scale
        );
        this.currentY = Math.round(
            (e.clientY - this.lastOffsetY - this.boundingRect.top) *
                this.panZoomInstance.transformation.scale
        );
        this.dragItem.style.marginLeft = this.currentX + "px";
        this.dragItem.style.marginTop = this.currentY + "px";
    }

    handleCardDelete(event) {
        if (!this.isTemplate) {
            deleteCard({ cardId: event.detail.cardId })
                .then(() => {
                    this.refreshCards();
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: "Deleted Successfully",
                            variant: "success"
                        })
                    );
                })
                .catch((error) => {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: "An error occurred when deleting the card",
                            message: error.message,
                            variant: "error"
                        })
                    );
                });
        } else {
            this.offlineCards = this.offlineCards.filter(function (obj) {
                return obj.Id !== event.detail.cardId;
            });
            this.cards = null;
            this.cards = this.offlineCards;
        }
    }

    handleCardEdit(event) {
        this.template
            .querySelector("c-new-card-modal")
            .editCard(event.detail.cardId);
    }

    trackActivity() {
        const d = new Date();
        this.activity.lastMouseMoveTimestamp = d.getTime();
        this.activity.nomousemovement = false;

        if (!this.intervalId && this.laneId && !this.isTemplate) {
            this.refreshCards();
            this.startRefresh();
        }
    }

    handleCardClone(event) {
        const cardId = event.detail.cardId;

        const cardObj = this.cards.filter(
            // eslint-disable-next-line no-loop-func
            (card) => card.Id === cardId
        );

        let xPos = cardObj[0][`${this.namespace}X_Position__c`];
        let yPos = cardObj[0][`${this.namespace}Y_Position__c`];

        let samePos = [];

        do {
            samePos = this.cards.filter(
                // eslint-disable-next-line no-loop-func
                (card) =>
                    card[`${this.namespace}X_Position__c`] === xPos &&
                    card[`${this.namespace}Y_Position__c`] === yPos
            );
            if (samePos.length > 0) {
                xPos += 15;
                yPos += 15;
            }
        } while (samePos.length > 0);

        cloneCard({ cardId, guestUserId: this.laneGuestUserId, xPos, yPos })
            .then(() => {
                this.refreshCards();
            })
            .catch((error) => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: "An error occurred when cloning the card",
                        message: error.message,
                        variant: "error"
                    })
                );
            });
    }
}

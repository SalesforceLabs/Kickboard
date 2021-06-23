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

import createNewCard from "@salesforce/apex/KickboardCtrl.createNewCard";
import getCards from "@salesforce/apex/KickboardCtrl.getCards";
import deleteCard from "@salesforce/apex/KickboardCtrl.deleteCard";
import saveCard from "@salesforce/apex/KickboardCtrl.saveCard";

import ISGUEST from "@salesforce/user/isGuest";
import USERID from "@salesforce/user/Id";

import { refreshApex } from "@salesforce/apex";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

import { renderer } from "./renderer";

import NAMESPACE from "@salesforce/label/c.Namespace";

export default class DraggableCanvas extends LightningElement {
    @api recordId;
    @api laneId;
    @api laneGuestUserId;
    @api isTemplate;

    isGuest = ISGUEST;
    isDragging = false;
    isPanning = false;
    addedPan = false;
    isTextSelection = false;

    showDetails = false;
    iconName = "utility:chevronright";

    fields = [BOARD_DESC, BOARD_OBJ, BOARD_PREREQ, BOARD_INSTR];
    boardObj = BOARD_OBJECT;

    dragItem;
    currentX;
    currentY;
    lastOffsetX = 0;
    lastOffsetY = 0;
    boundingRect;

    cards;
    wiredCards;
    offlineCards = [];

    intervalId;
    panZoomInstance;

    get namespace() {
        return NAMESPACE === "default" ? "" : NAMESPACE + "__";
    }

    get cardTitle() {
        return this.recordId
            ? this.getCurrentBoardName()
            : "Personal Whiteboard";
    }

    get shouldListenToChanges() {
        return !this.isGuest && this.recordId;
    }

    get canvasStyle() {
        if (this.boardRecord && this.boardRecord.data) {
            const bgUrl = getFieldValue(this.boardRecord.data, BG_IMG);
            if (bgUrl) {
                return `background-image: url(${bgUrl})`;
            }
        }
        return "";
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
                console.log('in wheel');
                this.panZoomInstance.zoom({
                    deltaScale: Math.sign(event.deltaY) > 0 ? -1 : 1,
                    x: event.pageX,
                    y: event.pageY
                });
            });*/
            container.addEventListener("dblclick", () => {
                this.panZoomInstance.panTo({
                    originX: 0,
                    originY: 0,
                    scale: 1
                });
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
            if (this.isGuest && this.laneId) {
                this.startRefresh();
            }
            this.addedPan = true;
        }
    }

    @wire(getCards, { boardId: "$recordId" })
    handleCards(result) {
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
    boardRecord;

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
            refreshApex(this.wiredCards);
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
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this.intervalId = window.setInterval(() => {
            refreshApex(this.wiredCards);
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

        if (!this.isTemplate) {
            createNewCard({
                boardId: this.recordId,
                xPos,
                yPos,
                guestUserId: this.laneGuestUserId
            })
                .then((result) => {
                    if (result) {
                        refreshApex(this.wiredCards);
                    }
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
            let card = {};
            card[`${this.namespace}X_Position__c`] = xPos;
            card[`${this.namespace}Y_Position__c`] = yPos;
            card[`${this.namespace}Color__c`] = "yellow";
            card[`${this.namespace}Board__c`] = this.recordId;
            card.Id = Math.floor(Math.random() * 100) + 1;
            this.offlineCards.push(card);
            this.cards = null;
            this.cards = this.offlineCards;
        }
    }

    getCurrentBoardName() {
        if (this.boardRecord && this.boardRecord.data) {
            return (
                getFieldValue(this.boardRecord.data, BOARD_ORDER) +
                ". " +
                getFieldValue(this.boardRecord.data, BOARD_NAME)
            );
        }
        return "";
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
        if (this.isDragging && this.currentX && this.currentY) {
            this.dragItem.style.zIndex = 0;
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
                        console.log(error);
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
                    refreshApex(this.wiredCards);
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: "Deleted Successfully",
                            variant: "success"
                        })
                    );
                })
                .catch((error) => {
                    console.error(error);
                });
        } else {
            this.offlineCards = this.offlineCards.filter(function (obj) {
                return obj.Id !== event.detail.cardId;
            });
            this.cards = null;
            this.cards = this.offlineCards;
        }
    }

    handleMessageFromListener(event) {
        if (
            event.detail.data.sobject.LastModifiedById !== USERID &&
            this.recordId === event.detail.data.sobject.Board__c
        ) {
            refreshApex(this.wiredCards);
        } else if (event.detail.data.event.type === "deleted") {
            const currentCardIndex = this.cards.findIndex(
                (x) => x.Id === event.detail.data.sobject.Id
            );
            if (currentCardIndex >= 0) {
                refreshApex(this.wiredCards);
            }
        }
    }
}

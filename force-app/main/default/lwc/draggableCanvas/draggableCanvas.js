import { LightningElement, wire, api } from "lwc";
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import BG_IMG from "@salesforce/schema/Board__c.Background_Image__c";
import BOARD_NAME from "@salesforce/schema/Board__c.Name";
import createNewCard from "@salesforce/apex/StickyNotesCtrl.createNewCard";
import getCards from "@salesforce/apex/StickyNotesCtrl.getCards";
import deleteCard from "@salesforce/apex/StickyNotesWithoutSharingCtrl.deleteCard";
import saveCard from "@salesforce/apex/StickyNotesWithoutSharingCtrl.saveCard";
import ISGUEST from "@salesforce/user/isGuest";
import USERID from "@salesforce/user/Id";

import { refreshApex } from "@salesforce/apex";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

import { renderer } from "./renderer";

export default class DraggableCanvas extends LightningElement {
    @api recordId;
    @api laneId;

    isGuest = ISGUEST;
    isDragging = false;
    isPanning = false;
    addedPan = false;

    dragItem;
    currentX;
    currentY;
    lastOffsetX = 0;
    lastOffsetY = 0;
    boundingRect;

    cards;
    wiredCards;

    intervalId;
    panZoomInstance;

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
                return `background: url(${bgUrl})`;
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
                    style: `margin-left:${record.X_Position__c}px; margin-top:${record.Y_Position__c}px;`
                };
            });
        }
    }

    @wire(getRecord, { recordId: "$recordId", fields: [BG_IMG, BOARD_NAME] })
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

    addCard() {
        const xPos = this.panZoomInstance.transformation.translateX * -1;
        const yPos = this.panZoomInstance.transformation.translateY * -1;
        createNewCard({ boardId: this.recordId, xPos, yPos })
            .then((result) => {
                if(result){
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
    }

    getCurrentBoardName() {
        if (this.boardRecord && this.boardRecord.data) {
            return getFieldValue(this.boardRecord.data, BOARD_NAME);
        }
        return "";
    }

    dragStart(e) {
        const container = this.template.querySelector(".canvas");
        this.boundingRect = container.getBoundingClientRect();
        if (e.target.tagName === "C-CARD") {
            this.isDragging = true;
            this.dragItem = e.target;
            // this.dragItem.parentNode.append(this.dragItem);
            this.lastOffsetX = e.offsetX;
            this.lastOffsetY = e.offsetY;
        }
    }

    panStart() {
        this.isPanning = true;
    }

    dragEnd() {
        if (this.isDragging && this.currentX && this.currentY) {
            saveCard({
                cardId: this.dragItem.dataset.cardid,
                xPos: this.currentX,
                yPos: this.currentY
            })
                .then(() => {
                    this.currentY = undefined;
                    this.currentX = undefined;
                })
                .catch((error) => {
                    console.log(error);
                });
        }
        this.isDragging = false;
    }

    panEnd() {
        this.isPanning = false;
    }

    drag(e) {
        e.preventDefault();
        if (!this.isDragging) return;
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

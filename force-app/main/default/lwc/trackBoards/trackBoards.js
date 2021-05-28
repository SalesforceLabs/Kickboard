import { LightningElement, api, wire } from "lwc";
import getBoards from "@salesforce/apex/StickyNotesCtrl.getBoards";
import { getRecord, updateRecord, getFieldValue } from "lightning/uiRecordApi";
import CURRENT_BOARD_ID from "@salesforce/schema/Track__c.Current_Board_ID__c";
import ISGUEST from "@salesforce/user/isGuest";

export default class TrackBoards extends LightningElement {
    @api recordId;

    currentBoardId;
    isGuest = ISGUEST;

    boardsList = [];
    currentBoardIdFromTrackRecord;

    hasPrevious = false;
    hasNext = false;

    boardsRetrieved = false;
    currentBoardIdRetrieved = false;

    @wire(getBoards, { trackId: "$recordId" })
    handleGetBoards({ data, error }) {
        if (data) {
            this.boardsList = data;
            this.boardsRetrieved = true;
            this.setCurrentBoardId();
        } else if(error){
            console.error(error);
        }
    }

    @wire(getRecord, { recordId: "$recordId", fields: [CURRENT_BOARD_ID] })
    handleGetRecord({ data, error }) {
        if (data) {
            const currentBoardId = getFieldValue(data, CURRENT_BOARD_ID);
            if (currentBoardId) {
                this.currentBoardIdFromTrackRecord = currentBoardId;
            }
            this.currentBoardIdRetrieved = true;
            this.setCurrentBoardId();
        } else if(error){
            console.error(error);
        }
    }

    setCurrentBoardId() {
        if (this.boardsRetrieved && this.currentBoardIdRetrieved) {
            if (this.currentBoardIdFromTrackRecord) {
                this.currentBoardId = this.currentBoardIdFromTrackRecord;
            } else if (this.boardsList[0]) {
                this.currentBoardId = this.boardsList[0].Id;
            }
            this.paginate();
        }
    }

    paginate() {
        if (this.boardsList) {
            const currentBoardIndex = this.boardsList.findIndex(
                (x) => x.Id === this.currentBoardId
            );
            if (currentBoardIndex >= 0) {
                if (currentBoardIndex === 0) {
                    this.hasPrevious = false;
                    this.hasNext = true;
                } else if (currentBoardIndex === this.boardsList.length - 1) {
                    this.hasPrevious = true;
                    this.hasNext = false;
                } else {
                    this.hasPrevious = true;
                    this.hasNext = true;
                }
            } else {
                this.hasPrevious = false;
                this.hasNext = false;
            }
        }
    }

    handlePrevious() {
        if (this.boardsList) {
            const currentBoardIndex = this.boardsList.findIndex(
                (x) => x.Id === this.currentBoardId
            );
            const newBoardIndex = currentBoardIndex - 1;
            if (newBoardIndex >= 0) {
                this.currentBoardId = this.boardsList[newBoardIndex].Id;
            }
            this.paginate();
            this.updateCurrentBoard();
            this.resetBoardCoordinates();
        }
    }

    handleNext() {
        if (this.boardsList) {
            const currentBoardIndex = this.boardsList.findIndex(
                (x) => x.Id === this.currentBoardId
            );
            const newBoardIndex = currentBoardIndex + 1;
            if (newBoardIndex <= this.boardsList.length - 1) {
                this.currentBoardId = this.boardsList[newBoardIndex].Id;
            }
            this.paginate();
            this.updateCurrentBoard();
            this.resetBoardCoordinates();
        }
    }

    resetBoardCoordinates(){
        const canvasElement =
            this.template.querySelector("c-draggable-canvas");
        if (canvasElement) {
            canvasElement.resetBoard();
        }
    }

    updateCurrentBoard() {
        const fields = {};
        fields.Id = this.recordId;
        fields[CURRENT_BOARD_ID.fieldApiName] = this.currentBoardId;

        const recordInput = { fields };
        updateRecord(recordInput).catch((error) => {
            console.log(error);
        });
    }

}

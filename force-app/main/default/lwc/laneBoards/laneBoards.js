import { LightningElement, api, wire } from "lwc";
import getBoards from "@salesforce/apex/KickboardCtrl.getBoards";

import { getRecord, updateRecord, getFieldValue } from "lightning/uiRecordApi";

import CURRENT_BOARD_ID from "@salesforce/schema/Lane__c.Current_Board_ID__c";
import LANE_NAME from "@salesforce/schema/Lane__c.Name";
import IS_TEMPLATE from "@salesforce/schema/Lane__c.Is_Template__c";
import ISGUEST from "@salesforce/user/isGuest";

import KickboardLogo from "@salesforce/resourceUrl/KickboardLogoSmall";

import NAMESPACE from "@salesforce/label/c.Namespace";

export default class LaneBoards extends LightningElement {
    @api recordId;
    @api laneGuestUserId;

    currentBoardId;
    isGuest = ISGUEST;

    boardsList = [];
    currentBoardIdFromLaneRecord;
    options;

    boardsRetrieved = false;
    currentBoardIdRetrieved = false;

    isTemplate = false;
    laneName = "";

    logo = KickboardLogo;

    get namespace() {
        return NAMESPACE === "default" ? "" : NAMESPACE + "__";
    }

    @wire(getBoards, { laneId: "$recordId" })
    handleGetBoards({ data, error }) {
        if (data) {
            this.boardsList = data;
            this.options = this.boardsList.map((board) => {
                return {
                    label:
                        board[`${this.namespace}Order__c`] + ". " + board.Name,
                    value: board.Id
                };
            });
            this.boardsRetrieved = true;
            this.setCurrentBoardId();
        } else if (error) {
            console.error(error);
        }
    }

    @wire(getRecord, {
        recordId: "$recordId",
        fields: [CURRENT_BOARD_ID, IS_TEMPLATE, LANE_NAME]
    })
    handleGetRecord({ data, error }) {
        if (data) {
            const currentBoardId = getFieldValue(data, CURRENT_BOARD_ID);
            if (currentBoardId) {
                this.currentBoardIdFromLaneRecord = currentBoardId;
            }
            this.currentBoardIdRetrieved = true;
            this.isTemplate = getFieldValue(data, IS_TEMPLATE);
            this.laneName = getFieldValue(data, LANE_NAME);
            this.setCurrentBoardId();
        } else if (error) {
            console.error(error);
        }
    }

    setCurrentBoardId() {
        if (this.boardsRetrieved && this.currentBoardIdRetrieved) {
            if (this.currentBoardIdFromLaneRecord) {
                this.currentBoardId = this.currentBoardIdFromLaneRecord;
            } else if (this.boardsList[0]) {
                this.currentBoardId = this.boardsList[0].Id;
            }
        }
    }

    handleChange(event) {
        this.currentBoardId = event.detail.value;
        if (!this.isGuest && !this.isTemplate) {
            this.updateCurrentBoard();
        }
        this.resetBoardCoordinates();
    }

    resetBoardCoordinates() {
        const canvasElement = this.template.querySelector("c-draggable-canvas");
        if (canvasElement) {
            canvasElement.resetBoard();
        }
    }

    updateCurrentBoard() {
        const fields = {};
        fields.Id = this.recordId;
        fields[CURRENT_BOARD_ID.fieldApiName] = this.currentBoardId;

        const recordInput = { fields };
        if (!this.isTemplate) {
            updateRecord(recordInput).catch((error) => {
                console.log(error);
            });
        }
    }
}

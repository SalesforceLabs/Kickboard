import { LightningElement, api, wire } from "lwc";
import exportLaneJSON from "@salesforce/apex/KickboardCtrl.exportLaneJSON";

export default class ExportLane extends LightningElement {
    @api recordId;
    dataUrl;
    error;

    get downloadFileName() {
        return `Lane_${this.recordId}`;
    }

    @wire(exportLaneJSON, { laneId: "$recordId" })
    jsonStr({ data, error }) {
        if (data) {
            this.dataUrl = `data:application/json,${data}`;
        } else if (error) {
            this.error = error;
        }
    }
}

import { LightningElement, api, wire } from "lwc";
import exportLaneJSON from "@salesforce/apex/KickboardCtrl.exportLaneJSON";

export default class ExportLane extends LightningElement {
    @api recordId;
    data;
    error;

    @wire(exportLaneJSON, { laneId: "$recordId" })
    jsonStr({ data, error }) {
        if (data) {
            this.data = data;
        } else if (error) {
            this.error = error;
        }
    }
}

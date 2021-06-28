import { LightningElement, api } from "lwc";
import exportLaneJSON from "@salesforce/apex/KickboardCtrl.exportLaneJSON";
import HAS_EXPORT_PERM from "@salesforce/customPermission/Export_Lane_for_Graph_API";

export default class ExportLane extends LightningElement {
    @api recordId;
    dataUrl;
    error;
    hasExportPermission = HAS_EXPORT_PERM;
    retrievedRecordId = false;

    get downloadFileName() {
        return `Lane_${this.recordId}`;
    }

    renderedCallback() {
        if (!this.retrievedRecordId && this.recordId) {
            this.retrievedRecordId = true;
            if (this.hasExportPermission) {
                exportLaneJSON({ laneId: this.recordId })
                    .then((result) => {
                        const file = new Blob([result], {
                            type: "application/json"
                        });
                        this.dataUrl = URL.createObjectURL(file);
                    })
                    .catch((error) => {
                        this.error = error;
                    });
            }
        }
    }
}

import { LightningElement, api } from "lwc";
import ISGUEST from "@salesforce/user/isGuest";

export default class CommunityLaneBoards extends LightningElement {
    @api recordId;

    isGuest = ISGUEST;
    laneGuestUserId;

    get showLogin() {
        return this.isGuest && !this.laneGuestUserId;
    }

    connectedCallback() {
        const guestUserId = sessionStorage.getItem(
            this.recordId + "_laneGuestUserId"
        );
        if (guestUserId) {
            this.laneGuestUserId = guestUserId;
        }
    }

    handleLogin(event) {
        this.laneGuestUserId = event.detail.laneuserid;
        sessionStorage.setItem(
            this.recordId + "_laneGuestUserId",
            this.laneGuestUserId
        );
    }
}

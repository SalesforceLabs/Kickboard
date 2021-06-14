import { LightningElement, api } from "lwc";
import isValidCredentials from "@salesforce/apex/StickyNotesCtrl.isValidCredentials";
import KickboardLogo from "@salesforce/resourceUrl/KickboardLogo";

export default class GuestLogin extends LightningElement {
    @api laneId;
    message;
    subtext;
    logo = KickboardLogo;

    handleLogin() {
        let email;
        let code;
        const emailEle = this.template.querySelector(".email");
        const codeEle = this.template.querySelector(".code");
        this.message = "";
        this.subtext = "";
        if (emailEle.value) {
            email = emailEle.value;
            emailEle.reportValidity();
        } else {
            emailEle.reportValidity();
        }
        if (codeEle.value) {
            code = codeEle.value;
            codeEle.reportValidity();
        } else {
            codeEle.reportValidity();
        }
        if (email && code && this.laneId) {
            isValidCredentials({
                laneId: this.laneId,
                email: email,
                code: code
            })
                .then((result) => {
                    if (result) {
                        const event = new CustomEvent("login", {
                            detail: { laneuserid: result }
                        });
                        this.dispatchEvent(event);
                    } else {
                        this.message = "Invalid Credentials";
                        this.subtext =
                            "Please contact your host to be invited to this board.";
                    }
                })
                .catch(() => {
                    this.message = "An error occurred";
                    this.subtext = "Please contact your system administrator";
                });
        }
    }
}

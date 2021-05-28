import { LightningElement, api } from "lwc";
import saveNote from "@salesforce/apex/StickyNotesWithoutSharingCtrl.saveNote";

const DELAY = 1000;

export default class Note extends LightningElement {
    @api description;
    @api noteId;

    @api
    get background() {
        return this.noteBg;
    }

    set background(color) {
        if (color) {
            this.noteBg = color;
        }
    }

    get noteClass() {
        return `note ${this.noteBg}`;
    }

    noteDescription;
    noteBg = "yellow";

    handleDelete() {
        const event = new CustomEvent("deletenote", {
            detail: { noteId: this.noteId }
        });
        this.dispatchEvent(event);
    }

    handleChange(event) {
        this.noteDescription = event.target.value;
        window.clearTimeout(this.delayTimeout);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this.delayTimeout = setTimeout(() => {
            saveNote({
                cardId: this.noteId,
                description: this.noteDescription
            }).catch((error) => {
                console.log(error);
            });
        }, DELAY);
    }

    changeBg(event) {
        this.noteBg = event.target.classList.value;
        saveNote({ cardId: this.noteId, color: this.noteBg }).catch((error) => {
            console.log(error);
        });
    }
}

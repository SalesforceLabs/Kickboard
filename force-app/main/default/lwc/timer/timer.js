import { LightningElement } from "lwc";

export default class Timer extends LightningElement {
    showStartBtn = true;
    timeIntervalInstance;

    timeInSeconds = 1500;
    secondsPassed = 0;
    secondsLeft;

    handleAmountChange(e) {
        this.timeInSeconds = e.detail.value * 60;
    }

    get timeLeft() {
        return this.formatTime(this.secondsLeft);
    }

    get timeInMinutes() {
        return Math.floor(this.timeInSeconds / 60);
    }

    formatTime(timeInSeconds) {
        let minutes = Math.floor(timeInSeconds / 60);
        if (minutes < 10) {
            minutes = `0${minutes}`;
        }

        let seconds = timeInSeconds % 60;
        if (seconds < 10) {
            seconds = `0${seconds}`;
        }

        return `${minutes}:${seconds}`;
    }

    start() {
        this.showStartBtn = false;
        this.secondsLeft = this.timeInSeconds;
        this.secondsPassed = 0;
        if (!this.timeIntervalInstance) {
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            this.timeIntervalInstance = setInterval(() => {
                this.secondsPassed = this.secondsPassed + 1;
                this.secondsLeft = this.timeInSeconds - this.secondsPassed;
                if (this.secondsLeft <= 0) {
                    this.secondsLeft = 0;
                    clearInterval(this.timeIntervalInstance);
                    this.timeIntervalInstance = undefined;
                }
            }, 1000);
        }
    }

    stop() {
        this.showStartBtn = true;
        this.secondsLeft = this.timeInSeconds;
        this.secondsPassed = 0;
        clearInterval(this.timeIntervalInstance);
        this.timeIntervalInstance = undefined;
    }

    getColor(percent) {
        const hue = ((1 - percent) * 120).toString(10);
        return `hsl(${hue}, 100%, 85%)`;
    }

    get remainingPathColor() {
        const progressPercent = this.secondsPassed / this.timeInSeconds;
        return `background: ${this.getColor(progressPercent)}`;
    }
}

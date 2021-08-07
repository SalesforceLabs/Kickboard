import { LightningElement, track } from 'lwc';

export default class Stopwatch extends LightningElement {
    @track showStartBtn = true;
    @track timeVal = '25:00';
    timeIntervalInstance;
    totalMilliseconds = 0;
    theme = 'slds-theme_shade slds-box slds-p-around_x-small slds-m-around_x-small';

    amount = 25;

    handleAmountChange(e) {
        this.amount = parseInt(e.detail.value);

        this.timeVal = this.amount<10?'0':'';
        this.timeVal += (this.amount+':00');
    }

    start(event) {
        this.showStartBtn = false;
        var parentThis = this;

        // Run timer code in every 100 milliseconds
        this.timeIntervalInstance = setInterval(function() {

            parentThis.totalMilliseconds -= 1000;

            // Time calculations for hours, minutes, seconds and milliseconds
            var minutes = parentThis.amount + Math.floor((parentThis.totalMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = 60 + Math.floor((parentThis.totalMilliseconds % (1000 * 60)) / 1000);
            
            if( seconds == 60 ){
                seconds = 0;
            }

            if( minutes === 0 && seconds === 0 ){
                parentThis.theme = 'slds-theme_warning slds-box slds-p-around_x-small slds-m-around_x-small';
                parentThis.timeVal = '00:00';
                clearInterval(parentThis.timeIntervalInstance);
            }else{

                
                if( seconds < 10 ){
                    seconds = '0'+seconds;
                }
                if( minutes < 10 ){
                    minutes = '0'+minutes;
                }

                // Output the result in the timeVal variable
                parentThis.timeVal = minutes + ":" + seconds;
            }
            
        }, 1000);
    }

    stop(event) {
        this.showStartBtn = true;
        this.timeVal = this.amount+':00';
        this.totalMilliseconds = 0;
        this.theme = 'slds-theme_shade slds-box slds-p-around_x-small slds-m-around_x-small';
        clearInterval(this.timeIntervalInstance);
    }
}
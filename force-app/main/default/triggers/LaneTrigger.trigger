trigger LaneTrigger on Lane__c(before insert) {
    Integer len = 6;
    for (Lane__c l : Trigger.new) {
        if (!l.Is_Template__c && l.Code__c == null) {
            String str = String.valueof(Math.abs(Crypto.getRandomLong()));
            l.Code__c = str.substring(0, len);
        }
    }
}

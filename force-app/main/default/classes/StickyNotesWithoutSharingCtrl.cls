public without sharing class StickyNotesWithoutSharingCtrl {
    @AuraEnabled
    public static void saveNote(
        String cardId,
        String description,
        Integer xPos,
        Integer yPos,
        String color
    ) {
        try {
            Card__c c = new Card__c(Id = cardId);
            if (description != null) {
                c.Description__c = description;
            } else if (xPos != null && yPos != null) {
                c.X_Position__c = xPos;
                c.Y_Position__c = yPos;
            } else if (color != null) {
                c.Color__c = color;
            }
            update c;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void deleteNote(String cardId) {
        try {
            delete ([SELECT Id FROM Card__c WHERE Id = :cardId]);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}

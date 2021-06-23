/**
 * This without sharing class deals with updating and deleting cards,
 * becuase a guest user does not have permissions to edit and delete records.
 */
public without sharing class KickboardWithoutSharingCtrl {
    @AuraEnabled
    public static void saveCard(
        String cardId,
        String description,
        Integer xPos,
        Integer yPos,
        String color,
        String guestUserId
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

            if (!String.isBlank(guestUserId)) {
                c.Last_Modified_By_Guest__c = guestUserId;
            }
            update c;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void deleteCard(String cardId) {
        try {
            delete ([SELECT Id FROM Card__c WHERE Id = :cardId]);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}

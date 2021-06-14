public with sharing class StickyNotesCtrl {
    @AuraEnabled
    public static Card__c createNewCard(
        String boardId,
        Integer xPos,
        Integer yPos,
        String guestUserId
    ) {
        try {
            Card__c c = new Card__c();
            c.Description__c = '';
            c.X_Position__c = (xPos != null) ? xPos : 0;
            c.Y_Position__c = (yPos != null) ? yPos : 0;
            if (!String.isBlank(boardId)) {
                c.Board__c = boardId;
            }
            if (!String.isBlank(guestUserId)) {
                c.Created_By_Guest__c = guestUserId;
            }

            SObjectAccessDecision securityDecision = Security.stripInaccessible(
                AccessType.CREATABLE,
                new List<Card__c>{ c }
            );
            insert securityDecision.getRecords();
            return c;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Card__c> getCards(String boardId) {
        try {
            String query = 'select Id, Description__c, X_Position__c, Y_Position__c, Color__c from Card__c ';
            String whereClause = '';
            if (!String.isBlank(boardId)) {
                whereClause = 'Board__c = :boardId';
            } else {
                String userId = UserInfo.getUserId();
                whereClause = 'CreatedById = :userId and Board__c = null';
            }
            return Database.query(
                query +
                'where ' +
                whereClause +
                ' WITH SECURITY_ENFORCED order by CreatedDate asc'
            );
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Board__c> getBoards(String laneId) {
        try {
            return [
                SELECT Id
                FROM Board__c
                WHERE Lane__c = :laneId
                WITH SECURITY_ENFORCED
                ORDER BY Order__c ASC
            ];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static string getSessionId() {
        try {
            return UserInfo.getSessionId();
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static Id isValidCredentials(
        String laneId,
        String email,
        String code
    ) {
        List<Lane__c> lane = [
            SELECT
                Id,
                Code__c,
                (SELECT Id, Email__c FROM Lane_Users__r WHERE Email__c = :email)
            FROM Lane__c
            WHERE Id = :laneId AND Code__c = :code
            WITH SECURITY_ENFORCED
        ];
        if (!lane.isEmpty() && lane[0].Lane_Users__r?.size() > 0) {
            return lane[0].Lane_Users__r[0]?.Id;
        }
        return null;
    }
}

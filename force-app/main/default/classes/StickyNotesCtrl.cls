public with sharing class StickyNotesCtrl {
    @AuraEnabled
    public static Card__c createNewCard(
        String boardId,
        Integer xPos,
        Integer yPos
    ) {
        try {
            Card__c c = new Card__c();
            c.Description__c = '';
            c.X_Position__c = (xPos != null) ? xPos : 0;
            c.Y_Position__c = (yPos != null) ? yPos : 0;
            if (!String.isBlank(boardId)) {
                c.Board__c = boardId;
            }
            insert c;
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
                '  order by CreatedDate asc'
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
}

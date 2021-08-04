public with sharing class KickboardCtrl {
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
                SELECT Id, Name, Order__c
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
                (
                    SELECT Id, Email__c
                    FROM Lane_Users__r
                    WHERE Email__c = :email AND Is_Active__c = TRUE
                )
            FROM Lane__c
            WHERE Id = :laneId AND Code__c = :code
            WITH SECURITY_ENFORCED
        ];
        if (!lane.isEmpty() && lane[0].Lane_Users__r?.size() > 0) {
            return lane[0].Lane_Users__r[0]?.Id;
        }
        return null;
    }

    /**
     * Removed FLS checks while updating and deleting cards,
     * becuase a guest user does not have permissions to edit and delete records.
     */
    @AuraEnabled
    public static Id saveCard(
        String boardId,
        String cardId,
        String description,
        Integer xPos,
        Integer yPos,
        String color,
        String guestUserId
    ) {
        try {
            Card__c c = new Card__c(Id = cardId);
            if (!String.isBlank(boardId)) {
                c.Board__c = boardId;
            }

            if (description != null) {
                c.Description__c = description;
            }

            if (xPos != null && yPos != null) {
                c.X_Position__c = xPos;
                c.Y_Position__c = yPos;
            } else if (String.isBlank(cardId)) {
                c.X_Position__c = (xPos != null) ? xPos : 0;
                c.Y_Position__c = (yPos != null) ? yPos : 0;
            }

            if (color != null) {
                c.Color__c = color;
            }

            if (!String.isBlank(guestUserId)) {
                if (String.isBlank(cardId)) {
                    c.Created_By_Guest__c = guestUserId;
                } else {
                    c.Last_Modified_By_Guest__c = guestUserId;
                }
            }

            upsert c;
            return c.Id;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void deleteCard(String cardId) {
        try {
            if (cardId != null) {
                delete ([SELECT Id FROM Card__c WHERE Id = :cardId]);
            }
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static Id cloneCard(
        String cardId,
        String guestUserId,
        Integer xPos,
        Integer yPos
    ) {
        try {
            if (cardId != null) {
                Card__c card = getCardDetails(cardId);
                Card__c newCard = card.clone(false, true);
                newCard.X_Position__c = xPos;
                newCard.Y_Position__c = yPos;

                if (!String.isBlank(guestUserId)) {
                    newCard.Created_By_Guest__c = guestUserId;
                }

                insert newCard;
                return newCard.Id;
            }
            return null;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static Card__c getCardDetails(String cardId) {
        try {
            if (cardId != null) {
                return [
                    SELECT
                        Id,
                        Description__c,
                        Color__c,
                        Board__c,
                        X_Position__c,
                        Y_Position__c
                    FROM Card__c
                    WHERE Id = :cardId
                    WITH SECURITY_ENFORCED
                ];
            }
            return null;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static String exportLaneJSON(String laneId) {
        try {
            Lane__c lane = [
                SELECT Id, Name, Description__c, Is_Template__c
                FROM Lane__c
                WHERE Id = :laneId
                WITH SECURITY_ENFORCED
            ];
            GraphRequest gr = new GraphRequest();
            gr.graphId = lane.Id;

            List<CompositeRequest> cRequests = new List<CompositeRequest>();

            // Lane Object
            CompositeRequest cr = new CompositeRequest();
            cr.url = '/services/data/v50.0/sobjects/__namespace__Lane__c/';
            cr.method = 'POST';
            cr.referenceId = lane.Id;
            cr.body = new Map<String, Object>();
            cr.body.put('Name', lane.Name);
            cr.body.put('__namespace__Description__c', lane.Description__c);
            cr.body.put('__namespace__Is_Template__c', lane.Is_Template__c);
            cRequests.add(cr);

            List<Board__c> boards = [
                SELECT
                    Id,
                    Name,
                    Description__c,
                    Order__c,
                    Background_Image__c,
                    Instructions__c,
                    Objective__c,
                    Prerequisites__c,
                    Design_Stage__c,
                    Time_to_Complete_in_minutes__c,
                    (
                        SELECT
                            Id,
                            Category__c,
                            Color__c,
                            Max_X_Position__c,
                            Max_Y_Position__c,
                            Min_X_Position__c,
                            Min_Y_Position__c,
                            Type__c
                        FROM Category_Mappings__r
                    ),
                    (
                        SELECT
                            Id,
                            Color__c,
                            Description__c,
                            X_Position__c,
                            Y_Position__c
                        FROM Cards__r
                    )
                FROM Board__c
                WHERE Lane__c = :lane.Id
            ];

            for (Board__c board : boards) {
                // Board Object
                cr = new CompositeRequest();
                cr.url = '/services/data/v50.0/sobjects/__namespace__Board__c/';
                cr.method = 'POST';
                cr.referenceId = board.Id;
                cr.body = new Map<String, Object>();
                cr.body.put('Name', board.Name);
                cr.body.put(
                    '__namespace__Description__c',
                    board.Description__c
                );
                cr.body.put('__namespace__Order__c', board.Order__c);
                cr.body.put(
                    '__namespace__Background_Image__c',
                    board.Background_Image__c
                );
                cr.body.put('__namespace__Lane__c', '@{' + lane.Id + '.id}');
                cr.body.put(
                    '__namespace__Instructions__c',
                    board.Instructions__c
                );
                cr.body.put('__namespace__Objective__c', board.Objective__c);
                cr.body.put(
                    '__namespace__Prerequisites__c',
                    board.Prerequisites__c
                );
                cr.body.put(
                    '__namespace__Design_Stage__c',
                    board.Design_Stage__c
                );
                cr.body.put(
                    '__namespace__Time_to_Complete_in_minutes__c',
                    board.Time_to_Complete_in_minutes__c
                );
                cRequests.add(cr);

                // Category Mapping Object
                if (board.Category_Mappings__r.size() > 0) {
                    for (Category_Mapping__c cm : board.Category_Mappings__r) {
                        cr = new CompositeRequest();
                        cr.url = '/services/data/v50.0/sobjects/__namespace__Category_Mapping__c/';
                        cr.method = 'POST';
                        cr.referenceId = cm.Id;
                        cr.body = new Map<String, Object>();
                        cr.body.put('__namespace__Category__c', cm.Category__c);
                        cr.body.put('__namespace__Color__c', cm.Color__c);
                        cr.body.put(
                            '__namespace__Max_X_Position__c',
                            cm.Max_X_Position__c
                        );
                        cr.body.put(
                            '__namespace__Max_Y_Position__c',
                            cm.Max_Y_Position__c
                        );
                        cr.body.put(
                            '__namespace__Min_X_Position__c',
                            cm.Min_X_Position__c
                        );
                        cr.body.put(
                            '__namespace__Min_Y_Position__c',
                            cm.Min_Y_Position__c
                        );
                        cr.body.put('__namespace__Type__c', cm.Type__c);
                        cr.body.put(
                            '__namespace__Board__c',
                            '@{' +
                            board.Id +
                            '.id}'
                        );
                        cRequests.add(cr);
                    }
                }

                // Card Object
                if (board.Cards__r.size() > 0) {
                    for (Card__c card : board.Cards__r) {
                        cr = new CompositeRequest();
                        cr.url = '/services/data/v50.0/sobjects/__namespace__Card__c/';
                        cr.method = 'POST';
                        cr.referenceId = card.Id;
                        cr.body = new Map<String, Object>();
                        cr.body.put('__namespace__Color__c', card.Color__c);
                        cr.body.put(
                            '__namespace__Description__c',
                            card.Description__c
                        );
                        cr.body.put(
                            '__namespace__X_Position__c',
                            card.X_Position__c
                        );
                        cr.body.put(
                            '__namespace__Y_Position__c',
                            card.Y_Position__c
                        );
                        cr.body.put(
                            '__namespace__Board__c',
                            '@{' +
                            board.Id +
                            '.id}'
                        );
                        cRequests.add(cr);
                    }
                }
            }
            gr.compositeRequest = cRequests;
            return JSON.serializePretty(gr);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    class GraphRequest {
        String graphId;
        List<CompositeRequest> compositeRequest;
    }

    class CompositeRequest {
        String url;
        Map<String, Object> body;
        String method;
        String referenceId;
    }
}

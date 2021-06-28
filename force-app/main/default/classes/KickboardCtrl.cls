public with sharing class KickboardCtrl {
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
            Card__c sanitizedCard = (Card__c) securityDecision.getRecords()[0];
            insert sanitizedCard;
            return sanitizedCard;
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

    @future(callout=true)
    public static void createTemplates(List<String> staticResources) {
        List<String> graphRequests = new List<String>();

        ApexClass ac = [
            SELECT NamespacePrefix
            FROM ApexClass
            WHERE Name = 'KickboardDataInitCtrl'
        ];
        String namespace = ac.NamespacePrefix;
        if (!String.isBlank(namespace)) {
            namespace += '__';
        } else {
            namespace = '';
        }

        List<StaticResource> srList = [
            SELECT Id, Name, Body
            FROM StaticResource
            WHERE Name IN :staticResources
        ];
        for (StaticResource sr : srList) {
            graphRequests.add(
                sr.Body?.toString()?.replace('__namespace__', namespace)
            );
        }

        if (!graphRequests.isEmpty()) {
            String baseURL = URL.getSalesforceBaseUrl().toExternalForm();
            String compositeGraphURL =
                baseURL + '/services/data/v50.0/composite/graph/';
            String body =
                '{"graphs": [' +
                String.join(graphRequests, ', ') +
                ']}';

            HttpRequest request = new HttpRequest();
            request.setMethod('POST');
            request.setHeader(
                'Authorization',
                'OAuth ' + UserInfo.getSessionId()
            );
            request.setHeader(
                'Authorization',
                'Bearer ' + UserInfo.getSessionID()
            );
            request.setHeader('Content-Type', 'application/json');

            request.setBody(body);
            request.setEndpoint(compositeGraphURL);

            Http http = new Http();
            HttpResponse response = http.send(request);

            if (response.getStatusCode() != 200) {
                throw new CalloutException(response.getBody());
            }
        }
    }

    @AuraEnabled
    public static String exportLaneJSON(String laneId) {
        try {
            Lane__c lane = [
                SELECT
                    Id,
                    Name,
                    Description__c,
                    Is_Template__c,
                    (
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
                            Time_to_Complete_in_minutes__c
                        FROM Boards__r
                    )
                FROM Lane__c
                WHERE Id = :laneId
                WITH SECURITY_ENFORCED
            ];
            GraphRequest gr = new GraphRequest();
            gr.graphId = lane.Id;

            List<CompositeRequest> cRequests = new List<CompositeRequest>();
            CompositeRequest cr = new CompositeRequest();
            cr.url = '/services/data/v50.0/sobjects/__namespace__Lane__c/';
            cr.method = 'POST';
            cr.referenceId = lane.Id;
            cr.body = new Map<String, Object>();
            cr.body.put('Name', lane.Name);
            cr.body.put('__namespace__Description__c', lane.Description__c);
            cr.body.put('__namespace__Is_Template__c', lane.Is_Template__c);
            cRequests.add(cr);
            for (Board__c board : lane.Boards__r) {
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

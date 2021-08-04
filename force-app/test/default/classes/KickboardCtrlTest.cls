@isTest
public class KickboardCtrlTest {
    @TestSetup
    static void createData() {
        Lane__c lane = new Lane__c(Name = 'Test Lane');
        insert lane;
        Board__c board = new Board__c();
        board.Name = 'Test Board';
        board.Order__c = 1;
        board.Lane__c = lane.Id;
        insert board;
        System.runAs(new User(Id = UserInfo.getUserId())) {
            PermissionSet ps = [
                SELECT Id
                FROM PermissionSet
                WHERE Name = 'Kickboard_User'
            ];
            List<PermissionSetAssignment> pas = [
                SELECT Id
                FROM PermissionSetAssignment
                WHERE
                    AssigneeId = :UserInfo.getUserId()
                    AND PermissionSetId = :ps.Id
            ];
            if (pas.size() == 0) {
                insert new PermissionSetAssignment(
                    AssigneeId = UserInfo.getUserId(),
                    PermissionSetId = ps.Id
                );
            }
        }
    }

    @IsTest
    static void checkBoardRetrieval() {
        Lane__c l = [SELECT Id FROM Lane__c];
        Test.startTest();
        System.runAs(new User(Id = UserInfo.getUserId())) {
            List<Board__c> boards = KickboardCtrl.getBoards(l.Id);
            system.assertEquals(1, boards.size());
        }
        Test.stopTest();
    }

    @IsTest
    static void checkCardCreation() {
        Board__c b = [SELECT Id FROM Board__c];
        Test.startTest();
        System.runAs(new User(Id = UserInfo.getUserId())) {
            List<Card__c> cards = KickboardCtrl.getCards(b.Id);
            system.assertEquals(0, cards.size());

            Id cardId = KickboardCtrl.saveCard(
                b.Id,
                null,
                null,
                null,
                null,
                null,
                null
            );
            Card__c card = [
                SELECT
                    Id,
                    Description__c,
                    X_Position__c,
                    Y_Position__c,
                    Color__c
                FROM Card__c
                WHERE Id = :cardId
            ];
            system.assertEquals(0, card.X_Position__c);
            system.assertEquals(0, card.Y_Position__c);

            cardId = KickboardCtrl.saveCard(b.Id, null, null, 2, 3, null, null);
            card = [
                SELECT
                    Id,
                    Description__c,
                    X_Position__c,
                    Y_Position__c,
                    Color__c
                FROM Card__c
                WHERE Id = :cardId
            ];
            system.assertEquals(2, card.X_Position__c);
            system.assertEquals(3, card.Y_Position__c);

            cardId = KickboardCtrl.saveCard(
                b.Id,
                null,
                'Test',
                2,
                3,
                null,
                null
            );
            card = [
                SELECT
                    Id,
                    Description__c,
                    X_Position__c,
                    Y_Position__c,
                    Color__c
                FROM Card__c
                WHERE Id = :cardId
            ];
            system.assertEquals(2, card.X_Position__c);
            system.assertEquals(3, card.Y_Position__c);
            system.assertEquals('Test', card.Description__c);

            cardId = KickboardCtrl.saveCard(
                b.Id,
                null,
                'Test',
                2,
                3,
                'white',
                null
            );
            card = [
                SELECT
                    Id,
                    Description__c,
                    X_Position__c,
                    Y_Position__c,
                    Color__c
                FROM Card__c
                WHERE Id = :cardId
            ];
            system.assertEquals(2, card.X_Position__c);
            system.assertEquals(3, card.Y_Position__c);
            system.assertEquals('Test', card.Description__c);
            system.assertEquals('white', card.Color__c);

            cards = KickboardCtrl.getCards(b.Id);
            system.assertEquals(4, cards.size());
        }
        Test.stopTest();
    }

    @IsTest
    static void checkCardUpdates() {
        Board__c b = [SELECT Id FROM Board__c];
        Id cardId = KickboardCtrl.saveCard(
            b.Id,
            null,
            null,
            null,
            null,
            null,
            null
        );
        Test.startTest();

        KickboardCtrl.saveCard(null, cardId, 'demo', null, null, null, null);
        Card__c card = [
            SELECT Id, X_Position__c, Y_Position__c, Description__c, Color__c
            FROM Card__c
            WHERE Id = :cardId
        ];
        system.assertEquals('demo', card.Description__c);
        system.assertEquals('yellow', card.Color__c);

        KickboardCtrl.saveCard(null, cardId, null, 2, 3, null, null);
        card = [
            SELECT Id, X_Position__c, Y_Position__c, Description__c, Color__c
            FROM Card__c
            WHERE Id = :card.Id
        ];
        system.assertEquals(2, card.X_Position__c);
        system.assertEquals(3, card.Y_Position__c);

        KickboardCtrl.saveCard(null, cardId, null, null, null, 'blue', null);
        card = [
            SELECT Id, X_Position__c, Y_Position__c, Description__c, Color__c
            FROM Card__c
            WHERE Id = :card.Id
        ];
        system.assertEquals('blue', card.Color__c);

        Test.stopTest();
    }

    @IsTest
    static void checkGuestCardChanges() {
        Lane__c lane = [SELECT Id, Code__c FROM Lane__c];

        Lane_User__c lu = new Lane_User__c();
        lu.Email__c = 'test@test.com';
        lu.Lane__c = lane.Id;
        lu.Is_Active__c = false;
        insert lu;

        Board__c b = [SELECT Id FROM Board__c];
        Test.startTest();
        System.runAs(new User(Id = UserInfo.getUserId())) {
            List<Card__c> cards = KickboardCtrl.getCards(b.Id);
            system.assertEquals(0, cards.size());

            Id cardId = KickboardCtrl.saveCard(
                b.Id,
                null,
                null,
                null,
                null,
                null,
                lu.Id
            );
            Card__c card = [
                SELECT
                    Id,
                    Description__c,
                    X_Position__c,
                    Y_Position__c,
                    Color__c,
                    Created_By_Guest__c,
                    Last_Modified_By_Guest__c
                FROM Card__c
                WHERE Id = :cardId
            ];
            system.assertEquals(lu.Id, card.Created_By_Guest__c);
            system.assertEquals(null, card.Last_Modified_By_Guest__c);

            cardId = KickboardCtrl.saveCard(
                b.Id,
                null,
                null,
                2,
                3,
                null,
                lu.Id
            );
            card = [
                SELECT
                    Id,
                    Description__c,
                    X_Position__c,
                    Y_Position__c,
                    Color__c,
                    Created_By_Guest__c,
                    Last_Modified_By_Guest__c
                FROM Card__c
                WHERE Id = :cardId
            ];
            system.assertEquals(lu.Id, card.Created_By_Guest__c);
            system.assertEquals(null, card.Last_Modified_By_Guest__c);

            cardId = KickboardCtrl.saveCard(
                b.Id,
                null,
                'Test',
                2,
                3,
                null,
                lu.Id
            );
            card = [
                SELECT
                    Id,
                    Description__c,
                    X_Position__c,
                    Y_Position__c,
                    Color__c,
                    Created_By_Guest__c,
                    Last_Modified_By_Guest__c
                FROM Card__c
                WHERE Id = :cardId
            ];
            system.assertEquals(2, card.X_Position__c);
            system.assertEquals(3, card.Y_Position__c);
            system.assertEquals('Test', card.Description__c);
            system.assertEquals(lu.Id, card.Created_By_Guest__c);
            system.assertEquals(null, card.Last_Modified_By_Guest__c);

            cardId = KickboardCtrl.saveCard(
                null,
                card.Id,
                'Testing',
                5,
                7,
                'blue',
                lu.Id
            );
            card = [
                SELECT
                    Id,
                    Description__c,
                    X_Position__c,
                    Y_Position__c,
                    Color__c,
                    Created_By_Guest__c,
                    Last_Modified_By_Guest__c
                FROM Card__c
                WHERE Id = :cardId
            ];
            system.assertEquals(5, card.X_Position__c);
            system.assertEquals(7, card.Y_Position__c);
            system.assertEquals('Testing', card.Description__c);
            system.assertEquals('blue', card.Color__c);
            system.assertEquals(lu.Id, card.Created_By_Guest__c);
            system.assertEquals(lu.Id, card.Last_Modified_By_Guest__c);

            cards = KickboardCtrl.getCards(b.Id);
            system.assertEquals(3, cards.size());
        }
        Test.stopTest();
    }

    @IsTest
    static void checkCardDelete() {
        Board__c b = [SELECT Id FROM Board__c];
        Id card1 = KickboardCtrl.saveCard(
            b.Id,
            null,
            null,
            null,
            null,
            null,
            null
        );
        Id card2 = KickboardCtrl.saveCard(b.Id, null, null, 2, 3, null, null);

        Test.startTest();
        System.runAs(new User(Id = UserInfo.getUserId())) {
            List<Card__c> cards = KickboardCtrl.getCards(b.Id);
            system.assertEquals(2, cards.size());

            KickboardCtrl.deleteCard(card1);

            cards = KickboardCtrl.getCards(b.Id);
            system.assertEquals(1, cards.size());

            KickboardCtrl.deleteCard(card2);

            cards = KickboardCtrl.getCards(b.Id);
            system.assertEquals(0, cards.size());
        }
        Test.stopTest();
    }

    @IsTest
    static void checkCardClone() {
        Board__c b = [SELECT Id FROM Board__c];
        Test.startTest();
        System.runAs(new User(Id = UserInfo.getUserId())) {
            Id cardId = KickboardCtrl.saveCard(
                b.Id,
                null,
                'Test',
                2,
                3,
                'white',
                null
            );
            List<Card__c> cards = KickboardCtrl.getCards(b.Id);
            system.assertEquals(1, cards.size());

            Id newCardId = KickboardCtrl.cloneCard(cardId, null, 8, 10);
            system.assertNotEquals(null, newCardId);

            cards = KickboardCtrl.getCards(b.Id);
            system.assertEquals(2, cards.size());

            Card__c card = [
                SELECT
                    Id,
                    Description__c,
                    X_Position__c,
                    Y_Position__c,
                    Color__c
                FROM Card__c
                WHERE Id = :newCardId
            ];
            system.assertEquals(8, card.X_Position__c);
            system.assertEquals(10, card.Y_Position__c);
            system.assertEquals('Test', card.Description__c);
            system.assertEquals('white', card.Color__c);
        }
        Test.stopTest();
    }

    @IsTest
    static void checkSessionId() {
        Test.startTest();
        String sessionId = KickboardCtrl.getSessionId();
        system.assert(sessionId != null);
        Test.stopTest();
    }

    @IsTest
    static void checkInactiveGuestInvite() {
        Lane__c lane = [SELECT Id, Code__c FROM Lane__c];

        Lane_User__c lu = new Lane_User__c();
        lu.Email__c = 'test@test.com';
        lu.Lane__c = lane.Id;
        lu.Is_Active__c = false;
        insert lu;

        Test.startTest();
        System.runAs(new User(Id = UserInfo.getUserId())) {
            Id inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                null,
                null
            );
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                'test@example.com',
                null
            );
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                null,
                '12345678'
            );
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                'test@example.com',
                '12345678'
            );
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                'test@test.com',
                null
            );
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                null,
                lane.Code__c
            );
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                'test@test.com',
                '12345678'
            );
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                'test@example.com',
                lane.Code__c
            );
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                'test@test.com',
                lane.Code__c
            );
            system.assertEquals(null, inviteeId);
        }
        Test.stopTest();
    }

    @IsTest
    static void checkActiveGuestInvite() {
        Lane__c lane = [SELECT Id, Code__c FROM Lane__c];

        Lane_User__c lu = new Lane_User__c();
        lu.Email__c = 'test@test.com';
        lu.Lane__c = lane.Id;
        lu.Is_Active__c = true;
        insert lu;

        Test.startTest();
        System.runAs(new User(Id = UserInfo.getUserId())) {
            Id inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                null,
                null
            );
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                'test@example.com',
                null
            );
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                null,
                '12345678'
            );
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                'test@example.com',
                '12345678'
            );
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                'test@test.com',
                null
            );
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                null,
                lane.Code__c
            );
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                'test@test.com',
                '12345678'
            );
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                'test@example.com',
                lane.Code__c
            );
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                'test@test.com',
                lane.Code__c
            );
            system.assertEquals(lu.Id, inviteeId);
        }
        Test.stopTest();
    }

    @IsTest
    static void checkExportLane() {
        Lane__c lane = [SELECT Id FROM Lane__c];
        Board__c b = [SELECT Id FROM Board__c];
        Id cardId = KickboardCtrl.saveCard(
            b.Id,
            null,
            null,
            null,
            null,
            null,
            null
        );
        Category_Mapping__c cm = new Category_Mapping__c();
        cm.Category__c = 'Test';
        cm.Color__c = 'blue';
        cm.Board__c = b.Id;
        cm.Type__c = 'Color';
        insert cm;
        Test.startTest();
        System.runAs(new User(Id = UserInfo.getUserId())) {
            String output = KickboardCtrl.exportLaneJSON(lane.Id);
            system.assertNotEquals(null, output);
        }
        Test.stopTest();
    }

    @IsTest
    static void checkCardDetails() {
        Lane__c lane = [SELECT Id FROM Lane__c];
        Board__c b = [SELECT Id FROM Board__c];
        Id cardId = KickboardCtrl.saveCard(
            b.Id,
            null,
            'test',
            null,
            null,
            null,
            null
        );
        Test.startTest();
        System.runAs(new User(Id = UserInfo.getUserId())) {
            Card__c card = KickboardCtrl.getCardDetails(cardId);
            system.assertEquals('test', card.Description__c);
        }
        Test.stopTest();
    }
}

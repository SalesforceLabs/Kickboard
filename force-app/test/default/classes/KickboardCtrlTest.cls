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
            PermissionSet ps = [SELECT Id FROM PermissionSet WHERE Name = 'Kickboard_User'];
            insert new PermissionSetAssignment(AssigneeId = UserInfo.getUserId(), PermissionSetId = ps.Id);
        }
    }

    @IsTest
    static void checkBoardRetrieval() {
        Lane__c l = [SELECT Id FROM Lane__c];
        Test.startTest();
        List<Board__c> boards = KickboardCtrl.getBoards(l.Id);
        system.assertEquals(1, boards.size());
        Test.stopTest();
    }

    @IsTest
    static void checkCardCreation() {
        Board__c b = [SELECT Id FROM Board__c];
        Test.startTest();
        System.runAs(new User(Id = UserInfo.getUserId())) {
            List<Card__c> cards = KickboardCtrl.getCards(b.Id);
            system.assertEquals(0, cards.size());

            Card__c card = KickboardCtrl.createNewCard(b.Id, null, null, null);
            system.assertEquals(0, card.X_Position__c);
            system.assertEquals(0, card.Y_Position__c);

            card = KickboardCtrl.createNewCard(b.Id, 2, 3, null);
            system.assertEquals(2, card.X_Position__c);
            system.assertEquals(3, card.Y_Position__c);

            cards = KickboardCtrl.getCards(b.Id);
            system.assertEquals(2, cards.size());
        }
        Test.stopTest();
    }

    @IsTest
    static void checkCardUpdates() {
        Board__c b = [SELECT Id FROM Board__c];
        Card__c card = KickboardCtrl.createNewCard(b.Id, null, null, null);
        Test.startTest();

        KickboardCtrl.saveCard(card.Id, 'demo', null, null, null, null);
        card = [
            SELECT Id, X_Position__c, Y_Position__c, Description__c, Color__c
            FROM Card__c
            WHERE Id = :card.Id
        ];
        system.assertEquals('demo', card.Description__c);
        system.assertEquals('yellow', card.Color__c);

        KickboardCtrl.saveCard(card.Id, null, 2, 3, null, null);
        card = [
            SELECT Id, X_Position__c, Y_Position__c, Description__c, Color__c
            FROM Card__c
            WHERE Id = :card.Id
        ];
        system.assertEquals(2, card.X_Position__c);
        system.assertEquals(3, card.Y_Position__c);

        KickboardCtrl.saveCard(card.Id, null, null, null, 'blue', null);
        card = [
            SELECT Id, X_Position__c, Y_Position__c, Description__c, Color__c
            FROM Card__c
            WHERE Id = :card.Id
        ];
        system.assertEquals('blue', card.Color__c);

        Test.stopTest();
    }

    @IsTest
    static void checkCardDelete() {
        Board__c b = [SELECT Id FROM Board__c];
        Card__c card1 = KickboardCtrl.createNewCard(b.Id, null, null, null);
        Card__c card2 = KickboardCtrl.createNewCard(b.Id, 2, 3, null);

        Test.startTest();
        System.runAs(new User(Id = UserInfo.getUserId())) {
            List<Card__c> cards = KickboardCtrl.getCards(b.Id);
            system.assertEquals(2, cards.size());

            KickboardCtrl.deleteCard(card1.Id);

            cards = KickboardCtrl.getCards(b.Id);
            system.assertEquals(1, cards.size());

            KickboardCtrl.deleteCard(card2.Id);

            cards = KickboardCtrl.getCards(b.Id);
            system.assertEquals(0, cards.size());
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
            Id inviteeId = KickboardCtrl.isValidCredentials(lane.Id, null, null);
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                'test@example.com',
                null
            );
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(lane.Id, null, '12345678');
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
            Id inviteeId = KickboardCtrl.isValidCredentials(lane.Id, null, null);
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(
                lane.Id,
                'test@example.com',
                null
            );
            system.assertEquals(null, inviteeId);

            inviteeId = KickboardCtrl.isValidCredentials(lane.Id, null, '12345678');
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
        Test.startTest();
        System.runAs(new User(Id = UserInfo.getUserId())) {
            String output = KickboardCtrl.exportLaneJSON(lane.Id);
            system.assertNotEquals(null, output);
        }
        Test.stopTest();
    }
}

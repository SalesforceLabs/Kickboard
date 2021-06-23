@isTest
public class KickboardDataInitCtrlTest {
    @isTest
    static void testDataInsert() {
        Test.setMock(HttpCalloutMock.class, new SalesforceAPICalloutMock());
        KickboardDataInitCtrl.initData(
            new List<String>{ 'Kickboard_data_create_a_vision' }
        );
    }

    public class SalesforceAPICalloutMock implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            GraphRequest graphRequest = (GraphRequest) JSON.deserialize(
                req.getBody(),
                GraphRequest.class
            );
            system.assertEquals(1, graphRequest.graphs.size());

            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setStatusCode(200);
            return res;
        }
    }

    class GraphRequest {
        List<Graphs> graphs;
    }

    class Graphs {
        String graphId;
        List<CompositeRequest> compositeRequest;
    }

    public class CompositeRequest {
        String url;
        String method;
        String referenceId;
    }
}

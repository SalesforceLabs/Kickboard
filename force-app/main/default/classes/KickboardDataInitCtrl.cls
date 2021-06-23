public with sharing class KickboardDataInitCtrl {
    @InvocableMethod(
        label='Create Swim Lane Templates'
        description='Creates swim lane templates from static resources'
    )
    public static void initData(List<String> staticResources) {
        List<String> graphRequests = new List<String>();

        ApexClass ac = [
            SELECT NamespacePrefix
            FROM ApexClass
            WHERE Name = 'KickboardDataInitCtrl'
        ];
        String namespace = ac.NamespacePrefix;
        if (!String.isBlank(namespace)) {
            namespace += '__';
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
}

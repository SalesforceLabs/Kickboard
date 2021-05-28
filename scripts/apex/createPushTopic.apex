PushTopic pushTopic = new PushTopic();
pushTopic.Name = 'CardChangeUpdates';
pushTopic.Query = 'SELECT Id, Board__c, LastModifiedById FROM Card__c';
pushTopic.ApiVersion = 51.0;
pushTopic.NotifyForOperationCreate = true;
pushTopic.NotifyForOperationUpdate = true;
pushTopic.NotifyForOperationDelete = true;
pushTopic.NotifyForFields = 'All';
insert pushTopic;

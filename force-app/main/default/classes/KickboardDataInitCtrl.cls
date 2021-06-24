public with sharing class KickboardDataInitCtrl {
    @InvocableMethod(
        label='Create Swim Lane Templates'
        description='Creates swim lane templates from static resources'
    )
    public static void initData(List<String> staticResources) {
        KickboardCtrl.createTemplates(staticResources);
    }
}

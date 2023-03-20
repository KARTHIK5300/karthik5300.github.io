const AddRelatedItems = async (params, myCol, PlatformApi, ctx)=>{
    for (let item of params.collectionitems ){
         let tags = Object.keys(item).filter(key => item[key] === "m:");

         item["ipa_data"] = {
             "Haystack Tags": tags,
             properties: {
                 "Haystack Tags": {
                   val: tags.join(),
                   type: "text",
                   dName: "Haystack Tags"
                 },
                 "Display Points": {
                   val: "All",
                   type: "text",
                   dName: "Display Points"
                 },
                 siteRef: {
                   val: item?.siteRef?.display ? item.siteRef.display : "",
                   type: "text",
                   dName: "siteRef"
                 },
                 floorRef: {
                   val: item?.floorRef?.display ? item.floorRef.display : "",
                   type: "text",
                   dName: "floorRef"
                 },
                 id: {
                   val: item?.id?.display ? item.id.display : "",
                   type: "text",
                   dName: "id"
                 }
             }
         }
    }

    const allExistingItems = await PlatformApi.IafScriptEngine.getItems(
     {
      collectionDesc: {
            _userItemId: myCol._userItemId,
            _namespaces: ctx._namespaces
        },
        query: {},
        options: {
            page: {
                getAllItems: true
            }
        }
     }, ctx);

    let existingIds = allExistingItems.map(i => i.id.value);
  
    let updateItems = params.collectionitems.filter(item => existingIds.includes(item.id.value));
    for (let item of updateItems){
        let existingItem = allExistingItems.find(e =>  e.id.value === item.id.value);
        if (existingItem){
            item._id = existingItem._id;
            item.ipa_data = existingItem.ipa_data;
            item.ipa_data.properties["Display Points"] = existingItem.ipa_data.properties["Display Points"]
  
        }
    }
    
    if (updateItems.length > 0) {
     console.log(JSON.stringify({"message":`Updating ${updateItems.length} items`}));
  
     await PlatformApi.IafScriptEngine.updateItemsBulk({
         _userItemId: myCol._userItemId,
         _namespaces: ctx._namespaces,
         items: updateItems
     }, ctx);
  
    }else{
        console.log(JSON.stringify({"message":"No Items to Update"}));
    }
    
    let newItems  = params.collectionitems.filter(item => !existingIds.includes(item.id.value));
    if (newItems.length >0){
     console.log(JSON.stringify({"message":`Adding ${newItems.length} new items`}));
     await PlatformApi.IafScriptEngine.createItemsBulk({
         _userItemId: myCol._userItemId,
         _namespaces: ctx._namespaces,
         items: newItems
     }, ctx);
    }else{
     console.log(JSON.stringify({"message":"No Items to Add"}));
    }

    return params.collectionitems;
  }
  
  export default {
     async uploadBMSAssets(params, PlatformApi, ctx) { 
  
         let my_bms_coll = await PlatformApi.IafScriptEngine
             .getCollection({
                 _userType: "bms_assets",
                 _shortName: "bms_assets",
                 _itemClass: "NamedUserCollection"
             },ctx);
         let outparams = {
             "j2assets": await AddRelatedItems(params.inparams, my_bms_coll, PlatformApi, ctx )
         }
         return outparams;
     }
  }
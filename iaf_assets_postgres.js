
export default {

	async extractAssets(params, PlatformApi, ctx) { 

	 	let my_coll = await PlatformApi.IafScriptEngine.getCollection({
			_userType: "iaf_ext_asset_coll",
	        _shortName: "asset_coll",
	        _itemClass: "NamedUserCollection"               
	 	}, ctx);

		console.log(JSON.stringify({"msg":"collection fetch"})) 

		let my_child_coll = await PlatformApi.IafScriptEngine.getCollection({ 
			_userType: "bms_assets",
            _itemClass: "NamedUserCollection"
		}, ctx);

		console.log(JSON.stringify({"msg":"child collection fetch"})) 

		let query = {
			"parent": {
	         	"collectionDesc": {
                 	"_userItemId": my_coll._userItemId
                },
                "options": {"page": {"getAllItems": true}}
            },
            "related": [
                {
                   	"relatedDesc": {"_relatedUserType":"bms_assets"},
                    "options": {"project": {"_id": 1, "id": 1,"points":1, "tz":1}},
                    "as": "children"
                }
            ]
        };
        let result = await PlatformApi.IafScriptEngine.findWithRelated(query,ctx);

		console.log(JSON.stringify({"msg":"find with related fetch"})) 

        let outparams = {
        	"assets":result
        }  
        return outparams;       


	}

}




const createBIMCollections = async (params, PlatformApi, ctx)=>{
    console.log(JSON.stringify({"message":"Creating Model Collections"}));
    let packagename = await PlatformApi
        .IafScriptEngine.getVar("package_name");
    let packagenameShort = await PlatformApi
        .IafScriptEngine.getVar("package_name_short");
        console.log("Create BIM Collection");
//create Geometry File Collection
    const geometryFilesCol = {
        "_name": packagename + "_geom_file",
        "_shortName": packagenameShort + "_geom_file",
        "_description": "File Collection for Geometry Files",
        "_userType": "bim_model_geomresources",
        "_namespaces": ctx._namespaces
    }
    const model_geom_file_coll = await PlatformApi
        .IafScriptEngine.createCollection(geometryFilesCol, ctx);
         console.log(JSON.stringify({"message":"Create BIM Collection - Geometry File Collection"}));

    //create Geometry View Collection
    const geometryViewsCol = {
        "_name": packagename + "_geom_view",
        "_shortName": packagenameShort + "_geom_view",
        "_description": "Geometry Views in Model",
        "_userType": "bim_model_geomviews",
        "_namespaces": ctx._namespaces
    }
    const model_geom_views_coll = await PlatformApi
        .IafScriptEngine.createCollection(geometryViewsCol, ctx);
         console.log(JSON.stringify({"message":"Create BIM Collection - Geometry View Collection"}));
    //create Model Composite Item
    const modelCompItem = {
        "_name": packagename,
        "_shortName": packagenameShort + "_modelver",
        "_description": "BIM model version by transform",
        "_userType": "bim_model_version",
        "_namespaces": ctx._namespaces
    }
    PlatformApi
        .IafScriptEngine.setVar("bim_model", await PlatformApi
            .IafScriptEngine.createNamedCompositeItem(modelCompItem, ctx));
    let _myCollections = {
        "model_geom_file_coll": model_geom_file_coll,
        "model_geom_views_coll": model_geom_views_coll
        
    };
    return await addRelatedCollections(_myCollections, PlatformApi, ctx);

}
const createBIMCollectionVersion = async (param, PlatformApi, ctx) =>{
    console.log(JSON.stringify({"message":"Found Previous Model Creating Versions"}));
    const modelRelatedCollection = await PlatformApi
        .IafScriptEngine.getCollectionsInComposite(
            PlatformApi
            .IafScriptEngine.getVar("bim_model")._id,null, ctx);
            console.log(JSON.stringify({"message":"Create BIM Collection Version - bim_model"}));

    await PlatformApi
        .IafScriptEngine.createNamedUserItemVersion({"namedUserItemId":PlatformApi
            .IafScriptEngine.getVar("bim_model")._id},ctx);
    
    const model_geom_file_coll = modelRelatedCollection.find(x => x._userType === 'bim_model_geomresources');
    const model_geom_views_coll = modelRelatedCollection.find(x => x._userType === 'bim_model_geomviews');
    const model_geom_file_coll_ver = await PlatformApi
        .IafScriptEngine
        .createNamedUserItemVersion({
            "namedUserItemId": model_geom_file_coll._userItemId
        }, ctx);
            console.log(JSON.stringify({"message":"Create BIM Collection Version model_geom_file_coll"}));
    const model_geom_views_coll_ver = await PlatformApi
        .IafScriptEngine
        .createNamedUserItemVersion({
            "namedUserItemId": model_geom_views_coll._userItemId
        }, ctx);
        let _myCollections = {
            "model_geom_file_coll": model_geom_file_coll,
            "model_geom_views_coll": model_geom_views_coll
    
        };
    return await addRelatedCollections(_myCollections, PlatformApi, ctx); 
}

const addRelatedCollections = async (_colls, PlatformApi, ctx) => {
    console.log(JSON.stringify({"message":"Creating Model Relations and Related Items"}));
    await PlatformApi
        .IafScriptEngine.addRelatedCollections({
            "namedCompositeItemId": PlatformApi
                .IafScriptEngine.getVar("bim_model")._id,
            "relatedCollections": [
                _colls.model_geom_file_coll._userItemId,
                _colls.model_geom_views_coll._userItemId
            ]
        }, ctx);
    await PlatformApi
        .IafScriptEngine.setVar("outparams", {
            "filecolid": _colls.model_geom_file_coll._userItemId,
            "viewcolid": _colls.model_geom_views_coll._userItemId,
            "compositeitemid": PlatformApi
                .IafScriptEngine.getVar("bim_model")._id

        });
    return true;
}

export default {
    async uploadSGPK(params, PlatformApi, ctx) {

        let param = params.inparams;
        // set global variables first
        await PlatformApi
            .IafScriptEngine.setVar("namespaces", ctx._namespaces);
        await PlatformApi
            .IafScriptEngine.setVar("package_name", param.filename);
        await PlatformApi
            .IafScriptEngine.setVar("package_name_short", param.filename.substring(0, 11));
        debugger;
        let bim_model = await PlatformApi
            .IafScriptEngine.getCompositeCollection(
                {
                    "_userType": "bim_model_version",
                    "_versions._userAttributes.sgpk.fileId": param._fileId
                },ctx, {});
        if (bim_model) {
            PlatformApi
                .IafScriptEngine.setVar("bim_model", bim_model);
           
            await createBIMCollectionVersion(param, PlatformApi, ctx);

        } else {
           
            await createBIMCollections(param, PlatformApi, ctx);

        }
        

        return PlatformApi
            .IafScriptEngine.getVar("outparams");


    }
}
export default {
  async importModeledAssets(params, PlatformApi, ctx){

      let proj = await PlatformApi.IafProj.getCurrent(ctx)
      //skip the getLatestVersion option in the old script unless we really need it.

      const iaf_ext_current_bim_models = await PlatformApi.IafScriptEngine.getCompositeCollections(
          {query: {"_userType":"bim_model_version","_namespaces":{"$in":proj._namespaces},"_itemClass":"NamedCompositeItem"}}, ctx)
      const iaf_ext_current_bim_model = _.last(_.sortBy(_.get(iaf_ext_current_bim_models, "_list"), m => m._metadata._updatedAt))

      let model_els_coll = await PlatformApi.IafScriptEngine.getCollectionInComposite(
        iaf_ext_current_bim_model._userItemId, {_userType: "rvt_elements"}, ctx
      )

      let fileRes = await PlatformApi.IafFileSvc.getFileInfo({_name:"devConfig_ModelAssets.xlsx"}, ctx);
      console.log("File Response:", JSON.stringify(fileRes));

      let fileObj = await PlatformApi.IafFileSvc.getFile({_fileId:fileRes[0]._id, _fileVersionId:fileRes[0]._tipId}, ctx);
      console.log("File Object:", JSON.stringify(fileObj));

      let typeWorkbook = await UiUtils.IafDataPlugin.readXLSXFiles(fileObj);
      console.log("Type Workbook:", JSON.stringify(typeWorkbook));

      let wbJSON = await UiUtils.IafDataPlugin.workbookToJSON(typeWorkbook[0]);
      console.log("wbJSON:", JSON.stringify(wbJSON));

      let iaf_dt_grid_data = wbJSON.Assets

      console.log("wbJSON:", JSON.stringify(iaf_dt_grid_data));

      let iaf_dt_grid_as_objects = await UiUtils.parseGridData({gridData: iaf_dt_grid_data});

      console.log("wbJSON:", JSON.stringify(iaf_dt_grid_as_objects));

      //filter out those rows with no Asset Name
      let assetRows = _.filter(iaf_dt_grid_as_objects, (row) => _.size(row['Asset Name']) > 0)

      let assetObjects = _.map(assetRows, (asset)=> {
        let aObj = {"Asset Name": asset["Asset Name"],
          properties: {
            revitGuid: {val: asset["revitGuid"], dName: "revitGuid", type: "text"},
            dtCategory: {val: asset["dtCategory"], dName: "dtCategory", type: "<<HIERARCHY>>"},
            dtType: {val: asset["dtType"], dName: "dtType", type: "<<HIERARCHY>>"},
            "Revit Family": {val: asset["Revit Family"], dName: "Revit Family", type: "text"},
            "Revit Type": {val: asset["Revit Type"], dName: "Revit Type", type: "text"},
            "BA Name": {val: asset["BA Name"], dName: "BA Name", type: "text"},
            "Containing Floor": {val: asset["Containing Floor"], dName: "Containing Floor", type: "text"},
            "Room Number": {val: asset["Room Number"], dName: "Room Number", type: "text"},
            Mark: {val: asset["Mark"], dName: "Mark", type: "text"},
            Manufacturer: {val: asset["Manufacturer"], dName: "Manufacturer", type: "text"},
            Model: {val: asset["Model"], dName: "Model", type: "text"},
            "Matterport Url": {val: asset["Matterport Url"], dName: "Matterport Url", type: "text"},
            "Image Url": {val: asset["Image Url"], dName: "Image Url", type: "text"},
            Date: {val: asset["Date"], dName: "Date", type: "date"}
          }
        }
        return aObj
      })

      let asset_coll = await PlatformApi.IafScriptEngine.createOrRecreateCollection({
        _name: 'Asset Collection',
        _shortName: 'asset_coll',
        _namespaces: proj._namespaces,
        _description: 'Physical Asset Collection',
        _userType: 'iaf_ext_asset_coll'
      }, ctx)

      let indexRes = await PlatformApi.IafScriptEngine.createOrRecreateIndex(
        {
          _id: asset_coll._id,
          indexDefs: [
            {
              key: {
                "Asset Name": "text",
                "properties.Mark.val": "text",
                "properties.Manufacturer.val": "text",
                "properties.Model.val": "text",
              },
              options: {
                "name": "text_search_index",
                "default_language": "english"
              }
            }
          ]
        }, ctx
      )

      let asset_items_res = await PlatformApi.IafScriptEngine.createItemsBulk(
        {
          _userItemId: asset_coll._userItemId,
          _namespaces: proj._namespaces,
          items: assetObjects
        }, ctx
      )

      let asset_query = {
        query: {},
        _userItemId: asset_coll._userItemId,
        options: {
          project: {"Asset Name": 1, _id: 1},
          page: {getAllItems: true},
          sort: {"_id": 1}
        }
      }

      let all_assets = await PlatformApi.IafScriptEngine.getItems(
        asset_query, ctx
      )

      console.log("all_assets")
      console.log(all_assets)

      //Find revitGuid and store in sourceIds array for each asset.
      //Because revitGuid is under asset.property, it's probably easier to fill them from
      //assetRows by finding matching "Asset Name"
      let assetsWithSourceIds = _.map(all_assets, (asset) => {
        let sourceIds = []
        let row = _.find(assetRows, ["Asset Name", asset["Asset Name"]])
        if(row) {
          sourceIds.push(row.revitGuid)
        }
        asset.sourceIds = sourceIds
        return asset

      })

      console.log("assetsWithSourceIds")
      console.log(assetsWithSourceIds)

      let nfallSourceIds = _.map(assetsWithSourceIds, 'sourceIds')

      console.log("nfallSourceIds")
      console.log(nfallSourceIds)

      let allSourceIds = _.flatten(nfallSourceIds)

      console.log("allSourceIds")
      console.log(allSourceIds)

      let platformIdList = await PlatformApi.IafScriptEngine.findInCollectionsByPropValuesBulk(
        {
          queryProp: {prop: "source_id", values: allSourceIds},
          collectionDesc: {_userType: model_els_coll._userType,
            _userItemId: model_els_coll._userItemId},
          options: {
            project: {platformId: 1, source_id: 1},
            page: {getAllItems: true, getPageInfo: true},
            chunkSize: 50
          }
        }, ctx
      )

      console.log("platformIdList")
      console.log(platformIdList)

      let assetsWithPlatformIds = _.map(assetsWithSourceIds, (asset)=> {
        let platformIds = []
        const assetSourceId = _.get(asset, "sourceIds.0");
        let platformIdData = _.find(platformIdList._list, {source_id: assetSourceId})
        platformIds.push({_id: platformIdData ? platformIdData._id : undefined})
        asset.platformIds = platformIds
        return asset
      })

      console.log("assetsWithPlatformIds")
      console.log(assetsWithPlatformIds)

      //assetsWithPlatformIdArray is not needed as it produces the same array
      //since platformIds is already an array

      let relatedItems = _.map(assetsWithPlatformIds, (related)=>{
        let obj = {
          parentItem: {_id: related._id},
          relatedItems: related.platformIds
        }
        return obj
      })

      let result = await PlatformApi.IafScriptEngine.createRelations(
        {
          parentUserItemId: asset_coll._userItemId,
          _userItemId: model_els_coll._userItemId,
          _namespaces: proj._namespaces,
          relations: relatedItems
        }, ctx
      )

      console.log('Import of Model Assets Complete. result:')
      console.log(result)
  },
}
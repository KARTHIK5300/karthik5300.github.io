const groupBy = (objectArray, property) => {
  return objectArray.reduce((acc, obj) => {
      let key = obj[property];
      key = key.replace(/[\.]+/g, "");
      if (!acc[key]) {
          acc[key] = {};
      }
      // Add object to list for given key's value
      acc[key] = obj;
      return acc;
  }, {});
}

const _mapItemsAsRelated = (parentItems, relatedItems, fromField, relatedField) => {
  let res = [];
  for (let i = 0, l = parentItems.length; i < l; i++) {
      let relatedRecs = [];

      let parentItem = parentItems[i];
      let fromValues = [];

      if (!(parentItem[fromField]) && fromField.indexOf(".") > 1) {
          fromValues = fromField.split(".").reduce((o, i) => o[i] || [], parentItem);
      } else {
          fromValues = Array.isArray(parentItem[fromField]) ? parentItem[fromField] : [parentItem[fromField]];
      }

      if (fromValues && fromValues.length > 0)
          relatedRecs = relatedItems.filter((r) => fromValues.includes(r[relatedField]));

      if (relatedRecs.length > 0) {
          res.push({
              parentItem: parentItems[i],
              relatedItems: relatedRecs
          });
      }
  }
  return res;
}

const createBIMCollections = async (params, libraries, ctx) => {

  const { PlatformApi,  IafScriptEngine} = libraries;

  console.log(JSON.stringify({"message":"Creating Model Collections"}));

  let packagename = await IafScriptEngine.getVar("package_name");
  let packagenameShort = await IafScriptEngine.getVar("package_name_short");

  console.log("Create BIM Collection");
  //create Elements Collection
  const elementsCol = {
      "_name": packagename + "_elements",
      "_shortName": packagenameShort + "_ba_elem",
      "_description": "Elements in BA model",
      "_userType": "rvt_elements",
      "_namespaces": ctx._namespaces
  }
  const model_els_coll = await IafScriptEngine.createCollection(elementsCol, ctx);
  console.log(JSON.stringify({"message":"Create BIM Collection - Element Collection"}));

  console.log("model element collection", model_els_coll)
  let elemCollIndex = {
      "_id": model_els_coll._userItemId,
      indexDefs: [
          {
              key: {
                  "id":1,
              },
              options: {
                  name: "model_els_coll_id",
                  default_language: "english"
              }
          },
          {
              key: {
                  "source_id":1,
              },
              options: {
                  name: "model_els_coll_source_id",
                  default_language: "english"
              }
          }
      ]
  };
  let elemIndex = await IafScriptEngine.createOrRecreateIndex(elemCollIndex, ctx);
  console.log(JSON.stringify({"message":"element index response"}));

  //create Element Properties Collection
  const modelElemPropsCol = {
      "_name": packagename + "_elem_props",
      "_shortName": packagenameShort + "_elprops",
      "_description": "Element Props in BA model",
      "_userType": "rvt_element_props",
      "_namespaces": ctx._namespaces
  }
  const model_els_props_coll = await IafScriptEngine.createCollection(modelElemPropsCol, ctx);
  console.log(JSON.stringify({"message":"Create BIM Collection - Element Props Collection"}));

  //create Type Elements Collection
  const typeElemsCol = {
      "_name": packagename + "_type_el",
      "_shortName": packagenameShort + "_type_el",
      "_description": "Type Elements in BA Check model",
      "_userType": "rvt_type_elements",
      "_namespaces": ctx._namespaces
  }
  const model_type_el_coll = await IafScriptEngine.createCollection(typeElemsCol, ctx);
  console.log(JSON.stringify({"message":"Create BIM Collection - Type Element Collection"}));

  console.log("model type collection", model_type_el_coll)

  let typeElemCollIndex = {
      "_id": model_type_el_coll._userItemId,
      indexDefs: [
          {
              key: {
                  "id":1,
              },
              options: {
                  name: "typeElemsCol_id",
                  default_language: "english"
              }
          },
          {
              key: {
                  "source_id":1,
              },
              options: {
                  name: "typeElemsCol_source_id",
                  default_language: "english"
              }
          }
      ]
  }
  let typeindex = await IafScriptEngine.createOrRecreateIndex(typeElemCollIndex, ctx);
  console.log(JSON.stringify({"message":"type index response"}));

  //create Geometry File Collection
  const geometryFilesCol = {
      "_name": packagename + "_geom_file",
      "_shortName": packagenameShort + "_geom_file",
      "_description": "File Collection for Geometry Files",
      "_userType": "bim_model_geomresources",
      "_namespaces": ctx._namespaces
  }
  const model_geom_file_coll = await IafScriptEngine.createCollection(geometryFilesCol, ctx);
  console.log(JSON.stringify({"message":"Create BIM Collection - Geometry File Collection"}));

  //create Geometry View Collection
  const geometryViewsCol = {
      "_name": packagename + "_geom_view",
      "_shortName": packagenameShort + "_geom_view",
      "_description": "Geometry Views in Model",
      "_userType": "bim_model_geomviews",
      "_namespaces": ctx._namespaces
  }
  const model_geom_views_coll = await IafScriptEngine.createCollection(geometryViewsCol, ctx);
  console.log(JSON.stringify({"message":"Create BIM Collection - Geometry View Collection"}));

  //create Model Data Cache Collection
  const dataCacheCol = {
    "_name": packagename + "_data_cache",
    "_shortName": packagenameShort + "_data_cache",
    "_description": "Data cached about imported model",
    "_userType": "data_cache",
    "_namespaces": ctx._namespaces
}
const data_cache_coll = await IafScriptEngine.createCollection(dataCacheCol, ctx);
console.log(JSON.stringify({"message":"Create Model Data Cache"}));

let bimpkFileId = await IafScriptEngine.getVar("bimpk_fileid");
let bimpkFileVersionId = await IafScriptEngine.getVar("bimpk_fileVersionId");

console.log("fileid: " + bimpkFileId + ", bimpkFileVersionid: " + bimpkFileVersionId);

  //create Model Composite Item
  const modelCompItem = {
    "_name": packagename,
    "_shortName": packagenameShort + "_modelver",
    "_description": "BIM model version by transform",
    "_userType": "bim_model_version",
    "_namespaces": ctx._namespaces,
    "_version": {
      "_userAttributes": {
        "bimpk": {
          "fileId": bimpkFileId,
          "fileVersionId": bimpkFileVersionId
        }
      }
    }
  }
  let model = await IafScriptEngine.createNamedCompositeItem(modelCompItem, ctx)
  await IafScriptEngine.setVar("bim_model", model);

  console.log(JSON.stringify({"message":"Create BIM Collection - Model Composite Item"}));
  console.log(JSON.stringify(model, null, 3))

  let _myCollections = {
      "model_els_coll": model_els_coll,
      "model_els_props_coll": model_els_props_coll,
      "model_type_el_coll": model_type_el_coll,
      "model_geom_file_coll": model_geom_file_coll,
      "model_geom_views_coll": model_geom_views_coll,
      "data_cache_coll": data_cache_coll

  };
  return await createRelatedItemsAndRelationships(_myCollections, libraries, ctx);

}

const createBIMCollectionVersion = async (params, libraries, ctx) => {

  const { PlatformApi,  IafScriptEngine} = libraries;

  console.log(JSON.stringify({"message":"Found Previous Model Creating Versions"}));

  let bimModel = await IafScriptEngine.getVar("bim_model")
  const modelRelatedCollection = await IafScriptEngine.getCollectionsInComposite(bimModel._id,null, ctx);
  console.log(JSON.stringify({"message":"Create BIM Collection Version - bim_model"}));

  console.log("bimModel", JSON.stringify(bimModel))

  let bimpkFileId = await IafScriptEngine.getVar("bimpk_fileid");
  let bimpkFileVersionId = await IafScriptEngine.getVar("bimpk_fileVersionId");

  console.log("bimpkFileId", JSON.stringify(bimpkFileId))

  console.log("bimpkFileVersionId", JSON.stringify(bimpkFileVersionId))

  let newModelVer = {"namedUserItemId":bimModel._id}

  newModelVer._userAttributes = {
      bimpk: {
        fileId: bimpkFileId,
        fileVersionId: bimpkFileVersionId
      }
  }

  let version = await IafScriptEngine.createNamedUserItemVersion(newModelVer,ctx);
  console.log("Create BIM Collection Version bim_model version");
  console.log(JSON.stringify(version, null, 3))

  console.log("newModversionelVer", JSON.stringify(version))

  const model_els_coll = modelRelatedCollection.find(x => x._userType === 'rvt_elements');
  const model_els_props_coll = modelRelatedCollection.find(x => x._userType === 'rvt_element_props');
  const model_type_el_coll = modelRelatedCollection.find(x => x._userType === 'rvt_type_elements');
  const model_geom_file_coll = modelRelatedCollection.find(x => x._userType === 'bim_model_geomresources');
  const model_geom_views_coll = modelRelatedCollection.find(x => x._userType === 'bim_model_geomviews');

  let data_cache_coll = modelRelatedCollection.find(x => x._userType === 'data_cache');
  if (!data_cache_coll) {
    let packagename = await IafScriptEngine.getVar("package_name");
    let packagenameShort = await IafScriptEngine.getVar("package_name_short");
    
    let data_cache_coll_def = {
      "_name": packagename + "_data_cache",
      "_shortName": packagenameShort + "_data_cache",
      "_description": "Data cached about imported model",
      "_userType": "data_cache",
      "_namespaces": ctx._namespaces
    }
    data_cache_coll = await IafScriptEngine.createCollection(data_cache_coll_def, ctx);
    console.log(JSON.stringify({"message":"Create Model Data Cache"}));
  }

  // create the versions

  const model_els_coll_ver = await IafScriptEngine.createNamedUserItemVersion({
    "namedUserItemId": model_els_coll._userItemId
  }, ctx);
  console.log(JSON.stringify({"message":"Create BIM Collection Version model_els_coll"}));

  const model_els_props_coll_ver = await IafScriptEngine.createNamedUserItemVersion({
    "namedUserItemId": model_els_props_coll._userItemId
  }, ctx);
  console.log(JSON.stringify({"message":"Create BIM Collection Version model_els_props_coll"}));

  const model_type_el_coll_ver = await IafScriptEngine.createNamedUserItemVersion({
    "namedUserItemId": model_type_el_coll._userItemId
  }, ctx);
  console.log(JSON.stringify({"message":"Create BIM Collection Version model_type_el_coll"}));

  const data_cache_coll_ver = await IafScriptEngine.createNamedUserItemVersion({
    "namedUserItemId": data_cache_coll._userItemId
  }, ctx);
  console.log(JSON.stringify({"message":"Create Data Cache Version data_cache"}));

  const model_geom_file_coll_ver = await IafScriptEngine.createNamedUserItemVersion({
    "namedUserItemId": model_geom_file_coll._userItemId
  }, ctx);
  console.log(JSON.stringify({"message":"Create BIM Collection Version model_geom_file_coll"}));

  const model_geom_views_coll_ver = await IafScriptEngine.createNamedUserItemVersion({
    "namedUserItemId": model_geom_views_coll._userItemId
  }, ctx);
  console.log(JSON.stringify({"message":"Create BIM Collection Version model_geom_views_coll"}));

  let elemCollIndex = {
    "_id": model_els_coll._userItemId,
    indexDefs: [
      {
        key: {
          "id":1,
        },
        options: {
          name: "model_els_coll_id",
          default_language: "english"
        }
      },
      {
        key: {
          "source_id":1,
        },
        options: {
          name: "model_els_coll_source_id",
          default_language: "english"
        }
      }
    ]
  };
  await IafScriptEngine.createOrRecreateIndex(elemCollIndex, ctx);
  console.log(JSON.stringify({"message":"element index response"}));

  let typeElemCollIndex = {
      "_id": model_type_el_coll._userItemId,
      indexDefs: [
          {
              key: {
                  "id":1,
              },
              options: {
                  name: "typeElemsCol_id",
                  default_language: "english"
              }
          },
          {
              key: {
                  "source_id":1,
              },
              options: {
                  name: "typeElemsCol_source_id",
                  default_language: "english"
              }
          }
      ]
  }
  await IafScriptEngine.createOrRecreateIndex(typeElemCollIndex, ctx);
  console.log(JSON.stringify({"message":"type index response"}));

  // set them in global variables
  IafScriptEngine.setVar("model_els_coll", model_els_coll);
  IafScriptEngine.setVar("model_els_props_coll", model_els_props_coll);
  IafScriptEngine.setVar("model_type_el_coll", model_type_el_coll);
  IafScriptEngine.setVar("data_cache_coll", data_cache_coll);
  IafScriptEngine.setVar("model_geom_file_coll", model_geom_file_coll);
  IafScriptEngine.setVar("model_geom_views_coll", model_geom_views_coll);

  let _myCollections = {
    "model_els_coll": model_els_coll,
    "model_els_props_coll": model_els_props_coll,
    "model_type_el_coll": model_type_el_coll,
    "data_cache_coll": data_cache_coll,
    "model_geom_file_coll": model_geom_file_coll,
    "model_geom_views_coll": model_geom_views_coll
  };
  return await createRelatedItemsAndRelationships(_myCollections, libraries, ctx);

}

const createRelatedItemsAndRelationships = async (_colls, libraries, ctx) => {

  const { PlatformApi,  IafScriptEngine} = libraries;

  console.log(JSON.stringify({"message":"Creating Model Relations and Related Items"}));

  await IafScriptEngine.addRelatedCollections({
    "namedCompositeItemId": IafScriptEngine.getVar("bim_model")._id,
    "relatedCollections": [
      _colls.model_els_coll._userItemId,
      _colls.model_els_props_coll._userItemId,
      _colls.model_type_el_coll._userItemId,
      _colls.data_cache_coll._userItemId,
      _colls.model_geom_file_coll._userItemId,
      _colls.model_geom_views_coll._userItemId
  ]}, ctx);
  console.log("Create Related Collection");

  const bim_els = await IafScriptEngine.createItemsBulk({
    "_userItemId": _colls.model_els_coll._userItemId,
    "_namespaces": ctx._namespaces,
    "items": IafScriptEngine.getVar("manage_els")
  }, ctx);
  console.log("Create Related Collection manage_els");

  const type_els = await IafScriptEngine.createItemsBulk({
    "_userItemId": _colls.model_type_el_coll._userItemId,
    "_namespaces": ctx._namespaces,
    "items": IafScriptEngine.getVar("manage_type_els")
  }, ctx);
  console.log("Create Related Collection manage_type_els");

  await IafScriptEngine.createItemsAsRelatedBulk({
    "parentUserItemId": _colls.model_els_coll._userItemId,
    "_userItemId": _colls.model_els_props_coll._userItemId,
    "_namespaces": ctx._namespaces,
    "items": IafScriptEngine.getVar("properties")
  },ctx);
  console.log("Create Related Collection properties");

  const el_to_type_relations = await IafScriptEngine.createRelations({
    "parentUserItemId": _colls.model_els_coll._userItemId,
    "_userItemId": _colls.model_type_el_coll._userItemId,
    "_namespaces": ctx._namespaces,
    "relations": IafScriptEngine.getVar("manage_el_to_type_relations")
  },ctx);
  console.log("Create Related Collection Relations");

  await IafScriptEngine.setVar("outparams", {
    "filecolid": _colls.model_geom_file_coll._userItemId,
    "viewcolid": _colls.model_geom_views_coll._userItemId,
    "compositeitemid": IafScriptEngine.getVar("bim_model")._id,
    "myCollections": _colls
  });
  return await IafScriptEngine.getVar("outparams");
}

const extractBimpk = async (param, libraries, ctx) => {

  const { PlatformApi,  IafScriptEngine} = libraries;

  try {
      //

      // Extract data 
      let _objectsArray = {
          "objects": [],
          "properties": [],
          "types": []
      }
      param.files.forEach((file) => {
          file.occurences.forEach((occ) => {
              occ.objects.objects.forEach((obj) => {
                  let _myObj = {
                      "package_id": obj.id,
                      "type_id": obj.type,
                      "relationships": obj.relationships,
                      "source_id": obj.sourceId,
                      "properties": obj.properties,
                      "source_filename":file.name
                  }
                  _objectsArray.objects.push(_myObj);

              });
              occ.objects.properties.forEach((prop) => {
                  _objectsArray.properties.push(prop);
              })

              occ.objects.types.forEach((type) => {
                  let _type = {
                      "id": type.id,
                      "name": type.name,
                      "source_id": type.sourceId,
                      "properties": type.properties

                  }
                  _objectsArray.types.push(_type);
              });

          });

      });
      console.log(JSON.stringify({"message":"Data Extraction is complete"}));
      // Data Extraction Completed
      //--------------------------------
      // load the typemap
      let assetTypeMap = null
      try {
          assetTypeMap = await IafScriptEngine.getItems({
                  "collectionDesc": {
                      "_userType": "iaf_dt_type_map_defs_coll",
                      "_namespaces": IafScriptEngine.getVar("namespaces")
                  },
                  "options": {
                      "page": {
                          "getAllItems": true
                      }
                  }
              }, ctx);
      } catch (err) {
          console.log('{"level": "info", "message": "Type Map collection does not exist"}')
      }

      for (let type of _objectsArray.types) {
          for (let prop of type.properties) {
              let _myProp = _objectsArray.properties.find(x => x.id == prop.id);
              prop.dName = _myProp.dName;
              if (_myProp.hasOwnProperty("Asset Category")) {
                  prop.baType = _myProp["Asset Category"]
              }

          }
          type._id = await IafScriptEngine.newID("mongo", {
                  "format": "hex"
              });
          type.properties = groupBy(type.properties, "dName");
          if (assetTypeMap && type.properties.hasOwnProperty("Revit Family") && type.properties.hasOwnProperty("Revit Type")) {
              let _myRow = assetTypeMap.find(x => x["Revit Family"] == type.properties["Revit Family"].val && x["Revit Type"] == type.properties["Revit Type"].val);
              if (_myRow) {
                  type.dtCategory = _myRow.dtCategory;
                  type.dtType = _myRow.dtType;
              }
          };
      };
      console.log(JSON.stringify({"message":"Type Extraction is complete"}));
      // do the same for properties in the object
      for (let obj of _objectsArray.objects) {
          obj.properties.forEach((prop) => {
              let _myProp = _objectsArray.properties.find(x => x.id == prop.id);
              prop.dName = _myProp.dName;

          });

          obj._id = await IafScriptEngine.newID("mongo", {
                  "format": "hex"
              });
          obj.properties = groupBy(obj.properties, "dName");
          let _myVal = _objectsArray.types.find(x => x.id == obj.type_id);
          obj.dtCategory = _myVal.dtCategory;
          obj.dtType = _myVal.dtType;
          if (_myVal.hasOwnProperty("baType")) {
              obj.baType = _myVal.baType;
          }

      };
      console.log(JSON.stringify({"message":"Property Extraction is complete"}));
      let _myProperties =[];
      _objectsArray.objects.forEach((object) =>{
          let _myProp = {
              _id:object._id,
              properties:object.properties
          }
          _myProperties.push(_myProp);

      });
      await IafScriptEngine.setVar("properties", _myProperties);
      _objectsArray.objects.forEach(e => { delete e.properties });
      await IafScriptEngine.setVar("manage_els", _objectsArray.objects);
      await IafScriptEngine.setVar("manage_type_els", _objectsArray.types);
      await IafScriptEngine.setVar("manage_el_to_type_relations",
          _mapItemsAsRelated(IafScriptEngine.getVar("manage_els"),
              IafScriptEngine.getVar("manage_type_els"), "type_id", "id"));
  } catch (err) {
      console.log(err);
  }
}

const cacheSourceFileGraphicsIds = async(params, libraries, ctx) => {

  const { PlatformApi,  IafScriptEngine} = libraries;
  
  const { model_els_coll, data_cache_coll } = params.inparams.myCollections

  console.log('--> cache elems: ' + model_els_coll._name)
  console.log('--> cache data: ' + data_cache_coll._name)

  let sourcefiles = await IafScriptEngine.getDistinct({
    collectionDesc: { _userType: model_els_coll._userType, _userItemId: model_els_coll._userItemId },
    field: 'source_filename',
    options: { getCollInfo: true }
  }, ctx)

  let sourcefileNames = sourcefiles._list[0]._versions[0]._relatedItems.source_filename

  let cacheDataItems = []
  for (let i = 0; i < sourcefileNames.length; i++) {

    let packageIds = await IafScriptEngine.getDistinct({
      collectionDesc: { _userType: model_els_coll._userType, _userItemId: model_els_coll._userItemId },
      query: {source_filename: sourcefileNames[i]},
      field: 'package_id',
      options: { getCollInfo: true }
    }, ctx)

    cacheDataItems.push({
      dataType: 'sourcefileToPkgIds',
      data: {
        source_filename: sourcefileNames[i],
        package_id: packageIds._list[0]._versions[0]._relatedItems.package_id
      }
    })
  }

  const bim_els = await IafScriptEngine.createItemsBulk({
    "_userItemId": data_cache_coll._userItemId,
    "_namespaces": ctx._namespaces,
    "items": cacheDataItems
  }, ctx);
  console.log("Create Cache Data: source filenames to package_ids");

}


export default {
  async uploadBimpk(params, libraries, ctx) {

    const { PlatformApi,  IafScriptEngine} = libraries;

    const {IafItemSvc} = PlatformApi

    let param = params.inparams;
    // set global variables first
    await IafScriptEngine.setVar("namespaces", ctx._namespaces);
    await IafScriptEngine.setVar("package_name", param.filename);
    await IafScriptEngine.setVar("package_name_short", param.filename.substring(0, 11));
    await IafScriptEngine.setVar("bimpk_fileid", param._fileId);
    await IafScriptEngine.setVar("bimpk_fileVersionId", param._fileVersionId);
    debugger;

    let res = await IafItemSvc.getNamedUserItems({"query":{
        "_userType": "bim_model_version",
        "_versions._userAttributes.bimpk.fileId": param._fileId,
        "_itemClass":"NamedCompositeItem"
    }},ctx,{});

  let bim_model = res._list[0];

  console.log(JSON.stringify({"message": "model -> "+JSON.stringify(bim_model)}));

  if (bim_model) {
      IafScriptEngine.setVar("bim_model", bim_model);
      await extractBimpk(param, libraries, ctx);
      await createBIMCollectionVersion(param, libraries, ctx);

  } else {
      await extractBimpk(param, libraries, ctx);
      await createBIMCollections(param, libraries, ctx);

  }
  return IafScriptEngine.getVar("outparams");

 },
  async createModelDataCache(params, libraries, ctx) {

    const { PlatformApi,  IafScriptEngine} = libraries;

    await cacheSourceFileGraphicsIds(params, libraries, ctx)

    return IafScriptEngine.getVar("outparams");

  }
}
let runnableScripts = [
    { name: "Get Link Relations", script: "getLinkRelations" },
    { name: "Clear All Existing Relations", script: "clearAllRelations" },
    { name: "Get BIM Types", script: "getBIMTypes" },
    { name: "Generate BIM Type Report", script: "generateBIMTypeReport" },
    { name: "Generate Type List", script: "generateDTTypeList" },
    { name: "Generate Relation Report", script: "reportDocRelationsFromSheet" },
    { name: "Get Item Counts", script: "getItemCounts" },
    { name: "Get File Property Values", script: "getFilePropertyValues" },
    { name: "Get BIM Asset Property Values By Asset Type", script: "getBIMAssetPropertyValsByAssetType" },
    { name: "Get BIM Asset Property Values", script: "getBIMAssetPropertyValues" },
    { name: "Get Category Type Doc Counts", script: "getCatTypeDocCounts" },
    { name: "All Elements with  Doc Counts", script: "allElementsWithDocs" },
    { name: "All Elements For Assets", script: "allElementsForAssets" },
    { name: "Check Duplicate Assets", script: "checkDuplicateAssets" },
    { name: "All Elements For Spaces", script: "allSpaceElementsForImports" },
    { name: "Create File Folders and File Collections for User Groups", script: "createFileFoldersAndCollections" },
    { name: "Get My Permissions", script: "getMyPerms" },
    { name: "Export Asset Data", script: "exportAssetData" },
    { name: "Export Space Data", script: "exportSpaceData" }
]

let Validation = {

    getRunnableScripts() {
        return runnableScripts
    },

    async getBIMTypes(input, libraries, ctx) {
        let { PlatformApi , IafScriptEngine} = libraries
        let IAF_workspace = await IafScriptEngine.getVar('IAF_workspace')
        let iaf_ext_type_elem_coll = IafScriptEngine.getVar('iaf_ext_type_elem_coll')
        let iaf_dt_model_el_types = await IafScriptEngine.getItems({
            collectionDesc: {
                _userItemId: iaf_ext_type_elem_coll._userItemId,
                _namespaces: IAF_workspace._namespaces
            },
            query: { "properties.Revit Family": { $exists: true } },
            options: { page: { getAllItems: true } }
        }, ctx)
        console.log('iaf_dt_model_el_types', iaf_dt_model_el_types)
        return iaf_dt_model_el_types
    },
    async generateBIMTypeReport(input, libraries, ctx) {
        let { PlatformApi , IafScriptEngine, UiUtils} = libraries

        let {IafProj} = PlatformApi

        let IAF_workspace = await IafProj.getCurrent(ctx)

        console.log("workspace", IAF_workspace)

        let currentModel = await IafScriptEngine.getCompositeCollections({
			query:
			{
				"_userType": "bim_model_version",
				"_namespaces": { "$in": IAF_workspace._namespaces },
				"_itemClass": "NamedCompositeItem"
			}
		}, ctx, { getLatestVersion: true });

		if (!currentModel) return "No Model Present"
   
		let latestModelComposite;
		if (currentModel && currentModel._list && currentModel._list.length) {
		  latestModelComposite = _.last(_.sortBy(currentModel._list, m => m._metadata._updatedAt));
		}

		console.log("latestModelComposite",JSON.stringify(latestModelComposite))
		
		let iaf_ext_type_elem_coll = await IafScriptEngine.getCollectionInComposite(
		latestModelComposite._userItemId, { _userType: "rvt_type_elements" }, ctx)

		console.log("iaf_ext_type_elem_coll", iaf_ext_type_elem_coll)

        let iaf_dt_model_el_types = await IafScriptEngine.getItems({
            collectionDesc: {
                _userItemId: iaf_ext_type_elem_coll._userItemId,
                _namespaces: IAF_workspace._namespaces
            },
            query: { "properties.Revit Family": { $exists: true } },
            options: { page: { getAllItems: true } }
        }, ctx)
        console.log('iaf_dt_model_el_types', iaf_dt_model_el_types)

        let header = [["Revit Category", "Revit Family", "Revit Type", "dtCategory", "dtType"]]
        let assetTypes = iaf_dt_model_el_types.map(type => {
            //if (type.baType)
            return [
                type.properties['Revit Category'].val,
                type.properties['Revit Family'].val,
                type.properties['Revit Type'].val,
                type.dtCategory ? type.dtCategory : '',
                type.dtType ? type.dtType : '']
        })
        let assetTypeAsGrid = header.concat(assetTypes)
        let sheetArrays = [{ sheetName: "Sheet1", objects: assetTypeAsGrid }]
        console.log('shetArrays', sheetArrays)
        
        let relationWorkbook = await UiUtils.IafDataPlugin.createWorkbookFromAoO(sheetArrays);

        let savedWorkbook = await UiUtils.IafDataPlugin.saveWorkbook(relationWorkbook,"devConfig_BIMTypes.xlsx");
        console.log('savedWorkbook', savedWorkbook)

        return { "bimTypes": assetTypeAsGrid }
    },
    //INCOMPLETE LAST PART AGGREGATE
    async generateDTTypeList(input, libraries, ctx) {
        let { PlatformApi , IafScriptEngine, UiUtils} = libraries
        let IAF_workspace = await IafScriptEngine.getVar('IAF_workspace')
        let iaf_ext_type_elem_coll = await IafScriptEngine.getVar('iaf_ext_type_elem_coll')
        let iaf_dt_model_el_types = await IafScriptEngine.getItems({
            collectionDesc: {
                _userItemId: iaf_ext_type_elem_coll._userItemId,
                _namespaces: IAF_workspace._namespaces
            },
            query: { "properties.Revit Family": { $exists: true } },
            options: { page: { getAllItems: true } }
        }, ctx)
    },
    async getItemCounts(input, libraries, ctx) {
        let { PlatformApi , IafScriptEngine} = libraries
        let IAF_workspace = await IafScriptEngine.getVar('IAF_workspace')
        let bimPropBundleDefs = await IafScriptEngine.getItems({
            collectionDesc: {
                _userType: 'iaf_ext_bim_prop_defs_coll',
                _namespaces: IAF_workspace._namespaces
            },
            options: { page: { getAllItems: true } }
        }, ctx)
        let asset_types = bimPropBundleDefs.map(asset => asset.assetType)
        let iaf_ext_elements_collection = await IafScriptEngine.getVar('iaf_ext_elements_collection')
        let iaf_ext_files_coll = await IafScriptEngine.getVar('iaf_ext_files_coll')
        let assetQueries = asset_types.map(asset_type => {
            return {
                query: { assetType: asset_type },
                _userItemId: iaf_ext_elements_collection._userItemId,
                options: { page: { _pageSize: 0, getPageInfo: true } }
            }
        })
        let assetItems = await IafScriptEngine.getItemsMulti(assetQueries, ctx)
        let fileQueries = asset_types.map(asset_type => {
            return {
                query: { "fileAttributes.assetType": asset_type },
                _userItemId: iaf_ext_files_coll._userItemId,
                options: { page: { _pageSize: 0, getPageInfo: true } }
            }
        })
        let fileItems = await IafScriptEngine.getFileItemsMulti(fileQueries, ctx)
        let assets = _.zip(asset_types, assetItems)
        let files = _.zip(asset_types, fileItems)
        let asset_counts = assets.map(assets => [asset[0], asset[1]._total])
        let file_counts = files.map(file => [file[0], file[1]._total])
        let data = {
            assetCounts: Object.fromEntries(asset_counts),
            fileCounts: Object.fromEntries(file_counts)
        }
        return data
    },
    //INCOMPLETE LAST PART AGGREGATE
    async getBIMAssetPropertyValues(input, libraries, ctx) {
        let { PlatformApi , IafScriptEngine} = libraries
        let IAF_workspace = await IafScriptEngine.getVar('IAF_workspace')
        let bimPropBundleDefs = await IafScriptEngine.getItems({
            collectionDesc: {
                _userType: 'iaf_ext_bim_prop_defs_coll',
                _namespaces: IAF_workspace._namespaces
            },
            options: { page: { getAllItems: true } }
        }, ctx)
        let asset_types = bimPropBundleDefs.map(asset => asset.assetType)
        let iaf_ext_elements_collection = await IafScriptEngine.getVar('iaf_ext_elements_collection')
        let bimQueries = asset_types.map(asset_type => {
            return {
                parent: {
                    query: { assetType: asset_type },
                    collectionDesc: { _userItemId: iaf_ext_elements_collection._userItemId },
                    options: { page: { getAllItems: true } }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: "rvt_element_props" },
                        options: {
                            project: { "properties.ASB Floor Levels": 1 }
                        },
                        as: 'Revit Element Properties'
                    }
                ]
            }
        })
        let bimQueryResults = await IafScriptEngine.findWithRelatedMulti(bimQueries, ctx)
        let bimAssetQueryResults = _.flatten(bimQueryResults.map(query_res => {
            return query_res._list.map(elem_res => {
                return {
                    id: elem_res._id,
                    source_id: elem_res.source_id,
                    package_id: elem_res.package_id,
                    assetType: elem_res.assetType,
                    "Element Properties": elem_res['Revit Element Properties']._list[0].properties
                }
            })
        }))
        let bimItemPropertyValues = bimAssetQueryResults
    },
    async getBIMAssetPropertyValsByAssetType(input, libraries, ctx) {
        let { PlatformApi , IafScriptEngine} = libraries
        let IAF_workspace = await IafScriptEngine.getVar('IAF_workspace')
        let bimPropBundleDefs = await IafScriptEngine.getItems({
            collectionDesc: {
                _userType: 'iaf_ext_bim_prop_defs_coll',
                _namespaces: IAF_workspace._namespaces
            },
            options: { page: { getAllItems: true } }
        }, ctx)
        let asset_types = bimPropBundleDefs.map(asset => asset.assetType)
        let iaf_ext_elements_collection = await IafScriptEngine.getVar('iaf_ext_elements_collection')
        let bimQueries = asset_types.map(asset_type => {
            return {
                parent: {
                    query: { baType: asset_type },
                    collectionDesc: { _userItemId: iaf_ext_elements_collection._userItemId },
                    options: { page: { getAllItems: true } }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: "rvt_type_elements" },
                        options: {
                            project: { "properties.COBieTypeManufacturer": 1, "properties.Revit Family": 1 }
                        },
                        as: 'Revit Type Properties'
                    },
                    {
                        relatedDesc: { _relatedUserType: "rvt_element_props" },
                        options: {
                            project: {
                                "properties.ASB Floor Levels": 1,
                                "properties.COBieComponentSpace": 1
                            }
                        },
                        as: 'Revit Element Properties'
                    }
                ]
            }
        })
        let bimQueryResults = await IafScriptEngine.findWithRelatedMulti(bimQueries, ctx)
        let bimAssetQueryResults = bimQueryResults.map(query_res => query_res._list.map(elem_res => {
            return {
                id: elem_res._id,
                source_id: elem_res.source_id,
                package_id: elem_res.package_id,
                assetType: elem_res.assetType,
                "Element Properties": elem_res['Revit Element Properties']._list[0].properties,
                "Type Properties": elem_res['Revit Type Properties']._list[0].properties
            }
        }))
        let bimItemPropertyValues = bimAssetQueryResults.map(asset_type => {
            return {
                count: asset_type.length,
                assetType: asset_type[0].assetType,
                propValues:
                {
                    // $aggregate:
                    //     [
                    //         { $$: "$$asset_type" },
                    //         {
                    //             $group:
                    //             {
                    //                 "_id": null,
                    //                 Manufacturer: { $addToSet: "$Type Properties.COBieTypeManufacturer.val" },
                    //                 RevitFamily: { $addToSet: "$Type Properties.Revit Family.val" },
                    //                 Level: { $addToSet: "$Element Properties.ASB Floor Levels.val" },
                    //                 Space: { $addToSet: "$Element Properties.COBieComponentSpace.val" }
                    //             }
                    //         }
                    //     ]
                }
            }
        })
        return { "data": bimItemPropertyValues }
    },
    async getFilePropertyValues(input, libraries, ctx) {
        let { PlatformApi , IafScriptEngine} = libraries
        let IAF_workspace = await IafScriptEngine.getVar('IAF_workspace')
        let iaf_ext_files_coll = await IafScriptEngine.getVar('iaf_ext_files_coll')
        let fileItems = await IafScriptEngine.getFileItems({
            query: {},
            _userItemId: iaf_ext_files_coll._userItemId,
            options: {
                page: { getAllItems: true },
                project: { "fileAttributes.levelsAndLocations": 1, "fileAttributes.assetType": 1 }
            }
        }, ctx)
        //aggregate
        let fileItemPropertyValues
        // {$aggregate:
        //     [
        //       {"$$": "$fileItems"},
        //       {$group:
        //       {
        //         "_id": null,
        //         assetType: {$addToSet: "$fileAttributes.assetType"},
        //         levelsAndLocations: {$addToSet: "$fileAttributes.levelsAndLocations"}
        //       }
        //       }
        //     ]}
        return { data: fileItemPropertyValues }
    },
    async getLinkRelations(input, libraries, ctx) {
        let { PlatformApi , IafScriptEngine} = libraries
        let IAF_workspace = await IafScriptEngine.getVar('IAF_workspace')
        let bimTypeMap = await IafScriptEngine.getItems({
            collectionDesc: {
                _userType: 'iaf_ext_bim_prop_defs_coll',
                _namespaces: IAF_workspace._namespaces
            },
            options: {
                project: { dtCategory: 1, dtType: 1 },
                page: { getAllItems: true }
            }
        }, ctx)
        let asset_types = bimTypeMap.filter(prop => prop.dtCategory).map(asset => {
            return { dtCategory: asset.dtCategory, dtType: asset.dtType }
        })
        let iaf_ext_elements_collection = await IafScriptEngine.getVar('iaf_ext_elements_collection')
        let iaf_ext_files_coll = await IafScriptEngine.getVar('iaf_ext_files_coll')
        let assetQueries = asset_types.map(asset_type => {
            return {
                query: { dtCategory: asset_type.dtCategory, dtType: asset_type.dtType },
                _userItemId: iaf_ext_elements_collection._userItemId,
                options: { page: { getAllItems: true } }
            }
        })
        let assetItems = await IafScriptEngine.getItemsMulti(assetQueries, ctx)
        let fileQueries = asset_types.map(asset_type => {
            return {
                query: { "fileAttributes.dtCategory": asset_type.dtCategory, "fileAttributes.dtType": asset_type.dtType },
                _userItemId: iaf_ext_files_coll._userItemId,
                options: { page: { getAllItems: true } }
            }
        })
        let fileItems = await IafScriptEngine.getFileItemsMulti(fileQueries, ctx)
        let asset_relations = IafScriptEngine.attachItemsAsRelatedMulti({
            parentItems: assetItems,
            relatedItems: fileItems
        })
        return asset_relations
    },
    async clearAllRelations(input, libraries, ctx) {
        let { PlatformApi , IafScriptEngine} = libraries
        let IAF_workspace = await IafScriptEngine.getVar('IAF_workspace')
        let iaf_ext_elements_collection = await IafScriptEngine.getVar('iaf_ext_elements_collection')
        let iaf_ext_files_coll = await IafScriptEngine.getVar('iaf_ext_files_coll')
        let docRelations = await IafScriptEngine.getRelations({
            collectionDesc: { _userType: iaf_ext_elements_collection._userType, _userItemId: iaf_ext_elements_collection._userItemId },
            query: { _relatedUserType: iaf_ext_files_coll._userType },
            options: { page: { getAllItems: true } }
        }, ctx)
        let deletedRelations = await IafScriptEngine.deleteRelations({
            parentUserItemId: iaf_ext_elements_collection._userItemId,
            relations: docRelations
        }, ctx)
        return deletedRelations
    },
    async reportDocRelationsFromSheet(input, libraries, ctx) {
        let { PlatformApi , IafScriptEngine, UiUtils} = libraries
        let IAF_workspace = await IafScriptEngine.getVar('IAF_workspace')
        let iaf_ext_elements_collection = await IafScriptEngine.getVar('iaf_ext_elements_collection')
        let iaf_ext_files_coll = await IafScriptEngine.getVar('iaf_ext_files_coll')
        let xlsxFiles = await UiUtils.IafLocalFile.selectFiles({ multiple: true, accept: ".xlsx" })
        let workbooks = await UiUtils.IafDataPlugin.readXLSXFiles(xlsxFiles)
        let wbJSON = await UiUtils.IafDataPlugin.workbookToJSON(workbooks[0])
        let iaf_doc_grid_data = wbJSON.Sheet1
        let iaf_doc_grid_as_objects = await UiUtils.parseGridData({ gridData: iaf_doc_grid_data })
        let dtTypeList = iaf_doc_grid_as_objects.map(type => {
            return {
                //     {$setq: {"dtTypeList":
                //     {$aggregate: [
                //         {"$$": "$iaf_doc_grid_as_objects"},
                //         {$group:
                //           { _id: "$dtCategory",
                //             types: {$addToSet: "$dtType"}
                //           }
                //         },
                //         {$project:
                //           {
                //             _id: 0,
                //             dtCategory: "$_id",
                //             dtTypes: "$types"
                //           }
                //         }
                //     ]}
                //   }},
            }
        })
        let dtCategoryTypeList = _.flatten(dtTypeList.map(cat =>
            cat.dtTypes.map(type => {
                return {
                    dtCategory: cat.dtCategory,
                    dtType: type
                }
            }
            )))
        let fileItems = dtCategoryTypeList.map(catType => {
            return {
                dtCategory: catType.dtCategory,
                dtType: catType.dtType
            }
        })
        let assetQueries = dtCategoryTypeList.map(catType => {
            return {
                query: { "dtCategory": catType.dtCategory, "dtType": catType.dtType },
                _userItemId: iaf_ext_elements_collection._userItemId,
                options: { page: { getAllItems: true } }
            }
        })
        let assetItems = await IafScriptEngine.getItemsMulti(assetQueries, ctx)
        let relationArrays = _.zip(dtCategoryTypeList, assetItems, fileItems)
        let relationCounts = relationArrays.map(relation => {
            return {
                dtCategory: relation[0].dtCategory,
                dtType: relation[0].dtType,
                elementCount: relation[1].length,
                docCount: relation[2].length,
                relationCount: relation[1].length * relation[2].length
            }
        })
        let relationCountsAsGrid = [["dtCategory", "dtType", "Element Count", "Doc Count", "Relation Count"]].concat(relationCounts.map(catType => { return [catType.dtCategory, catType.dtType, catType.elementCount, catType.docCount, catType.relationCount] }))
        let sheetArrays = [{ sheetName: "Sheet1", arrays: relationCountsAsGrid }]
        let relationWorkbook = await UiUtils.IafDataPlugin.createWorkbookFromAoO(sheetArrays);
        let savedWorkbook = await UiUtils.IafDataPlugin.saveWorkbook({
            workbook: relationWorkbook,
            filename: `RelationCounts_${IAF_workspace._shortName}.xlsx"`
        });
        let finalCounts = relationCountsAsGrid
        return finalCounts
    },
    async getCatTypeDocCounts(input, libraries, ctx) {
        let { PlatformApi , IafScriptEngine, UiUtils} = libraries
        let IAF_workspace = await IafScriptEngine.getVar('IAF_workspace')
        let iaf_typedef_collection = await IafScriptEngine.getVar('iaf_typedef_collection')
        let iaf_ext_files_coll = await IafScriptEngine.getVar('iaf_ext_files_coll')
        let bimTypeMaps = await IafScriptEngine.getItems({
            collectionDesc:
                { _userType: iaf_typedef_collection._userType, _namespaces: IAF_workspace._namespaces },
            options: {
                project: { dtCategory: 1, dtType: 1 },
                page: { getAllItems: true }
            }
        }, ctx);//INCOMPLETE AGGREGATE
    },
    async allElementsWithDocs(input, libraries, ctx) {
        let { PlatformApi , IafScriptEngine, UiUtils} = libraries
        let IAF_workspace = await IafScriptEngine.getVar('IAF_workspace')
        let iaf_ext_elements_collection = await IafScriptEngine.getVar('iaf_ext_elements_collection')
        let iaf_ext_files_coll = await IafScriptEngine.getVar('iaf_ext_files_coll')
        let bimQuery = [{
            parent: {
                query: {},
                collectionDesc: { _userType: "rvt_elements", _userItemId: iaf_ext_elements_collection._userItemId },
                options: { page: { getAllItems: true } }
            },
            related: [
                {
                    relatedDesc: { _relatedUserType: "rvt_type_elements" },
                    as: 'Revit Type Properties'
                },
                {
                    relatedDesc: { _relatedUserType: "file_container" },
                    query: {
                        "containerPath": "/"
                    },
                    as: 'CDE_Documents'
                }
            ]
        }]
        let queryResults = await IafScriptEngine.findWithRelatedMulti(bimQuery, ctx)
        let elementList = queryResults[0]._list
        let reduced = elementList.map(elem => {
            return {
                dtCategory: elem.dtCategory,
                dtType: elem.dtType,
                RevitFamily: elem['Revit Type Properties']._list[0].properties['Revit Family'].val,
                Documents: elem.CDE_Documents._list.map(doc => doc.name)
            }
        })
        let reducedMore = reduced.map(elem => {
            return {
                dtCategory: elem.dtCategory,
                dtType: elem.dtType,
                RevitFamily: elem.RevitFamily,
                Documents: JSON.stringify(elem.Documents)
            }
        })
        let sheetArrays = [{
            sheetName: "Sheet1",
            objects: reducedMore
        }]
        let relationWorkbook = await UiUtils.IafDataPlugin.createWorkbookFromAoO(sheetArrays);
        let savedWorkbook = await UiUtils.IafDataPlugin.saveWorkbook({
            workbook: relationWorkbook,
            file: `ElemDocs_${IAF_workspace._shortName}.xlsx`
        })
        let fini = "Done"
        return fini
    },
    async allElementsForAssets(input, libraries, ctx) {
        let { PlatformApi , IafScriptEngine, UiUtils} = libraries
        let iaf_ext_elements_collection = IafScriptEngine.getVar('iaf_ext_elements_collection')
        let iaf_asset_collection = await IafScriptEngine.getVar('iaf_asset_collection')
        let bimQuery
        console.log('iaf_asset_collection', iaf_asset_collection)
        if (iaf_asset_collection) {
            bimQuery = [{
                parent: {
                    query: { "dtCategory": { $exists: true } },
                    collectionDesc: { _userType: "rvt_elements", _userItemId: iaf_ext_elements_collection._userItemId },
                    options: { page: { getAllItems: true } },
                    sort: { _id: 1 }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: "rvt_type_elements" },
                        as: 'Revit Type Properties'
                    },
                    {
                        relatedDesc: { _relatedUserType: "rvt_element_props" },
                        as: 'Revit Element Properties'
                    },
                    {
                        relatedDesc: { _relatedUserType: iaf_asset_collection._userType, _isInverse: true },
                        as: 'AssetInfo',
                        options: {
                            project: { "Asset Name": 1 }
                        }
                    }
                ]
            }]
        } else {
            bimQuery = [{
                parent: {
                    query: { "dtCategory": { $exists: true } },
                    collectionDesc: { _userType: "rvt_elements", _userItemId: iaf_ext_elements_collection._userItemId },
                    options: { page: { getAllItems: true } },
                    sort: { _id: 1 }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: "rvt_type_elements" },
                        as: 'Revit Type Properties'
                    },
                    {
                        relatedDesc: { _relatedUserType: "rvt_element_props" },
                        as: 'Revit Element Properties'
                    }
                ]
            }]
        }
        let queryResults = await IafScriptEngine.findWithRelatedMulti(bimQuery, ctx);
        let elementList = queryResults[0]._list
        let reduced = elementList.map(elem => {
            return {
                platformId: elem._id,
                revitGuid: elem.source_id,
                dtCategory: elem.dtCategory,
                dtType: elem.dtType,
                "Revit Category": elem['Revit Type Properties']._list[0].properties['Revit Category'].val,
                "Revit Family": elem['Revit Type Properties']._list[0].properties['Revit Family'].val,
                "Revit Type": elem['Revit Type Properties']._list[0].properties['Revit Type'].val,
                "Revit Class": elem['Revit Type Properties']._list[0].properties['Revit Class'].val,
                "Revit Element ID": elem['Revit Element Properties']._list[0].properties.SystemelementId.val,
                "baBuilding Name": elem['Revit Element Properties']._list[0].properties['baBuilding Name'] ? elem['Revit Element Properties']._list[0].properties['baBuilding Name'].val : '',
                "baV_Grid": elem['Revit Element Properties']._list[0].properties.baV_Grid ? elem['Revit Element Properties']._list[0].properties.baV_Grid.val : '',
                "baH_Grid": elem['Revit Element Properties']._list[0].properties.baH_Grid ? elem['Revit Element Properties']._list[0].properties.baH_Grid.val : '',
                "baFloor Name": elem['Revit Element Properties']._list[0].properties['baFloor Name'] ? elem['Revit Element Properties']._list[0].properties['baFloor Name'].val : '',
                "baModel Reference": elem['Revit Element Properties']._list[0].properties['baModel Reference'] ? elem['Revit Element Properties']._list[0].properties['baModel Reference'].val : '',
                "Asset Name": elem.AssetInfo._list[0] ? elem.AssetInfo._list[0]['Asset Name'] : ''
            }
        })
        let sheetArrays = [{
            sheetName: "Assets",
            objects: reduced
        }]
        let relationWorkbook = await UiUtils.IafDataPlugin.createWorkbookFromAoO(sheetArrays);
        let savedWorkbook = await UiUtils.IafDataPlugin.saveWorkbook({
            workbook: relationWorkbook,
            file: "Exported_Assets.xlsx"
        });
        return { finished: "Done" }
    },
    
    async checkDuplicateAssets(input, libraries, ctx) {
        let { PlatformApi , IafScriptEngine, UiUtils} = libraries
        let IAF_workspace = await IafScriptEngine.getVar('IAF_workspace')
        let iaf_ext_elements_collection = await IafScriptEngine.getVar('iaf_ext_elements_collection')
        let iaf_ext_files_coll = await IafScriptEngine.getVar('iaf_ext_files_coll')
        let xlsxFiles = await UiUtils.IafLocalFile.selectFiles({ multiple: true, accept: ".xlsx" })
        let typeWorkbook = await UiUtils.IafDataPlugin.readXLSXFiles(xlsxFiles)
        let wbJSON = await UiUtils.IafDataPlugin.workbookToJSON(typeWorkbook[0])
        let iaf_dt_grid_data = wbJSON.Assets
        let iaf_dt_grid_as_objects = await UiUtils.parseGridData({ gridData: iaf_dt_grid_data })
        let assetRows = iaf_dt_grid_as_objects.filter(row => row['Asset Name'])
        let assetObjects = assetRows.map(asset => {
            return {
                "Asset Name": asset['Asset Name'],
                properties: {
                    Floor: asset.containingFloor,
                    Room: asset.roomNumber,
                    Mark: asset.mark,
                    "Revit Family": asset.revitFamily,
                    "Revit Type": asset.revitType
                }
            }
        })
    },

    async exportAssetData(input, libraries, ctx){

        let { PlatformApi , IafScriptEngine, UiUtils} = libraries
        let proj = await PlatformApi.IafProj.getCurrent(ctx)

        let iaf_ext_current_bim_model = await IafScriptEngine.getCompositeCollection(
            { query: { "_userType": "bim_model_version", "_namespaces": { "$in": proj._namespaces }, "_itemClass": "NamedCompositeItem" } }, ctx, { getLatestVersion: true })
        console.log("iaf_ext_current_bim_model", iaf_ext_current_bim_model); 

        let model_els_coll = await IafScriptEngine.getCollectionInComposite(
            iaf_ext_current_bim_model._userItemId, { _userType: "rvt_elements" }, ctx)
        console.log('iaf_asset_collection', iaf_asset_collection);

        let bimQuery;

        if (iaf_asset_collection) {
            bimQuery = [{
                parent: {
                    query: { dtCategory: { $exists: true } },
                    collectionDesc: { _userType: "rvt_elements", _userItemId: model_els_coll._userItemId },
                    options: { page: { getAllItems: true } },
                    sort: { _id: 1 }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: "rvt_type_elements" },
                        as: 'Revit Type Properties'
                    },
                    {
                        relatedDesc: { _relatedUserType: "rvt_element_props" },
                        as: 'Revit Element Properties'
                    },
                    {
                        relatedDesc: { _relatedUserType: iaf_asset_collection._userType, _isInverse: true },
                        as: 'AssetInfo',
                        options: {project: { "Asset Name": 1, properties:1 }}
                    }
                ]
            }]
        } else {
            bimQuery = [{
                parent: {
                    query: { dtCategory: { $exists: true } },
                    collectionDesc: { _userType: "rvt_elements", _userItemId: model_els_coll._userItemId },
                    options: { page: { getAllItems: true } },
                    sort: { _id: 1 }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: "rvt_type_elements" },
                        as: 'Revit Type Properties'
                    },
                    {
                        relatedDesc: { _relatedUserType: "rvt_element_props" },
                        as: 'Revit Element Properties'
                    }
                ]
            }]
        }
        console.log("bim_query", JSON.stringify(bimQuery));  

        let queryResults = await IafScriptEngine.findWithRelatedMulti(bimQuery, ctx)
        console.log("queryResults", queryResults);   

        let assetList =  queryResults[0]._list
        console.log("assetList", assetList);

        let reduced = assetList.map(elem => {
            let result = {
                platformId: elem._id,
                revitGuid: elem.source_id,
                dtCategory: elem.dtCategory,
                dtType: elem.dtType,
                "Asset Name": _.get(elem, "AssetInfo._list[0]") ?  _.get(elem, "AssetInfo._list[0].Asset Name") : ''
            }
            let typeProps = _.get(elem, "Revit Type Properties._list[0].properties")
            let elemProps = _.get(elem, "Revit Element Properties._list[0].properties")

            for (const property in typeProps) {
                let key = typeProps[property].dName
                result[key] = typeProps[property].val
            }

            for (const property in elemProps) {
                let key = elemProps[property].dName
                result[key] = elemProps[property].val
            }
            return result
        })

        console.log("reduced", reduced)

        let sheetArrays = [{ sheetName: "Assets", objects: reduced }]
        console.log('shetArrays', sheetArrays)
        let relationWorkbook = await UiUtils.IafDataPlugin.createWorkbookFromAoO(sheetArrays)
        console.log('relationWorkbook', relationWorkbook)
        let savedWorkbook = await UiUtils.IafDataPlugin.saveWorkbook(relationWorkbook,"devConfig_Exported_Assets.xlsx");
        console.log('savedWorkbook', savedWorkbook)
    },

    async exportSpaceData(input, libraries, ctx){

        let { PlatformApi , IafScriptEngine, UiUtils} = libraries
        console.log
        let proj = await PlatformApi.IafProj.getCurrent(ctx)
        let iaf_ext_current_bim_model = await IafScriptEngine.getCompositeCollection(
            { query: { "_userType": "bim_model_version", "_namespaces": { "$in": proj._namespaces }, "_itemClass": "NamedCompositeItem" } }, ctx, { getLatestVersion: true })
        console.log("iaf_ext_current_bim_model", iaf_ext_current_bim_model);    
        let model_els_coll = await IafScriptEngine.getCollectionInComposite(
            iaf_ext_current_bim_model._userItemId, { _userType: "rvt_elements" }, ctx)
        console.log("model_els_coll", model_els_coll);
        let type_coll = await IafScriptEngine.getCollectionInComposite(
            iaf_ext_current_bim_model._userItemId, { _userType: "rvt_type_elements" }, ctx)
        console.log("type_coll", type_coll);
        let bim_query = {
            parent: {
                query: {"dtCategory": { $exists: false }},
                collectionDesc: { _userItemId: model_els_coll._userItemId, _userType: "rvt_elements"},
                options: { page: { getAllItems: true, getLatestVersion: true }},
                sort: { "_id": 1 }
              },
              relatedFilter: {
                includeResult: true,
                $and: [
                    {
                        relatedDesc: { _relatedUserType: "rvt_type_elements"},
                        as: 'Revit Type Properties',
                        query: {$or: [
                            {"properties.Revit Category.val": "OST_Rooms"},
                            {"properties.Revit Category.val": "OST_Spaces"},
                            {"properties.Revit Category.val": "OST_Levels"},
                            {"properties.Revit Category.val": "OST_Zones"},
                            {"properties.Revit Category.val": "OST_Areas"},
                            {"properties.Revit Category.val": "OST_MEPSpaces"}
                        ]}
                    },
                    {
                        relatedDesc: {_relatedUserType: "rvt_element_props"},
                        as: "Revit Element Properties",
                    }
                ]
            }
        }
        console.log("bim_query", bim_query);     
        let queryResults = await IafScriptEngine.findWithRelatedMulti([bim_query], ctx)
        console.log("queryResults", queryResults);  
        let spaceList =  queryResults[0]._list
        console.log("spaceList", spaceList); 
        let reduced = spaceList.map(elem => {
            return {
                revitGuid: elem.source_id,
                Name:  _.get(elem, "Revit Element Properties._list[0].properties.Name.val"),
                Number:  _.get(elem, "Revit Element Properties._list[0].properties.Number.val"),
                Area:  _.get(elem, "Revit Element Properties._list[0].properties.Area.val"),
                area_uom:  _.get(elem, "Revit Element Properties._list[0].properties.Area.uom"),
                "Revit Category":  _.get(elem, "Revit Type Properties._list[0].properties.Revit Category.val"),
                "Revit Family":  _.get(elem, "Revit Type Properties._list[0].properties.Revit Family.val")
            }
        })
        console.log("reduced", reduced)
        let sheetArrays = [{ sheetName: "Spaces", objects: reduced }]
        console.log('shetArrays', sheetArrays)
        let relationWorkbook = await UiUtils.IafDataPlugin.createWorkbookFromAoO(sheetArrays)
        console.log('relationWorkbook', relationWorkbook)
        let savedWorkbook = await UiUtils.IafDataPlugin.saveWorkbook(relationWorkbook,"devConfig_Exported_Spaces.xlsx");
        console.log('savedWorkbook', savedWorkbook)
    }


  }
  
  export default Validation
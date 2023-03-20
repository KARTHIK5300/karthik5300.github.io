let runnableScripts = [
    { name: "loadProjectAndCollections", script: "loadProjectAndCollections" },
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
    { name: "Get My Permissions", script: "getMyPerms" }
]

let extval = {
    //Exposes the runnable steps to script execution tools like the vscode extension
    getRunnableScripts() {
        return runnableScripts
    },
    async getBIMTypes(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        let iaf_ext_type_elem_coll = PlatformApi.IafScriptEngine.getVar('iaf_ext_type_elem_coll')
        let iaf_dt_model_el_types = await PlatformApi.IafScriptEngine.getItems({
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
        let { PlatformApi, UiUtils } = libraries
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        let iaf_ext_type_elem_coll = PlatformApi.IafScriptEngine.getVar('iaf_ext_type_elem_coll')
        let iaf_dt_model_el_types = await PlatformApi.IafScriptEngine.getItems({
            collectionDesc: {
                _userItemId: iaf_ext_type_elem_coll._userItemId,
                _namespaces: IAF_workspace._namespaces
            },
            query: { "properties.Revit Family": { $exists: true } },
            options: { page: { getAllItems: true } }
        }, ctx)
        console.log('iaf_dt_model_el_types', iaf_dt_model_el_types)
        let header = [["Revit Category", "baType", "Revit Family", "Revit Type", "dtCategory", "dtType"]]
        let assetTypes = iaf_dt_model_el_types.map(type => {
            //if (type.baType)
            return [
                type.properties['Revit Category'].val,
                type.baType ? type.baType : '',
                type.properties['Revit Family'].val,
                type.properties['Revit Type'].val,
                type.dtCategory ? type.dtCategory : '',
                type.dtType ? type.dtType : '']
        })
        let assetTypeAsGrid = header.concat(assetTypes)
        let sheetArrays = [{ sheetName: "Sheet1", objects: assetTypeAsGrid }]
        console.log('shetArrays', sheetArrays)
        let relationWorkbook = await UiUtils.IafDataPlugin.createWorkbookFromAoO(sheetArrays)
        console.log('relationWorkbook', relationWorkbook)
        let savedWorkbook = await UiUtils.IafDataPlugin.saveWorkbook({
            workbook: relationWorkbook,
            file: `${IAF_workspace._shortName}_BIMTypes.xlsx`
        })
        console.log('savedWorkbook', savedWorkbook)
        return { "bimTypes": assetTypeAsGrid }
    },
    //INCOMPLETE LAST PART AGGREGATE
    async generateDTTypeList(input, libraries, ctx) {
        let { PlatformApi, UiUtils } = libraries
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        let iaf_ext_type_elem_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_type_elem_coll')
        let iaf_dt_model_el_types = await PlatformApi.IafScriptEngine.getItems({
            collectionDesc: {
                _userItemId: iaf_ext_type_elem_coll._userItemId,
                _namespaces: IAF_workspace._namespaces
            },
            query: { "properties.Revit Family": { $exists: true } },
            options: { page: { getAllItems: true } }
        }, ctx)
    },
    async getItemCounts(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        let bimPropBundleDefs = await PlatformApi.IafScriptEngine.getItems({
            collectionDesc: {
                _userType: 'iaf_ext_bim_prop_defs_coll',
                _namespaces: IAF_workspace._namespaces
            },
            options: { page: { getAllItems: true } }
        }, ctx)
        let asset_types = bimPropBundleDefs.map(asset => asset.assetType)
        let iaf_ext_elements_collection = await PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')
        let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
        let assetQueries = asset_types.map(asset_type => {
            return {
                query: { assetType: asset_type },
                _userItemId: iaf_ext_elements_collection._userItemId,
                options: { page: { _pageSize: 0, getPageInfo: true } }
            }
        })
        let assetItems = await PlatformApi.IafScriptEngine.getItemsMulti(assetQueries, ctx)
        let fileQueries = asset_types.map(asset_type => {
            return {
                query: { "fileAttributes.assetType": asset_type },
                _userItemId: iaf_ext_files_coll._userItemId,
                options: { page: { _pageSize: 0, getPageInfo: true } }
            }
        })
        let fileItems = await PlatformApi.IafScriptEngine.getFileItemsMulti(fileQueries, ctx)
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
        let { PlatformApi } = libraries
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        let bimPropBundleDefs = await PlatformApi.IafScriptEngine.getItems({
            collectionDesc: {
                _userType: 'iaf_ext_bim_prop_defs_coll',
                _namespaces: IAF_workspace._namespaces
            },
            options: { page: { getAllItems: true } }
        }, ctx)
        let asset_types = bimPropBundleDefs.map(asset => asset.assetType)
        let iaf_ext_elements_collection = await PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')
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
        let bimQueryResults = await PlatformApi.IafScriptEngine.findWithRelatedMulti(bimQueries, ctx)
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
        let { PlatformApi } = libraries
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        let bimPropBundleDefs = await PlatformApi.IafScriptEngine.getItems({
            collectionDesc: {
                _userType: 'iaf_ext_bim_prop_defs_coll',
                _namespaces: IAF_workspace._namespaces
            },
            options: { page: { getAllItems: true } }
        }, ctx)
        let asset_types = bimPropBundleDefs.map(asset => asset.assetType)
        let iaf_ext_elements_collection = await PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')
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
        let bimQueryResults = await PlatformApi.IafScriptEngine.findWithRelatedMulti(bimQueries, ctx)
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
        let { PlatformApi } = libraries
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
        let fileItems = await PlatformApi.IafScriptEngine.getFileItems({
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
        let { PlatformApi } = libraries
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        let bimTypeMap = await PlatformApi.IafScriptEngine.getItems({
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
        let iaf_ext_elements_collection = await PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')
        let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
        let assetQueries = asset_types.map(asset_type => {
            return {
                query: { dtCategory: asset_type.dtCategory, dtType: asset_type.dtType },
                _userItemId: iaf_ext_elements_collection._userItemId,
                options: { page: { getAllItems: true } }
            }
        })
        let assetItems = await PlatformApi.IafScriptEngine.getItemsMulti(assetQueries, ctx)
        let fileQueries = asset_types.map(asset_type => {
            return {
                query: { "fileAttributes.dtCategory": asset_type.dtCategory, "fileAttributes.dtType": asset_type.dtType },
                _userItemId: iaf_ext_files_coll._userItemId,
                options: { page: { getAllItems: true } }
            }
        })
        let fileItems = await PlatformApi.IafScriptEngine.getFileItemsMulti(fileQueries, ctx)
        let asset_relations = PlatformApi.IafScriptEngine.attachItemsAsRelatedMulti({
            parentItems: assetItems,
            relatedItems: fileItems
        })
        return asset_relations
    },
    async clearAllRelations(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        let iaf_ext_elements_collection = await PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')
        let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
        let docRelations = await PlatformApi.IafScriptEngine.getRelations({
            collectionDesc: { _userType: iaf_ext_elements_collection._userType, _userItemId: iaf_ext_elements_collection._userItemId },
            query: { _relatedUserType: iaf_ext_files_coll._userType },
            options: { page: { getAllItems: true } }
        }, ctx)
        let deletedRelations = await PlatformApi.IafScriptEngine.deleteRelations({
            parentUserItemId: iaf_ext_elements_collection._userItemId,
            relations: docRelations
        }, ctx)
        return deletedRelations
    },
    async reportDocRelationsFromSheet(input, libraries, ctx) {
        let { PlatformApi, UiUtils } = libraries
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        let iaf_ext_elements_collection = await PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')
        let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
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
        let assetItems = await PlatformApi.IafScriptEngine.getItemsMulti(assetQueries, ctx)
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
        let { PlatformApi, UiUtils } = libraries
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        let iaf_typedef_collection = await PlatformApi.IafScriptEngine.getVar('iaf_typedef_collection')
        let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
        let bimTypeMaps = await PlatformApi.IafScriptEngine.getItems({
            collectionDesc:
                { _userType: iaf_typedef_collection._userType, _namespaces: IAF_workspace._namespaces },
            options: {
                project: { dtCategory: 1, dtType: 1 },
                page: { getAllItems: true }
            }
        }, ctx);//INCOMPLETE AGGREGATE
    },
    async allElementsWithDocs(input, libraries, ctx) {
        let { PlatformApi, UiUtils } = libraries
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        let iaf_ext_elements_collection = await PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')
        let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
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
        let queryResults = await PlatformApi.IafScriptEngine.findWithRelatedMulti(bimQuery, ctx)
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
        let { PlatformApi, UiUtils } = libraries
        let iaf_ext_elements_collection = PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')
        let iaf_asset_collection = await PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
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
        let queryResults = await PlatformApi.IafScriptEngine.findWithRelatedMulti(bimQuery, ctx);
        console.log('queryResults', queryResults)
        let elementList = queryResults[0]._list
        let reduced = elementList.map(elem => {
            return {
                platformId: elem._id,
                revitGuid: elem.source_id,
                dtCategory: elem.dtCategory,
                dtType: elem.dtType,
                "Revit Category": elem['Revit Type Properties'] ? elem['Revit Type Properties']._list[0] ? elem['Revit Type Properties']._list[0].properties['Revit Category'].val : '' : '',
                "Revit Family": elem['Revit Type Properties'] ? elem['Revit Type Properties']._list[0] ? elem['Revit Type Properties']._list[0].properties['Revit Family'].val : '' : '',
                "Revit Type": elem['Revit Type Properties'] ? elem['Revit Type Properties']._list[0] ? elem['Revit Type Properties']._list[0].properties['Revit Type'].val : '' : '',
                "Revit Class": elem['Revit Type Properties'] ? elem['Revit Type Properties']._list[0] ? elem['Revit Type Properties']._list[0].properties['Revit Class'].val : '' : '',
                "Revit Element ID": elem['Revit Element Properties'] ? elem['Revit Element Properties']._list[0] ? elem['Revit Element Properties']._list[0].properties.SystemelementId.val : '' : '',
                "baBuilding Name": elem['Revit Element Properties'] ? elem['Revit Element Properties']._list[0]? elem['Revit Element Properties']._list[0].properties['baBuilding Name'] ? elem['Revit Element Properties']._list[0].properties['baBuilding Name'].val : '' : '' : '',
                "baV_Grid": elem['Revit Element Properties'] ? elem['Revit Element Properties']._list[0] ? elem['Revit Element Properties']._list[0].properties.baV_Grid ? elem['Revit Element Properties']._list[0].properties.baV_Grid.val : '' : '' : '',
                "baH_Grid": elem['Revit Element Properties'] ? elem['Revit Element Properties']._list[0] ? elem['Revit Element Properties']._list[0].properties.baH_Grid ? elem['Revit Element Properties']._list[0].properties.baH_Grid.val : '' : '' : '',
                "baFloor Name": elem['Revit Element Properties'] ? elem['Revit Element Properties']._list[0] ? elem['Revit Element Properties']._list[0].properties['baFloor Name'] ? elem['Revit Element Properties']._list[0].properties['baFloor Name'].val : '' : '' : '',
                "baModel Reference": elem['Revit Element Properties'] ? elem['Revit Element Properties']._list[0] ? elem['Revit Element Properties']._list[0].properties['baModel Reference'] ? elem['Revit Element Properties']._list[0].properties['baModel Reference'].val : '' : '' : '',
                "Asset Name": elem.AssetInfo ? elem.AssetInfo._list[0] ? elem.AssetInfo._list[0]['Asset Name'] : '' : ''
            }
        })
        console.log('reduced', reduced)
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
        let { PlatformApi, UiUtils } = libraries
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        let iaf_ext_elements_collection = await PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')
        let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
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
        // let assetsWithSourceIds = assetObjects.map(asset => {return{
        //     sourceIds: {$map: {
        //       input: {$findall: ["$assetRows", {"Asset Name": "$$asset.Asset Name"}]},
        //       as: "matchingRow",
        //       in: "$$matchingRow.revitGuid",
        //       out: {}
        //     }}
        //   }})
        //     {$setq: {"groupedList":
        //     {$aggregate:
        //     [
        //       {"$$": "$assetsWithSourceIds"},
        //       {$group:
        //         { _id: "$Asset Name",
        //           props: {$addToSet: "$properties"}
        //         }
        //       }
        //     ]
        //     }
        //   }},
    },
    async allSpaceElementsForImports(input, libraries, ctx) {
        let { PlatformApi, UiUtils } = libraries
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        let iaf_ext_elements_collection = await PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')
        let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
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
        // let assetsWithSourceIds = assetObjects.map(asset => {return{
        //     sourceIds: {$map: {
        //       input: {$findall: ["$assetRows", {"Asset Name": "$$asset.Asset Name"}]},
        //       as: "matchingRow",
        //       in: "$$matchingRow.revitGuid",
        //       out: {}
        //     }}
        //   }})
        //     {$setq: {"groupedList":
        //     {$aggregate:
        //     [
        //       {"$$": "$assetsWithSourceIds"},
        //       {$group:
        //         { _id: "$Asset Name",
        //           props: {$addToSet: "$properties"}
        //         }
        //       }
        //     ]
        //     }
        //   }},
    },
    async loadProjectAndCollections(input, libraries, ctx, callback) {

        const { IafProj, IafScriptEngine, IafDataSource } = libraries.PlatformApi



        let currentProj = await IafProj.getCurrent(ctx)

        let collections = await IafScriptEngine.getCollections(null, ctx)
        console.log('loadProjectAndCollections collections', collections)
        collections = collections._list

        let root_file_cont = await IafScriptEngine.getFileCollection({
            _userType: "file_container",
            _shortName: "Root Container"
        }, ctx)
        console.log('loadProjectAndCollections root_file_cont', root_file_cont)

        let latestModelComposite = await IafScriptEngine.getCompositeCollection({
            query:
            {
                "_userType": "bim_model_version",
                "_namespaces": { "$in": currentProj._namespaces },
                "_itemClass": "NamedCompositeItem"
            }
        }, ctx, { getLatestVersion: true })

        let latestElementCollection
        if (latestModelComposite)
            latestElementCollection = await IafScriptEngine.getCollectionInComposite(latestModelComposite._id, {
                _userType: "rvt_elements"
            }, ctx)
        let iaf_ext_type_elem_coll
        if (latestModelComposite)
            iaf_ext_type_elem_coll = await IafScriptEngine.getCollectionInComposite(latestModelComposite._id, {
                _userType: "rvt_type_elements"
            }, ctx)

        let datasources = await IafDataSource.getOrchestrators(null, ctx)
        datasources = datasources._list

        let iaf_collections = _.find(collections, { _userType: "iaf_ext_coll_coll" })
        let iaf_asset_collection = _.find(collections, { _userType: "iaf_ext_asset_coll" })
        let iaf_space_collection = _.find(collections, { _userType: "iaf_ext_space_coll" })
        let iaf_bms_collection = _.find(collections, { _userType: "bms_assets" })
        let iaf_schema_collection = _.find(collections, { _userType: "iaf_schema_collection" })
        let iaf_pick_list_collection = _.find(collections, { _userType: "iaf_pick_list_collection" })
        let iaf_systems_collection = _.find(collections, { _userType: "iaf_ext_sys_coll" })
        let iaf_system_elements_collection = _.find(collections, { _userType: "iaf_ext_sysel_coll" })
        let iaf_ext_files_coll = _.find(collections, { _userType: "file_container" })
        let iaf_dt_contractor_coll = _.find(collections, { _userType: "iaf_dt_contractor_coll" })
        let iaf_dt_installer_coll = _.find(collections, { _userType: "iaf_dt_installer_coll" })
        let iaf_dt_iron_data_coll = _.find(collections, { _userType: "iaf_dt_iron_data_coll" })
        let iaf_dt_spec_data_coll = _.find(collections, { _userType: "iaf_dt_spec_data_coll" })
        let iaf_dt_sup_data_coll = _.find(collections, { _userType: "iaf_dt_sup_data_coll" })
        let iaf_dt_trace_coll = _.find(collections, { _userType: "iaf_dt_trace_coll" })
        let iaf_dt_warranty_coll = _.find(collections, { _userType: "iaf_dt_warranty_coll" })
        let iaf_dt_commtest_coll = _.find(collections, { _userType: "iaf_dt_commtest_coll" })

        IafScriptEngine.setVar('iaf_ext_type_elem_coll', iaf_ext_type_elem_coll)
        IafScriptEngine.setVar('runnableScripts', runnableScripts)
        IafScriptEngine.setVar('iaf_collections', iaf_collections)
        IafScriptEngine.setVar('iaf_space_collection', iaf_space_collection)
        IafScriptEngine.setVar('iaf_bms_collection', iaf_bms_collection)
        IafScriptEngine.setVar('iaf_schema_collection', iaf_schema_collection)
        IafScriptEngine.setVar('iaf_pick_list_collection', iaf_pick_list_collection)
        IafScriptEngine.setVar('iaf_systems_collection', iaf_systems_collection)
        IafScriptEngine.setVar('iaf_system_elements_collection', iaf_system_elements_collection)
        IafScriptEngine.setVar('iaf_ext_files_coll', root_file_cont)
        IafScriptEngine.setVar('iaf_dt_contractor_coll', iaf_dt_contractor_coll)
        IafScriptEngine.setVar('iaf_dt_spec_data_coll', iaf_dt_spec_data_coll)
        IafScriptEngine.setVar('iaf_dt_installer_coll', iaf_dt_installer_coll)
        IafScriptEngine.setVar('iaf_dt_iron_data_coll', iaf_dt_iron_data_coll)
        IafScriptEngine.setVar('iaf_dt_sup_data_coll', iaf_dt_sup_data_coll)
        IafScriptEngine.setVar('iaf_dt_trace_coll', iaf_dt_trace_coll)
        IafScriptEngine.setVar('iaf_dt_warranty_coll', iaf_dt_warranty_coll)
        IafScriptEngine.setVar('iaf_dt_commtest_coll', iaf_dt_commtest_coll)
        IafScriptEngine.setVar('iaf_entityCollectionMap', {
            Asset: iaf_asset_collection,
            Assets: iaf_asset_collection,
            Space: iaf_space_collection,
            Spaces: iaf_space_collection,
            File: iaf_ext_files_coll,
            Files: iaf_ext_files_coll,
            Collection: iaf_collections,
            Collections: iaf_collections,
            "BMS Equipment": iaf_bms_collection,
            System: iaf_systems_collection,
            Systems: iaf_systems_collection,
            SystemElement: iaf_system_elements_collection,
            SystemElements: iaf_system_elements_collection
        })
        IafScriptEngine.setVar('iaf_entityNamePropMap', {
            Asset: "Asset Name",
            Assets: "Asset Name",
            Space: "Space Name",
            Spaces: "Space Name",
            File: "name",
            Files: "name",
            Collection: "Collection Name",
            Collections: "Collection Name",
            "BMS Equipment": "id.display",
            System: "Systems Name",
            Systems: "Systems Name",
            SystemElement: "Element Name",
            SystemElements: "Element Name",
        })
        IafScriptEngine.setVar('iaf_typedef_collection', _.find(collections, { _userType: "iaf_dt_type_map_defs_coll" }))
        IafScriptEngine.setVar('iaf_asset_collection', iaf_asset_collection)

        if (latestModelComposite) {
            IafScriptEngine.setVar('iaf_ext_current_bim_model', latestModelComposite)
            IafScriptEngine.setVar('iaf_ext_elements_collection', latestElementCollection)
        }

        IafScriptEngine.setVar('datasources', datasources)
        IafScriptEngine.setVar('IAF_workspace', currentProj)
        return {
            currentProj,
            iaf_typedef_collection: IafScriptEngine.getVar('iaf_typedef_collection'),
            iaf_asset_collection: IafScriptEngine.getVar('iaf_asset_collection'),
            latestModelComposite,
            latestElementCollection,
            datasources,
            iaf_entityNamePropMap: IafScriptEngine.getVar('iaf_entityNamePropMap'),
            iaf_entityCollectionMap: IafScriptEngine.getVar('iaf_entityCollectionMap'),
            collections,
            iaf_collections: IafScriptEngine.getVar('iaf_collections'),
            iaf_space_collection: IafScriptEngine.getVar('iaf_space_collection'),
            iaf_bms_collection: IafScriptEngine.getVar('iaf_bms_collection'),
            iaf_schema_collection: IafScriptEngine.getVar('iaf_schema_collection'),
            iaf_pick_list_collection: IafScriptEngine.getVar('iaf_pick_list_collection'),
            iaf_systems_collection: IafScriptEngine.getVar('iaf_systems_collection'),
            iaf_system_elements_collection: IafScriptEngine.getVar('iaf_system_elements_collection'),
            iaf_ext_files_coll: IafScriptEngine.getVar('iaf_ext_files_coll'),
            iaf_dt_contractor_coll: IafScriptEngine.getVar('iaf_dt_contractor_coll'),
            iaf_dt_installer_coll: IafScriptEngine.getVar('iaf_dt_installer_coll'),
            iaf_dt_iron_data_coll: IafScriptEngine.getVar('iaf_dt_iron_data_coll'),
            iaf_dt_spec_data_coll: IafScriptEngine.getVar('iaf_dt_spec_data_coll'),
            iaf_dt_sup_data_coll: IafScriptEngine.getVar('iaf_dt_sup_data_coll'),
            iaf_dt_trace_coll: IafScriptEngine.getVar('iaf_dt_trace_coll'),
            iaf_dt_warranty_coll: IafScriptEngine.getVar('iaf_dt_warranty_coll'),
            iaf_dt_commtest_coll: IafScriptEngine.getVar('iaf_dt_commtest_coll')
        }
    },
}

export default extval
let entass = {
    async getCategoryOfAssets(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_asset_collection = await PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let distinctCategories = await PlatformApi.IafScriptEngine.getDistinct({
            collectionDesc: { _userType: iaf_asset_collection._userType, _id: iaf_asset_collection._id },
            field: 'properties.dtCategory.val',
            query: {}
        }, ctx)
        let sortedCategories = _.sortBy(distinctCategories, cat => cat._id)
        return sortedCategories
    },
    async createAssetFromSchema(input, libraries, ctx) {
        let { PlatformApi, UiUtils } = libraries
        let iaf_schema_collection = PlatformApi.IafScriptEngine.getVar('iaf_schema_collection')
        console.log('iaf_schema_collection', iaf_schema_collection)
        let findSchema = await PlatformApi.IafScriptEngine.findInCollections({
            query: { "entity": "asset" },
            collectionDesc: {
                _userType: iaf_schema_collection._userType,
                _userItemId: iaf_schema_collection._userItemId
            },
            options: {
                page: {
                    _pageSize: 10,
                    getPageInfo: true
                }
            }
        }, ctx)
        console.log('findSchema', findSchema)
        let schemaExists
        if (!_.isEmpty(findSchema._list)) {
            schemaExists = true
        } else {
            schemaExists = false
        }
        let hydratedObject = null
        if (schemaExists) {
            hydratedObject = await UiUtils.IafDataPlugin.generateSchemaObject(findSchema._list[0].schema)
        }
        if (hydratedObject) {
            Object.assign(hydratedObject, { "Entity Name": hydratedObject["Asset Name"] });
        }

        console.log('hydratedObject', hydratedObject)
        return hydratedObject
    },
    // this one is not working need to ask scott
    async exportAssets(input, libraries, ctx) {
        let { UiUtils } = libraries
        let assetRows = input.entityInfo.original.map(asset => {
            return {
                "Asset Name": asset['Entity Name'],
                "Revit Element ID": asset.properties['Revit Element ID.val'],
                "Volume": asset.properties['Volume.val'],
                "Volume Unit": "m^3",
                "Task ID": asset.properties['Task ID.val'],
                "Grade": asset.properties['Grade.val']
            }
        })
        let sheetArrays = [{ sheetName: "Exported Assets", objects: assetRows }]
        let relationWorkbook = await UiUtils.IafDataPlugin.createWorkbookFromAoO(sheetArrays);
        let savedWorkbook = await UiUtils.IafDataPlugin.saveWorkbook({
            workbook: relationWorkbook,
            file: "Exported_Assets.xlsx"
        });
        return savedWorkbook
    },
    async getAssets(input, libraries, ctx, callback) {
        console.log('input', input)
        const { IafScriptEngine } = libraries.PlatformApi
        let assetColl = IafScriptEngine.getVar('iaf_asset_collection')
        let relatedQuery = {
            parent: {
                query: input.entityInfo,
                collectionDesc: { _userType: assetColl._userType, _userItemId: assetColl._userItemId },
                options: { page: { getAllItems: true } }
            },
            related: [
                {
                    relatedDesc: {
                        _relatedUserType: "rvt_elements",
                        //_relatedUserItemId: elemColl._userItemId,
                        //_relatedUserItemVersionId: elemColl._userItemVersionId
                    },
                    options: { project: { _id: 1, package_id: 1 } },
                    as: "revitElementIds"
                }
            ]
        }

        console.log(relatedQuery)

        let assets = await IafScriptEngine.findWithRelated(relatedQuery, ctx).catch((err) => {
            return err
        })

        console.log(assets)

        let assetsAsEntities = assets._list.map((a) => {
            a.original = _.cloneDeep(a)
            a['Entity Name'] = a['Asset Name']
            a.modelViewerIds = a.revitElementIds._list.map(e => e.package_id)
            return a
        })

        return assetsAsEntities

    },
    async createAsset(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let currentProj = await PlatformApi.IafProj.getCurrent(ctx)
        let assetColl = await PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let res = { success: true, message: '', result: [] }
        console.log('input', input)
        let minAssetInfo = { 'Asset Name': input.entityInfo.new['Entity Name'], properties: input.entityInfo.new.properties }
        let newAssetArray = [minAssetInfo]
        let findAsset = await PlatformApi.IafScriptEngine.findInCollections({
            query: { "Asset Name": input.entityInfo.new['Entity Name'] },
            collectionDesc: {
                _userType: assetColl._userType,
                _userItemId: assetColl._userItemId
            },
            options: {
                page: {
                    _pageSize: 10,
                    getPageInfo: true
                }
            }
        }, ctx)
        if (findAsset._total > 0) {
            res.success = false
            res.message = 'An asset with the same name already exists!'
            return res
        } else {
            let new_asset = await PlatformApi.IafScriptEngine.createItems({
                _userItemId: assetColl._userItemId,
                _namespaces: currentProj._namespaces,
                items: newAssetArray
            }, ctx)
            console.log('new_asset', new_asset)
            console.log('newasset empty', !_.isEmpty(new_asset))
            if (!_.isEmpty(new_asset)) {
                res.success = true
                res.result = new_asset
            } else {
                res.success = false
                res.message = "Error creating Asset!"
            }
        }
        return res
    },
    async deleteAsset(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let assetColl = await PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let res = { success: true, message: '', result: [] }
        console.log('input', input)
        let deleteAssetArray = [input.entityInfo.new.original._id]
        let deleteResult = await PlatformApi.IafScriptEngine.deleteItems({
            _userItemId: assetColl._userItemId,
            items: deleteAssetArray
        }, ctx)
        console.log('deleteResult', deleteResult)
        res.success = true
        return res
    },
    async assetsToSpaces(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_space_collection = await PlatformApi.IafScriptEngine.getVar('iaf_space_collection')
        console.log('input', input)
        //old script was using these roomVals that I think we dont need
        //let roomVals = input.entityInfo.selectedEntities.map()
        let spaceNumberQueries = input.entityInfo.selectedEntities.map(asset => {
            return {
                query: { "properties.Number.val": asset.properties["Room Number"].val },
                collectionDesc: { _userType: iaf_space_collection._userType, _userItemId: iaf_space_collection._userItemId },
                options: {
                    page: { getAllItems: true },
                    project: { _id: 1 }
                }
            }
        })
        console.log('spaceNumberQueries', spaceNumberQueries)
        let spaceIds = await PlatformApi.IafScriptEngine.getItemsMulti(spaceNumberQueries, ctx)
        console.log('spaceIds', spaceIds)
        return spaceIds
    },
    async getAssetFromModel(input, libraries, ctx, callback) {
        console.log('from model input', input)

        const { IafScriptEngine } = libraries.PlatformApi
        let iaf_ext_elements_collection = IafScriptEngine.getVar('iaf_ext_elements_collection')
        console.log("iaf_ext_elements_collection", iaf_ext_elements_collection)
        let iaf_asset_collection = IafScriptEngine.getVar('iaf_asset_collection')
        console.log("iaf_asset_collection", iaf_asset_collection)
        let bimQuery = [{
            parent: {
                query: { package_id: input.modelInfo.id },
                collectionDesc: { _userType: "rvt_elements", _userItemId: iaf_ext_elements_collection._userItemId },
                options: { page: { getAllItems: true } },
                sort: { _id: 1 }
            },
            "related": [
                {
                    relatedDesc: { _relatedUserType: iaf_asset_collection._userType, _isInverse: true },
                    as: 'AssetInfo',
                },
                {
                    "relatedDesc": {
                        "_relatedUserType": "rvt_element_props"
                    },
                    "as": "Revit Element Properties"
                },
                {
                   "relatedDesc": {
                       "_relatedUserType": "rvt_type_elements"
                   },
                   "as": "Revit Type Properties"
               }
            ]
        }]


        let queryResults = await IafScriptEngine.findWithRelatedMulti(bimQuery, ctx)

        console.log('queryResults', queryResults)

        let asset = null
        if (queryResults[0]._list[0].AssetInfo._total > 0) {
            asset = queryResults[0]._list[0].AssetInfo._list.map(asset => {
                return {
                    _id: asset._id,
                    "Entity Name": asset['Asset Name'],
                    properties: asset.properties,
                    modelViewerIds: [queryResults[0]._list[0].id],
                    modelData: {
                        "id": queryResults[0]._list[0].package_id,
                        "revitGuid": queryResults[0]._list[0].source_id,
                        "dtCategory": queryResults[0]._list[0].dtCategory,
                        "dtType": queryResults[0]._list[0].dtType,
                        "Revit Type Properties": queryResults[0]._list[0]['Revit Type Properties']._list[0].properties,
                        "Revit Element Properties": queryResults[0]._list[0]['Revit Element Properties']._list[0].properties,
                    }
                }
            })[0]
        }
        console.log('asset', asset)
        
        return asset
    },
    async editAsset(input, libraries, ctx) {
        let { PlatformApi, UiUtils } = libraries
        let iaf_asset_collection = PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        console.log('input', input)
        let res = {
            success: true,
            message: '',
            result: []
        }
        if (!_.isEmpty(input.entityInfo.new['Asset Name'])) {
            let findasset = await PlatformApi.IafScriptEngine.findInCollections({
                query: { "Asset Name": input.entityInfo.new['Entity Name'] },
                collectionDesc: {
                    _userType: iaf_asset_collection._userType,
                    _userItemId: iaf_asset_collection._userItemId
                },
                options: { page: { _pageSize: 10, getPageInfo: true } }
            }, ctx)
            let updateOK
            if (findasset._total > 0) {
                if (findasset._list[0]._id == input.entityInfo.new._id) {
                    updateOK = true
                } else {
                    updateOK = false
                }
            } else {
                updateOK = true
            }
            if (updateOK) {
                let updatedItemArray = [{
                    _id: input.entityInfo.new._id,
                    "Asset Name": input.entityInfo.new['Entity Name'],
                    properties: input.entityInfo.new.properties
                }]
                let updateItemResult = await PlatformApi.IafScriptEngine.updateItemsBulk({
                    _userItemId: iaf_asset_collection._userItemId,
                    _namespaces: IAF_workspace._namespaces,
                    items: updatedItemArray
                }, ctx);
                let updateRes = updateItemResult[0][0]
                if (updateRes === 'ok: 204') {
                    res.success = true
                    res.result = updateRes
                } else {
                    res.success = false
                    res.message = "Error updating Asset!"
                }
            } else {
                res.success = false
                res.message = "Asset with same name already exists!"
            }
        } else {
            res.success = false
            res.message = "Required Properties (Asset Name) are missing values!"
        }
        return res
    },
    async getMatterportConfig(input, libraries, ctx, callback) {
        if (input.entityInfo.properties['Matterport Url'].val) return { url: input.entityInfo.properties['Matterport Url'].val }
        else return null
    },
    async getAssetImage(input, libraries, ctx, callback) {
        if (input.entityInfo.properties['Image Url'].val) return { url: input.entityInfo.properties['Image Url'].val }
        else return null
    },
    async getAssetSpecificationData(input, libraries, ctx, callback) {
        let { PlatformApi } = libraries;
        let iaf_asset_collection = PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let iaf_dt_spec_data_coll = PlatformApi.IafScriptEngine.getVar('iaf_dt_spec_data_coll')
        let data_query = {
            query:
            {
                parent: {
                    query: { _id: input.entityInfo._id },
                    collectionDesc: { _userType: iaf_asset_collection._userType, _userItemId: iaf_asset_collection._userItemId },
                    options: {
                        page: { getAllItems: true },
                        project: { _id: 1 }
                    }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: iaf_dt_spec_data_coll._userType },
                        as: "extendedData",
                        options: {
                            project: { properties: 1 }
                        }
                    }
                ]
            }
        }
        let asset_extended_data = await PlatformApi.IafScriptEngine.findWithRelated(data_query.query, ctx)
        let tableDataWithHeader = {}
        if (asset_extended_data._list[0].extendedData._list.length > 0) {
            let propsForTable = Object.values(asset_extended_data._list[0].extendedData._list[0].properties)
            let sortedPropsForTable = _.sortBy(propsForTable, prop => prop.dName)
            let header = [['', '', '']]
            let tableData = sortedPropsForTable.map(prop => {
                return [
                    prop.dName,
                    prop.uom ? prop.uom : [],
                    prop.val
                ]
            })
            console.log('tableData', tableData)
            tableDataWithHeader = header.concat(tableData)
            console.log('tableDataWithHeader', tableDataWithHeader)
        } else {
            tableDataWithHeader = []
        }
        return tableDataWithHeader
    },
    async getAssetInstallerData(input, libraries, ctx, callback) {
        let { PlatformApi } = libraries;
        let iaf_asset_collection = PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let iaf_dt_installer_coll = PlatformApi.IafScriptEngine.getVar('iaf_dt_installer_coll')
        let data_query = {
            query:
            {
                parent: {
                    query: { _id: input.entityInfo._id },
                    collectionDesc: { _userType: iaf_asset_collection._userType, _userItemId: iaf_asset_collection._userItemId },
                    options: {
                        page: { getAllItems: true },
                        project: { _id: 1 }
                    }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: iaf_dt_installer_coll._userType },
                        as: "extendedData",
                        options: {
                            project: { properties: 1 }
                        }
                    }
                ]
            }
        }
        let asset_extended_data = await PlatformApi.IafScriptEngine.findWithRelated(data_query.query, ctx)
        let tableDataWithHeader = {}
        if (asset_extended_data._list[0].extendedData._list.length > 0) {
            let propsForTable = Object.values(asset_extended_data._list[0].extendedData._list[0].properties)
            let sortedPropsForTable = _.sortBy(propsForTable, prop => prop.dName)
            let header = [['', '', '']]
            let tableData = sortedPropsForTable.map(prop => {
                return [
                    prop.dName,
                    prop.uom ? prop.uom : [],
                    prop.val
                ]
            })
            console.log('tableData', tableData)
            tableDataWithHeader = header.concat(tableData)
            console.log('tableDataWithHeader', tableDataWithHeader)
        } else {
            tableDataWithHeader = []
        }
        return tableDataWithHeader
    },
    async getAssetIronmongeryData(input, libraries, ctx, callback) {
        let { PlatformApi } = libraries;
        let iaf_asset_collection = PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let iaf_dt_iron_data_coll = PlatformApi.IafScriptEngine.getVar('iaf_dt_iron_data_coll')
        console.log('getAssetIronmongeryData iaf_dt_iron_data_coll', iaf_dt_iron_data_coll)
        let data_query = {
            query:
            {
                parent: {
                    query: { _id: input.entityInfo._id },
                    collectionDesc: { _userType: iaf_asset_collection._userType, _userItemId: iaf_asset_collection._userItemId },
                    options: {
                        page: { getAllItems: true },
                        project: { _id: 1 }
                    }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: iaf_dt_iron_data_coll._userType },
                        as: "extendedData",
                        options: {
                            project: { properties: 1 }
                        }
                    }
                ]
            }
        }
        let asset_extended_data = await PlatformApi.IafScriptEngine.findWithRelated(data_query.query, ctx)
        console.log('getAssetIronmongeryData asset_extended_data', asset_extended_data)
        let tableDataWithHeader = []
        if (asset_extended_data._list[0].extendedData._list.length > 0) {
            let propsForTable = Object.values(asset_extended_data._list[0].extendedData._list[0].properties)
            console.log('getAssetIronmongeryData propsForTable', propsForTable)
            let sortedPropsForTable = _.sortBy(propsForTable, prop => prop.dName)
            console.log('getAssetIronmongeryData sortedPropsForTable', sortedPropsForTable)
            let header = [['', '', '']]
            let tableData = sortedPropsForTable.map(prop => {
                console.log('prop', prop)
                return [
                    prop.dName,
                    prop.val ? prop.val : '',
                    prop.type,
                ]
            })
            console.log('getAssetIronmongeryData tableData', tableData)

            tableDataWithHeader = header.concat(tableData)
        } else {
            tableDataWithHeader = []
        }
        return tableDataWithHeader
    },
    async getAssetSupplierData(input, libraries, ctx, callback) {
        let { PlatformApi } = libraries;
        let iaf_asset_collection = PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let iaf_dt_sup_data_coll = PlatformApi.IafScriptEngine.getVar('iaf_dt_sup_data_coll')
        let data_query = {
            query:
            {
                parent: {
                    query: { _id: input.entityInfo._id },
                    collectionDesc: { _userType: iaf_asset_collection._userType, _userItemId: iaf_asset_collection._userItemId },
                    options: {
                        page: { getAllItems: true },
                        project: { _id: 1 }
                    }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: iaf_dt_sup_data_coll._userType },
                        as: "extendedData",
                        options: {
                            project: { properties: 1 }
                        }
                    }
                ]
            }
        }
        let asset_extended_data = await PlatformApi.IafScriptEngine.findWithRelated(data_query.query, ctx)
        let tableDataWithHeader = {}
        if (asset_extended_data._list[0].extendedData._list.length > 0) {
            let propsForTable = Object.values(asset_extended_data._list[0].extendedData._list[0].properties)
            let sortedPropsForTable = _.sortBy(propsForTable, prop => prop.dName)
            let header = [['', '', '']]
            let tableData = sortedPropsForTable.map(prop => {
                return [
                    prop.dName,
                    prop.uom ? prop.uom : [],
                    prop.val
                ]
            })
            console.log('tableData', tableData)
            tableDataWithHeader = header.concat(tableData)
            console.log('tableDataWithHeader', tableDataWithHeader)
        } else {
            tableDataWithHeader = []
        }
        return tableDataWithHeader
    },
    async getAssetTraceabilityData(input, libraries, ctx, callback) {
        let { PlatformApi } = libraries;
        let iaf_asset_collection = PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let iaf_dt_trace_coll = PlatformApi.IafScriptEngine.getVar('iaf_dt_trace_coll')
        console.log('iaf_dt_trace_coll', iaf_dt_trace_coll)
        let data_query = {
            query:
            {
                parent: {
                    query: { _id: input.entityInfo._id },
                    collectionDesc: { _userType: iaf_asset_collection._userType, _userItemId: iaf_asset_collection._userItemId },
                    options: {
                        page: { getAllItems: true },
                        project: { _id: 1 }
                    }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: iaf_dt_trace_coll._userType },
                        as: "extendedData",
                        options: {
                            project: { properties: 1 }
                        }
                    }
                ]
            }
        }
        let asset_extended_data = await PlatformApi.IafScriptEngine.findWithRelated(data_query.query, ctx)
        let tableDataWithHeader = {}
        if (asset_extended_data._list[0].extendedData._list.length > 0) {
            let propsForTable = Object.values(asset_extended_data._list[0].extendedData._list[0].properties)
            console.log('propsForTable', propsForTable)
            let sortedPropsForTable = _.sortBy(propsForTable, prop => prop)
            console.log('sortedPropsForTable', sortedPropsForTable)
            let header = [['', 'Units']]
            let datas = asset_extended_data._list[0].extendedData._list.map(externalData => { return Object.values(externalData.properties) })
            let propNames = datas[0].map(data => { return data.k })
            let units = datas[0].map(data => { return data.v.uom })
            let dataArrays = datas.map(data => {
                return data.map(d => d.v.val)
            })
            let zipped
            if (dataArrays.length == 4) {
                zipped = _.zip(propNames, units, dataArrays[0], dataArrays[1], dataArrays[2], dataArrays[3])
            } else if (dataArrays.length == 3) {
                zipped = _.zip(propNames, units, dataArrays[0], dataArrays[1], dataArrays[2])
            } else if (dataArrays.length == 2) {
                zipped = _.zip(propNames, units, dataArrays[0], dataArrays[1])
            } else {
                zipped = _.zip(propNames, units, dataArrays[0])
            }
            tableDataWithHeader = header.concat(zipped)
        } else {
            tableDataWithHeader = []
        }
        return tableDataWithHeader
    },
    async getAssetWarrantyData(input, libraries, ctx, callback) {
        let { PlatformApi } = libraries;
        let iaf_asset_collection = PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let iaf_dt_warranty_coll = PlatformApi.IafScriptEngine.getVar('iaf_dt_warranty_coll')
        let data_query = {
            query:
            {
                parent: {
                    query: { _id: input.entityInfo._id },
                    collectionDesc: { _userType: iaf_asset_collection._userType, _userItemId: iaf_asset_collection._userItemId },
                    options: {
                        page: { getAllItems: true },
                        project: { _id: 1 }
                    }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: iaf_dt_warranty_coll._userType },
                        as: "extendedData",
                        options: {
                            project: { properties: 1 }
                        }
                    }
                ]
            }
        }
        let asset_extended_data = await PlatformApi.IafScriptEngine.findWithRelated(data_query.query, ctx)
        let tableDataWithHeader = []
        if (asset_extended_data._list[0].extendedData._list.length > 0) {
            let propsForTable = Object.values(asset_extended_data._list[0].extendedData._list[0].properties)
            console.log('propsForTable', propsForTable)
            let sortedPropsForTable = _.sortBy(propsForTable, prop => prop)
            console.log('sortedPropsForTable', sortedPropsForTable)
            let header = [['', '', '']]
            let tableData = sortedPropsForTable.map(prop => {
                return [
                    prop.dName,
                    prop.uom,
                    prop.val
                ]
            })
            tableDataWithHeader = header.concat(tableData)
        } else {
            tableDataWithHeader = []
        }
        return tableDataWithHeader
    },
    async getAssetCommTestData(input, libraries, ctx, callback) {
        let { PlatformApi } = libraries;
        let iaf_asset_collection = PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let iaf_dt_commtest_coll = PlatformApi.IafScriptEngine.getVar('iaf_dt_commtest_coll')
        let data_query = {
            query:
            {
                parent: {
                    query: { _id: input.entityInfo._id },
                    collectionDesc: { _userType: iaf_asset_collection._userType, _userItemId: iaf_asset_collection._userItemId },
                    options: {
                        page: { getAllItems: true },
                        project: { _id: 1 }
                    }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: iaf_dt_commtest_coll._userType },
                        as: "extendedData",
                        options: {
                            project: { properties: 1 }
                        }
                    }
                ]
            }
        }
        let asset_extended_data = await PlatformApi.IafScriptEngine.findWithRelated(data_query.query, ctx)
        let tableDataWithHeader = {}
        if (asset_extended_data._list[0].extendedData._list.length > 0) {
            let propsForTable = Object.values(asset_extended_data._list[0].extendedData._list[0].properties)
            console.log('propsForTable', propsForTable)
            let sortedPropsForTable = _.sortBy(propsForTable, prop => prop)
            console.log('sortedPropsForTable', sortedPropsForTable)
            let headers = [['', 'Units']]
            asset_extended_data._list[0].extendedData._list.map(externalData => { return headers.concat(externalData.date.val) })
            let datas = asset_extended_data._list[0].extendedData._list.map(externalData => Object.values(externalData.measures))
            let propNames = datas[0].map(data => { return data.k })
            let units = datas[0].map(data => { return data.v.uom })
            let dataArrays = datas.map(data => {
                return data.map(d => d.v.val)
            })
            let zipped
            if (dataArrays.length == 2) {
                zipped = _.zip(propNames, units, dataArrays[0], dataArrays[1])
            } else {
                zipped = _.zip(propNames, units, dataArrays[0])
            }
            tableDataWithHeader = headers.concat(zipped)
        } else {
            tableDataWithHeader = []
        }
        return tableDataWithHeader
    },
    async getRealtimeAssetPointReadings(input, libraries, ctx, callback) {
        let { PlatformApi } = libraries;
        console.log('getRealtimeAssetPointReadings input', input)
        let iaf_asset_collection = PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let iaf_bms_collection = PlatformApi.IafScriptEngine.getVar('iaf_bms_collection')
        let datasources = PlatformApi.IafScriptEngine.getVar('datasources')
        console.log('getRealtimeAssetPointReadings datasources', datasources)
        let skysparkRealtimeDatasource = datasources.find(source => source._name === "skyspark REALTIME")
        console.log('getRealtimeAssetPointReadings skysparkRealtimeDatasource', skysparkRealtimeDatasource)
        let data_query = {
            query:
            {
                parent: {
                    query: { _id: input.entityInfo._id },
                    collectionDesc: { _userType: iaf_asset_collection._userType, _userItemId: iaf_asset_collection._userItemId },
                    options: {
                        page: { getAllItems: true },
                        project: { _id: 1 }
                    }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: iaf_bms_collection._userType },
                        as: "bmsequipment",
                        options: {
                            project: { _id: 1, id: 1, "ipa_data.properties.Display Points.val": 1 }
                        }
                    }
                ]
            }
        }
        let asset_bms = await PlatformApi.IafScriptEngine.findWithRelated(data_query.query, ctx)
        console.log('getRealtimeAssetPointReadings asset_bms', asset_bms)

        let equip = asset_bms._list[0].bmsequipment._list[0]
        let pointsToFetch
        if (equip.ipa_data.properties['Display Points'].val === 'All' || equip.ipa_data.properties['Display Points'].val === 'ALL' || equip.ipa_data.properties['Display Points'].val === 'all') {
            pointsToFetch = "ALL"
        } else if (!equip.ipa_data.properties['Display Points'].val || equip.ipa_data.properties['Display Points'].val === 'All' || equip.ipa_data.properties['Display Points'].val === 'ALL' || equip.ipa_data.properties['Display Points'].val === 'all') {
            pointsToFetch = "NONE"
        } else {
            pointsToFetch = "SOME"
        }
        let pointNavNames = equip.ipa_data.properties['Display Points'].val.split(',').map(navName => navName)
        let orchRes
        let filteredPoints
        console.log('getRealtimeAssetPointReadings pointNavNames', pointNavNames)
        console.log('getRealtimeAssetPointReadings pointsToFetch', pointsToFetch)

        if (pointsToFetch === 'NONE') {
            orchRes = null
        } else {

            console.log('getRealtimeAssetPointReadings else pointstofetch')
            orchRes = await PlatformApi.IafScriptEngine.runDatasource({
                orchestratorId: skysparkRealtimeDatasource.id,
                _actualparams: [{
                    sequence_type_id: skysparkRealtimeDatasource.orchsteps[0]._compid,
                    params: {
                        action: "readall",
                        cmd: `point and equipRef == @${equip.id.value}`
                    }
                }]
            }, ctx)
            console.log('getRealtimeAssetPointReadings orchRes', orchRes)

            if (orchRes) {
                if (pointsToFetch === 'ALL') {
                    filteredPoints = { points: orchRes._result.readall }
                }
            } else {
                filteredPoints = { points: orchRes._result.readall.filter(point => pointNavNames.map(name => name === point)) }
            }
            console.log('getRealtimeAssetPointReadings filteredPoints', filteredPoints)

        }
        return filteredPoints
    },
    async getAssetSubComponent(input, libraries, ctx, callback) {
        let { PlatformApi } = libraries;
        console.log ("getAssetSubComponent", input)
        let iaf_asset_collection = PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        console.log("iaf_asset_collection", iaf_asset_collection)
        let compQuery = [{
            parent: {
                query: { _id: input.entityInfo._id },
                collectionDesc: { _userType: iaf_asset_collection._userType, _userItemId: iaf_asset_collection._userItemId },
                options: { page: { getAllItems: true } },
                sort: { _id: 1 }
            },
            related: [
                {
                    relatedDesc: { _relatedUserType: iaf_asset_collection._userType },
                    as: 'assetSubComponents',
                }
            ]
        }]
        console.log("compQuery", compQuery)
        let queryResults = await PlatformApi.IafScriptEngine.findWithRelatedMulti(compQuery, ctx)
        console.log ("getAssetSubComponent-queryResults", queryResults)
        let subComponents = queryResults[0]._list[0].assetSubComponents._list
        console.log ("getAssetSubComponent-subComponents", subComponents)
        return subComponents
    },
    async getAssetParentComponent(input, libraries, ctx, callback) {
        let { PlatformApi } = libraries;
        let iaf_asset_collection = PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let compQuery = [{
            parent: {
                query: { _id: input.entityInfo._id },
                collectionDesc: { _userType: iaf_asset_collection._userType, _userItemId: iaf_asset_collection._userItemId },
                options: { page: { getAllItems: true } },
                sort: { _id: 1 }
            },
            related: [
                {
                    relatedDesc: { _relatedUserType: iaf_asset_collection._userType, _isInverse: true },
                    as: 'assetSubComponents',
                }
            ]
        }]
        let queryResults = await PlatformApi.IafScriptEngine.findWithRelatedMulti(compQuery, ctx)
        let subComponents = queryResults[0]._list[0].assetSubComponents._list
        return subComponents
    },
    async getCollectionsForAsset(input, libraries, ctx, callback) {
        let { PlatformApi } = libraries;
        let iaf_asset_collection = PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let iaf_collections = PlatformApi.IafScriptEngine.getVar('iaf_collections')
        let collQuery = [{
            parent: {
                query: { _id: input.entityInfo._id },
                collectionDesc: { _userType: iaf_asset_collection._userType, _userItemId: iaf_asset_collection._userItemId },
                options: { page: { getAllItems: true } },
                sort: { _id: 1 }
            },
            related: [
                {
                    relatedDesc: { _relatedUserType: iaf_collections._userType, _isInverse: true },
                    as: 'assetCollections',
                }
            ]
        }]
        let queryResults = await PlatformApi.IafScriptEngine.findWithRelatedMulti(collQuery, ctx)
        let collections = queryResults[0]._list[0].assetCollections._list
        return collections
    },
    async getDocumentsForAsset(input, libraries, ctx, callback) {
        let { PlatformApi } = libraries;
        let iaf_asset_collection = PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let assetDoc_query = {
            query:
            {
                parent: {
                    query: { _id: input.entityInfo._id },
                    collectionDesc: { _userType: iaf_asset_collection._userType, _userItemId: iaf_asset_collection._userItemId },
                    options: { page: { getAllItems: true } }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: "file_container" },
                        as: "documents",
                        options: { page: { getAllItems: true } }
                    }
                ]
            }
        }
        let IAF_assetdoc_res = await PlatformApi.IafScriptEngine.findWithRelated(assetDoc_query.query, ctx)
        let documentsForAsset = IAF_assetdoc_res._list[0].documents._list
        return documentsForAsset
    },
    async getAssetContractorData(input, libraries, ctx, callback) {
        let { PlatformApi } = libraries;
        let iaf_asset_collection = PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let iaf_dt_contractor_coll = PlatformApi.IafScriptEngine.getVar('iaf_dt_contractor_coll')
        let data_query = {
            query:
            {
                parent: {
                    query: { _id: input.entityInfo._id },
                    collectionDesc: { _userType: iaf_asset_collection._userType, _userItemId: iaf_asset_collection._userItemId },
                    options: {
                        page: { getAllItems: true },
                        project: { _id: 1 }
                    }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: iaf_dt_contractor_coll._userType },
                        as: "extendedData",
                        options: {
                            project: { properties: 1 }
                        }
                    }
                ]
            }
        }
        let asset_extended_data = await PlatformApi.IafScriptEngine.findWithRelated(data_query.query, ctx)
        let tableDataWithHeader = {}
        if (asset_extended_data._list[0].extendedData._list.length > 0) {
            let propsForTable = Object.values(asset_extended_data._list[0].extendedData._list[0].properties)
            let sortedPropsForTable = _.sortBy(propsForTable, prop => prop.dName)
            let header = [['', '', '']]
            let tableData = sortedPropsForTable.map(prop => {
                return [
                    prop.dName,
                    prop.uom ? prop.uom : [],
                    prop.val
                ]
            })
            console.log('tableData', tableData)
            tableDataWithHeader = header.concat(tableData)
            console.log('tableDataWithHeader', tableDataWithHeader)
        } else {
            tableDataWithHeader = []
        }
        return tableDataWithHeader
    },
    async getTypesOfAssetForCategory(input, libraries, ctx, callback) {
        console.log("input", input)
        let { PlatformApi } = libraries
        let iaf_asset_collection = await PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let distinctTypes = await PlatformApi.IafScriptEngine.getDistinct({
            collectionDesc: { _userType: iaf_asset_collection._userType, _id: iaf_asset_collection._id },
            field: 'properties.dtType.val',
            query: { "properties.dtCategory.val": input.input.dtCategory }
        }, ctx)
        console.log('distinctTypes', distinctTypes)
        let sortedTypes = _.sortBy(distinctTypes, type => type)
        console.log('getTypesOfAssetForCategory sortedTypes', sortedTypes)
        return sortedTypes
    },

}
export default entass
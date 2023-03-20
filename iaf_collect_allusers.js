let collect = {
    //this is failinng somehow I dont know if bms data is already created
    async getCollectionTypes(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_collections = await PlatformApi.IafScriptEngine.getVar('iaf_collections')
        let collectionTypes = await PlatformApi.IafScriptEngine.getDistinct({
            collectionDesc: { _userType: iaf_collections._userType, _id: iaf_collections._id },
            field: 'properties.Type.val',
            options: { getCollInfo: true } //we need this to workaround a bug in expressions
        }, ctx)
        let collectionType = { Type: collectionTypes?._list[0]._versions[0]._relatedItems['properties.Type.val'] }

        return collectionType
    },
    async getAssetCollectionTypes(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_collections = await PlatformApi.IafScriptEngine.getVar('iaf_collections')
        let collectionTypes = await PlatformApi.IafScriptEngine.getDistinct({
            collectionDesc: { _userType: iaf_collections._userType, _id: iaf_collections._id },
            field: 'properties.Type.val',
            query: {'properties.Entity Types.val': 'Asset' },
            options: { getCollInfo: true } //we need this to workaround a bug in expressions
        }, ctx)
        let collectionType = collectionTypes._list[0]._versions[0]._relatedItems['properties.Type.val']

        return { collectionTypes, collectionType }
    },
    async getDocumentCollectionTypes(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_collections = await PlatformApi.IafScriptEngine.getVar('iaf_collections')
        let collectionTypes = await PlatformApi.IafScriptEngine.getDistinct({
            collectionDesc: { _userType: iaf_collections._userType, _id: iaf_collections._id },
            field: "properties.Type.val",
            query: { "properties.Entity Types.val": "File" },
            options: { getCollInfo: true } //we need this to workaround a bug in expressions
        }, ctx)
        let collectionType = collectionTypes._list[0]._versions[0]._relatedItems['properties.Type.val']

        return { collectionTypes, collectionType }
    },
    async getCollectionTypesFlatAsset(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_collections = await PlatformApi.IafScriptEngine.getVar('iaf_collections')
        let collectionTypes = await PlatformApi.IafScriptEngine.getDistinct({
            collectionDesc: { _userType: iaf_collections._userType, _id: iaf_collections._id },
            field: "properties.Type.val",
            query: { "properties.Entity Types.val": "Asset" },
            options: { getCollInfo: true } //we need this to workaround a bug in expressions
        }, ctx)
        let collectionType = collectionTypes._list[0]._versions[0]._relatedItems['properties.Type.val']
        console.log('getCollectionTypesFlatAsset collectionType', collectionType)
        return collectionType
    },
    async getCollectionTypesFlatDocument(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_collections = await PlatformApi.IafScriptEngine.getVar('iaf_collections')
        let collectionTypes = await PlatformApi.IafScriptEngine.getDistinct({
            collectionDesc: { _userType: iaf_collections._userType, _id: iaf_collections._id },
            field: "properties.Type.val",
            query: { "properties.Entity Types.val": "File" },
            options: { getCollInfo: true } //we need this to workaround a bug in expressions
        }, ctx)
        collectionTypes = collectionTypes._list[0]._versions[0]._relatedItems['properties.Type.val']

        return collectionTypes
    },
    async getCollectionNames(input, libraries, ctx) {
        console.log('input', input)
        let { PlatformApi } = libraries
        let iaf_collections = await PlatformApi.IafScriptEngine.getVar('iaf_collections')
        let collectionNames = []
        let finalNames = { "Collection Name": collectionNames }
        if (!_.isEmpty(input)) {
            if (!_.isEmpty(input.filterInfo) && !_.isEmpty(input.filterInfo.query)) {
                collectionNames = await PlatformApi.IafScriptEngine.getDistinct({
                    collectionDesc: { _userType: iaf_collections._userType, _id: iaf_collections._id },
                    field: "Collection Name",
                    query: input.filterInfo.query,
                    options: { getCollInfo: true } //we need this to workaround a bug in expressions
                }, ctx)
                finalNames = { "Collection Name": collectionNames._list[0]._versions[0]._relatedItems['Collection Name'] }
            } else if (!_.isEmpty(input.input)) {
                collectionNames = await PlatformApi.IafScriptEngine.getDistinct({
                    collectionDesc: { _userType: iaf_collections._userType, _id: iaf_collections._id },
                    field: "Collection Name",
                    query: { 'properties.Type.val': input.input['Collection Type'] },
                    options: { getCollInfo: true } //we need this to workaround a bug in expressions
                }, ctx)
                finalNames = collectionNames._list[0]._versions[0]._relatedItems['Collection Name']
            }
        }
        console.log('finalNames', finalNames)
        return finalNames
    },
    async addAssetsToCollections(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_collections = await PlatformApi.IafScriptEngine.getVar('iaf_collections')
        let iaf_asset_collection = await PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        let collectionQueries = input.entityInfo.collections.map(colInfo => {
            return {
                query: { "Collection Name": colInfo.name, "properties.Type.val": colInfo.type },
                _userItemId: iaf_collections._userItemId,
                options: { page: { getAllItems: true } }
            }
        })
        let collectionItems = await PlatformApi.IafScriptEngine.getItemsMulti(collectionQueries, ctx);
        let flatItems = _.flatten(collectionItems)
        //need to test the following includes
        console.log('flatItems', flatItems)
        let createTheseCollections = input.entityInfo.collections.filter(colInfo => !flatItems.includes(colInfo.name && colInfo.type));
        console.log('createTheseCollections', createTheseCollections)
        let newCollections = createTheseCollections.map(coll => {
            return {
                "Collection Name": coll.name,
                public: true,
                properties: {
                    Type: {
                        val: coll.type,
                        type: "text",
                        dName: "Type"
                    },
                    "Entity Types": {
                        val: ["Asset"],
                        type: "tags",
                        dName: "Entity Types"
                    }
                }
            }
        })
        console.log('newCollections', newCollections)
        let createCollResult = await PlatformApi
            .IafScriptEngine.createItemsBulk({
                _userItemId: iaf_collections._userItemId,
                _namespaces: IAF_workspace._namespaces,
                items: newCollections
            }, ctx);

        console.log('createCollResult', createCollResult)
        let flatCollResult = _.flatten(createCollResult)
        console.log('flatCollResult', flatCollResult)
        let existingIds = flatItems.map(ex => {
            console.log('ex', ex)
            return ex._id
        })
        console.log('existingIds', existingIds)
        let newIds = flatCollResult[0]._uris.map(newUri => {
            console.log('newUri', newUri)
            return newUri.split('/')[4]
        })
        console.log('newIds', newIds)
        let allIds = existingIds.concat(newIds)
        console.log('allIds', allIds)
        let assetIds = input.entityInfo.entities.map(file => { return { _id: file._id } })
        console.log('documentIds', assetIds)
        let relatedItems = allIds.map(coll => { return { parentItem: { _id: coll }, relatedItems: assetIds } })
        console.log('relatedItems', relatedItems)
        let relations = {
            parentUserItemId: iaf_collections._userItemId,
            _userItemId: iaf_asset_collection._userItemId,
            _namespaces: IAF_workspace._namespaces,
            relations: relatedItems
        }
        console.log('relations', relations)
        let relationResult = await PlatformApi.IafScriptEngine.createRelations(relations, ctx);
        console.log('relationResult', relationResult)
        let final = { success: true }
        return final
    },
    async addDocumentsToCollections(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_collections = await PlatformApi.IafScriptEngine.getVar('iaf_collections')
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        let collectionQueries = input.entityInfo.collections.map(colInfo => {
            return {
                query: { "Collection Name": colInfo.name, "properties.Type.val": colInfo.type },
                _userItemId: iaf_collections._userItemId,
                options: { page: { getAllItems: true } }
            }
        })
        let collectionItems = await PlatformApi.IafScriptEngine.getItemsMulti(collectionQueries, ctx);
        let flatItems = _.flatten(collectionItems)
        //need to test the following includes
        let createTheseCollections = input.entityInfo.collections.filter(colInfo => !flatItems.includes(colInfo.name && colInfo.type));
        let newCollections = createTheseCollections.map(coll => {
            return {
                "Collection Name": coll.name,
                public: true,
                properties: {
                    Type: {
                        val: coll.type,
                        type: "text",
                        dName: "Type"
                    },
                    "Entity Types": {
                        val: ["File"],
                        type: "tags",
                        dName: "Entity Types"
                    }
                }
            }
        })
        const createCollResult = await PlatformApi
            .IafScriptEngine.createItemsBulk({
                _userItemId: iaf_collections._userItemId,
                _namespaces: IAF_workspace._namespaces,
                items: newCollectionItems
            }, ctx);
        let flatCollResult = _.flatten(createCollResult)
        let existingIds = flatCollResult.map(ex => ex._id)
        let newIds = flatCollResult[0]._uris.map(newUri => newUri.split('/', 1))
        let allIds = existingIds.concat(newIds)
        let documentIds = input.entityInfo.entities.map(file => file._id)
        let relatedItems = allIds.map(coll => { return { parentItem: coll, realatedItems: documentIds } })
        let relationResult = await PlatformApi.IafScri2ptEngine.createRelations({
            parentUserItemId: iaf_collections._userItemId,
            _userItemId: iaf_ext_files_coll._userItemId,
            _namespaces: IAF_workspace._namespaces,
            relations: relatedItems
        }, ctx);
        return relationResult
    },
    async getAssetsForCollections(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_collections = await PlatformApi.IafScriptEngine.getVar('iaf_collections')
        let iaf_asset_collection = await PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let colType = input.entityInfo['Collection Type'][0]
        console.log('colType', colType)
        let hasNames = input.entityInfo['Collection Name'][0]
        console.log('hasNames', hasNames)
        let collectionQueries = {}
        if (hasNames) {
            collectionQueries = input.entityInfo['Collection Name'].map(name => {
                return {
                    parent: {
                        query: { 'Collection Name': name, 'properties.Type.val': colType },
                        collectionDesc: { _userType: iaf_collections._userType, _userItemId: iaf_collections._userItemId },
                        options: { page: { getAllItems: true } }
                    },
                    related: [
                        {
                            relatedDesc: { _relatedUserType: iaf_asset_collection._userType },
                            options: { page: { getAllItems: true } },
                            as: 'Assets'
                        }
                    ]
                }
            })
        } else {
            collectionQueries = input.entityInfo['Collection Type'].map(type => {
                return {
                    parent: {
                        query: { "properties.Type.val": type },
                        collectionDesc: { _userType: iaf_collections._userType, _userItemId: iaf_collections._userItemId },
                        options: { page: { getAllItems: true } }
                    },
                    related: [
                        {
                            relatedDesc: { _relatedUserType: iaf_asset_collection._userType },
                            options: { page: { getAllItems: true } },
                            as: 'Assets'
                        }
                    ]

                }
            })
        }
        console.log('collectionQueries', collectionQueries)
        let collectionItems = await PlatformApi.IafScriptEngine.findWithRelatedMulti(collectionQueries, ctx);
        console.log('collectionItems', collectionItems)
        let assetArrays = []
        if (hasNames) {
            assetArrays = _.flatten(collectionItems.map(response => response._list[0].Assets._list))
        } else {
            assetArrays = _.flatten(collectionItems[0]._list.map(response => response.Assets._list))
        }
        console.log('assetArrays', assetArrays)

        let assetsAsEntities = assetArrays.map((a) => {
            a.original = _.cloneDeep(a)
            a['Entity Name'] = a['Asset Name']
            //a.modelViewerIds = a.revitElementIds._list.map(e => e.package_id)
            return a
        })
        return assetsAsEntities
    },
    async getCollections(input, libraries, ctx) {
        let { PlatformApi } = libraries

        console.log("input", input.entityInfo)

        let iaf_collections = await PlatformApi.IafScriptEngine.getVar('iaf_collections')

        console.log("iaf_collections", JSON.stringify(iaf_collections))

        let entity_query = {
            query:
            {
                parent: {
                    query: input.entityInfo,
                    collectionDesc: { _userType: iaf_collections._userType, _userItemId: iaf_collections._userItemId },
                    options: { page: { getAllItems: true } }
                }
            }
        }

        console.log("entity_query", entity_query)

        let IAF_entity_res = await PlatformApi.IafScriptEngine.findWithRelated(entity_query.query, ctx);
        console.log('IAF_entity_res', IAF_entity_res)
        let IAF_entity_res_with_array = IAF_entity_res._list.map(result => { return { 'Entity Name': result['Collection Name'], ...result } })
        console.log('IAF_entity_res_with_array', IAF_entity_res_with_array)
        return IAF_entity_res_with_array
    },
    async getCategoryOfFiles(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
        let distinctFileCategories = await PlatformApi.IafScriptEngine.getDistinct({
            collectionDesc: { _userType: iaf_ext_files_coll._userType, _id: iaf_ext_files_coll._id },
            field: "fileAttributes.dtCategory",
            query: {}
        }, ctx)
        console.log('distinctFileCategories', distinctFileCategories)
        let sortedCategories = _.sortBy(distinctFileCategories, name => name)
        return sortedCategories
    },
    async getAssetsForCollectionExtendedData(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_collections = await PlatformApi.IafScriptEngine.getVar('iaf_collections')
        let assetQuery = {
            query: {
                parent: {
                    query: { "Collection Name": entityInfo['Entity Name'], "properties.Type.val": input.entityInfo.properties.Type.val },
                    collectionDesc: { _userType: iaf_collections._userType, _userItemId: iaf_collections._userItemId },
                    options: { page: { getAllItems: true } }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: iaf_asset_collection._userType },
                        options: { page: { getAllItems: true } },
                        as: 'Assets'
                    }
                ]
            }
        }
        let queryResult = await PlatformApi.IafScriptEngine.findWithRelated(assetQuery.query, ctx);
        console.log('queryResult', queryResult)
        return queryResult._list[0].Assets._list
    },
    async getDocumentsForCollectionExtendedData(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_collections = await PlatformApi.IafScriptEngine.getVar('iaf_collections')
        let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
        let assetQuery = {
            query: {
                parent: {
                    query: { "Collection Name": input.entityInfo['Entity Name'], "properties.Type.val": input.entityInfo.properties.Type.val },
                    collectionDesc: { _userType: iaf_collections._userType, _userItemId: iaf_collections._userItemId },
                    options: { page: { getAllItems: true } }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: iaf_ext_files_coll._userType },
                        options: { page: { getAllItems: true } },
                        as: 'Documents'
                    }
                ]
            }
        }
        let queryResult = await PlatformApi.IafScriptEngine.findWithRelated(assetQuery.query, ctx);
        console.log('queryResult', queryResult)
        return queryResult._list[0].Documents._list
    },
    async getCollectionRelatedEntities(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_collections = await PlatformApi.IafScriptEngine.getVar('iaf_collections')
        let iaf_asset_collection = await PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
        let queryResult = false
        let collectionType
        let related = []
        if (input.entityType === 'Assets') {
            collectionType = iaf_asset_collection
        } else if (input.entityType === 'Files') {
            collectionType = iaf_ext_files_coll
        }
        if (collectionType) {
            queryResult = await PlatformApi.IafScriptEngine.findWithRelated({
                parent: {
                    query: { _id: input.collection._id },
                    collectionDesc: { _userType: iaf_collections._userType, _userItemId: iaf_collections._userItemId },
                    options: { page: { getAllItems: true } },
                    project: { _id: 1 }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: collectionType._userType },
                        as: 'Relations'
                    }
                ]
            }, ctx);
        }
        if (collectionType && queryResult) {
            queryResult._list[0].Relations._list.map(rel => {
                return {
                    "Entity Name": input.entityType === "Assets" ? rel['Asset Name'] :
                        input.entityType === "Files" ? rel.name : "Missing Configuration for Relation Type"
                }
            })
        }
        return related
    },
    async editCollection(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_collections = await PlatformApi.IafScriptEngine.getVar('iaf_collections')
        let iaf_asset_collection = await PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')

        let res = {
            success: true,
            message: "",
            result: []
        }
        let minCollInfo = {
            "Collection Name": input.entityInfo.new['Entity Name'],
            properties: input.entityInfo.new.properties
        }
        let updatedCollArray = [minCollInfo]
        if (input.entityInfo.new['Entity Name'] && input.entityInfo.new.Type) {
            let findcoll = await PlatformApi.IafScriptEngine.findInCollections({
                query: { "Collection Name": input.entityInfo.new['Entity Name'], "properties.Type.val": input.entityInfo.new.properties.Type.val },
                collectionDesc: {
                    _userType: iaf_collections._userType,
                    _userItemId: iaf_collections._userItemId
                },
                options: { page: { _pageSize: 10, getPageInfo: true } }
            }, ctx)
            let updateOK
            if (findcoll._total > 0) {
                if (findcoll._list[0]._id == input.entityInfo.new._id) {
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
                    "Collection Name": input.entityInfo.new['Entity Name'],
                    properties: input.entityInfo.new.properties
                }]
                let updateItemResult = await PlatformApi.IafScriptEngine.updateItemsBulk({
                    _userItemId: iaf_collections._userItemId,
                    _namespaces: IAF_workspace._namespaces,
                    items: updatedItemArray
                }, ctx);
                let updateRes = updateItemResult[0][0]
                if (updateRes === 'ok: 204') {
                    res.success = true
                    res.result = updateRes
                } else {
                    res.success = false
                    res.message = "Error updating Collection!"
                }
            } else {
                res.success = false
                res.message = "Collection with same type/name already exists!"
            }

        } else {
            res.success = false
            res.message = "Required Properties (Collection Name, Type) are missing values!"

        }

        return related
    },
    async deleteCollections(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_collections = await PlatformApi.IafScriptEngine.getVar('iaf_collections')
        let res = { success: true, message: '', result: [] }
        console.log('input', input)
        let deleteCollectionArray = [input.entityInfo.original[0]._id]
        let deleteResult = await PlatformApi.IafScriptEngine.deleteItems({
            _userItemId: iaf_collections._userItemId,
            items: deleteCollectionArray
        }, ctx)
        console.log('deleteResult', deleteResult)
        res.success = true
        return res
    },

}

export default collect
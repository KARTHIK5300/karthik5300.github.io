
const getQueryParams =  data => {
    return data && data.params && data.params.query ? data.params.query : undefined
}
const getAssetCollection = async (input, libraries, context)  => {

    const {PlatformApi, IafScriptEngine} = libraries

    const iaf_asset_collection = await IafScriptEngine.getCollection(
        {
            _userType: "iaf_ext_asset_coll",
            _shortName: "asset_coll",
            _itemClass: "NamedUserCollection",
        }, context
    )

    return iaf_asset_collection
}

const getFileCollection = async (input, libraries, context)  => {
    const {IafScriptEngine} = libraries

    const iaf_file_collection = await IafScriptEngine.getFileCollection(
        {
            _userType: "file_container",
        }, context
    )
    console.log("get file collection completed")   
    return iaf_file_collection
}

const getSpaceCollection = async (input, libraries, context)  => {

    const {IafScriptEngine} = libraries

    const iaf_space_collection = await IafScriptEngine.getCollection(
        {
            _userType: "iaf_ext_space_coll",
            _shortName: "space_coll",
            _itemClass: "NamedUserCollection",
        }, context
    )

    return iaf_space_collection
}

const getAssetsData = async (input, libraries, context) => {
    const {PlatformApi, IafScriptEngine} = libraries
    const iaf_asset_collection = await getAssetCollection(input, libraries, context)
    console.log('iaf_asset_collection', iaf_asset_collection)
    if(!iaf_asset_collection) {
        console.log('Assets collection is missing.')
        return
    }
    const iaf_asset_res = await IafScriptEngine.findWithRelated(
        {
            parent: {
                query: input,
                collectionDesc: {
                    _userType: iaf_asset_collection._userType,
                    _userItemId: iaf_asset_collection._userItemId
                },
                options: {page: {getAllItems: true}}
            },
            related: [
                {
                    relatedDesc: {
                        _relatedUserType: "rvt_elements",
                    },
                    options: {project: {_id: 1, package_id: 1}},
                    as: 'revitElementIds'
                }
            ]
        }, context
    )
    console.log('iaf_asset_res', iaf_asset_res)

    if(!iaf_asset_res || !iaf_asset_res._list) {
        console.log('Assets not found.')
        return
    }

    const iaf_asset_res_with_array = iaf_asset_res._list.map(result => {
        result["Entity Name"] = result["Asset Name"]
        const modelViewerIds = result && result.revitElementIds && result.revitElementIds._list ?
            result.revitElementIds._list.map(elem => elem.package_id) : undefined
        result.modelViewerIds = modelViewerIds
        return result
    })
    console.log('iaf_asset_res_with_array', iaf_asset_res_with_array)

    return iaf_asset_res_with_array
}

const getSpacesData = async (input, libraries, context) => {
    const iaf_space_collection = await getSpaceCollection(input, libraries, context)
    console.log('iaf_space_collection', iaf_space_collection)
    const { IafScriptEngine } = libraries
    if(!iaf_space_collection) {
        console.log('Space collection is missing.')
        return
    }
    const iaf_space_res = await IafScriptEngine.findWithRelated(
        {
            parent: {
                query: input,
                collectionDesc: {
                    _userType: iaf_space_collection._userType,
                    _userItemId: iaf_space_collection._userItemId
                },
                options: {page: {getAllItems: true}}
            },
            related: [
                {
                    relatedDesc: {
                        _relatedUserType: "rvt_elements",
                    },
                    options: {project: {_id: 1, package_id: 1}},
                    as: 'revitElementIds'
                }
            ]
        }, context
    )
    console.log('iaf_space_res', iaf_space_res)

    if(!iaf_space_res || !iaf_space_res._list) {
        console.log('Spaces not found.')
        return
    }

    const iaf_space_res_with_array = iaf_space_res._list.map(result => {
        result["Entity Name"] = result["Space Name"]
        const modelViewerIds = result && result.revitElementIds && result.revitElementIds._list ?
            result.revitElementIds._list.map(elem => elem.package_id) : undefined
        result.modelViewerIds = modelViewerIds
        return result
    })
    console.log('iaf_space_res_with_array', iaf_space_res_with_array)

    return iaf_space_res_with_array
}

const getFilesData = async (input, libraries, context) => {
    const {IafScriptEngine} = libraries
    const iaf_file_collection = await getFileCollection(input, libraries, context)
    console.log('iaf_file_collection', iaf_file_collection)
    if(!iaf_file_collection) {
        console.log('File collection is missing.')
        return
    }
    const iaf_file_res = await IafScriptEngine.getFileItems(
        {
            query: input,
            collectionDesc: {
                _userType: iaf_file_collection._userType,
                _userItemId: iaf_file_collection._userItemId
            },
            options: {page: {getAllItems: true}}
         }, context
    )
    console.log('iaf_file_res_string', JSON.stringify(iaf_file_res))


    if(!iaf_file_res) {
        console.log('Files not found.')
        return
    }
    return iaf_file_res
}

const getExtendedData = async (input, libraries, context) => {
    const {IafScriptEngine} = libraries
    const params = input.params
    const iaf_asset_collection = await getAssetCollection(input, libraries, context)
    console.log('iaf_asset_collection')
    if(!iaf_asset_collection) {
        console.log('Assets collection is missing.')
        return
    }
    console.log("user type", JSON.stringify(params._userType))
    console.log("asset ID:", input.assetid)

    const iaf_asset_ext = await IafScriptEngine.findWithRelated(
        {
            parent: {
                query: {_id: input.assetid},
                collectionDesc: {
                    _userType: iaf_asset_collection._userType,
                    _userItemId: iaf_asset_collection._userItemId
                },
                options: {page: {getAllItems: true}}
            },
            related: [
                {
                    relatedDesc: { _relatedUserType: params._userType},
                    as: 'extendedData',
                    options: {page: {getAllItems: true}},
                    
                }
            ]
        }, context
    )

    if(!iaf_asset_ext || !iaf_asset_ext._list) {
        console.log('Assets not found.')
        return
    }

    if(!iaf_asset_ext._list[0].extendedData._list) {
        console.log('Extended data not found.')
        return
    }

    return iaf_asset_ext._list[0].extendedData._list[0].properties
}

const getAssetDocuments = async (input, libraries, context) => {
    const {IafScriptEngine} = libraries
    const iaf_asset_collection = await getAssetCollection(input, libraries, context)
    console.log('iaf_asset_collection')
    if(!iaf_asset_collection) {
        console.log('Assets collection is missing.')
        return
    }

    console.log("asset ID:", input.assetid)

    const iaf_asset_doc = await IafScriptEngine.findWithRelated(
        {
            parent: {
                query: {_id: input.assetid},
                collectionDesc: {
                    _userType: iaf_asset_collection._userType,
                    _userItemId: iaf_asset_collection._userItemId
                },
                options: {page: {getAllItems: true}}
            },
            related: [
                {
                    relatedDesc: { _relatedUserType: "file_container"},
                    as: 'documents',
                    options: {page: {getAllItems: true}},
                    
                }
            ]
        }, context
    )


    //console.log('list of documents', JSON.stringify(iaf_asset_doc._list[0]))

    if(!iaf_asset_doc) {
        console.log('Assets not found.')
        return
    }

    if(!iaf_asset_doc._list[0]) {
        console.log('No Documents Found')
        return
    }

    return iaf_asset_doc._list[0].documents
}

const getSpaceDocuments = async (input, libraries, context) => {
    const {IafScriptEngine} = libraries
    const iaf_space_collection = await getSpaceCollection(input, libraries, context)
    console.log('iaf_space_collection')
    if(!iaf_space_collection) {
        console.log('Space collection is missing.')
        return
    }

    console.log("space ID:", input.spaceid)

    const iaf_space_doc = await IafScriptEngine.findWithRelated(
        {
            parent: {
                query: {_id: input.spaceid},
                collectionDesc: {
                    _userType: iaf_space_collection._userType,
                    _userItemId: iaf_space_collection._userItemId
                },
                options: {page: {getAllItems: true}}
            },
            related: [
                {
                    relatedDesc: { _relatedUserType: "file_container"},
                    as: 'documents',
                    options: {page: {getAllItems: true}},
                    
                }
            ]
        }, context
    )
    
    //console.log('space documents', JSON.stringify(iaf_space_doc._list))

    if(!iaf_space_doc) {
        console.log('Spaces not found.')
        return
    }

    if(!iaf_space_doc._list[0]) {
        console.log('Documents not found.')
        return
    }

    return iaf_space_doc._list[0].documents._list
}

export default {

    async searchAssets(input, libraries, ctx) {
        return await getAssetsData( getQueryParams(input), libraries, ctx)
    },

    async getAssets(input, libraries, ctx) {
        return await getAssetsData( getQueryParams(input), libraries, ctx)
    },

    async extractAssetById(input, libraries, ctx) {
        const assetId = input.assetid
        console.log('assetId', assetId)
        return await getAssetsData({_id: assetId}, libraries, ctx)
    },

    async addAssets(input, libraries, ctx) {

        const {IafScriptEngine} = libraries
        const queryParams = input.params
        console.log("queryParams", queryParams)
        const iaf_asset_collection = await getAssetCollection(input, libraries, ctx)
        console.log('iaf_asset_collection', iaf_asset_collection)

        const assetsData = [{
            "Asset Name": queryParams["Entity Name"],
            properties: queryParams.properties
        }]
        console.log('assetsData', assetsData)
        
        let args = {
            items: assetsData,
            _userItemId: iaf_asset_collection._userItemId
        }

        const newAssets = await IafScriptEngine.createItems(args, ctx)
        console.log('newAssets', newAssets)

        return newAssets
    },

    async delAssets(input, libraries, ctx)  {
        const {IafScriptEngine} = libraries
        const iaf_asset_collection = await getAssetCollection(input, libraries, ctx)
        const assetId = input.assetid
        console.log('assetId', assetId)

        const deleteResult = await IafScriptEngine.deleteItems({
            _userItemId: iaf_asset_collection._userItemId,
            items: [assetId]
        }, ctx)
        return deleteResult
    },

    async editAssets(input, libraries, ctx) {
        let { IafScriptEngine } = libraries
        let iaf_asset_collection = await IafScriptEngine.getCollection(
            {
              _userType: "iaf_ext_asset_coll",
              _shortName: "asset_coll",
              _itemClass: "NamedUserCollection",
            }, ctx
       );
        console.log("iaf_asset_collection", iaf_asset_collection)
        const queryParams = input.params
        console.log('input', input)
        let res = {
            success: true,
            message: '',
            result: []
        }
        const assetName = queryParams["Entity Name"]
        console.log("assetName", assetName)
        if(!assetName) {
            result.message = "Asset Name is missing!"
            return result
        }
        let findasset = await IafScriptEngine.findInCollections({
            query: { "Asset Name": assetName },
            collectionDesc: {
                _userType: iaf_asset_collection._userType,
                _userItemId: iaf_asset_collection._userItemId,
            },
            options: { page: { _pageSize: 10, getPageInfo: true } }
        }, ctx)
        console.log("findasset", findasset)
        let updateOK
        let updateItemResult
        if (findasset._total > 0) {
            if (findasset._list[0]._id == input.assetid) {
                updateOK = true
            } else {
                updateOK = false
            }
        } else {
            updateOK = true
        }
        console.log("updateOK", updateOK)
        if (updateOK) {
            let updatedItemArray = [{
                _id: input.assetid,
                "Asset Name": assetName.trim(),
                properties: queryParams.properties
            }]
            console.log("updatedItemArray", updatedItemArray)
            updateItemResult = await IafScriptEngine.updateItemsBulk({
                _userItemId: iaf_asset_collection._userItemId,
                _namespaces: [queryParams.nsfilter],
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
        console.log("updateItemResult", updateItemResult)
        return res
    },

    async getAssetExtendedData(input, libraries, ctx) {
        return await getExtendedData(input, libraries, ctx)
    },

    async getDocumentsForAsset(input, libraries, ctx) {
        return await getAssetDocuments(input, libraries, ctx)
    },

    async getSpaces(input, libraries, ctx) {
        return await getSpacesData( getQueryParams(input), libraries, ctx)
    },

    async deleteSpace(input, libraries, ctx)  {
        const {IafScriptEngine} = libraries
        const iaf_space_collection = await getSpaceCollection(input, libraries, ctx)
        const spaceId = input.spaceid
        console.log('spaceId', spaceId)

        const deleteResult = await IafScriptEngine.deleteItems({
            _userItemId: iaf_space_collection._userItemId,
            items: [spaceId]
        }, ctx)
        return deleteResult
    },

    async getDocumentsForSpace(input, libraries, ctx) {
        return await getSpaceDocuments(input, libraries, ctx)
    },

    async getDocuments(input, libraries, ctx) {
        return await getFilesData(getQueryParams(input), libraries, ctx)
    },

    async deleteDocument(input, libraries, ctx)  {
        console.log('input', input)
        const {IafScriptEngine} = libraries
        const iaf_file_collection = await getFileCollection(input, libraries, ctx)
        const docId = input.documentid
        console.log('documentID', docId)

        const deleteResult = await IafScriptEngine.deleteItems({
            _userItemId: iaf_file_collection._userItemId,
            items: [docId]
        }, ctx)
        return deleteResult
    },
}


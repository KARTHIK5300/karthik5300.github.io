let systems = {
    async getAllSystems(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_systems_collection = await PlatformApi.IafScriptEngine.getVar('iaf_systems_collection')
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')

        console.log('input', input)
        let allSystems = await PlatformApi.IafScriptEngine.getItems({
            collectionDesc: {
                _userItemId: iaf_systems_collection._userItemId,
                _namespaces: IAF_workspace._namespaces
            },
            query: {},
            options: { page: { getAllItems: true } }
        }, ctx)

        return allSystems
    },
    async getSystemsAsEntities(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_systems_collection = await PlatformApi.IafScriptEngine.getVar('iaf_systems_collection')
        let iaf_system_elements_collection = await PlatformApi.IafScriptEngine.getVar('iaf_system_elements_collection')
        let iaf_space_collection = await PlatformApi.IafScriptEngine.getVar('iaf_space_collection')
        let iaf_asset_collection = await PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let iaf_ext_elements_collection = PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')

        let allSystems = await PlatformApi.IafScriptEngine.getItems({
            collectionDesc: {
                _userItemId: iaf_systems_collection._userItemId,
                _namespaces: IAF_workspace._namespaces
            },
            query: { _id: { "$in": input.systemIds } },
            options: { page: { getAllItems: true } }
        }, ctx);

        function mapBy(key) {
            return function group(array) {
                return array.reduce((acc, obj) => {
                    const property = obj[key];
                    acc[property] = obj;
                    return acc;
                }, {});
            };
        }

        function groupBy(key) {
            return function group(array) {
                return array.reduce((acc, obj) => {
                    const property = obj[key];
                    acc[property] = acc[property] || [];
                    acc[property].push(obj);
                    return acc;
                }, {});
            };
        }

        const systemsByIdMapper = mapBy("_id");
        const allSystemsMappedById = systemsByIdMapper(allSystems);

        let allSystemsIds = allSystems.map(s=>s._id);

        let system_query = {
            query: {
                parent: {
                    collectionDesc: {
                        _userType: iaf_system_elements_collection._userType,
                        _userItemId: iaf_system_elements_collection._userItemId
                    },
                    options: {
                        page: { getAllItems: true }
                    }
                },
                relatedFilter:
                    {
                        includeResult: false,
                        $and: [
                            {
                                relatedDesc: { _relatedUserType: iaf_systems_collection._userType, _isInverse: true },
                                as: "system",
                                query: { _id: { "$in": allSystemsIds } }
                            }
                        ]
                    },
                related: [
                    {
                        relatedDesc: {
                            _relatedUserType: iaf_space_collection._userType
                        },
                        options: { page: { getAllItems: true } },
                        as: "spaces"
                    },
                    {
                        relatedDesc: {
                            _relatedUserType: iaf_asset_collection._userType
                        },
                        options: { page: { getAllItems: true } },
                        "as": "assets"
                    },
                    {
                        relatedDesc: {
                            _relatedUserType: iaf_ext_elements_collection._userType
                        },
                        options: { page: { getAllItems: true } },
                        "as": "modelElements"
                    },
                    {
                        relatedDesc: {
                            _relatedUserType: iaf_system_elements_collection._userType
                        },
                        options: { page: { getAllItems: true } },
                        as: 'relatedSystemElements'
                    }
                ]
            }
        }

        let systemQueryResults = await PlatformApi.IafScriptEngine.findWithRelated(system_query.query, ctx);
        let modelIsToFetchElementDataFor = [];
        let systemElementEntitiesPerSystem = {};

        if(systemQueryResults && systemQueryResults._list){
            systemQueryResults._list.forEach((systemElement) => {

                if(!systemElement["Local Orders"] || !Array.isArray(systemElement["Local Orders"])){
                    console.log("Could not find system for systemElement",systemElement);
                    return;
                }
                systemElement["Local Orders"].forEach(lo=>{
                    const {systemId, localOrder } = lo;

                    const entity = {
                        ...systemElement,
                        "Entity Name": systemElement['System Element Name'],
                        "System Name": allSystemsMappedById[systemId]['System Name'],
                        entityType: "Model Element",
                        entityInfo : undefined,
                        localOrder: localOrder,
                        modelViewerIds: systemElement.modelViewerIds
                    }
                    const hasAssets = systemElement?.assets?._list.length > 0;
                    const hasSpaces = systemElement?.spaces?._list.length > 0;
                    const hasModelElements = systemElement?.modelElements?._list.length > 0;
                    const hasRelatedSystemElements = systemElement?.relatedSystemElements?._list.length > 0;
                    if(hasAssets){
                        entity.entityType = "Asset";
                        entity.entityInfo = systemElement?.assets?._list;
                    }
                    else if(hasSpaces){
                        entity.entityType = "Space";
                        entity.entityInfo = systemElement.spaces._list;
                    }
                    else if(hasModelElements){
                        //TODO: this relation is not persisting, will need to be fetched by modelViewerId in the script below
                        entity.entityType = "Model Element";
                        entity.entityInfo = systemElement.modelElements._list;
                    }

                    if(hasRelatedSystemElements){}

                    systemElementEntitiesPerSystem[systemId] = systemElementEntitiesPerSystem[systemId] || [];
                    systemElementEntitiesPerSystem[systemId].push(entity);

                    if(!hasAssets && !hasSpaces && !hasModelElements){
                        modelIsToFetchElementDataFor.push(...systemElement.modelViewerIds);
                    }
                });
            });

            //separate call to get Model Element properties
            if(modelIsToFetchElementDataFor.length>0) {
                console.log('getElementFromModel input', input)
                const { PlatformApi } = libraries
                let iaf_ext_elements_collection = PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')

                let getElementFromModelQuery = {
                    parent: {
                        query: {package_id: {'$in' : modelIsToFetchElementDataFor}},
                        collectionDesc: {_userType: 'rvt_elements', _userItemId: iaf_ext_elements_collection._userItemId},
                        options: {page: {getAllItems: true}},
                        sort: {_id: 1}
                    },
                    related: [
                        {relatedDesc: {_relatedUserType: 'rvt_type_elements'}, as: 'Revit Type Properties'},
                        {relatedDesc: {_relatedUserType: 'rvt_element_props'}, as: 'Revit Element Properties'}
                    ]
                }
                let elements = undefined;
                try{
                    elements = await PlatformApi.IafScriptEngine.findWithRelated(getElementFromModelQuery, ctx)
                } catch (e) {
                    console.error(e);
                }
                console.log('getElementFromModel elements', elements)
                let modelElementEntityInfosMap = elements._list.map(e => {
                    let properties = {}
                    if (!_.isEmpty(e["Revit Type Properties"]._list[0])) {
                        Object.keys(e["Revit Type Properties"]._list[0].properties).forEach((key) => {
                            let currentProp = e["Revit Type Properties"]._list[0].properties[key]
                            properties[key] = {
                                dName: currentProp.dName,
                                val: currentProp.val ? currentProp.val : "" + " " + currentProp.uom ? currentProp.uom : "",
                                type: "text"
                            }
                        })
                    }
                    if (!_.isEmpty(e["Revit Element Properties"]._list[0])) {
                        Object.keys(e["Revit Element Properties"]._list[0].properties).forEach((key) => {
                            let currentProp = e["Revit Element Properties"]._list[0].properties[key]
                            properties[key] = {
                                dName: currentProp.dName,
                                val: currentProp.val ? currentProp.val : "" + " " + currentProp.uom ? currentProp.uom : "",
                                type: "text"
                            }
                        })
                    }
                    let revitFamily = e["Revit Type Properties"]._list[0].properties["Revit Family"] ? e["Revit Type Properties"]._list[0].properties["Revit Family"].val : "No Family"
                    let revitType = e["Revit Type Properties"]._list[0].properties["Revit Type"] ? e["Revit Type Properties"]._list[0].properties["Revit Type"].val : "No Type"
                    let sysElemId = e["Revit Element Properties"]._list[0].properties.SystemelementId.val
                    return {
                        _id: e._id,
                        "Entity Name": revitFamily + "-" + revitType + "-" + sysElemId,
                        properties,
                        modelViewerIds: [e.package_id]
                    }
                }).reduce((acc, modelElementEntityInfo)=>{acc[modelElementEntityInfo.modelViewerIds[0]]=modelElementEntityInfo;return acc;},{});

                console.log('getElementFromModel modelElementEntityInfosMap', modelElementEntityInfosMap)
                //ADD MODEL INFO ONTO SYSTEM ELEMENT
                _.values(systemElementEntitiesPerSystem).forEach(systemElementsArray => {
                    systemElementsArray.forEach(systemElement => {
                        console.log('getElementFromModel systemElementBefore', systemElement)
                        if(systemElement.entityType=="Model Element" && !systemElement.entityInfo){
                            systemElement.entityInfo = systemElement.modelViewerIds.map(modelId => modelElementEntityInfosMap[modelId]);
                        }
                    });
                })
            }
        }


        let result = Object.values(allSystemsMappedById).map(s=>{return {...s, 'Entity Name':s['System Name'], entityType: 'System', modelViewerIds: systemElementEntitiesPerSystem[s._id].reduce(
                (accu, ent) => accu.concat(ent.modelViewerIds),[]), elements: systemElementEntitiesPerSystem[s._id]  }});

        //let result = systemElementEntities;
        return result
    },
    async createSystem(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let currentProj = await PlatformApi.IafProj.getCurrent(ctx)
        let iaf_systems_collection = await PlatformApi.IafScriptEngine.getVar('iaf_systems_collection')
        let res = { success: true, message: '', result: [] }
        console.log('input', input)
        let minSystemInfo = { 'System Name': input.system['System Name'], properties: input.system.properties }
        let newSystemArray = [minSystemInfo]
        if (!_.isEmpty(newSystemArray[0]['System Name']) && !_.isEmpty(newSystemArray[0].properties['System Category'].val) && !_.isEmpty(newSystemArray[0].properties['System Type'].val) && !_.isEmpty(newSystemArray[0].properties['System Status'].val)) {
            let findAsset = await PlatformApi.IafScriptEngine.findInCollections({
                query: { "System Name": input.system['System Name'] },
                collectionDesc: {
                    _userType: iaf_systems_collection._userType,
                    _userItemId: iaf_systems_collection._userItemId
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
                res.message = 'An system with the same name already exists!'
                return res
            } else {
                let new_system = await PlatformApi.IafScriptEngine.createItems({
                    _userItemId: iaf_systems_collection._userItemId,
                    _namespaces: currentProj._namespaces,
                    items: newSystemArray
                }, ctx)
                console.log('new_system', new_system)
                console.log('newsystem empty', !_.isEmpty(new_system))
                if (!_.isEmpty(new_system)) {
                    res.success = true
                    res.result = new_system[0]
                } else {
                    res.success = false
                    res.message = "Error creating System!"
                }
            }
        } else {
            res.success = false
            res.message = "Required Properties (System Name, Category, Type, Status) are missing values!"
        }
        return res
    },
    async getSystem(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_systems_collection = await PlatformApi.IafScriptEngine.getVar('iaf_systems_collection')
        let iaf_system_elements_collection = await PlatformApi.IafScriptEngine.getVar('iaf_system_elements_collection')
        let iaf_space_collection = await PlatformApi.IafScriptEngine.getVar('iaf_space_collection')
        let iaf_asset_collection = await PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let system_query = {
            query: {
                parent: {
                    collectionDesc: {
                        _userType: iaf_system_elements_collection._userType,
                        _userItemId: iaf_system_elements_collection._userItemId
                    },
                    options: {
                        page: { getAllItems: true }
                    }
                },
                relatedFilter:
                    {
                        includeResult: false,
                        $and: [
                            {
                                relatedDesc: { _relatedUserType: iaf_systems_collection._userType, _isInverse: true },
                                as: "system",
                                query: { _id: input.systemId }
                            }
                        ]
                    },
                related: [
                    {
                        relatedDesc: {
                            _relatedUserType: iaf_space_collection._userType
                        },
                        options: { page: { getAllItems: true } },
                        as: "spaces"
                    },
                    {
                        relatedDesc: {
                            _relatedUserType: iaf_asset_collection._userType
                        },
                        options: { page: { getAllItems: true } },
                        "as": "assets"
                    },
                    {
                        relatedDesc: {
                            _relatedUserType: iaf_system_elements_collection._userType
                        },
                        options: { page: { getAllItems: true } },
                        as: 'relatedSystemElements'
                    }
                ]
            }
        }
        let systemElements = await PlatformApi.IafScriptEngine.findWithRelated(system_query.query, ctx)
        let system = await PlatformApi.IafScriptEngine.getItems({
            query: { _id: input.systemId },
            collectionDesc: { _userType: iaf_systems_collection._userType, _userItemId: iaf_systems_collection._userItemId },
            options: { page: { getAllItems: true } }
        }, ctx)
        let result = { system: system[0], systemElements: systemElements }
        return result
    },
    async updateSystemRelations(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_systems_collection = await PlatformApi.IafScriptEngine.getVar('iaf_systems_collection')
        let iaf_system_elements_collection = await PlatformApi.IafScriptEngine.getVar('iaf_system_elements_collection')
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')

        console.log('input', input)
        await PlatformApi.IafScriptEngine.createRelations({
            parentUserItemId: iaf_systems_collection._userItemId,
            _userItemId: iaf_system_elements_collection._userItemId,
            _namespaces: IAF_workspace._namespaces,
            relations: input.newSystemToElementRelationObjects
        }, ctx);
        await PlatformApi.IafScriptEngine.createRelations({
            parentUserItemId: iaf_system_elements_collection._userItemId,
            _userItemId: iaf_system_elements_collection._userItemId,
            _namespaces: IAF_workspace._namespaces,
            relations: input.newElementToElementRelationObjects
        }, ctx);
        await PlatformApi.IafScriptEngine.removeRelations({
            parentUserItemId: iaf_systems_collection._userItemId,
            _userItemId: iaf_system_elements_collection._userItemId,
            _namespaces: IAF_workspace._namespaces,
            relations: input.removedSystemToElementRelationObjects
        }, ctx);
        await PlatformApi.IafScriptEngine.removeRelations({
            parentUserItemId: iaf_system_elements_collection._userItemId,
            _userItemId: iaf_system_elements_collection._userItemId,
            _namespaces: IAF_workspace._namespaces,
            relations: input.removedElementToElementRelationObjects
        }, ctx);
        await PlatformApi.IafScriptEngine.updateItemsBulk({
            _userItemId: iaf_system_elements_collection._userItemId,
            _namespaces: IAF_workspace._namespaces,
            items: input.reorderedElements
        }, ctx);


        return {}
    },
    async editSystem(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_systems_collection = PlatformApi.IafScriptEngine.getVar('iaf_systems_collection')
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        console.log('input', input)
        console.log('input', input)
        let res = {
            success: true,
            message: '',
            result: []
        }
        let minSystemInfo = { 'System Name': input.system['System Name'], properties: input.system.properties }
        let updatedSystemArray = [minSystemInfo]
        if (!_.isEmpty(updatedSystemArray[0]['System Name']) && !_.isEmpty(updatedSystemArray[0].properties['System Category'].val) && !_.isEmpty(updatedSystemArray[0].properties['System Type'].val) && !_.isEmpty(updatedSystemArray[0].properties['System Status'].val)) {
            let findasset = await PlatformApi.IafScriptEngine.findInCollections({
                query: { "System Name": input.system['System Name'] },
                collectionDesc: {
                    _userType: iaf_systems_collection._userType,
                    _userItemId: iaf_systems_collection._userItemId
                },
                options: { page: { _pageSize: 10, getPageInfo: true } }
            }, ctx)
            let updateOK
            if (findasset._total > 0) {
                if (findasset._list[0]._id == input.system._id) {
                    updateOK = true
                } else {
                    updateOK = false
                }
            } else {
                updateOK = true
            }
            if (updateOK) {
                let updatedItemArray = [{
                    _id: input.system._id,
                    "System Name": input.system['System Name'],
                    properties: input.system.properties
                }]
                let updateItemResult = await PlatformApi.IafScriptEngine.updateItemsBulk({
                    _userItemId: iaf_systems_collection._userItemId,
                    _namesystems: IAF_workspace._name,
                    items: updatedItemArray
                }, ctx);
                let updateRes = updateItemResult[0][0]
                if (updateRes === 'ok: 204') {
                    res.success = true
                    res.result = updateRes
                } else {
                    res.success = false
                    res.message = "Error updating System!"
                }
            } else {
                res.success = false
                res.message = "System with same name already exists!"
            }
        } else {
            res.success = false
            res.message = "Required Properties (System Name) are missing values!"
        }
        return res
    },
    async getModelData(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_asset_collection = await PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let iaf_ext_elements_collection = await PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')

        let bimQuery = [
            {
                parent: {
                    query: { package_id: input.modelInfo.id },
                    collectionDesc: {
                        _userType: "rvt_elements",
                        _userItemId: iaf_ext_elements_collection._userItemId
                    },
                    options: {
                        page: {
                            getAllItems: true
                        }
                    }
                },
                relatedFilter: {
                    includeResult: true,
                    $and: [
                        {
                            relatedDesc: { _relatedUserType: "rvt_type_elements" },
                            as: "Revit Type Properties",
                            query: {
                                "properties.Revit Category.val": {
                                    $not: {
                                        $in: [
                                            "OST_Rooms",
                                            "OST_Spaces",
                                            "OST_Levels",
                                            "OST_Zones",
                                            "OST_Areas",
                                            "OST_MEPSpaces"
                                        ]
                                    }
                                }
                            }
                        }
                    ]
                },
                related: [
                    {
                        relatedDesc: {
                            _relatedUserType: iaf_asset_collection._userType,
                            _isInverse: true
                        },
                        as: "Assets"
                    },
                    {
                        relatedDesc: {
                            _relatedUserType: "rvt_element_props"
                        },
                        as: "Revit Element Properties"
                    }
                ]
            }
        ]
        let queryResults = await PlatformApi.IafScriptEngine.findWithRelatedMulti(bimQuery, ctx)
        let elementList = queryResults[0]._list
        let reduced = elementList.map(elem => {
            return {
                id: elem.package_id,
                revitGuid: elem.source_id,
                dtCategory: elem.dtCategory,
                dtType: elem.dtType,
                'Revit Type Properties': elem['Revit Type Properties']._list[0].properties,
                'Revit Element Properties': elem['Revit Element Properties']._list[0].properties,
                relatedAssets: elem.Assets._list
            }
        })
        return reduced
    },
    async createSystemElement(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_system_elements_collection = await PlatformApi.IafScriptEngine.getVar('iaf_system_elements_collection')
        let iaf_systems_collection = PlatformApi.IafScriptEngine.getVar('iaf_systems_collection')
        let iaf_asset_collection = await PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let iaf_space_collection = await PlatformApi.IafScriptEngine.getVar('iaf_space_collection')
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        console.log('input',input)

        let new_system_element = await PlatformApi.IafScriptEngine.createItems({
            _userItemId: iaf_system_elements_collection._userItemId,
            _namespaces: IAF_workspace._namespaces,
            items: [input.systemElement]
        }, ctx)
        console.log('new_system_element',new_system_element)
        let assetRelations = input.relatedEntities.filter(assetRelation => assetRelation['Asset Name'])
        console.log('assetRelations',assetRelations)
        let assetIds = assetRelations.map(rel => {
            return {
                _id: rel._id
            }
        })
        console.log('assetIds',assetIds)
        if (assetIds.length > 0) {
            let assetToSystemElementRelations = {
                parentItem: { _id: new_system_element[0]._id },
                relatedItems: assetIds
            }
            console.log('assetToSystemElementRelations',assetToSystemElementRelations)
            let assetRelationsResult = await PlatformApi.IafScriptEngine.createRelations({
                parentUserItemId: iaf_system_elements_collection._userItemId,
                _userItemId: iaf_asset_collection._userItemId,
                _namespaces: IAF_workspace._namespaces,
                relations: [assetToSystemElementRelations]
            }, ctx)
            console.log('assetRelationsResult',assetRelationsResult)
        }
        let spaceRelations = input.relatedEntities.filter(spaceRelation => spaceRelation?.type?.singular=='Space')
        console.log('spaceRelations',spaceRelations)
        let spaceIds = spaceRelations.map(spaceRel => {
            return {
                _id: spaceRel._id
            }
        })
        console.log('spaceIds',spaceIds)
        if (spaceIds.length > 0) {
            let spaceToSystemElementRelations = {
                parentItem: { _id: new_system_element[0]._id },
                relatedItems: spaceIds
            }
            console.log('spaceToSystemElementRelations',spaceToSystemElementRelations)
            let spaceRelationsResult = await PlatformApi.IafScriptEngine.createRelations({
                parentUserItemId: iaf_system_elements_collection._userItemId,
                _userItemId: iaf_space_collection._userItemId,
                _namespaces: IAF_workspace._namespaces,
                relations: [spaceToSystemElementRelations]
            }, ctx)
            console.log('spaceRelationsResult',spaceRelationsResult)
        }
        let sysElIdArray = [{ _id: new_system_element[0]._id }]
        console.log('sysElIdArray',sysElIdArray)
        let systemElementToSystemRelation = {
            parentItem: { _id: input.system._id },
            relatedItems: sysElIdArray
        }
        console.log('systemElementToSystemRelation',systemElementToSystemRelation)
        let systemRelationResult = await PlatformApi.IafScriptEngine.createRelations({
            parentUserItemId: iaf_systems_collection._userItemId,
            _userItemId: iaf_system_elements_collection._userItemId,
            _namespaces: IAF_workspace._namespaces,
            relations: [systemElementToSystemRelation]
        }, ctx)
        console.log('systemRelationResult',systemRelationResult)
        return new_system_element
    },
    async getSystemIdsForEntity(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let collectionType = undefined;
        let iaf_system_elements_collection = await PlatformApi.IafScriptEngine.getVar('iaf_system_elements_collection');
        console.log("getSystemIdsForEntity input",input);
        let systemIdsFromAllSystemElementRels = [];

        if(input.entityType=='Asset' || input.entityType=='Space') {
            if(input.entityType=='Asset') {
                collectionType = await PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
            }
            else if(input.entityType=='Space') {
                collectionType = await PlatformApi.IafScriptEngine.getVar('iaf_space_collection')
            }
            let queryResult = await PlatformApi.IafScriptEngine.findWithRelated({
                parent: {
                    query: { _id: input.entityInfo[0]._id },
                    collectionDesc: { _userType: collectionType._userType, _userItemId: collectionType._userItemId },
                    options: { page: { getAllItems: true } },
                    project: { _id: 1 }
                },
                related: [
                    {
                        relatedDesc: { _relatedUserType: iaf_system_elements_collection._userType, _isInverse: true },
                        as: 'SystemElements'
                    }
                ]
            }, ctx);
            console.log("getSystemIdsForEntity queryResult",queryResult);
            if (collectionType && queryResult) {
                queryResult._list[0].SystemElements._list.forEach(systemElement => {
                    const systemIds = systemElement["Local Orders"].map(lo=>lo.systemId);
                    systemIds.forEach(sId=>{
                        if(systemIdsFromAllSystemElementRels.indexOf(sId)<0){
                            systemIdsFromAllSystemElementRels.push(sId);
                        }
                    })
                })
            }

        }
        else {
            collectionType = await PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')
            let iaf_systems_collection = PlatformApi.IafScriptEngine.getVar('iaf_systems_collection')
            let queryResult = await PlatformApi.IafScriptEngine.getItems({
                query: { modelViewerIds: input.modelInfo.id },
                collectionDesc: { _userType: iaf_system_elements_collection._userType, _userItemId: iaf_system_elements_collection._userItemId },
                options: { page: { getAllItems: true } },
                project: { _id: 1 }
            }, ctx);
            console.log("getSystemIdsForEntity queryResult",queryResult);
            if (queryResult) {
                queryResult.forEach(systemElement => {
                    const systemIds = systemElement["Local Orders"].map(lo=>lo.systemId);
                    systemIds.forEach(sId=>{
                        if(systemIdsFromAllSystemElementRels.indexOf(sId)<0){
                            systemIdsFromAllSystemElementRels.push(sId);
                        }
                    })
                })
            }
        }

        return systemIdsFromAllSystemElementRels
    },
    async getSystemAlerts(input, libraries, ctx) {
        console.log("getSystemAlerts input",input);
        const PlatformApi = libraries.PlatformApi;
        const assetCol = await PlatformApi.IafScriptEngine.getVar('iaf_asset_collection');
        const spaceCol = await PlatformApi.IafScriptEngine.getVar('iaf_space_collection');
        let alertsRealCol = await PlatformApi.IafScriptEngine.getCollection(
            {
                _userType: "alerts",
                _shortName: "alerts",
                _itemClass: "NamedUserCollection",
            }, ctx
        );

        let alertsCol = alertsRealCol;

        const queryFactory = function(entityType,ids){
            let collectionType = undefined;
            if(entityType=='Asset') {
                collectionType = assetCol;
            }
            else if(entityType=='Space') {
                collectionType = spaceCol;
            }
            let alerts_query = {
                query: {
                    parent: {
                        query: {'properties.Active.val': true},
                        collectionDesc: {
                            _userType: alertsCol._userType,
                            _userItemId: alertsCol._userItemId
                        },
                        options: {
                            page: { getAllItems: true }
                        }
                    },
                    relatedFilter:
                        {
                            includeResult: true,
                            $and: [
                                {
                                    relatedDesc: { _relatedUserType: collectionType._userType },
                                    as: "related",
                                    query: { _id: { "$in": ids } }
                                }
                            ]
                        }
                }
            }
            return alerts_query;
        }

        const alerts = {};
        for (const [entityType, ids] of Object.entries(input.entityDataMap)) {
            const query = queryFactory(entityType,ids);
            console.log(`getSystemAlerts ${entityType} query`,query);
            let results = undefined;
            try {
                results = await PlatformApi.IafScriptEngine.findWithRelated(query.query, ctx);
            } catch (e) {
                console.error(e);
            }
            console.log(`getSystemAlerts ${entityType} result`,results);
            if(results && results._list && results._list.length){
                results._list.forEach((alert) => {
                    const alertId = alert._id;
                    if(alert.related && alert.related._list && alert.related._list.length){
                        alert.related._list.forEach((entity) => {
                            alerts[entityType] = alerts[entityType] || {};
                            alerts[entityType][entity._id] = alerts[entityType][entity._id] || [];
                            alerts[entityType][entity._id].push(alert);
                        });
                    }
                });
            }
        }
        return alerts;

    },
    async getSystemAlertsWithDemo(input, libraries, ctx) {
        console.log("getSystemAlerts input",input);
        const PlatformApi = libraries.PlatformApi;
        const assetCol = await PlatformApi.IafScriptEngine.getVar('iaf_asset_collection');
        const spaceCol = await PlatformApi.IafScriptEngine.getVar('iaf_space_collection');
        let alertsDemoCol = await PlatformApi.IafScriptEngine.getCollection(
            {
                _userType: "demo_alerts",
                _shortName: "demo_alerts",
                _itemClass: "NamedUserCollection",
            }, ctx
        );

        let alertsRealCol = await PlatformApi.IafScriptEngine.getCollection(
            {
                _userType: "alerts",
                _shortName: "alerts",
                _itemClass: "NamedUserCollection",
            }, ctx
        );

        let alertsCol = alertsDemoCol || alertsRealCol;

        const queryFactory = function(entityType,ids){
            let collectionType = undefined;
            if(entityType=='Asset') {
                collectionType = assetCol;
            }
            else if(entityType=='Space') {
                collectionType = spaceCol;
            }
            let alerts_query = {
                query: {
                    parent: {
                        query: {'properties.Active.val': true},
                        collectionDesc: {
                            _userType: alertsCol._userType,
                            _userItemId: alertsCol._userItemId
                        },
                        options: {
                            page: { getAllItems: true }
                        }
                    },
                    relatedFilter:
                        {
                            includeResult: true,
                            $and: [
                                {
                                    relatedDesc: { _relatedUserType: collectionType._userType },
                                    as: "related",
                                    query: { _id: { "$in": ids } }
                                }
                            ]
                        }
                }
            }
            return alerts_query;
        }

        const alerts = {};
        for (const [entityType, ids] of Object.entries(input.entityDataMap)) {
            const query = queryFactory(entityType,ids);
            console.log(`getSystemAlerts ${entityType} query`,query);
            let results = undefined;
            try {
                results = await PlatformApi.IafScriptEngine.findWithRelated(query.query, ctx);
            } catch (e) {
                console.error(e);
            }
            console.log(`getSystemAlerts ${entityType} result`,results);
            if(results && results._list && results._list.length){
                results._list.forEach((alert) => {
                    const alertId = alert._id;
                    if(alert.related && alert.related._list && alert.related._list.length){
                        alert.related._list.forEach((entity) => {
                            alerts[entityType] = alerts[entityType] || {};
                            alerts[entityType][entity._id] = alerts[entityType][entity._id] || [];
                            alerts[entityType][entity._id].push(alert);
                        });
                    }
                });
            }
        }
        return alerts;

    },
    async getAllModels(input, libraries, ctx) {

        const { IafScriptEngine, IafProj, IafItemSvc } = libraries.PlatformApi;

        let currentProj = await IafProj.getCurrent(ctx);

        let latestModelComposites = await IafScriptEngine.getCompositeCollections({
            query:
                {
                    "_userType": "bim_model_version",
                    "_namespaces": { "$in": currentProj._namespaces },
                    "_itemClass": "NamedCompositeItem"
                }
        }, ctx, { getLatestVersion: true });


        console.log('loadProjectAndCollections latestModelComposites', latestModelComposites)

        let latestModelComposite;
        if (latestModelComposites && latestModelComposites._list && latestModelComposites._list.length) {
            latestModelComposite = _.last(_.sortBy(latestModelComposites._list, m => m._metadata._updatedAt));
        }


        let dc = await IafItemSvc.getNamedUserItems({
            query:{
                "_name" : latestModelComposite._name+"_data_cache",
                "_userType": "data_cache",
            }
        }, ctx, {});


        let items = await IafScriptEngine.getItems({
            query: {},
            collectionDesc: {
                _userType: 'data_cache',
                _userItemId: dc._userItemId,
                _namespaces: currentProj._namespaces
            }
        }, ctx)

        const result = [];

        if(items && items.length){
            items.forEach((item) => {
                item.data.package_ids.forEach(id=>{
                    result.push({id:id,package_id:id, source_filename:item.data.sourcefile});
                });
            });
        }

        console.log("getAllModels result");
        return result;
    },

    async getModelElementsWithLimit(input, libraries, ctx) {

        console.log(input)

        const { IafScriptEngine } = libraries.PlatformApi

        let model = IafScriptEngine.getVar('iaf_ext_current_bim_model')
        let elem_coll = IafScriptEngine.getVar('iaf_ext_elements_collection')
        let elem_props_coll = await IafScriptEngine.getCollectionInComposite(model._id, {
            _userType: "rvt_element_props"
        }, ctx)

        let elem_props = await IafScriptEngine.findWithRelated({
            parent: {
                query: input.entityInfo,
                collectionDesc: {
                    _userType: 'rvt_element_props',
                    _userItemId: elem_props_coll._userItemId
                },
                options: {
                    page: {getAllItems: true}
                }
            },
            related: [
                {
                    relatedDesc: {
                        _relatedUserType: elem_coll._userType,
                        _isInverse: true
                    },
                    as: "element"
                }
            ]
        })

        console.log(elem_props)

        let items = elem_props._list.map((ep) => {

            let elemPropNames = Object.keys(ep.properties)
            elemPropNames.forEach((pn) => {
                if (!ep.properties[pn].type)
                    ep.properties[pn].type = 'text'
            })

            let el = ep.element._list[0]

            return {
                id: el.package_id,
                revitGuid: el.source_id,
                dtCategory: el.dtCategory || "<no value>",
                dtType: el.dtType || "<no value>",
                source_filename: el.source_filename,
                "Revit Element Properties": ep.properties,
                "Revit Type Properties": {
                    "Revit Category": {val: "Blank", type: "text"},
                    "Revit Type": {val: "Blank", type: "text"},
                    "Revit Family": {val: "Blank", type: "text"}
                },
                relatedAssets: [],
            }
        })
        console.log(items)



        return items

    },

    async TEST_CLIENT_copySystemFromAnotherProject(input, libraries, ctx) {

        let { IafScriptEngine, IafItemSvc } = libraries.PlatformApi

        if (!input) {
            input = {
                _namespacesToCopyFrom: ["wts_lQR0P0EZ"],
                systemName: "AHU 03 Supply Air for MCR"
            }
        }

        if (!input._namespacesToCopyFrom || input._namespacesToCopyFrom[0] === ctx._namespaces[0]) {
            throw("ERROR: input._namespacesToCopyFrom is required to specify the project from which to copy data! And it must be different from current project namespace!")
        }

        if (!input.systemName) {
            throw("ERROR: input._systemName is required!")
        }

        //GET SOURCE SYSTEM AND SYSTEM ELEMENTS
        let sourceCtx = Object.assign({}, ctx, {_namespaces: input._namespacesToCopyFrom})

        let srcSystemsCollection = await IafScriptEngine.getCollection({
            _userType: 'iaf_ext_sys_coll'
        }, sourceCtx)

        let srcSystemElsCollection = await IafScriptEngine.getCollection({
            _userType: 'iaf_ext_sysel_coll'
        }, sourceCtx)

        let srcAssetsCollection = await IafScriptEngine.getCollection({
            _userType: 'iaf_ext_asset_coll'
        }, sourceCtx)

        let srcSpacesCollection = await IafScriptEngine.getCollection({
            _userType: 'iaf_ext_space_coll'
        }, sourceCtx)

        let system = await IafScriptEngine.getItems({
            query: { 'System Name': input.systemName },
            collectionDesc: { _userType: srcSystemsCollection._userType, _userItemId: srcSystemsCollection._userItemId },
            options: { page: { getAllItems: true } }
        }, sourceCtx)

        //set these so getSystem works
        IafScriptEngine.setVar('iaf_systems_collection', srcSystemsCollection)
        IafScriptEngine.setVar('iaf_system_elements_collection', srcSystemElsCollection)
        IafScriptEngine.setVar('iaf_space_collection', srcSpacesCollection)
        IafScriptEngine.setVar('iaf_asset_collection', srcAssetsCollection)

        let systemInfo = await systems.getSystem({systemId: system[0]._id}, libraries, sourceCtx)

        //CREATE NEW SYSTEM AND SYSTEM ELEMENTS IN TARGET
        let targetSystemsCollection = await IafScriptEngine.getCollection({
            _userType: 'iaf_ext_sys_coll'
        }, ctx)

        let targetSystemElsCollection = await IafScriptEngine.getCollection({
            _userType: 'iaf_ext_sysel_coll'
        }, ctx)

        //create new system
        let { _id, _metadata, ...newSystemInfo } = system[0]

        let newSystemResp = await IafScriptEngine.createItems({
            _userItemId: targetSystemsCollection._userItemId,
            items: [newSystemInfo]
        }, ctx)

        let newSystem = newSystemResp[0]

        //clone system elements
        let clonedSystemElements = JSON.parse(JSON.stringify(systemInfo.systemElements._list))

        //strip away source specific info
        let newSysElems = clonedSystemElements.map((se) => {
            let {_id, _metadata, _uri, relatedSystemElements, downstream, upstream, assets, spaces, ...newSysElem} = se
            newSysElem.source_syselem_id = se._id
            let localOrd = newSysElem['Local Orders'].find(o => o.systemId === systemInfo.system._id)
            if (localOrd) localOrd.systemId = newSystem._id
            return newSysElem
        })

        //create new system elements in target collection and relate to system
        let newSysElemCreateResp = await IafScriptEngine.createItemsAsSeparateRelatedBulk({
            parentUserItemId: targetSystemsCollection._userItemId,
            _userItemId: targetSystemElsCollection._userItemId,
            fieldName: "records",
            items: [{_id: newSystem._id, records: newSysElems}]
        }, ctx)

        //fetch newly created system elements by system
        let fetchNewSystemWithElsResp = await IafScriptEngine.findWithRelated({
            parent: {
                query: {_id: newSystem._id},
                collectionDesc: {
                    _userType: targetSystemsCollection._userType,
                    _userItemId: targetSystemsCollection._userItemId
                }
            },
            related: [
                {
                    relatedDesc: {
                        _relatedUserType: targetSystemElsCollection._userType
                    },
                    options: { page: { getAllItems: true } },
                    as: "syselems"
                }
            ]
        }, ctx)

        //RELATE SYSTEM ELEMENTS TO SYSTEM ELEMENTS
        //recreate system element to system element relations and populate upstream and downstream
        let targetSystemElements = fetchNewSystemWithElsResp._list[0].syselems._list
        let elementToElementRelations = []

        targetSystemElements.forEach((tse) => {

            //get matching source system element
            let sourceElem = systemInfo.systemElements._list.find(e => e._id === tse.source_syselem_id)

            //get new matching upstream system element id
            if (sourceElem.upstream) {
                tse.upstream = targetSystemElements.find(e => e.source_syselem_id === sourceElem.upstream)._id
            }

            //get new matching downstream system element ids and create relations objects for each
            if (sourceElem.downstream && sourceElem.downstream.length) {
                tse.downstream = sourceElem.downstream.map(ds => targetSystemElements.find(e => e.source_syselem_id === ds)._id)
                elementToElementRelations.push({
                    customAttributes: {systemId: newSystem._id},
                    parentItem: {_id: tse._id},
                    relatedItems: tse.downstream.map((d) => {return {_id: d}})
                })
            }
        })

        //update system elements and write relations to item service
        let updateElemsResp = await IafScriptEngine.updateItemsBulk({
            _userItemId: targetSystemElsCollection._userItemId,
            items: targetSystemElements
        }, ctx)

        let elemToElemCreateResp = await IafScriptEngine.createRelations({
            parentUserItemId: targetSystemElsCollection._userItemId,
            _userItemId: targetSystemElsCollection._userItemId,
            _userType: targetSystemElsCollection._userType,
            relations: elementToElementRelations
        }, ctx)

        //RELATE SYSTEM ELEMENTS TO ASSETS AND SPACES
        let targetAssetsCollection = await IafScriptEngine.getCollection({
            _userType: 'iaf_ext_asset_coll'
        }, ctx)

        let targetSpacesCollection = await IafScriptEngine.getCollection({
            _userType: 'iaf_ext_space_coll'
        }, ctx)

        let srcAssetNames = []
        let srcSpaceNames = []
        systemInfo.systemElements._list.forEach((srcElem) => {
            if (srcElem.assets._total > 0) {
                srcElem.assets._list.forEach((a) => {
                    srcAssetNames.push(a['Asset Name'])
                })
            }
            if (srcElem.spaces._total > 0) {
                srcElem.spaces._list.forEach((a) => {
                    srcSpaceNames.push(a['Space Name'])
                })
            }
        })

        let targetAssets = await IafScriptEngine.getItems({
            _userItemId: targetAssetsCollection._userItemId,
            query: {"Asset Name": {$in: srcAssetNames}},
            options: {page:{getAllItems: true}}
        },ctx)

        let targetSpaces = await IafScriptEngine.getItems({
            _userItemId: targetSpacesCollection._userItemId,
            query: {"Space Name": {$in: srcSpaceNames}},
            options: {page:{getAllItems: true}}
        },ctx)

        //match up new system elements with target Assets
        let assetRelations = []
        let spaceRelations = []
        systemInfo.systemElements._list.forEach((srcElem) => {
            if (srcElem.assets._total > 0) {

                let parentTargetElement = targetSystemElements.find(e => e.source_syselem_id === srcElem._id)
                let relatedAssets = srcElem.assets._list.map((sa) => {
                    return {_id: targetAssets.find(a => a['Asset Name'] === sa['Asset Name'])._id}
                })

                assetRelations.push({
                    parentItem: {_id: parentTargetElement._id},
                    relatedItems: relatedAssets
                })
            }

            if (srcElem.spaces._total > 0) {

                let parentTargetElement = targetSystemElements.find(e => e.source_syselem_id === srcElem._id)
                let relatedSpaces = srcElem.spaces._list.map((ss) => {
                    return {_id: targetSpaces.find(a => a['Space Name'] === ss['Space Name'])._id}
                })

                spaceRelations.push({
                    parentItem: {_id: parentTargetElement._id},
                    relatedItems: relatedSpaces
                })
            }
        })

        let elemToAssetsCreateResp = await IafScriptEngine.createRelations({
            parentUserItemId: targetSystemElsCollection._userItemId,
            _userItemId: targetAssetsCollection._userItemId,
            _userType: targetAssetsCollection._userType,
            relations: assetRelations
        }, ctx)

        let elemToSpacesCreateResp = await IafScriptEngine.createRelations({
            parentUserItemId: targetSystemElsCollection._userItemId,
            _userItemId: targetSpacesCollection._userItemId,
            _userType: targetSpacesCollection._userType,
            relations: spaceRelations
        }, ctx)

        //set these so getSystem works
        IafScriptEngine.setVar('iaf_systems_collection', targetSystemsCollection)
        IafScriptEngine.setVar('iaf_system_elements_collection', targetSystemElsCollection)
        IafScriptEngine.setVar('iaf_space_collection', targetSpacesCollection)
        IafScriptEngine.setVar('iaf_asset_collection', targetAssetsCollection)
        let targetSystemInfo = await systems.getSystem({systemId: newSystem._id}, libraries, ctx)

        return {
            systemInfo,
            clonedSystemElements,
            newSystemInfo,
            newSystem,
            newSysElems,
            newSysElemCreateResp,
            fetchNewSystemWithElsResp,
            targetSystemElements,
            elementToElementRelations,
            updateElemsResp,
            elemToElemCreateResp,
            srcAssetNames,
            srcSpaceNames,
            targetAssets,
            targetSpaces,
            assetRelations,
            spaceRelations,
            elemToAssetsCreateResp,
            elemToSpacesCreateResp,
            targetSystemInfo
        }

    }

}
export default systems
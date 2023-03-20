let modeleleme = {
    async getModelElements(input, libraries, ctx, callback) {
        console.log('input', input)
        const { PlatformApi } = libraries
        let iaf_ext_elements_collection = PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')

        let bimQuery = {
            parent: {
                query: input.entityInfo,
                collectionDesc: {
                    _userType: "rvt_elements",
                    _userItemId: iaf_ext_elements_collection._userItemId
                },
                options: {
                    page: {
                        getAllItems: true
                    }
                },
                sort: {
                    _id: 1
                }
            },
            related: [
                {
                    relatedDesc: {
                        _relatedUserType: "rvt_type_elements"
                    },
                    as: "Revit Type Properties"
                },
                {
                    relatedDesc: {
                        _relatedUserType: "rvt_element_props"
                    },
                    as: "Revit Element Properties"
                }
            ]
        }
        let elements = await PlatformApi.IafScriptEngine.findWithRelated(bimQuery, ctx)
        let entities = elements._list.map(e => {
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
        })
        return entities
    },
    async getElementFromModel(input, libraries, ctx, callback) {
        console.log('input', input)
        const { PlatformApi } = libraries
        let iaf_ext_elements_collection = PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')

        let bimQuery = {
            parent: {
                query: {
                    id: input.modelInfo.id
                },
                collectionDesc: {
                    _userType: 'rvt_elements',
                    _userItemId: iaf_ext_elements_collection._userItemId
                },
                options: {
                    page: {
                        getAllItems: true
                    }
                },
                sort: {
                    _id: 1
                }
            },
            related: [
                {
                    relatedDesc: {
                        _relatedUserType: 'rvt_type_elements'
                    },
                    as: 'Revit Type Properties'
                },
                {
                    relatedDesc: {
                        _relatedUserType: rvt_element_props
                    },
                    as: 'Revit Element Properties'
                }
            ]
        }
        let elements = await PlatformApi.IafScriptEngine.findWithRelated(bimQuery, ctx)
        console.log('getElementFromModel elements', elements)
        let entities = elements._list.map(e => {
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
        })
        return entities[0]
    },
    async getModelElementsByCatAndType(input, libraries, ctx, callback) {
        console.log('input', input)
        const { PlatformApi } = libraries
        let iaf_ext_elements_collection = PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')
        let bimQuery
        if (input.entityInfo.dtCategory[0]) {
            bimQuery = {
                parent: {
                    query: {
                        dtCategory: input.entityInfo.dtCategory[0],
                        dtType: {
                            $in: input.entityInfo.dtType
                        }
                    },
                    collectionDesc: {
                        _userType: 'rvt_elements',
                        _userItemId: iaf_ext_elements_collection._userItemId
                    },
                    options: {
                        page: {
                            getAllItems: true
                        }
                    },
                    sort: {
                        _id: 1
                    }
                },
                related: [
                    {
                        relatedDesc: {
                            _relatedUserType: 'rvt_type_elements'
                        },
                        as: 'Revit Type Properties'
                    },
                    {
                        relatedDesc: {
                            _relatedUserType: 'rvt_element_props'
                        },
                        as: 'Revit Element Properties'
                    }
                ]
            }
        } else {
            bimQuery = {
                parent: {
                    query: {
                        dtCategory: input.entityInfo.dtCategory[0]
                    },
                    collectionDesc: {
                        _userType: 'rvt_elements',
                        _userItemId: iaf_ext_elements_collection._userItemId
                    },
                    options: {
                        page: {
                            getAllItems: true
                        }
                    },
                    sort: {
                        _id: 1
                    }
                },
                related: [
                    {
                        relatedDesc: {
                            _relatedUserType: 'rvt_type_elements'
                        },
                        as: 'Revit Type Properties'
                    },
                    {
                        relatedDesc: {
                            _relatedUserType: 'rvt_element_props'
                        },
                        as: 'Revit Element Properties'
                    }
                ]
            }
        }
        let elements = await PlatformApi.IafScriptEngine.findWithRelated(bimQuery, ctx)
        console.log('getModelElementsByCatAndType elements', elements)
        let entities = elements._list.map(e => {
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
        })
        return entities
    },
    async getModelElementsBySourceFile(input, libraries, ctx, callback) {
        console.log('input', input)
        const { PlatformApi } = libraries
        let iaf_ext_elements_collection = PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')
        let bimQuery = {
            parent: {
                query: {
                    source_filename: {
                        $in: input.entityInfo['Source Files']
                    }
                },
                collectionDesc: {
                    _userType: 'rvt_elements',
                    _userItemId: iaf_ext_elements_collection._userItemId
                },
                options: {
                    page: {
                        getAllItems: true
                    }
                },
                sort: {
                    _id: 1
                }
            },
            related: [
                {
                    relatedDesc: {
                        _relatedUserType: 'rvt_type_elements'
                    },
                    as: 'Revit Type Properties'
                },
                {
                    relatedDesc: {
                        _relatedUserType: 'rvt_element_props'
                    },
                    as: 'Revit Element Properties'
                }
            ]
        }
        let elements = await PlatformApi.IafScriptEngine.findWithRelated(bimQuery, ctx)
        console.log('getModelElementsBySourceFile elements', elements)
        let entities = elements._list.map(e => {
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
            let revitFamily = e["Revit Type Properties"]._list[0] ? e["Revit Type Properties"]._list[0].properties["Revit Family"] ? e["Revit Type Properties"]._list[0].properties["Revit Family"].val : "No Family" : "No Family"
            let revitType = e["Revit Type Properties"]._list[0] ? e["Revit Type Properties"]._list[0].properties["Revit Type"] ? e["Revit Type Properties"]._list[0].properties["Revit Type"].val : "No Type" : "No Type"
            let sysElemId = e["Revit Element Properties"]._list[0]? e["Revit Element Properties"]._list[0].properties.SystemelementId.val : ''
            return {
                _id: e._id,
                "Entity Name": revitFamily + "-" + revitType + "-" + sysElemId,
                properties,
                modelViewerIds: [e.package_id]
            }
        })
        console.log('getModelElementsBySourceFile entities', entities)
        return entities
    },
    async getModelElementsByTypeProps(input, libraries, ctx, callback) {
        console.log('input', input)
        const { PlatformApi } = libraries
        let iaf_ext_current_bim_model = PlatformApi.IafScriptEngine.getVar('iaf_ext_current_bim_model')
        let iaf_ext_elements_collection = PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')
        let type_elements_coll = await PlatformApi.IafScriptEngine.getCollectionInComposite(iaf_ext_current_bim_model._userItemId, {
            _userType: "rvt_type_elements"
        }, ctx)
        let bimQuery
        if (input.entityInfo['Revit Type']) {
            bimQuery = {
                query: {
                    parent: {
                        query: {
                            "properties.Revit Family.val": input.entityInfo['Revit Family'][0],
                            "properties.Revit Type.val": input.entityInfo['Revit Type'][0]
                        },
                        collectionDesc: {
                            _userType: type_elements_coll._userType,
                            _userItemId: type_elements_coll._userItemId
                        },
                        options: {
                            page: {
                                getAllItems: true
                            },
                            project: {
                                _id: 1
                            }
                        }
                    },
                    related: [
                        {
                            relatedDesc: {
                                _isInverse: true,
                                _relatedUserType: 'rvt_elements',
                                _relatedUserItemVersionId: iaf_ext_elements_collection._userItemVersionId
                            },
                            options: {
                                project: {
                                    _id: 1
                                }
                            },
                            as: 'revitElements'
                        }
                    ]
                }
            }
        } else {
            bimQuery = {
                query: {
                    parent: {
                        query: {
                            'properties.Revit Family.val': input.entityInfo['Revit Family'][0]
                        },
                        collectionDesc: {
                            _userType: type_elements_coll._userType,
                            _userItemId: type_elements_coll._userItemId
                        },
                        options: {
                            page: {
                                getAllItems: true
                            },
                            project: {
                                _id: 1
                            }
                        }
                    },
                    related: [
                        {
                            relatedDesc: {
                                _isInverse: true,
                                _relatedUserType: 'rvt_elements',
                                _relatedUserItemVersionId: iaf_ext_elements_collection._userItemVersionId
                            },
                            options: {
                                project: {
                                    _id: 1
                                }
                            },
                            as: 'revitElements'
                        }
                    ]
                }
            }
        }
        let fetchedTypeElems = await PlatformApi.IafScriptEngine.findWithRelated(bimQuery.query, ctx)
        console.log('fetchedTypeElems', fetchedTypeElems)
        let queries = fetchedTypeElems._list.map(e =>
            e.revitElements._list.map(re => {
                return {
                    parent: {
                        query: {
                            _id: re._id
                        },
                        collectionDesc: {
                            _userType: 'rvt_elements',
                            _userItemId: iaf_ext_elements_collection._userItemId
                        },
                        options: {
                            page: {
                                getAllItems: true
                            }
                        },
                        sort: {
                            _id: 1
                        }
                    },
                    related: [
                        {
                            relatedDesc: {
                                _relatedUserType: 'rvt_type_elements'
                            },
                            as: 'Revit Type Properties'
                        },
                        {
                            relatedDesc: {
                                _relatedUserType: 'rvt_element_props'
                            },
                            as: 'Revit Element Properties'
                        }
                    ]
                }
            })
        )
        queries = _.flatten(queries)
        let elements = await PlatformApi.IafScriptEngine.findWithRelatedMulti(queries, ctx);
        console.log('elements', elements)
        elements = _.flatten(elements.map(e => e._list))
        console.log('elements1', elements)
        let entities = elements.map(e => {
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
        })
        return entities
    },
    async getModelRevitDtTypesForDtCategory(input, libraries, ctx, callback) {
        console.log('input', input)
        const { PlatformApi } = libraries
        let iaf_ext_elements_collection = PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')
        let distinctTypes = await PlatformApi.IafScriptEngine.getDistinct({
            collectionDesc: { _userType: iaf_ext_elements_collection._userType, _userItemId: iaf_ext_elements_collection._userItemId },
            field: 'dtType',
            query: { 'dtCategory': input.input.dtCategory }
        }, ctx)
        console.log('distinctTypes', distinctTypes)
        distinctTypes = _.sortBy(distinctTypes, type => type)
        return distinctTypes
    },
    async getModelRevitDtCategories(input, libraries, ctx, callback) {
        console.log('input', input)
        const { PlatformApi } = libraries
        let iaf_ext_elements_collection = PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')
        let distinctCats = await PlatformApi.IafScriptEngine.getDistinct({
            collectionDesc: { _userType: iaf_ext_elements_collection._userType, _userItemId: iaf_ext_elements_collection._userItemId },
            field: 'dtCategory'
        }, ctx)
        console.log('distinctCats', distinctCats)
        distinctCats = _.sortBy(distinctCats, type => type)
        return distinctCats
    },
    async getModelRevitTypeForFamily(input, libraries, ctx, callback) {
        console.log('input', input)
        const { PlatformApi } = libraries
        let iaf_ext_current_bim_model = PlatformApi.IafScriptEngine.getVar('iaf_ext_current_bim_model')
        let type_elements_coll = await PlatformApi.IafScriptEngine.getCollectionInComposite(iaf_ext_current_bim_model._userItemId, {
            _userType: "rvt_type_elements"
        }, ctx)
        let distinctRevitTypes = await PlatformApi.IafScriptEngine.getDistinct({
            collectionDesc: { _userType: type_elements_coll._userType, _userItemId: type_elements_coll._userItemId },
            field: 'properties.Revit Type.val',
            query: {
                "properties.Revit Family.val": input.input['Revit Family']
            }
        }, ctx)
        console.log('distinctRevitTypes', distinctRevitTypes)
        distinctRevitTypes = _.sortBy(distinctRevitTypes, type => type)
        return distinctRevitTypes
    },
    async getModelRevitFamilies(input, libraries, ctx, callback) {
        console.log('input', input)
        const { PlatformApi } = libraries
        let iaf_ext_current_bim_model = PlatformApi.IafScriptEngine.getVar('iaf_ext_current_bim_model')
        let type_elements_coll = await PlatformApi.IafScriptEngine.getCollectionInComposite(iaf_ext_current_bim_model._userItemId, {
            _userType: "rvt_type_elements"
        }, ctx)
        console.log('type_elements_coll', type_elements_coll)
        let distinctRevitFams = await PlatformApi.IafScriptEngine.getDistinct({
            collectionDesc: { _userType: type_elements_coll._userType, _userItemId: type_elements_coll._userItemId },
            field: 'properties.Revit Family.val'
        }, ctx)
        console.log('distinctRevitFams', distinctRevitFams)
        distinctRevitFams = _.sortBy(distinctRevitFams, type => type)
        return distinctRevitFams
    },
    async getRevitSourceFiles(input, libraries, ctx, callback) {
        console.log('input', input)
        const { PlatformApi } = libraries
        let iaf_ext_elements_collection = PlatformApi.IafScriptEngine.getVar('iaf_ext_elements_collection')
        let distinctSourceFiles = await PlatformApi.IafScriptEngine.getDistinct({
            collectionDesc: { _userType: iaf_ext_elements_collection._userType, _userItemId: iaf_ext_elements_collection._userItemId },
            field: "source_filename"
        }, ctx)
        console.log('distinctSourceFiles', distinctSourceFiles)
        let selects = {
            "Source Files": _.sortBy(distinctSourceFiles, type => type)
        }
        return selects
    },
}
export default modeleleme
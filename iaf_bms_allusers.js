let bms = {
    async getBMSEquipment(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_bms_collection = await PlatformApi.IafScriptEngine.getVar('iaf_bms_collection')
        let equips = await PlatformApi.IafScriptEngine.getItems({
            query: input.entityInfo,
            collectionDesc: { _userType: iaf_bms_collection._userType, _userItemId: iaf_bms_collection._userItemId },
            options: { page: { getAllItems: true } }
        }, ctx)
        let entities = equips.map(equip => {
            return {
                original: equip,
                _id: equip._id,
                "Entity Name": equip.navName,
                properties: equip.ipa_data.properties
            }
        })
        return entities
    },
    async getPoints(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let points = input.entityInfo.original.points.map(point => {
            return {
                navName: point.navName,
                description: point.description,
                "Haystack Tags": Object.entries(point).filter(([_, value]) => value === "m:").map(([key]) => key)
            }
        })
        console.log("return points", points)
        return points
    },
    async editBMSEquipment(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let proj = await PlatformApi.IafProj.getCurrent(ctx)
        let iaf_bms_collection = await PlatformApi.IafScriptEngine.getVar('iaf_bms_collection')
        let original = input.entityInfo.new.original
        let updated = Object.assign(original, { ipa_data: { properties: input.entityInfo.new.properties } })
        let updateItemResult = await PlatformApi.IafScriptEngine.updateItemsBulk({
            _userItemId: iaf_bms_collection._userItemId,
            _namespaces: proj._namespaces,
            items: [updated]
        }, ctx)
        let updateRes = updateItemResult[0][0]
        let res
        if (updateRes === "ok:204") {
            res = {
                success: true,
                result: updateRes
            }
        } else {
            res = {
                success: false,
                message: "Error updating BMS Equipment!"
            }
        }
        return res
    },
    async getDistinctBMSHaystackTags(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_bms_collection = await PlatformApi.IafScriptEngine.getVar('iaf_bms_collection')
        console.log(input,"sad",iaf_bms_collection)
     
        let distinctTags = await PlatformApi.IafScriptEngine.getDistinct({
            collectionDesc: { _userType: iaf_bms_collection._userType, _id: iaf_bms_collection._id },
            field: "ipa_data.Haystack Tags",
            query: {}
        }, ctx)
        let tags = { "Haystack Tags": distinctTags }
        console.log(tags,"sad")
        return tags
    },
    async runBMSSync(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let skysparkRealtimeDatasource = PlatformApi.IafScriptEngine.getVar('skysparkRealtimeDatasource')
        let orchRes = await PlatformApi.IafScriptEngine.runDatasource({
            orchestratorId: skysparkRealtimeDatasource[0].id
        }, ctx);
        return orchRes
    },
    async getRealtimeBMSPointReadings(input, libraries, ctx) {
        let { PlatformApi } = libraries
        console.log("Input Entitiy Info", input.entityInfo)
        console.log("value", input.entityInfo.original.id.value)
        console.log("BMS Realtime Readings, input", input.entityInfo.properties)
        let pointsToFetch
        if (input.entityInfo.properties['Display Points'].val === "All" || input.entityInfo.properties['Display Points'].val === "ALL" || input.entityInfo.properties['Display Points'].val === "all") {
            pointsToFetch = "ALL"
        } else if (!input.entityInfo.properties['Display Points'].val || input.entityInfo.properties['Display Points'].val === "None" || input.entityInfo.properties['Display Points'].val === "NONE" || input.entityInfo.properties['Display Points'].val === "none") {
            pointsToFetch = "NONE"
        } else {
            pointsToFetch = "SOME"
            let pointNavNames = input.entityInfo.properties['Display Points'].val.map(navName => { return { navName: _.trim(navName) } })
            console.log("pointNavNames", pointNavNames)
        }
        console.log("pointsToFetch", pointsToFetch)
        let points
        let orchRes = null
        if (pointsToFetch != "NONE") {
            let skysparkRealtimeDatasource = PlatformApi.IafScriptEngine.getVar('skysparkRealtimeDatasource')
            console.log("skysparkRealtimeDatasource", skysparkRealtimeDatasource)
            orchRes = await PlatformApi.IafScriptEngine.runDatasource({
                orchestratorId: skysparkRealtimeDatasource[0].id,
                _actualparams: [{
                    sequence_type_id: skysparkRealtimeDatasource[0].orchsteps[0]._compid,
                    params: {
                        action: "readall",
                        cmd: `point and equipRef == @${input.entityInfo.original.id.value}`
                    }
                }]
            }, ctx);
            console.log("orchRes", orchRes)
            if (pointsToFetch === "ALL") {
                console.log("came here - all")
                console.log("orchRes")
                points = orchRes._result.readall
            } else {
                console.log("came here - some")
                console.log("orchRes")
                points = orchRes._result.readall.map(point => { return { navName: pointNavNames[point.navName] } })
            }
        } else {
            points = null
        }
        console.log("BMS Realtime Readings points, points")
        let pointReadings = null
        if (points) {
            pointReadings = { points: points }
        }
        console.log("pointReadings", pointReadings)
        return pointReadings
    },
    async getAllRealtimeAssetPointReadings(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_asset_collection = await PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
        let iaf_bms_collection = await PlatformApi.IafScriptEngine.getVar('iaf_bms_collection')
        let bms_query = {
            query: {
                parent: {
                    query: {
                        _id: input.entityInfo._id
                    },
                    collectionDesc: {
                        _userType: iaf_asset_collection._userType,
                        _userItemId: iaf_asset_collection._userItemId
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
                            _relatedUserType: iaf_bms_collection._userType
                        },
                        as: bmsequipment,
                        options: {
                            project: {
                                _id: 1,
                                id: 1,
                                'ipa_data.properties.Display Points.val': 1
                            }
                        }
                    }
                ]
            }
        }
        let asset_bms = await PlatformApi.IafScriptEngine.findWithRelated(bms_query.query, ctx);
        let equipmentMap = asset_bms._list[0].bmsequipment._list.map(singleEquip => Object.assign({ equip: singleEquip.id.display },
            singleEquip.ipa_data.properties['Display Points'].val === 'All' ||
                singleEquip.ipa_data.properties['Display Points'].val === 'ALL' ||
                singleEquip.ipa_data.properties['Display Points'].val === 'all' ? { pointsToFetch: 'ALL' } :
                singleEquip.ipa_data.properties['Display Points'].val === 'None' ||
                    singleEquip.ipa_data.properties['Display Points'].val === 'NONE' ||
                    singleEquip.ipa_data.properties['Display Points'].val === 'none' ? { pointsToFetch: 'NONE' } :
                    { pointsToFetch: 'SOME', pointNavNames: singleEquip.ipa_data.properties['Display Points'].val.split(',').map(navName => _.trim(navName)) }
        ))
        let bmsEquipResult = asset_bms._list[0].bmsequipment._list.map(bmseq => {
            if (bmseq.id.value === asset_bms._list[0].bmsequipment._list[0].id.value) {
                return `equipRef == @${bmseq.id.value}`
            } else {
                return ` or equipRef == @${bmseq.id.value}`
            }
        })
        let joinedEquip = bmsEquipResult.join("")
        let equipCommand = `(${joinedEquip})`
        let equipmentsWithNoPointsToFetch = equipmentMap.filter(equipment => equipment.pointsToFetch === "NONE")
        let equipmentsWithAllPointsToFetch = equipmentMap.filter(equipment => equipment.pointsToFetch === "ALL")
        let orchRes = null
        if (equipmentsWithNoPointsToFetch.length != equipmentMap.length) {
            let skysparkRealtimeDatasource = PlatformApi.IafScriptEngine.getVar('skysparkRealtimeDatasource')
            orchRes = await PlatformApi.IafScriptEngine.runDatasource({
                orchestratorId: skysparkRealtimeDatasource[0].id,
                _actualparams: [
                    {
                        sequence_type_id: skysparkRealtimeDatasource[0].orchsteps[0]._compid,
                        params: {
                            action: "readall",
                            cmd: equipCommand
                        }
                    }
                ]
            }, ctx);
        }
        let filteredPoints = null
        if (orchRes) {
            if (equipmentsWithAllPointsToFetch.length === equipmentMap.length) {
                filteredPoints = { points: orchRes._result.readall }
            } else {
                filteredPoints = {
                    points: orchRes._result.readall.filter(point => {
                        if (equipmentMap['point.equipRef.display'].pointsToFetch === 'NONE') {
                            return [1, 2]
                        } else if (equipmentMap['point.equipRef.display'].pointsToFetch === 'ALL') {
                            return [1, 1]
                        } else {
                            return { navName: point.navName }
                        }
                    })
                }
            }
        } else {
            filteredPoints = null
        }
        return filteredPoints
    },

}

export default bms
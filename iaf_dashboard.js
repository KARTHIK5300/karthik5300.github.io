let dash = {
    async getPropertyInfo(input, libraries, ctx, callback) {
        return {
            "ImageFile": {
                "fileId": null
            }
        }
    },
    async getOccupancy(input, libraries, ctx, callback) {
        return {
            "Occupied": 70,
            "Available": 20,
            "Other": 10
        }
    },
    async getCapExForecast(input, libraries, ctx, callback) {
        return {
            "2020": 1.5,
            "2021": 2,
            "2022": 0.75,
            "2023": 0.25,
            "2024": 1.5
        }
    },
    async getEquipmentPointReadings(input, libraries, ctx, callback) {
        return { "pointReadings": null }
    },
    async crossEntitySearch(input, libraries, ctx, callback) {
        let { PlatformApi } = libraries
        let iaf_entityCollectionMap = await PlatformApi.IafScriptEngine.getVar('iaf_entityCollectionMap')
        let iaf_entityNamePropMap = await PlatformApi.IafScriptEngine.getVar('iaf_entityNamePropMap')
        console.log('iaf_entityCollectionMap', iaf_entityCollectionMap)
        console.log('iaf_entityNamePropMap', iaf_entityNamePropMap)
        let entityTypeCollections = input.entityTypes.map(et => iaf_entityCollectionMap[et])
        console.log('entityTypeCollections', entityTypeCollections)
        let queries = entityTypeCollections.map(etcoll => {
            return {
                query: input.searchQuery,
                _userItemId: etcoll._userItemId,
                options: { page: { getAllItems: true } }
            }
        })
        let foundItems = await PlatformApi.IafScriptEngine.getItemsMulti(queries, ctx)
        let zippedRes = _.zip(input.entityTypes, foundItems)
        let resItems = zippedRes.map(combo => combo[1].map(entResult => {
            console.log('entResult', entResult)
            return {
                entityType: combo[0],
                //entityName: { $value: [{ $value: ["$$combo[0]", "$iaf_entityNamePropMap"] }, "$$entResult"] },
                entityName: entResult[iaf_entityNamePropMap[combo[0]]],
                _id: entResult._id
            }
        }))
        return _.flatten(resItems)
    },

}

export default dash
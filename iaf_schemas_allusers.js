let schemas = {
    async createEntityFromSchema(input, libraries, ctx) {
        let { PlatformApi, UiUtils } = libraries
        console.log('createEntityFromSchema input', input)
        let iaf_schema_collection = await PlatformApi.IafScriptEngine.getVar('iaf_schema_collection')
        let findSchema = await PlatformApi.IafScriptEngine.findInCollections({
            query: { entity: input.entityType },
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
        let hydratedObject
        if (findSchema._list) {
            hydratedObject = await UiUtils.IafDataPlugin.generateSchemaObject(findSchema._list[0].schema)

        }
        return hydratedObject
    },
    async updateEntityFromSchema(input, libraries, ctx) {
        let { PlatformApi, UiUtils } = libraries
        console.log('createEntityFromSchema input', input)
        let iaf_schema_collection = await PlatformApi.IafScriptEngine.getVar('iaf_schema_collection')
        let findSchema = await PlatformApi.IafScriptEngine.findInCollections({
            query: { entity: input.entityType },
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
        let hydratedObject
        let updatedEntity
        if (findSchema._list) {
            hydratedObject = await UiUtils.IafDataPlugin.generateSchemaObject(findSchema._list[0].schema)
            let updatedProps = Object.assign(hydratedObject.properties, input.entity.properties);
            updatedEntity = Object.assign(hydratedObject.properties, input.entity.properties);
            return updatedEntity
        }
        return updatedEntity
    },

}
export default schemas
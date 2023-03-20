let picklist = {
    async getPickList(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_pick_list_collection = await PlatformApi.IafScriptEngine.getVar('iaf_pick_list_collection')

        console.log('input', input)
        let pickListValues = await PlatformApi.IafScriptEngine.getItems({
            query: { type: input.type },
            collectionDesc: { _userType: iaf_pick_list_collection._userType, _userItemId: iaf_pick_list_collection._userItemId },
            options: {
                page: { getAllItems: true },
            }
        }, ctx)

        return pickListValues
    },
    async updatePickList(input, libraries, ctx) {
        let { PlatformApi } = libraries
        let iaf_pick_list_collection = await PlatformApi.IafScriptEngine.getVar('iaf_pick_list_collection')
        let currentProj = await PlatformApi.IafProj.getCurrent(ctx)
        console.log('input', input)
        let current_picklist = await PlatformApi.IafScriptEngine.getItems({
            query: { type: input.pickList.type },
            _userItemId: iaf_pick_list_collection._userItemId,
            options: {
                page: { getAllItems: true }
            }
        }, ctx)
        let actual_picklist = current_picklist[0]
        let updated_values = actual_picklist.values.concat(input.pickList.newValue)
        let updated = Object.assign(actual_picklist, { values: updated_values })
        let updateItemResult = await PlatformApi.IafScriptEngine.updateItemsBulk({
            _userItemId: iaf_pick_list_collection._userItemId,
            _namespaces: currentProj._namespaces,
            items: [updated]
        }, ctx);
        if (input.pickList.newType) {
            let new_pick_list = [{ type: input.pickList.newType, values: [] }]
            let default_pick_list_collection_result = await PlatformApi.IafScriptEngine.createItems({
                _userItemId: iaf_pick_list_collection._userItemId,
                _namespaces: currentProj._namespaces,
                items: new_pick_list
            }, ctx)
            return default_pick_list_collection_result
        }
    },

}
export default picklist
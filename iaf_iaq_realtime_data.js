
export default {
    async createCollection(params, libraries, ctx) {
        let { PlatformApi, IafScriptEngine } = libraries
        let proj = await PlatformApi.IafProj.getCurrent(ctx)

        let iaq_coll = await IafScriptEngine.getCollection({
            _userType: "iaf_ext_points_coll",
            _shortName: "iaq_coll",
            _itemClass: "NamedUserCollection",
        }, ctx
        )
        if (!iaq_coll) {
            iaq_coll = await IafScriptEngine.createOrRecreateCollection(
                {
                    _name: 'IKON IAQ Collection',
                    _shortName: 'iaq_coll',
                    _description: 'IAQ Points Collection',
                    _userType: 'iaf_ext_points_coll',
                    _namespaces: proj._namespaces
                }, ctx)
        }
        return {
            "getCollection": iaq_coll
        }
    },
    async getValues(params, libraries, ctx) {
        const { IafScriptEngine } = libraries;
        let assets = await IafScriptEngine.getItems({
            query: {},
            collectionDesc: {
                _userType: 'iaf_ext_points_coll',
                _namespaces: params.inparams.getCollection._namespaces
            },
            options: { page: { getAllItems: true } }
        }, ctx)
        return {
            "getValues": assets
        }
    },

    async updateData(params, libraries, ctx) {
        console.log("getValues", JSON.stringify(params.inparams.getValues.length))
        console.log("readallLength", params.inparams.readall.length)
        let { IafScriptEngine } = libraries
        let _now = `timestamp '${new Date().toISOString()}'`;
        let updateObj = []
        if (params.inparams.getValues.length > 0) {
            params.inparams.readall.filter((x) => {
                return params.inparams.getValues.some((pt) => {
                    if (pt.pointid === x.id.value) {
                        updateObj.push({
                            _id: pt._id,
                            pointid: x.id.value,
                            value: x.curVal,
                            updatedat: _now
                        })
                    }
                });
            });
            if (updateObj.length > 0) {
                console.log(updateObj.length, "updateObj")
                await IafScriptEngine.updateItemsBulk(
                    {
                        _userItemId: params.inparams.getCollection._userItemId,
                        _namespaces: params.inparams.getCollection._namespaces,
                        items: updateObj
                    }, ctx
                )
            }
            let _newPts = params.inparams.readall.filter((pts) => {
                return params.inparams.getValues.every((fd) => fd.pointid !== pts.id.value);
            });
            console.log(_newPts.length, "_newPtslength")
            if (_newPts.length > 0) {

                let assetObjects = _newPts.map((pts) => {
                    let aObj = { "pointid": pts.id.value, "value": pts.curVal, "unit": pts.unit, "navname": pts.navName, "updatedat": _now }
                    return aObj
                })
                console.log(assetObjects.length, "inside _newPts.length")
                await IafScriptEngine.createItemsBulk(
                    {
                        _userItemId: params.inparams.getCollection._userItemId,
                        _namespaces: params.inparams.getCollection._namespaces,
                        items: assetObjects
                    }, ctx
                )
            }
        } else {
            let assetObjects = params.inparams.readall.map((pts) => {
                let aObj = { "pointid": pts.id.value, "value": pts.curVal, "unit": pts.unit, "navname": pts.navName, "updatedat": _now }
                return aObj
            })
            console.log(assetObjects.length, "inside else cond")
            await IafScriptEngine.createItemsBulk(
                {
                    _userItemId: params.inparams.getCollection._userItemId,
                    _namespaces: params.inparams.getCollection._namespaces,
                    items: assetObjects
                }, ctx
            )

        }
    }
}
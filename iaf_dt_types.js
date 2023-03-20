let types = {
  async getCategoriesWithCount(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_asset_collection = await PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
    let distinctCats = await PlatformApi.IafScriptEngine.getDistinct({
      collectionDesc: { _userType: iaf_asset_collection._userType, _id: iaf_asset_collection._id },
      field: "properties.dtCategory.val",
      query: {}
    }, ctx)
    //check this
    distinctCats = _.sortBy(distinctCats, cat => cat._id)
    let distinctCatWithTypeCountQuery = distinctCats.map(cat => {
      return {
        _userItemId: iaf_asset_collection._id,
        query: { "properties.dtCategory.val": cat },
        options: { page: { _pageSize: 0, getPageInfo: true } }
      }
    })
    let catsPageInfo = await PlatformApi.IafScriptEngine.getItemsMulti(distinctCatWithTypeCountQuery, ctx);
    let distinctCatsWithPageInfo = _.zip(distinctCats, catsPageInfo)
    let distinctCatsWithTypeCount = distinctCatsWithPageInfo.map(catWithPage => {
      return {
        name: catWithPage[0],
        childCount: catWithPage[1]._total
      }
    })
    return distinctCatsWithTypeCount
  },
  async getArchieveTypesWithCount(input, libraries, ctx) {
    console.log("input", input)
    let { PlatformApi } = libraries
    let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
    let distinctTypes = await PlatformApi.IafScriptEngine.getDistinct({
        collectionDesc: {_userType: iaf_ext_files_coll._userType, _id: iaf_ext_files_coll._id },
        field: "fileAttributes.Document Type",
        query: {}
    }, ctx)
    console.log('distinctTypes', distinctTypes)
    let sortedDistinctTypes =  _.sortBy(distinctTypes)
    let distinctTypeWithTypeCountQuery = _.map(sortedDistinctTypes, cat =>{
        return {
    _userItemId: iaf_ext_files_coll._id,
    query: {"fileAttributes.Document Type":  cat,"isArchieve": { $eq: true } },
    options: {page: {_pageSize: 0, getPageInfo: true}}
    }
    })
    let typesPageInfo = await PlatformApi.IafScriptEngine.getItemsMulti(distinctTypeWithTypeCountQuery, ctx);
    let distinctTypesWithPageInfo = _.zip(distinctTypes, typesPageInfo)
    let distinctTypesWithTypeCount = _.map(distinctTypesWithPageInfo, typeWithPage=>{
        return {
            name: typeWithPage[0],
            childCount:  typeWithPage[1]._total
          }
    })
    distinctTypesWithTypeCount = _.filter(distinctTypesWithTypeCount, x=>{
      return x.childCount != 0
    })
    return distinctTypesWithTypeCount
  }, 
  async getDtTypesWithChildrenCount(input, libraries, ctx, callback) {
    console.log("input", input)
    let { PlatformApi } = libraries
    let iaf_asset_collection = await PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
    let distinctTypes = await PlatformApi.IafScriptEngine.getDistinct({
      collectionDesc: { _userType: iaf_asset_collection._userType, _id: iaf_asset_collection._id },
      field: 'properties.dtType.val',
      query: { "properties.dtCategory.val": input.input.dtCategory }
    }, ctx)
    console.log('distinctTypes', distinctTypes)
    let distinctTypestWithChildCountQuery = distinctTypes.map(type => {
      return {
        _userItemId: iaf_asset_collection._id,
        query: {
          'properties.dtCategory.val': input.input.dtCategory,
          'properties.dtType.val': type
        },
        options: { page: { _pageSize: 0, getPageInfo: true } }
      }
    })
    console.log('distinctTypestWithChildCountQuery', distinctTypestWithChildCountQuery)
    let typesPageInfo = await PlatformApi.IafScriptEngine.getItemsMulti(distinctTypestWithChildCountQuery, ctx);

    console.log('typesPageInfo', typesPageInfo)
    let distinctTypesWithPageInfo = _.zip(distinctTypes, typesPageInfo)
    console.log('distinctTypesWithPageInfo', distinctTypesWithPageInfo)

    let distinctTypesWithChildrenCount = distinctTypesWithPageInfo.map(typeWithpage => {
      return {
        name: typeWithpage[0],
        childCount: typeWithpage[1]._total
      }
    })
    console.log('distinctTypesWithChildrenCount', distinctTypesWithChildrenCount)
    return distinctTypesWithChildrenCount
  },
  async getDtCategories(input, libraries, ctx, callback) {
    console.log("input", input)
    let { PlatformApi } = libraries
    let iaf_typedef_collection = await PlatformApi.IafScriptEngine.getVar('iaf_typedef_collection')
    let distinctCats = await PlatformApi.IafScriptEngine.getDistinct({
      collectionDesc: { _userType: iaf_typedef_collection._userType, _id: iaf_typedef_collection._id },
      field: 'dtCategory',
      query: {}
    }, ctx)
    console.log('distinctCats', distinctCats)
    console.log('distinctCats sorted', _.sortBy(distinctCats))
    return _.sortBy(distinctCats)
  },
  async getDtTypes(input, libraries, ctx, callback) {
    console.log("input", input)
    let { PlatformApi } = libraries
    let iaf_typedef_collection = await PlatformApi.IafScriptEngine.getVar('iaf_typedef_collection')
    let distinctTypes = await PlatformApi.IafScriptEngine.getDistinct({
      collectionDesc: { _userType: iaf_typedef_collection._userType, _id: iaf_typedef_collection._id },
      field: 'dtType',
      query: {
        dtCategory: input.dtCategory
      }
    }, ctx)
    console.log('distinctTypes', distinctTypes)
    return distinctTypes
  },
}

export default types
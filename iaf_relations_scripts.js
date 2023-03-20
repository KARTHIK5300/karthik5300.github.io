let relations = {
    //I cannot test this one since I cannot save them
    async getEntityRelatedItems(input, libraries, ctx) {
        let { PlatformApi } = libraries
        console.log('input', input)
        let iaf_entityCollectionMap = await PlatformApi.IafScriptEngine.getVar('iaf_entityCollectionMap')
        console.log('iaf_entityCollectionMap', iaf_entityCollectionMap)
        let childrenTypesForQuery = input.childrenTypes.map(childType => {
            if (!_.isEmpty(iaf_entityCollectionMap[childType.singular])) {
                return {
                    relatedDesc: {
                        _relatedUserType: iaf_entityCollectionMap[childType.singular]._userType,
                        _isInverse: childType.isParent ? true : false
                    },
                    as: childType.singular
                }
            } else {
                return undefined
            }
        }).filter(x => x !== undefined)
        console.log('childrenTypesForQuery', childrenTypesForQuery)
        let getChildrenQuery = input.parentEntities.map(parentEntity => {
            return {
                parent: {
                    query: {
                        _id: parentEntity._id
                    },
                    collectionDesc: {
                        _userType: iaf_entityCollectionMap[parentEntity.entityType]._userType,
                        _userItemId: iaf_entityCollectionMap[parentEntity.entityType]._userItemId,
                    },
                    options: {
                      page: {
                          getAllItems: true
                      }
                    }
                },
                related: childrenTypesForQuery
            }
        })
        console.log('getChildrenQuery', getChildrenQuery)
        let childrenQueryResults = await PlatformApi.IafScriptEngine.findWithRelatedMulti(getChildrenQuery, ctx);
        console.log('childrenQueryResults', childrenQueryResults)
        return childrenQueryResults.map(result => result._list[0])
    },
    //updaterelation doesnt seems to work on asset relations to assets
    async updateRelations(input, libraries, ctx) {
        let { PlatformApi } = libraries
        console.log('updaterelations input', input)
        let iaf_entityCollectionMap = await PlatformApi.IafScriptEngine.getVar('iaf_entityCollectionMap')
        let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
        let parentCollection = iaf_entityCollectionMap[input.parentEntityType]
        console.log('parentCollection', parentCollection)
        let childrenCollection = iaf_entityCollectionMap[input.childrenEntityType]
        console.log('childrenCollection', childrenCollection)
        let relatedItems = input.parentEntitiesWithNewChildren.map(parent => {
          return {
            parentItem: {_id: parent._id},
            relatedItems: parent.childrenMap[input.childrenEntityType].map((c) => {return {_id: c._id}})
          }
        })
        console.log('relatedItems', relatedItems)
        let unrelatedItems = input.parentEntitiesWithDeletedChildren.map(parent => {
            return {
                parentItem: parent,
                relatedItems: parent.childrenMap[input.childrenEntityType]
            }
        })
        console.log('unrelatedItems', unrelatedItems)
        console.log('relatePayload', {
          parentUserItemId: parentCollection._userItemId,
          _userItemId: childrenCollection._userItemId,
          _namespaces: IAF_workspace._namespaces,
          relations: relatedItems
        })
        let newRelationsResult = await PlatformApi.IafScriptEngine.createRelations({
            parentUserItemId: parentCollection._userItemId,
            _userItemId: childrenCollection._userItemId,
            _namespaces: IAF_workspace._namespaces,
            relations: relatedItems
        }, ctx);
        console.log('newRelationsResult', newRelationsResult)
        let removedRelationsResult = await PlatformApi.IafScriptEngine.removeRelations({
            parentUserItemId: parentCollection._userItemId,
            _userItemId: childrenCollection._userItemId,
            _namespaces: IAF_workspace._namespaces,
            relations: unrelatedItems
        }, ctx);
        console.log('removedRelationsResult', removedRelationsResult)
        return { success: true }
    },
  
  }
  export default relations
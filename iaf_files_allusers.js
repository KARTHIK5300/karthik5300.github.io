let files = {
  async loadFileAttributes(input, libraries, ctx) {
		let { PlatformApi } = libraries
		let proj = await PlatformApi.IafProj.getCurrent(ctx)
  
		let fileAttributesList = await PlatformApi.IafScriptEngine.getItems({
			query: {},
			collectionDesc: {
			_userType: 'iaf_cde_file_attrib_coll',
			_namespaces: proj._namespaces
			}
		}, ctx)
  
		console.log('fileAttributes', fileAttributesList)
		
		let fieldAttribVals = fileAttributesList ? fileAttributesList[0] : {}
		PlatformApi.IafScriptEngine.setVar('iaf_ext_fileAttributes', fieldAttribVals)

		console.log('fieldAttribVals', fieldAttribVals)

		var attributeKeys = Object.entries(fieldAttribVals).map(([key, value]) => ({key,value}));

		console.log('attrKeys', attributeKeys)

		let props = []

		for(var i = 0; i < attributeKeys.length; i++){ 
			props.push({prop: attributeKeys[i].key, dName: attributeKeys[i].key}); 
		} 

		PlatformApi.IafScriptEngine.setVar('iaf_attributeDisplayNames', props)
	},
  
  async getFileAttributeSelects(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
    console.log("iaf_ext_files_coll", iaf_ext_files_coll)
    let distinctOriginators = await PlatformApi.IafScriptEngine.getDistinct({
      collectionDesc: { _userType: iaf_ext_files_coll._userType, _id: iaf_ext_files_coll._id },
      field: "fileAttributes.Originator",
      query: {}
    }, ctx)
    console.log('distinctOriginators', distinctOriginators)
    distinctOriginators = distinctOriginators.filter(attval => attval != '')
    console.log('distinctOriginators2', distinctOriginators)
    distinctOriginators = _.sortBy(distinctOriginators, a => a)
    console.log('distinctOriginators3', distinctOriginators)
    let distinctLevels = await PlatformApi.IafScriptEngine.getDistinct({
      collectionDesc: { _userType: iaf_ext_files_coll._userType, _id: iaf_ext_files_coll._id },
      field: "fileAttributes.Levels And Locations",
      query: {}
    }, ctx)
    console.log('distinctLevels', distinctLevels)
    distinctLevels = distinctLevels.filter(attval => attval)
    console.log('distinctLevels2', distinctLevels)
    distinctLevels = _.sortBy(distinctLevels, a => a)
    console.log('distinctDocTypes3', distinctLevels)
    let distinctFileTypes = await PlatformApi.IafScriptEngine.getDistinct({
      collectionDesc: { _userType: iaf_ext_files_coll._userType, _id: iaf_ext_files_coll._id },
      field: "fileAttributes.File Type",
      query: {}
    }, ctx)
    console.log('distinctFileTypes', distinctFileTypes)
    distinctFileTypes = distinctFileTypes.filter(attval => attval)
    console.log('distinctFileTypes2', distinctFileTypes)
    distinctFileTypes = _.sortBy(distinctFileTypes, a => a)
    console.log('distinctFileTypes3', distinctFileTypes)
    let scriptedSelectProps = {
      Originator: distinctOriginators,
      "Levels And Locations": distinctLevels,
      "File Type": distinctFileTypes
    }
    return scriptedSelectProps
  },
  async getFiles(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
    let fileItems = await PlatformApi.IafScriptEngine.getFileItems(
      {
        collectionDesc: { _userType: iaf_ext_files_coll._userType, _userItemId: iaf_ext_files_coll._userItemId },
        query: {...input.entityInfo,"isArchieve": { $ne: true }},
        options: { page: { getAllItems: true } }
      }, ctx
    )
    console.log('fileItems', fileItems)
    let propDispNames = PlatformApi.IafScriptEngine.getVar('iaf_attributeDisplayNames')
    let filesAsEntities = fileItems.map(file => {
      let filePropNamesOrig = Object.keys(file.fileAttributes)
      let fileProps = {}
      for (let i = 0; i < filePropNamesOrig.length; i++) {
        let filePropInfo = _.find(propDispNames, {prop: filePropNamesOrig[i]})
        if(filePropInfo)
        fileProps[filePropInfo.dName] = {
          dName: filePropInfo.dName,
          type: filePropNamesOrig[i] === 'dtCategory' || filePropNamesOrig[i] === 'dtType' ? '<HIERARCHY>' : 'text',
          val: file.fileAttributes[filePropNamesOrig[i]] || null
        }
      }

      return {
        _id: file._id,
        _fileId: file._fileId,
        ...file,
        "Entity Name": file.name,
        properties: fileProps
      }
    })
    console.log('fileAsEntities', filesAsEntities)
    return filesAsEntities
  },

  async getContributors(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_fileAttributes = await PlatformApi.IafScriptEngine.getVar('iaf_ext_fileAttributes')
    let scriptValues = { Contributor: iaf_ext_fileAttributes.Contributor }
    return scriptValues
  },

  async getOriginators(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_fileAttributes = await PlatformApi.IafScriptEngine.getVar('iaf_ext_fileAttributes')
    let scriptValues = { Originator: iaf_ext_fileAttributes.Originator }
    return scriptValues
  },

  async getBuildings(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_fileAttributes = await PlatformApi.IafScriptEngine.getVar('iaf_ext_fileAttributes')
    let scriptValues = { Building: iaf_ext_fileAttributes.Building }
    return scriptValues
  },
  
  async getLevelsAndLocations(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_fileAttributes = await PlatformApi.IafScriptEngine.getVar('iaf_ext_fileAttributes')
    let scriptValues = { 'Levels And Locations': iaf_ext_fileAttributes['Levels And Locations'] }
    return scriptValues
  },

  async getDocumentTypes(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_fileAttributes = await PlatformApi.IafScriptEngine.getVar('iaf_ext_fileAttributes')
    let scriptValues = { 'Document Type': iaf_ext_fileAttributes['Document Type'] }
    return scriptValues
  },

  async getFileDisciplines(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_fileAttributes = await PlatformApi.IafScriptEngine.getVar('iaf_ext_fileAttributes')
    let scriptValues = { 'File Discipline': iaf_ext_fileAttributes['File Discipline'] }
    return scriptValues
  },

  async getManufacturers(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
    let distinctManu = await PlatformApi.IafScriptEngine.getDistinct({
      collectionDesc: { _userType: iaf_ext_files_coll._userType, _id: iaf_ext_files_coll._id },
      field: "fileAttributes.Manufacturer",
      query: {}
    }, ctx)
    
    distinctManu = distinctManu.filter(attval => attval)

    distinctManu = _.sortBy(distinctManu, a => a)

    let scriptValues = { Manufacturer: distinctManu }
    return scriptValues
  },

  async getFileTypes(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_fileAttributes = await PlatformApi.IafScriptEngine.getVar('iaf_ext_fileAttributes')
    let scriptValues = { 'File Type': iaf_ext_fileAttributes['File Type'] }
    return scriptValues
  },

  async getRevisions(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
    let distinctRevision = await PlatformApi.IafScriptEngine.getDistinct({
      collectionDesc: { _userType: iaf_ext_files_coll._userType, _id: iaf_ext_files_coll._id },
      field: "fileAttributes.Revision",
      query: {}
    }, ctx)
    
    distinctRevision = distinctRevision.filter(attval => attval)

    distinctRevision = _.sortBy(distinctRevision, a => a)

    let scriptValues = { Revision: distinctRevision }
    return scriptValues
  },

  async getStageDescriptions(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_fileAttributes = await PlatformApi.IafScriptEngine.getVar('iaf_ext_fileAttributes')
    let scriptValues = { 'Stage Description': iaf_ext_fileAttributes['Stage Description'] }
    return scriptValues
  },


  async preprocessUploadFiles(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
    console.log('input', input)
    let fileQueries = input.files.map(file => {
      return {
        query: { name: file.name },
        _userItemId: iaf_ext_files_coll._userItemId,
        options: { page: { getAllItems: true } }
      }
    })
    console.log('fileQueries', fileQueries)
    let fileItems = await PlatformApi.IafScriptEngine.getItemsMulti(fileQueries, ctx)
    fileItems = _.flatten(fileItems)
    console.log('fileItems', fileItems)
    let accepted = input.files.map(file => {
      let fileFound = _.find(fileItems, { name: file.name })
      if (fileFound) {
        file.fileItem = { fileAttributes: fileFound.fileAttributes }
      } else {
        file.fileItem = { fileAttributes: {} }
      }
      console.log('file', file)
      return file
    })
    console.log('accepted', accepted)
    return { accepted: accepted }
  },
  async getRevisions(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')

    console.log('getRevisions INPUT', input)
    let distinctRevs = await PlatformApi.IafScriptEngine.getDistinct({
      collectionDesc: { _userType: iaf_ext_files_coll._userType, _id: iaf_ext_files_coll._id },
      field: "fileAttributes.revision",
      query: {}
    }, ctx)
    distinctRevs = distinctRevs.filter(attval => attval != '')
    distinctRevs = _.sortBy(distinctRevs, rev => rev._id)
    let scriptValues = { Revision: distinctRevs }
    return scriptValues
  },
  async getCategoryOfFiles(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')

    console.log('getCategoryOfFiles INPUT', input)
    let distinctFileCategories = await PlatformApi.IafScriptEngine.getDistinct({
      collectionDesc: { _userType: iaf_ext_files_coll._userType, _id: iaf_ext_files_coll._id },
      field: 'fileAttributes.dtCategory',
      query: {}
    }, ctx)
    let sortedCategories = _.sortBy(distinctFileCategories, rev => rev.name)
    return sortedCategories
  },
  async getTypesOfFilesForCategory(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')

    console.log('getCategoryOfFiles INPUT', input)
    let distinctFileTypes = await PlatformApi.IafScriptEngine.getDistinct({
      collectionDesc: { _userType: iaf_ext_files_coll._userType, _id: iaf_ext_files_coll._id },
      field: 'fileAttributes.dtType',
      query: { 'fileAttributes.dtCategory': input.dtCategory }
    }, ctx)
    let sortedTypes = _.sortBy(distinctFileTypes, rev => rev.name)
    return sortedTypes
  },
  async getAssetsForFile(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
    let iaf_asset_collection = PlatformApi.IafScriptEngine.getVar('iaf_asset_collection')
    console.log("iaf_asset_collection", iaf_asset_collection)
    console.log('getAssetsForFile INPUT', input)
    let assetQuery = [{
      parent: {
        query: { _id: input.entityInfo._id },
        collectionDesc: { _userType: iaf_ext_files_coll._userType, _userItemId: iaf_ext_files_coll._userItemId },
        options: { page: { getAllItems: true } },
        sort: { _id: 1 }
      },
      related: [
        {
          relatedDesc: { _relatedUserType: iaf_asset_collection._userType, _isInverse: true },
          as: 'AssetInfo'
        }
      ]
    }]
    let queryResults = await PlatformApi.IafScriptEngine.findWithRelatedMulti(assetQuery, ctx)
    console.log("queryResults", queryResults)
    let assets = queryResults[0]._list[0].AssetInfo._list
    console.log("assets", assets)
    let assetForTheFile
    let finalAssetForTheFile
    let header = [["Asset Name", "Mark", "Room Number"]]
    if (assets.length > 0) {
      assetForTheFile = assets.map(asset => [
        asset['Asset Name'],
        asset.properties.Mark.val,
        asset.properties["Room Number"].val
      ])
      finalAssetForTheFile = header.concat(assetForTheFile)
    } else {
      finalAssetForTheFile = []
    }
    return finalAssetForTheFile
  },
  async editFile(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
    let iaf_attributeDisplayNames = await PlatformApi.IafScriptEngine.getVar('iaf_attributeDisplayNames')
    console.log("iaf_attributeDisplayNames", iaf_attributeDisplayNames)
    let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')

    let propNames = Object.values(input.entityInfo.new.properties)
    console.log("propNames",propNames)

    let propArrays = []

    propArrays = propNames.map(propInfo => {
      let tempArray = []
      iaf_attributeDisplayNames.forEach(att => {
        if (att.dName === propInfo.dName) {
          tempArray.push(att.prop, propInfo.val)
        }
      });
      return tempArray
    })
    
    console.log("propArrays", JSON.stringify(propArrays))

    let updatedFileItem = [{
      _id: input.entityInfo.new._id,
      name: input.entityInfo.new.name,
      fileAttributes: Object.assign(propArrays),
      _fileId: input.entityInfo.new._fileId,
      containerPath: input.entityInfo.new.containerPath,
      nextVersionNumber: input.entityInfo.new.nextVersionNumber,
      tipVersionNumber: input.entityInfo.new.tipVersionNumber,
      versions: input.entityInfo.new.version
    }]
    let updateItemResult = await PlatformApi.IafScriptEngine.updateItemsBulk({
      _userItemId: iaf_ext_files_coll._userItemId,
      _namespaces: IAF_workspace._namespaces,
      items: updatedFileItem
    }, ctx);
    let res
    if (updateItemResult[0][0] === "ok: 204") {
      res = {
        success: true,
        result: "$updateItemResult[0][0]"
      }
    } else {
      res = {
        success: false,
        message: "Error updating File!"
      }
    }
    return res
  },
  async downloadFileUploadReport(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
    console.log('getAssetsForFile INPUT', input)
    let sheetArrays = [{ sheetName: "Uploaded Files", arrays: input.tableRows }]
    let workbook = await UiUtils.IafDataPlugin.createWorkbookFromAoA(sheetArrays)
    let savedWorkbook = await UiUtils.IafDataPlugin.saveWorkbook({
      workbook: workbook,
      file: `${IAF_workspace._shortName}_UploadedFiles.xlsx`
    });
    return savedWorkbook
  },
  async postprocessUploadFiles(input, libraries, ctx) {
    let { PlatformApi } = libraries
    console.log("input", input)
    let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
    let iaf_entityCollectionMap = await PlatformApi.IafScriptEngine.getVar('iaf_entityCollectionMap')
    let entityCollection = iaf_entityCollectionMap[input.entityType]
    console.log("entityCollection", entityCollection)
    let relatedItems = input.entities.map(ent => {
      return {
        parentItem: ent,
        relatedItems: input.fileItems
      }
    })
    console.log("relatedItems", relatedItems)
    let relationsResult = await PlatformApi.IafScriptEngine.createRelations({
      parentUserItemId: entityCollection._userItemId,
      _userItemId: iaf_ext_files_coll._userItemId,
      _namespaces: IAF_workspace._namespaces,
      relations: relatedItems
    }, ctx);
    return { success: true }
  },
  async getCollectionsForDocument(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
    console.log('getCollectionsForDocument INPUT', input)
    let collQuery = [{
      parent: {
        query: { _id: entityInfo._id },
        collectionDesc: { _userType: iaf_ext_files_coll._userType, _userItemId: iaf_ext_files_coll._userItemId },
        options: { page: { getAllItems: true } },
        sort: { _id: 1 }
      },
      related: [
        {
          relatedDesc: { _relatedUserType: iaf_collections._userType, _isInverse: true },
          as: 'documentCollections',
        }
      ]
    }]
    let queryResults = await PlatformApi.IafScriptEngine.findWithRelatedMulti(collQuery, ctx)
    let collections = queryResults[0]._list[0].documentCollections._list
    return collections
  },
  async getSpacesForFile(input, libraries, ctx) {
    let { PlatformApi } = libraries
    let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
    let iaf_space_collection = await PlatformApi.IafScriptEngine.getVar('iaf_space_collection')
    console.log('getSpacesForFile input', input)
    let spaceQuery = [{
      parent: {
        query: { _id: input.entityInfo._id },
        collectionDesc: { _userType: iaf_ext_files_coll._userType, _userItemId: iaf_ext_files_coll._userItemId },
        options: { page: { getAllItems: true } },
        sort: { _id: 1 }
      },
      related: [
        {
          relatedDesc: { _relatedUserType: iaf_space_collection._userType, _isInverse: true },
          as: 'SpaceInfo',
          options: { page: { getAllItems: true } },
        }
      ]
    }]
    let queryResults = await PlatformApi.IafScriptEngine.findWithRelatedMulti(spaceQuery, ctx)
    let spaces = queryResults[0]._list[0].SpaceInfo._list
    let spaceForTheFile
    let finalSpaceForTheFile
    let header = ["Space Name", "Floor", "Space Type"]
    if (spaces.length > 0) {
      spaceForTheFile = spaces.map(space => [
        space['Space Name'],
        space.properties.Floor.val,
        space.properties['Space Type'].val
      ])
      finalSpaceForTheFile = header.concat(spaceForTheFile)
    } else {
      finalSpaceForTheFile = []
    }
    return finalSpaceForTheFile
  },

  async deleteDocument(input, libraries, ctx) {
    let { PlatformApi } = libraries
    
    console.log("input.entityInfo.original", input.entityInfo.original)

    let deleteDocumentArray = [input.entityInfo.original._id]

    console.log("delete document array", deleteDocumentArray)
    
    let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')

    console.log("iaf_ext_files_coll", iaf_ext_files_coll)
    let deleteResult = await PlatformApi.IafScriptEngine.deleteItems({
      _userItemId: iaf_ext_files_coll._userItemId,
      items: deleteDocumentArray
    }, ctx)

    let res = { success: true, message: '', result: deleteResult }
    return res
  },
  async archiveFile(input, libraries, ctx) {
    let { PlatformApi } = libraries
    console.log(input,"input")
    let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
    let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
    let updatedFileItem = [{
      _id: input.entityInfo.new._id,
      name: input.entityInfo.new.name,
      fileAttributes: input.entityInfo.new.fileAttributes,
      _fileId: input.entityInfo.new._fileId,
      containerPath: input.entityInfo.new.containerPath,
      nextVersionNumber: input.entityInfo.new.nextVersionNumber,
      tipVersionNumber: input.entityInfo.new.tipVersionNumber,
      versions: input.entityInfo.new.version,
      isArchieve: true
    }]
    let updateItemResult = await PlatformApi.IafScriptEngine.updateItemsBulk({
      _userItemId: iaf_ext_files_coll._userItemId,
      _namespaces: IAF_workspace._namespaces,
      items: updatedFileItem
    }, ctx);
    let res
    if (updateItemResult[0][0] === "ok: 204") {
      res = {
        success: true,
        result: updateItemResult[0][0]
      }
    } else {
      res = {
        success: false,
        message: "Error updating File!"
      }
    }
    return res
  },
  async unArchiveFile(input, libraries, ctx) {
    let { PlatformApi } = libraries
    console.log(input,"input")
    let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')
    let IAF_workspace = await PlatformApi.IafScriptEngine.getVar('IAF_workspace')
    let updatedFileItem = [{
      _id: input.entityInfo.new._id,
      name: input.entityInfo.new.name,
      fileAttributes: input.entityInfo.new.fileAttributes,
      _fileId: input.entityInfo.new._fileId,
      containerPath: input.entityInfo.new.containerPath,
      nextVersionNumber: input.entityInfo.new.nextVersionNumber,
      tipVersionNumber: input.entityInfo.new.tipVersionNumber,
      versions: input.entityInfo.new.version,
      isArchieve: false
    }]
    let updateItemResult = await PlatformApi.IafScriptEngine.updateItemsBulk({
      _userItemId: iaf_ext_files_coll._userItemId,
      _namespaces: IAF_workspace._namespaces,
      items: updatedFileItem
    }, ctx);
    let res
    if (updateItemResult[0][0] === "ok: 204") {
      res = {
        success: true,
        result: updateItemResult[0][0]
      }
    } else {
      res = {
        success: false,
        message: "Error updating File!"
      }
    }
    return res
  },
  async getArchieveFileByTypes(input, libraries, ctx) {
    console.log("getArchieveFileByTypes")
    let { PlatformApi } = libraries
    let iaf_ext_files_coll = await PlatformApi.IafScriptEngine.getVar('iaf_ext_files_coll')

    let tagArray = Object.keys(input.entityInfo)
    console.log(tagArray)
    let tagNames = tagArray.map(name => {
      return _.split(name, '-')[2]
    })
    let fileItems = await PlatformApi.IafScriptEngine.getFileItems(
      {
        collectionDesc: {
          _userType: iaf_ext_files_coll._userType,
          _userItemId: iaf_ext_files_coll._userItemId
        },
        query: { "fileAttributes.Document Type": { $in: tagNames },
                 "isArchieve": { $eq: true } },
        options: { page: { getAllItems: true } }
      }, ctx)
      let propDispNames = PlatformApi.IafScriptEngine.getVar('iaf_attributeDisplayNames')
      let filesAsEntities = fileItems.map(file => {
        let filePropNamesOrig = Object.keys(file.fileAttributes)
        let fileProps = {}
        for (let i = 0; i < filePropNamesOrig.length; i++) {
          let filePropInfo = _.find(propDispNames, { prop: filePropNamesOrig[i] })
          if(filePropInfo?.dName){
          fileProps[filePropInfo.dName] = {
            dName: filePropInfo.dName,
            type: filePropNamesOrig[i] === 'dtCategory' || filePropNamesOrig[i] === 'dtType' ? '<HIERARCHY>' : 'text',
            val: file.fileAttributes[filePropNamesOrig[i]] || null
          }
        }
        }
  
        return {
          _id: file._id,
          _fileId: file._fileId,
          ...file,
          "Entity Name": file.name,
          properties: fileProps
        }
      })
      console.log('fileAsEntities', filesAsEntities)
      return filesAsEntities
  },


}

export default files
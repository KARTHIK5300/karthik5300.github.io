let proj = {
    async loadProjectAndCollections(input, libraries, ctx, callback) {

        const { IafProj, IafScriptEngine, IafDataSource } = libraries.PlatformApi

        let currentProj = await IafProj.getCurrent(ctx)

        let collections = await IafScriptEngine.getCollections(null, ctx)
        console.log('loadProjectAndCollections collections', collections)
        collections = collections._list
        
        let root_file_cont = await IafScriptEngine.getFileCollection({
            _userType: "file_container",
            _shortName: "Root Container"
        }, ctx)
        console.log('loadProjectAndCollections root_file_cont', root_file_cont)

        let latestModelComposite = await IafScriptEngine.getCompositeCollection({
            query:
            {
                "_userType": "bim_model_version",
                "_namespaces": { "$in": currentProj._namespaces },
                "_itemClass": "NamedCompositeItem"
            }
        }, ctx, { getLatestVersion: true })

        let latestElementCollection
        if (latestModelComposite)
            latestElementCollection = await IafScriptEngine.getCollectionInComposite(latestModelComposite._id, {
                _userType: "rvt_elements"
            }, ctx)

        let datasources = await IafDataSource.getOrchestrators(null, ctx)
        datasources = datasources._list

        const skysparkRealtime = _.filter(datasources, d => d._userType === "skyspark"
        && d._name === "skyspark REALTIME");

        console.log("skysparkRealtime", JSON.stringify(skysparkRealtime))

        let iaf_collections = _.find(collections, { _userType: "iaf_ext_coll_coll" })
        let iaf_asset_collection = _.find(collections, { _userType: "iaf_ext_asset_coll" })
        let iaf_space_collection = _.find(collections, { _userType: "iaf_ext_space_coll" })
        let iaf_bms_collection = _.find(collections, { _userType: "bms_assets" })
        let iaf_schema_collection = _.find(collections, { _userType: "iaf_schema_collection" })
        let iaf_pick_list_collection = _.find(collections, { _userType: "iaf_pick_list_collection" })
        let iaf_systems_collection = _.find(collections, { _userType: "iaf_ext_sys_coll" })
        let iaf_system_elements_collection = _.find(collections, { _userType: "iaf_ext_sysel_coll" })
        let iaf_ext_files_coll = root_file_cont
        let skysparkRealtimeDatasource = skysparkRealtime
        let iaf_dt_contractor_coll = _.find(collections, { _userType: "iaf_dt_contractor_coll" })
        let iaf_dt_installer_coll = _.find(collections, { _userType: "iaf_dt_installer_coll" })
        let iaf_dt_iron_data_coll = _.find(collections, { _userType: "iaf_dt_iron_data_coll" })
        let iaf_dt_spec_data_coll = _.find(collections, { _userType: "iaf_dt_spec_data_coll" })
        let iaf_dt_sup_data_coll = _.find(collections, { _userType: "iaf_dt_sup_data_coll" })
        let iaf_dt_trace_coll = _.find(collections, { _userType: "iaf_dt_trace_coll" })
        let iaf_dt_warranty_coll = _.find(collections, { _userType: "iaf_dt_warranty_coll" })
        let iaf_dt_commtest_coll = _.find(collections, { _userType: "iaf_dt_commtest_coll" })

        IafScriptEngine.setVar('iaf_collections', iaf_collections)
        IafScriptEngine.setVar('iaf_space_collection', iaf_space_collection)
        IafScriptEngine.setVar('iaf_bms_collection', iaf_bms_collection)
        IafScriptEngine.setVar('iaf_schema_collection', iaf_schema_collection)
        IafScriptEngine.setVar('iaf_pick_list_collection', iaf_pick_list_collection)
        IafScriptEngine.setVar('iaf_systems_collection', iaf_systems_collection)
        IafScriptEngine.setVar('iaf_system_elements_collection', iaf_system_elements_collection)
        IafScriptEngine.setVar('iaf_ext_files_coll', root_file_cont)
        IafScriptEngine.setVar('skysparkRealtimeDatasource', skysparkRealtimeDatasource)
        IafScriptEngine.setVar('iaf_dt_contractor_coll', iaf_dt_contractor_coll)
        IafScriptEngine.setVar('iaf_dt_spec_data_coll', iaf_dt_spec_data_coll)
        IafScriptEngine.setVar('iaf_dt_installer_coll', iaf_dt_installer_coll)
        IafScriptEngine.setVar('iaf_dt_iron_data_coll', iaf_dt_iron_data_coll)
        IafScriptEngine.setVar('iaf_dt_sup_data_coll', iaf_dt_sup_data_coll)
        IafScriptEngine.setVar('iaf_dt_trace_coll', iaf_dt_trace_coll)
        IafScriptEngine.setVar('iaf_dt_warranty_coll', iaf_dt_warranty_coll)
        IafScriptEngine.setVar('iaf_dt_commtest_coll', iaf_dt_commtest_coll)
        IafScriptEngine.setVar('iaf_entityCollectionMap', {
            Asset: iaf_asset_collection,
            Assets: iaf_asset_collection,
            Space: iaf_space_collection,
            Spaces: iaf_space_collection,
            File: iaf_ext_files_coll,
            Files: iaf_ext_files_coll,
            Collection: iaf_collections,
            Collections: iaf_collections,
            "BMS Equipment": iaf_bms_collection,
            System: iaf_systems_collection,
            Systems: iaf_systems_collection,
            SystemElement: iaf_system_elements_collection,
            SystemElements: iaf_system_elements_collection
        })
        IafScriptEngine.setVar('iaf_entityNamePropMap', {
            Asset: "Asset Name",
            Assets: "Asset Name",
            Space: "Space Name",
            Spaces: "Space Name",
            File: "name",
            Files: "name",
            Collection: "Collection Name",
            Collections: "Collection Name",
            "BMS Equipment": "id.display",
            System: "Systems Name",
            Systems: "Systems Name",
            SystemElement: "Element Name",
            SystemElements: "Element Name",
        })
        IafScriptEngine.setVar('iaf_typedef_collection', _.find(collections, { _userType: "iaf_dt_type_map_defs_coll" }))
        IafScriptEngine.setVar('iaf_asset_collection', iaf_asset_collection)

        if (latestModelComposite) {
            IafScriptEngine.setVar('iaf_ext_current_bim_model', latestModelComposite)
            IafScriptEngine.setVar('iaf_ext_elements_collection', latestElementCollection)
        }

        IafScriptEngine.setVar('datasources', datasources)
        IafScriptEngine.setVar('IAF_workspace', currentProj)
        return {
            currentProj,
            iaf_typedef_collection: IafScriptEngine.getVar('iaf_typedef_collection'),
            iaf_asset_collection: IafScriptEngine.getVar('iaf_asset_collection'),
            latestModelComposite,
            latestElementCollection,
            datasources,
            iaf_entityNamePropMap: IafScriptEngine.getVar('iaf_entityNamePropMap'),
            iaf_entityCollectionMap: IafScriptEngine.getVar('iaf_entityCollectionMap'),
            collections,
            iaf_collections: IafScriptEngine.getVar('iaf_collections'),
            iaf_space_collection: IafScriptEngine.getVar('iaf_space_collection'),
            iaf_bms_collection: IafScriptEngine.getVar('iaf_bms_collection'),
            iaf_schema_collection: IafScriptEngine.getVar('iaf_schema_collection'),
            iaf_pick_list_collection: IafScriptEngine.getVar('iaf_pick_list_collection'),
            iaf_systems_collection: IafScriptEngine.getVar('iaf_systems_collection'),
            iaf_system_elements_collection: IafScriptEngine.getVar('iaf_system_elements_collection'),
            iaf_ext_files_coll: IafScriptEngine.getVar('iaf_ext_files_coll'),
            iaf_dt_contractor_coll: IafScriptEngine.getVar('iaf_dt_contractor_coll'),
            iaf_dt_installer_coll: IafScriptEngine.getVar('iaf_dt_installer_coll'),
            iaf_dt_iron_data_coll: IafScriptEngine.getVar('iaf_dt_iron_data_coll'),
            iaf_dt_spec_data_coll: IafScriptEngine.getVar('iaf_dt_spec_data_coll'),
            iaf_dt_sup_data_coll: IafScriptEngine.getVar('iaf_dt_sup_data_coll'),
            iaf_dt_trace_coll: IafScriptEngine.getVar('iaf_dt_trace_coll'),
            iaf_dt_warranty_coll: IafScriptEngine.getVar('iaf_dt_warranty_coll'),
            iaf_dt_commtest_coll: IafScriptEngine.getVar('iaf_dt_commtest_coll'),
            skysparkRealtimeDatasource: IafScriptEngine.getVar('skysparkRealtimeDatasource')
        }
    },
}

export default proj
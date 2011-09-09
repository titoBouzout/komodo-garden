
function GardenDrivers(){}

GardenDrivers.prototype = {
  
  driversTypes : [],
  driversInstances : [],
  //register a new connection type
  register : function(aDriverTypeID, aDescription, aConstructor, aType)
  {
	this.driversTypes[aDriverTypeID] = {}
	this.driversTypes[aDriverTypeID].id = aDriverTypeID;
	this.driversTypes[aDriverTypeID].description = aDescription;
	this.driversTypes[aDriverTypeID].contructor = aConstructor;
	this.driversTypes[aDriverTypeID].type = aType;
  },

  //returns all available "servers" for a connection type
  getEntries :function(aDriverTypeID)
  {
	var entries = {};
	var object = this.getObject(aDriverTypeID);
	var thread = myAPI.thread().newThread();
	myAPI.thread().runThreadAndWait(function(){ entries = object.driverGetEntries();}, thread);
	for(var id in entries)
	{
	  entries[id].path = entries[id].path.replace(/\/+$/, '').replace(/\\+$/, '');
	  if(entries[id].path == '')
		entries[id].path = object.__DS;
	}
	for(var id in entries)
	  entries[id].id = myAPI.crypto().sha1(entries[id].toSource()+'.'+JSON.stringify(entries[id]));

	thread = null;
	return entries;
  },
  getEntry:function(aDriverTypeID, aEntryID)
  {
	var entries = this.getEntries(aDriverTypeID);
	for(var id in entries)
	{
	  if(entries[id].id == aEntryID)
	  {
		return entries[id];
	  }
	}
  },
  //if the server list is editable run "edit servers"
  edit :function(aDriverTypeID)
  {
	this.getObject(aDriverTypeID).driverEdit();
  },
  //returns true if the "server" list is editable
  isEditable :function(aDriverTypeID)
  {
	return typeof(this.getObject(aDriverTypeID).driverEdit) == 'function';
  },
  //used for requesting informational data to the connection
  getObject :function(aDriverTypeID)
  {
	if(!this.driversTypes[aDriverTypeID].object)
	{
	  this.driversTypes[aDriverTypeID].object = new this.driversTypes[aDriverTypeID].contructor;
	  this.driversTypes[aDriverTypeID].object.driverInit();
	}
	
	return this.driversTypes[aDriverTypeID].object;
  },
  //instance the connection
  getInstance:function(aID, aDriverTypeID, aEntryID)
  {
	//unique indentifier for this instance
	var instanceID 	= aDriverTypeID+'.'+aEntryID+'.'+aID;
	var serverID 	= myAPI.crypto().sha1(aDriverTypeID+'.'+aEntryID);
	
	if(!this.driversInstances[instanceID])
	  this.driversInstances[instanceID] = new GardenInstances(
		aDriverTypeID,
		instanceID,
		serverID,
		this.driversTypes[aDriverTypeID].contructor,
		this.getEntry(aDriverTypeID, aEntryID),
		aEntryID,
		this.driversTypes[aDriverTypeID].type
	  );
	return this.driversInstances[instanceID];
  }
}

var gardenDrivers = new GardenDrivers();
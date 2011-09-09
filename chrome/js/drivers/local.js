function GardenLocal(){}

GardenLocal.prototype = {

  driverInit:function()
  {
	if(myAPI.os().isWindows())
	  this.__DS = '\\';
	else
	  this.__DS = '/';
	  
	this.shouldKeepAlive = false;
	this.shouldShowLoading = false;
  },
  /* register the connection */
  driverRegister: function()
  {
	gardenDrivers.register(
							'local',
							'Local and network files',
							GardenLocal,
							'local'
						  );
  },
  driverGetEntries:function()
  {
	var drives = myAPI.file().drives();
	var entries = [];
	var i = 0;
	for(var id in drives)
	{
	  entries[i] = {};
	  entries[i].labelWithPath = drives[id];
	  entries[i].labelWithoutPath = '';
	  entries[i].path = drives[id];
	  entries[i].aData = drives[id];
	  i++;
	}
	var dir = Components
				.classes["@mozilla.org/file/directory_service;1"]
				.getService(Components.interfaces.nsIProperties)
				.get("Home", Components.interfaces.nsIFile).path;
	entries[i] = {};
	entries[i].labelWithPath = dir;
	entries[i].labelWithoutPath = '';
	entries[i].path =dir;
	entries[i].aData = dir;
	i++;
	
	var dir = Components
				.classes["@mozilla.org/file/directory_service;1"]
				.getService(Components.interfaces.nsIProperties)
				.get("Desk", Components.interfaces.nsIFile).path;
	entries[i] = {};
	entries[i].labelWithPath = dir;
	entries[i].labelWithoutPath = '';
	entries[i].path = dir;
	entries[i].aData = dir;
	i++;
	
	//TODO add networks "folders"?? how can I get a list of shared folders of the network?
	/*entries[i] = {};
	entries[i].labelWithPath = '\\\\Titook\\Documentos';
	entries[i].labelWithoutPath = '';
	entries[i].path = '\\\\Titook\\Documentos';
	entries[i].aData = '\\\\Titook\\Documentos';
	i++;
	*/
	
	return entries;
  },
  
  connect:function()
  {
	return true;
  },
  close:function()
  {
	
  },
  directoryList:function(aDirectory, noHiddenItems)
  {
	//garden.dump('object:directoryList');
	var entries = [], entry, isHidden;
	var fileSystemEntries = myAPI.file().listEntries(aDirectory);
	for(var i in fileSystemEntries)
	{
	  entry = fileSystemEntries[i];
	  isHidden = entry.isHidden();
	  if(isHidden && noHiddenItems)
		continue;
	  entries[entries.length] =
	  {
		'name': entry.leafName,
		'path': entry.path,
		'pathMapped': entry.path,
		'isFile': !entry.isDirectory(),
		'isDirectory': entry.isDirectory(),
		'isSymlink': entry.isSymlink(),
		'isHidden': isHidden,
		'isWritable': entry.isWritable(),
		'isReadable': entry.isReadable(),
		'modifiedTime': entry.lastModifiedTime,
		'permissions': entry.permissions,
		'size': entry.fileSize
	  }
	}
	//garden.dump('object:directoryList:end');
	return entries;
  },
 
  removeFile:function(aFile)
  {
	myAPI.file().remove(aFile);
  },
  removeDirectory:function(aFile)
  {
	myAPI.file().remove(aFile);
  },
  removeDirectoryRecursive:function(aFile)
  {
	myAPI.file().remove(aFile);
  },
  trashFile:function(aFile)
  {
	myAPI.file().trash(aFile);
  },
  trashDirectory:function(aFile)
  {
	myAPI.file().trash(aFile);
  },
  trashDirectoryRecursive:function(aFile)
  {
	myAPI.file().trash(aFile);
  },
  rename:function(oldName, newName)
  {
	myAPI.file().rename(oldName, newName);
  },
  createDirectory:function(aDirectory, aPermissions)
  {
	myAPI.file().createDirectory(aDirectory, aPermissions);
  },
  copyFile:function(aFile, aDestination)
  {
	myAPI.file().copy(aFile, aDestination);
  },
  copyDirectory:function(aFile, aDestination)
  {
	myAPI.file().copy(aFile, aDestination);
  }
};

garden.registerDriverClass(GardenLocal);
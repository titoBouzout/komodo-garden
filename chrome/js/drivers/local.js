function GardenLocal(){}

GardenLocal.prototype = {

  driverInit:function()
  {
	if(garden.s.isWindows())
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
	var drives = garden.s.fileDrivesList();
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
	entries[i] = {};
	entries[i].labelWithPath = '\\\\Titook\\Documentos';
	entries[i].labelWithoutPath = '';
	entries[i].path = '\\\\Titook\\Documentos';
	entries[i].aData = '\\\\Titook\\Documentos';
	i++;
	
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
	//garden.s.dump('object:directoryList');
	var entries = [], entry, isHidden;
	var fileSystemEntries = garden.s.folderListContentData(aDirectory);
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
	//garden.s.dump('object:directoryList:end');
	return entries;
  },
 
  removeFile:function(aFile)
  {
	garden.s.fileRemove(aFile);
  },
  removeDirectory:function(aFile)
  {
	garden.s.fileRemove(aFile);
  },
  removeDirectoryRecursive:function(aFile)
  {
	garden.s.fileRemove(aFile);
  },
  trashFile:function(aFile)
  {
	garden.s.fileTrash(aFile);
  },
  trashDirectory:function(aFile)
  {
	garden.s.fileTrash(aFile);
  },
  trashDirectoryRecursive:function(aFile)
  {
	garden.s.fileTrash(aFile);
  },
  rename:function(oldName, newName)
  {
	garden.s.fileRename(oldName, newName);
  },
  createDirectory:function(aDirectory, aPermissions)
  {
	garden.s.folderCreate(aDirectory, aPermissions);
  },
  copyFile:function(aFile, aDestination)
  {
	garden.s.fileCopy(aFile, aDestination);
  },
  copyDirectory:function(aFile, aDestination)
  {
	garden.s.fileCopy(aFile, aDestination);
  }
};

garden.registerDriverClass(GardenLocal);
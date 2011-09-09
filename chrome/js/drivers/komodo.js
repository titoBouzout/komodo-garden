const mRCService = Components
					  .classes["@activestate.com/koRemoteConnectionService;1"]
					  .getService(
								  Components
									.interfaces
									.koIRemoteConnectionService
								  );
					  
function AsynchRemoteConnection(){}

AsynchRemoteConnection.prototype = {

  driverRegister: function()
  {
	gardenDrivers.register(
							'komodo',
							'Komodo (ftp, ftps, sftp, scp)',
							AsynchRemoteConnection,
							'remote'
						  );
  },
  driverInit:function()
  {
	this.__DS = '/';
	
	this.shouldKeepAlive = true;
    this.shouldShowLoading = true;
  },
  driverEdit:function()
  {
	ko.windowManager.getMainWindow().prefs_doGlobalPrefs('serversItem');
  },
  driverGetEntries:function()
  {
	var servers = mRCService.getServerInfoList({});
	var entries = [];
	var i = 0;
	var prefix = '';
	for(var id in servers)
	{
	  if(servers[id].alias != servers[id].hostname)
		prefix = servers[id].alias+' - '+servers[id].hostname;
	  else
		prefix = servers[id].hostname;

	  entries[i] = {};
	  entries[i].labelWithPath = prefix+''+(servers[id].port > 0 ? ':'+servers[id].port : '')+servers[id].path;
	  entries[i].labelWithoutPath  = prefix+''+(servers[id].port > 0 ? ':'+servers[id].port : '');
	  entries[i].aData = servers[id];
	  entries[i].path = servers[id].path;
	  i++;
	}
	return entries;
  },
  //returns the connection to the server ( connects if needed )
  connect: function(aNumTry, aKeepAliveRequest)
  {
	if(!this.connection)
	  this.connection = mRCService.getConnectionUsingServerAlias(this.aData.alias);
	return this.connection;
  },
  keepAlive:function()
  {
	this.connect().changeDirectory('/');
  },
  directoryList:function(aDirectory, noHiddenItems)
  {
	var entries = this.connect().list(('/'+aDirectory).replace(/^\/+/, '/'), 1).getChildren({});
	var child, rows = [], path = '', isDirectory, isHidden;

	for(var i=0;i<entries.length;i++)
	{
	  child = entries[i];
	  
	  path = child.getFilepath();
	  isDirectory = child.isDirectory();
	  isHidden = child.isHidden();
	  if(isHidden && noHiddenItems)
		continue;
	  rows[rows.length] = 
	  {
		'name': child.getFilename(),
		'path': path,
		'pathMapped': path,
		'isFile': !isDirectory,
		'isDirectory': isDirectory,
		'isSymlink': child.isSymlink(),
		'isHidden': isHidden,
		'isWritable': child.isWriteable(),
		'isReadable': child.isReadable(),
		'modifiedTime': child.mtime,
		'permissions': child.uid+'_'+child.gid,
		'size': child.size
	  }
	}
	
	delete  child, isDirectory, path;

	return rows;
  },
  removeFile:function(aFile)
  {
	//garden.dump('removeFile:'+aFile);
	this.connect().removeFile(aFile);
  },
  removeDirectory:function(aDirectory)
  {
	//garden.dump('removeDirectory:'+aDirectory);
	this.connect().removeDirectory(aDirectory);
  },
  chmod:function(aFile, aPermissions)
  {
	this.connect().chmod(aFile, aPermissions);
  },
  rename:function(oldName, newName)
  {
	this.connect().rename(oldName, newName);
  },
  createDirectory:function(aDirectory, aPermissions)
  {
	this.connect().createDirectory(aDirectory, aPermissions);
  },
  saveFile:function(aFile, aLocalPath)//this is download and save
  {	
	//writing file
	myAPI.file().writeBinaryContentIsByteArray(aLocalPath, this.connect().readFile(aFile, {}));
  }
};

garden.registerDriverClass(AsynchRemoteConnection);
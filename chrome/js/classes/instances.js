
function GardenInstances(aName, instanceID, serverID, object, entry, aEntryID, aType)
{
  /* BASIC */
	
	this.name = aName;
	this.label = entry.labelWithPath;
	this.instanceID = instanceID;
	this.serverID = serverID;
	this.object =  new object();//holds our "connection object" from where we get data
	this.object.driverInit();
	
	this.entry = entry;
	this.entryID = aEntryID;
	this.object.aData = entry.aData;
	
	this.type = aType; //should be local or remote
	this.thread = garden.s.newThread();//holds a thread for this connection
	
	this.__DS = this.object.__DS;
	
	this.diskSpaceAvailable = 0;
	
  /* PROCESSES */
  
	this.numProcesses = 0;//holds num of processes (ids).
	this.processes = [];//holds references to the processes lsit.

  /* CACHE */
  
	//cache of directory listings
	this.listings = garden.s.sharedObjectGet(
						'server.'+serverID+'.listings',
						garden.s.serializedSessionGet('server.'+serverID+'.listings', {})
					);
	this.listingsCounter = 0;
	//holds the sizes and modified times of files to not upload the same file again
	this.lastModified = garden.s.sharedObjectGet(
						'server.'+serverID+'.lastModified',
						garden.s.serializedSessionGet('server.'+serverID+'.lastModified', {})
					);
	
  /* LOGS */
  
	//holds logs of connections
	this.logs = [];
	this.log('status', 'Loaded pane: "'+this.label+'"', 0);
	  
	this.errorCount = 0;
	
	//try and catchs! waterproof
	this.numMaxTrys = 2;//for all the operation this is the num of max trys
	this.numMaxTrysDirectoryListing = 3;//when retreiving directory listing this is the num of max trys
	this.numMaxLostConnectionTrys = 6;//connection maybe lost many times in a row depending of.. I dont know, mnay things
	
  /* STATUS */
  
	this.connection = false;//a reference to the connection object.
	this.connected = false;//if we are connected this is true

	this.iterations = 0;//if there is some iterations with the server this holds a number of these
	//keep alive the connection or close if idle
	
	if(this.object.shouldKeepAlive)
	  this.keepAliveTimer = Components
						  .classes["@mozilla.org/timer;1"]
						  .createInstance(Components.interfaces.nsITimer);

}

GardenInstances.prototype = {

  //returns the connection to the server ( connects if needed )
  connect: function(aNumTry, aKeepAliveRequest)
  {
	if(!this.connection)
	{
	  this.iterations++;
	  if(this.connected)
		this.log('status', 'Re-connecting to host…', 0);
	  else
		this.log('status', 'Connecting to host…', 0);
	  try{
		this.connection = this.object.connect(this.entry);
						  
		this.keepAliveOrCloseConnectionInit();
	  }catch(e){
		if(!aNumTry)
		  aNumTry = 1;
		else
		  aNumTry++;
		this.log('warning', 'Attempt '+aNumTry+' of '+this.numMaxLostConnectionTrys+' to connect to host failed.', 0);

		var lastErrorSvc = Components
								.classes["@activestate.com/koLastErrorService;1"]
								.getService(Components.interfaces.koILastErrorService);
		var error = lastErrorSvc.getLastErrorMessage();
		if(e && e != '' && error != e)
		  error += '\n'+e;
		this.iterations--;
		if(aNumTry<this.numMaxLostConnectionTrys)
		{
		  if(error && error != '')
			this.log('warning', 'Error message:'+error, 0);
		  this.log('warning', 'Trying again…', 0);
		  return this.connect(aNumTry);
		}
		else
		{
		  this.connected = false;
		  this.log('error', 'Can\'t connect to host. '+error, 0);
		  return false;
		}
	  }
	  this.connected = true;
	  this.log('status', 'Connected!', 0);
	  this.iterations--;
	}
	else
	{
	  /*this.dump('already connected!');*/
	}
	if(!aKeepAliveRequest)
	  this.lastIteration = new Date();
	return this.connection;
  },

  
  keepAliveOrCloseConnectionInit:function()
  {
	if(this.object.shouldKeepAlive)
	{
	  this.lastIteration = new Date();
	  var instance = this;
	  this.keepAliveOrCloseConnectionUninit();
	  this.keepAliveTimer.init({
		  observe: function(aSubject, aTopic, aData) {
			if(!instance.keepAliveSent)
			{
			  instance.keepAliveSent = true;
			  garden.s.runThread(function(){
				instance.keepAliveOrCloseConnection();
			  }, instance.thread);
			}
		  }
		}, 1000 * 56, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
	}
  },
  keepAliveOrCloseConnectionUninit:function()
  {
	if(this.object.shouldKeepAlive)
	{
	  try{this.keepAliveTimer.cancel();}catch(e){}
	}
  },
  keepAliveOrCloseConnection:function()
  {
	if(this.object.shouldKeepAlive)
	{
	  var now = new Date();
	  //the connection was idle by five minutes
	  //and to make expire the connection no operations must be running
	  //( example uploading a big file should put this.iterations on atleast 1 in value)
  
		if(Math.floor((now-this.lastIteration)/60000) > 4 && this.iterations === 0 && this.connected)
		{
		  try{this.object.close();}catch(e){}
  
		  this.connected = false;
		  this.connection = null;
		  this.log('status', 'Connection idle, now disconnected from host', 0);
		  this.keepAliveTimer.cancel();
		  this.keepAliveSent = false;
		}
		else if(this.iterations !== 0 && this.connected)//the connection is doing something
		{
		  this.log('status', 'Sending keep alive', 0);
		  try{
			this.connect();
			this.object.keepAlive();
			this.keepAliveSent = false;
		  }catch(e){}
		}
		else if(this.connected)//the connection is idle, keep alive for minutes
		{
		  this.log('status', 'Sending keep alive', 0);
		  try{
			this.connect(0, true);
			this.object.keepAlive();
			this.keepAliveSent = false;
		  }catch(e){}
		}
	  this.notifyProgress();
	}
  },
  processController:function(aProcess, aNumTry)
  {
	if(aProcess.paused())
	{
	  //this.log('warning', 'Process '+aProcess.name+' was paused by user', aProcess.id);
	}
	else if(!aProcess.hasPendingTask())
	{
	  //this.log('status', 'Process '+aProcess.id+' : '+aProcess.name+' completed without errors', aProcess.id);
	}
	else if(aProcess.canRun())
	{
	  this.iterations++;
	  var aFunction = aProcess.run();
	  try
	  {
		aFunction();
		this.iterations--;
		aProcess.started(true);
	  }
	  catch(e)
	  {
		aProcess.reQueue(aFunction);
		if(!aNumTry)
		  aNumTry = 1;
		else
		  aNumTry++;
		this.log('warning', 'Attempt '+aNumTry+' of '+this.numMaxTrys+' about '+aProcess.name+' failed', aProcess.id);
		var lastErrorSvc = Components
							  .classes["@activestate.com/koLastErrorService;1"]
							  .getService(Components.interfaces.koILastErrorService);
		var error = lastErrorSvc.getLastErrorMessage();
		if(e && e != '' && error != e)
		  error += '\n'+e;
		if(aNumTry<this.numMaxTrys)
		{
		  this.iterations--;
		  if(error && error != '')
			this.log('warning', 'Error message:'+error, aProcess.id);
		  this.log('warning', 'Trying again…', aProcess.id);
		  this.processController(aProcess, aNumTry);
		}
		else
		{
		  this.iterations--;
		  aProcess.aborted(true);
		  this.log('error', 'Unable to '+aProcess.name+'. Reached max attemps. '+error, aProcess.id);
		}
	  }
	  //run all the queue
	  this.processController(aProcess, aNumTry);
	}
	else
	{
	  //this.log('error', 'Process '+aProcess.name+' reached max attempts of trying errors, is now stopped and should manually set to run/continue', aProcess.id);
	}
  },
  
  /*
	directory listing is outside of process controller
  */
  directoryList: function(aData)
  {
	//this.dump('instance:directoryList');
	if(this.listings[aData.path] && this.listings[aData.path].data)
	{
	  this.log('progress', 'Getting listing "'+aData.path+'" from cache', 0);
	  aData.aEntries = this.listings[aData.path].data;
	  //garden.s.runMain(function(){
		aData.aFunction(aData);
		//});
	}
	else
	{
	  //run two threads to get directory listings!
	  if(this.listingsCounter % 2 == 0 || this.subInstance)
	  {
		this.listingsCounter++;
		//if(!this.subInstance)
		// this.dump('llamdno a la instancia propia para '+aData.path, true, true);
		//run threaded only if no cached
		var instance = this;
		garden.s.runThread(function(){
		  instance._directoryList(aData);
		}, this.thread);
	  }
	  else
	  {
		this.listingsCounter++;
		//this.dump('llamdno a la instancia garden para '+aData.path, true, true);
		var instance = garden.gardenDrivers.getInstance(
														  'garden',
														  this.name,
														  this.entryID
														);

		  instance.subInstance = true;
		  instance.listings = this.listings;
		  instance.logs = this.logs;
		  instance.treeID = this.treeID;
		
		instance.directoryList(aData);
	  }
	}
  },
  //threaded directory listing for tree view
  _directoryList:function(aData, aNumTry)
  {
	//this.dump('instance:_directoryList');
	var aDirectory = aData.path;
	
	if(!this.listings[aDirectory])
	  this.listings[aDirectory] = {};

	  if(this.listings[aDirectory].data)
	  {
		var wasConnecting = false;
	  }
	  else
	  {
		this.iterations++;
		var wasConnecting = true;
	  }
	  
	  try
	  {
		if(this.listings[aDirectory].data)
		{
		  this.log('progress', 'Getting listing "'+aDirectory+'" from cache', 0);
		  aData.aEntries = this.listings[aDirectory].data;
		  garden.s.runMain(function(){aData.aFunction(aData);});
		}
		else
		{
		  var connection  = this.connect();
		  
		  this.log('progress', 'Getting "'+aDirectory+'" list from host', 0);
		  
		  var entries = this.object.directoryList(aDirectory);
		  
		  var rowsDirectories = [], rowsFiles = [], rows = [], rowsSorted = [], nameSorting;
		  //this.dump('instance:_directoryList:startParsing');
		  for(var i=0;i<entries.length;i++)
		  {
			nameSorting = entries[i].name.toLowerCase()+' '+i;

			rows[nameSorting] = 
			{
			  'name': entries[i].name,
			  'path': entries[i].path,
			  'pathMapped': entries[i].pathMapped,
			  'id': garden.s.sha1(entries[i].path+'-'+entries[i].pathMapped),
			  'extension': (entries[i].isDirectory ? '' : (entries[i].name.split('.').pop().toLowerCase()  || '')),
			  'isFile': !entries[i].isDirectory,
			  'isDirectory': entries[i].isDirectory,
			  'isSymlink': entries[i].isSymlink,
			  'isHidden': entries[i].isHidden,
			  'isWritable': entries[i].isWritable,
			  'isReadable': entries[i].isReadable,
			  'modifiedTime': entries[i].modifiedTime,
			  'permissions': entries[i].permissions,
			  'size': entries[i].size
			}
			if(rows[nameSorting].isDirectory)
			  rowsDirectories[rowsDirectories.length] = nameSorting;
			else
			  rowsFiles[rowsFiles.length] = nameSorting;
		  }
		  //sorting names
		  rowsDirectories.sort(garden.s.sortLocale);
		  rowsFiles.sort(garden.s.sortLocale);
		  for(var id in rowsDirectories)
			rowsSorted[rowsSorted.length] = rows[rowsDirectories[id]]
		  for(var id in rowsFiles)
			rowsSorted[rowsSorted.length] = rows[rowsFiles[id]]
		  
		  delete rowsDirectories, rowsFiles, rows, nameSorting, entries;
		  
		  this.listings[aDirectory].data = rowsSorted;
		  
		  delete rowsSorted;
		  
		  this.log('sucess', 'Directory "'+aDirectory+'" list completed', 0);
		  
		  //this.dump('instance:_directoryList:endParsing');
		  aData.aEntries = this.listings[aDirectory].data;
		  garden.s.runMain(function(){aData.aFunction(aData);});
		}
	  }
	  catch(e)
	  {
		this.listings[aDirectory] = {};

		if(!aNumTry)
		  aNumTry = 1;
		else
		  aNumTry++;
		var lastErrorSvc = Components
								.classes["@activestate.com/koLastErrorService;1"]
								.getService(Components.interfaces.koILastErrorService);
		var error = lastErrorSvc.getLastErrorMessage();
		if(e && e != '' && error != e)
		  error += '\n'+e;

		if(aNumTry<this.numMaxTrysDirectoryListing)
		{
		  //Trying again…
		  this._directoryList(aData, aNumTry);
		}
		else
		{
		  aData.aEntries = null;
		  garden.s.runMain(function(){aData.aFunction(aData);});
		  //this.listings[aDirectory].data = [];
		  this.log('error', 'Unable to get directory listing of "'+aDirectory+'". '+error, 0);
		}
	  }
	  if(wasConnecting)
		this.iterations--;
  
	this.notifyProgress();
  }, 
  removeFile:function(aFile, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('remove file "'+aFile+'"', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}

	var instance = this;
	aProcess.queue(function(){instance._removeFile(aFile, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  },
  _removeFile:function(aFile, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to remove file "'+aFile+'" …', aProcess.id);
	  if(connection)
	  {
		try{
		  this.object.removeFile(aFile);
		}
		catch(e)
		{
		  if(
			String(e).indexOf('550 File not found') != -1 ||
			String(e).indexOf('No such file or directory') != -1 
		  )
		  {
			this.log('warning', 'the file to remove "'+aFile+'" was not found', aProcess.id);
		  }
		  else
			throw new Error(e);
		}
		//removing the item from cache and tree
		this.cacheDirectoryItemRemove(aFile, false);
		this.log('sucess', 'removed file "'+aFile+'"', aProcess.id);
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  
  removeDirectory:function(aDirectory, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('remove directory "'+aDirectory+'"', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}

	var instance = this;
	aProcess.queue(function(){instance._removeDirectory(aDirectory, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  
  },
  _removeDirectory:function(aDirectory, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to remove directory "'+aDirectory+'" …', aProcess.id);
	  if(connection)
	  {
		if(typeof(this.object.removeDirectoryRecursive) == 'function') //try recursive first
		{
		  this.object.removeDirectoryRecursive(aDirectory);
		  this.cacheDirectoryItemRemove(aDirectory, true);
		  this.log('sucess', 'removed directory "'+aDirectory+'"', aProcess.id);
		}
		else
		{
		  try  {
			//ok directory no empty maybe
			var entries = this.object.directoryList(aDirectory);
		  }
		  catch(e)
		  {
			//trying again to list the content
			try{
			  var entries = this.object.directoryList(aDirectory);
			} catch(e) {
			  this.log('error', 'Can\'t list directory "'+aDirectory+'" maybe no exists', aProcess.id);
			  //throw new Error('Can\'t list content of folder "'+aDirectory+'"');
			  //return;
			}
		  }
		  
		  if(entries)
		  {
			for(var i=0;i<entries.length;i++)
			{
			  if(entries[i].isDirectory)
				this._removeDirectory(entries[i].path, aProcess, true);
			  else
				this._removeFile(entries[i].path, aProcess, true);
			}
		  }
		  if(!aProcess.stopped())
		  {
			try{
			  this.object.removeDirectory(aDirectory);
			} catch(e){
			  if(
				 String(e).indexOf('550 Directory not found') != -1 || 
				 String(e).indexOf('No such file or directory') != -1 
				 )
				{
				  this.log('warning', 'The directory to remove "'+aDirectory+'" was not found', aProcess.id);
				}
			  else{ throw new Error(e);}
			}
			this.cacheDirectoryItemRemove(aDirectory, true);
			this.log('sucess', 'removed directory "'+aDirectory+'"', aProcess.id);
		  }
		  else if(!aInternalCall)
		  {
			aProcess.reQueue(aProcess.lastRunnuable);
		  }
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  trashFile:function(aFile, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('trash file "'+aFile+'"', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}

	var instance = this;
	aProcess.queue(function(){instance._trashFile(aFile, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  },
  _trashFile:function(aFile, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to trash file "'+aFile+'" …', aProcess.id);
	  if(connection)
	  {
		try{
		  this.object.trashFile(aFile);
		}
		catch(e)
		{
		  if(
			String(e).indexOf('550 File not found') != -1 ||
			String(e).indexOf('No such file or directory') != -1 
		  )
		  {
			this.log('warning', 'the file to trash "'+aFile+'" was not found', aProcess.id);
		  }
		  else
			throw new Error(e);
		}
		//removing the item from cache and tree
		this.cacheDirectoryItemRemove(aFile, false);
		this.log('sucess', 'trashed file "'+aFile+'"', aProcess.id);
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  trashDirectory:function(aDirectory, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('trash directory "'+aDirectory+'"', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}

	var instance = this;
	aProcess.queue(function(){instance._trashDirectory(aDirectory, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  
  },
  _trashDirectory:function(aDirectory, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to trash directory "'+aDirectory+'" …', aProcess.id);
	  if(connection)
	  {
		if(typeof(this.object.trashDirectoryRecursive) == 'function') //try recursive first
		{
		  this.object.trashDirectoryRecursive(aDirectory);
		  this.cacheDirectoryItemRemove(aDirectory, true);
		  this.log('sucess', 'trashed directory "'+aDirectory+'"', aProcess.id);
		}
		else
		{
		  try  {
			//ok directory no empty maybe
			var entries = this.object.directoryList(aDirectory);
		  }
		  catch(e)
		  {
			//trying again to list the content
			try{
			  var entries = this.object.directoryList(aDirectory);
			} catch(e) {
			  this.log('error', 'Can\'t list directory "'+aDirectory+'" maybe no exists', aProcess.id);
			  //throw new Error('Can\'t list content of folder "'+aDirectory+'"');
			  //return;
			}
		  }
		  
		  if(entries)
		  {
			for(var i=0;i<entries.length;i++)
			{
			  if(entries[i].isDirectory)
				this._trashDirectory(entries[i].path, aProcess, true);
			  else
				this._trashFile(entries[i].path, aProcess, true);
			}
		  }
		  if(!aProcess.stopped())
		  {
			try{
			  this.object.trashDirectory(aDirectory);
			} catch(e){
			  if(
				 String(e).indexOf('550 Directory not found') != -1 || 
				 String(e).indexOf('No such file or directory') != -1 
				 )
				{
				  this.log('warning', 'The directory to trash "'+aDirectory+'" was not found', aProcess.id);
				}
			  else{ throw new Error(e);}
			}
			this.cacheDirectoryItemRemove(aDirectory, true);
			this.log('sucess', 'trashed directory "'+aDirectory+'"', aProcess.id);
		  }
		  else if(!aInternalCall)
		  {
			aProcess.reQueue(aProcess.lastRunnuable);
		  }
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  copyFile:function(aSource, aDestination, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('copy file "'+aSource+'" to "'+aDestination+'" ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}

	var instance = this;
	aProcess.queue(function(){instance._copyFile(aSource, aDestination, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  },
  _copyFile:function(aSource, aDestination, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to copy file "'+aSource+'" to "'+aDestination+'"…', aProcess.id);
	  if(connection)
	  {
		this.object.copyFile(aSource, aDestination);
		this.cacheDirectoryItemAdd(aDestination, false);
		this.log('sucess', 'copied file "'+aSource+'" to "'+aDestination+'"', aProcess.id);
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  copyDirectory:function(aSource, aDestination, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('copy directory "'+aSource+'" to "'+aDestination+'" ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}

	var instance = this;
	aProcess.queue(function(){instance._copyDirectory(aSource, aDestination, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  },
  _copyDirectory:function(aSource, aDestination, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to copy directory "'+aSource+'" to "'+aDestination+'"…', aProcess.id);
	  if(connection)
	  {
		this.object.copyDirectory(aSource, aDestination);
		this.cacheDirectoryItemAdd(aDestination, true);
		this.log('sucess', 'copied directory "'+aSource+'" to "'+aDestination+'"', aProcess.id);
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  _duplicateFileRX1 : /.*(\..{1,4}\..{1,4})$/,
  _duplicateFileRX2 : /.*(\..{1,4})$/,
  _duplicateFileRX3 : /( [0-9]{13,16})$/,
  duplicateFile:function(aFile, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('duplicate file "'+aFile+'"', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}

	var instance = this;
	aProcess.queue(function(){instance._duplicateFile(aFile, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  },
  _duplicateFile:function(aFile, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to duplicate file "'+aFile+'" …', aProcess.id);
	  if(connection)
	  {
		var now = garden.s.nowVersionTime();
		var aFileName, aName, aDir, extension;
		
		if(aFile.indexOf(this.__DS) != -1)
		{
		  aDir = aFile.split(this.__DS);
		  aFileName = aDir.pop();
		  aDir = aDir.join(this.__DS);

		  if(!aFileName || aFileName == '')
		  {
			aDir = aFile.split(this.__DS);
			aDir.pop();
			aFileName = aDir.pop();
			aDir = aDir.join(this.__DS);
		  }
		  if(!aFileName || aFileName == '')
		  {
			aDir = '';
			aFileName = aFile;
		  }
		}
		else
		{
		  aDir = '';
		  aFileName = aFile;
		}
		
		extension = aFileName.replace(this._duplicateFileRX1, '$1');
		if(extension == '' || aFileName == extension)
		  extension = aFileName.replace(this._duplicateFileRX2, '$1');
		if(extension == '' || aFileName == extension)
		  extension = '';
		//this.dump('extension is '+extension);
		//this.dump('name is '+aFileName);
		if(extension != '')
		{
		  aFileName = aFileName.split(extension);
		  aFileName.pop();
		  aFileName = aFileName.join(extension);
		}
		
		aFileName = aFileName.replace(this._duplicateFileRX3, '');
		//this.dump('name is '+aFileName);
			
		aFileName = aFileName+' '+now+extension;
		//this.dump('name is '+aFileName);
		
		var aDestination = aDir+this.__DS+aFileName;
		this.object.copyFile(aFile, aDestination);
		this.cacheDirectoryItemAdd(aDestination, false);
		this.log('sucess', 'duplicated file "'+aFile+'" as "'+aDestination+'"', aProcess.id);
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  duplicateDirectory:function(aDirectory, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('duplicate directory "'+aDirectory+'"', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}

	var instance = this;
	aProcess.queue(function(){instance._duplicateDirectory(aDirectory, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  
  },
  _duplicateDirectory:function(aDirectory, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to duplicate directory "'+aDirectory+'" …', aProcess.id);
	  if(connection)
	  {
		var now = garden.s.nowVersionTime();
		var aDestination = aDirectory.replace(this._duplicateFileRX3, '')+' '+now;
		this.object.copyDirectory(aDirectory, aDestination);
		this.cacheDirectoryItemAdd(aDestination, true);
		this.log('sucess', 'duplicated directory "'+aDirectory+'" as "'+aDestination+'"', aProcess.id);
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  chmodFile:function(aFile, aPermissions, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('change permissions to file "'+aFile+'"', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var instance = this;
	aProcess.queue(function(){instance._chmodFile(aFile, aPermissions, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  },
  _chmodFile:function(aFile, aPermissions, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to set permissions on file "'+aFile+'" to '+aPermissions+' …', aProcess.id);
	  if(connection)
	  {
		this.object.chmod(aFile, parseInt('0'+''+aPermissions));
		this.log('sucess', 'changed permissions to file "'+aFile+'" to '+aPermissions, aProcess.id);
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  chmodDirectory:function(aDirectory, aPermissions, aRecursive, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('change permissions to directory "'+aDirectory+'"', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var instance = this;
	aProcess.queue(function(){instance._chmodDirectory(aDirectory, aPermissions, aRecursive, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  },
  _chmodDirectory:function(aDirectory, aPermissions, aRecursive, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to set permissions on directory "'+aDirectory+'" to '+aPermissions+' …', aProcess.id);
  
	  if(connection)
	  {
		if(aRecursive)
		{
		  if(typeof(this.object.chmodRecursive) == 'function')
		  {
			this.object.chmodRecursive(aDirectory, parseInt('0'+''+aPermissions));
			this.log('sucess', 'changed permissions to directory "'+aDirectory+'" to '+aPermissions, aProcess.id);
		  }
		  else
		  {
			try
			{
			  this.object.chmod(aDirectory, parseInt('0'+''+aPermissions));
			  
			  //ok directory no empty maybe
			  var entries = this.object.directoryList(aDirectory);
			  for(var i=0;i<entries.length;i++)
			  {
				if(entries[i].isDirectory)
				  this.chmodDirectory(entries[i].path,  aPermissions, aRecursive, aProcess, true);
				else
				  this.chmodFile(entries[i].path, aPermissions, aProcess, true);
			  }
			  if(!aProcess.stopped())
			  {
				this.log('sucess', 'changed permissions to directory "'+aDirectory+'" to '+aPermissions, aProcess.id);
			  }
			  else if(!aInternalCall)
			  {
				aProcess.reQueue(aProcess.lastRunnuable);
			  }
			}
			catch(e)// ok directory dont have content, or maybe no exists and when trying to list the content throw a error
			{
			  if(connection)
			  {
				this.object.chmod(aDirectory, parseInt('0'+''+aPermissions));
				this.log('sucess', 'changed permissions to directory "'+aDirectory+'" to '+aPermissions, aProcess.id);
			  }
			}
		  }
		}
		else
		{
		  if(connection)
		  {
			this.object.chmod(aDirectory, parseInt('0'+''+aPermissions));
			this.log('sucess', 'changed permissions to directory "'+aDirectory+'" to '+aPermissions, aProcess.id);
		  }
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  rename:function(oldName, newName, isDirectory, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('rename "'+oldName+'" to "'+newName+'"', ++this.numProcesses);
  	  this.processes[this.processes.length] = aProcess;
	}
	var instance = this;
	aProcess.queue(function(){instance._rename(oldName, newName, isDirectory, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  },
  _rename:function(oldName, newName, isDirectory,  aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to rename from "'+oldName+'" to "'+newName+'" …', aProcess.id);
  
	  if(connection)
	  {
		if(newName.indexOf(oldName+this.__DS) === 0)
		{
		  this.log('error', 'can\'t move "'+oldName+'" into self "'+newName+'"', aProcess.id);
		}
		else
		{
		  try
		  {
			this.object.rename(oldName, newName);
		  }
		  catch(e)
		  {
			//may directories no exists.
			try{
			  this._tryCreatingDirectories(oldName, newName);
			  this.object.rename(oldName, newName);
			}
			catch(e)//ok leave the extension manage de error
			{
			  this.object.rename(oldName, newName);
			}
		  }
		  this.cacheDirectoryItemRemove(oldName, isDirectory);
		  this.cacheDirectoryItemAdd(newName, isDirectory);
		  this.log('sucess', 'renamed "'+oldName+'" to "'+newName+'"', aProcess.id);
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  createDirectory:function(aParentDirectory, aDirectory, aPermissions, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('create directory "'+aDirectory+'" in "'+aParentDirectory+'"', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var instance = this;
	aProcess.queue(function(){instance._createDirectory(aParentDirectory, aDirectory, aPermissions, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  },
  _createDirectory:function(aParentDirectory, aDirectory, aPermissions, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to create directory "'+aDirectory+'" in "'+aParentDirectory+'" …', aProcess.id);
	  if(connection)
	  {
		if(aDirectory.indexOf(this.__DS) != -1)//if the user wants to create many directories..
		{
		  aDirectory = aDirectory.split(this.__DS);
		  var ourDirectory = aDirectory.pop();//keep the last to try outside of a try and catch
		  
		  var path = '';
		  for(var id in aDirectory)
		  {
			path += aDirectory[id];
			try{this.object.createDirectory(aParentDirectory+this.__DS+path, parseInt('0'+''+'755'));}catch(e){/*subdirectory maybe exists*/}
			path += this.__DS;
		  }
		  aDirectory[aDirectory.length] = ourDirectory;
		  aDirectory = aDirectory.join(this.__DS);
		  try{
			this.object.createDirectory(aParentDirectory+this.__DS+aDirectory, parseInt('0'+''+'755'));
			this.cacheDirectoryItemAdd(aParentDirectory+this.__DS+aDirectory, true);
			this.log('sucess', 'created directory "'+aDirectory+'" in "'+aParentDirectory+'"', aProcess.id);
		  }
		  catch(e)
		  {
			if(
			   String(e).indexOf('550 Directory already exists') != -1 ||
			   String(e).indexOf('File exists') != -1
			   
			)
			{
			  this.log('warning', 'The directory to create "'+aDirectory+'" already exists', aProcess.id);
			}
			else{ throw new Error(e);}
		  }
		}
		else
		{
		  try{
			this.object.createDirectory(aParentDirectory+this.__DS+aDirectory, parseInt('0'+''+'755'));
			this.cacheDirectoryItemAdd(aParentDirectory+this.__DS+aDirectory, true);
			this.log('sucess', 'created directory "'+aDirectory+'" in "'+aParentDirectory+'"', aProcess.id);
		  } catch(e) {
			if(
			  String(e).indexOf('550 Directory already exists') != -1 ||
			  String(e).indexOf('File exists') != -1
			)
			{
			  this.log('warning', 'The directory to create "'+aDirectory+'" already exists', aProcess.id);
			}
			else{ throw new Error(e);}
		  }
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  //used when trying to work with a deep directory that was not created first
  _tryCreatingDirectories:function(oldPath, newPath, connection)
  {
	newPath = newPath.split(this.__DS);
	newPath.pop();//remove file or directory name from list.
	if(newPath.length > 0)
	{
	  newPath = newPath.join(this.__DS);
	  if(newPath == this.__DS || newPath == ''){}
	  else
	  {
		newPath = newPath.split(this.__DS);
		var aPaths = '';
		for(var id in newPath)
		{
		  aPaths += newPath[id];
		  if(oldPath.indexOf(aPaths+this.__DS) === 0){}//skiping already know directories
		  else
		  {
			try{
			  this.object.createDirectory(aPaths, parseInt('0'+''+'755'));
			  this.cacheDirectoryItemAdd(aPaths, true);
			}catch(e){/*subdirectory maybe exists*/}
		  }
		  aPaths += this.__DS;
		}
	  }
	}
  },
  
  
  downloadAndOpenFile:function(aFile, aLocalPath, aParentInstance, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('open file "'+aFile+'" ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var instance = this;
	aProcess.queue(function(){instance._downloadAndOpenFile(aFile, aLocalPath, aParentInstance, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  },
  _downloadAndOpenFile:function(aFile, aLocalPath, aParentInstance, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to open file "'+aFile+'" …', aProcess.id);
	  if(connection)
	  {
		//download already ask for overWrite
		//this.overWriteResolve(aProcess, null, null, aDestination, true);
		
		this._downloadFile(aFile, aLocalPath, aProcess, true);
		//run in a thread and then back to main thread because we need to wait for the file to download
		if(!aProcess.stopped())
		{
		  if(aProcess.overWriteLocal)
		  {
			garden.s.runThread(function(){
								  if(garden.s.fileExists(aLocalPath))
									garden.s.runMain(function(){garden.s.launch(aLocalPath);});
								  }, this.thread);
			this.cacheDirectoryItemAdd(aLocalPath, false, aParentInstance);
			this.log('sucess', 'opened file "'+aLocalPath+'" ', aProcess.id);
		  }
		}
		else if(!aInternalCall)
		{
		  aProcess.reQueue(aProcess.lastRunnuable);
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  downloadAndEditFile:function(aFile, aLocalPath, aParentInstance, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('edit "'+aFile+'" ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var instance = this;
	aProcess.queue(function(){instance._downloadAndEditFile(aFile, aLocalPath, aParentInstance, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  },
  _downloadAndEditFile:function(aFile, aLocalPath, aParentInstance, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to edit "'+aFile+'" …', aProcess.id);
	  if(connection)
	  {
		//download already ask for overWrite
		//this.overWriteResolve(aProcess, null, null, aDestination, true);
		
		this._downloadFile(aFile, aLocalPath, aProcess, true);
		//run in a thread and then back to main thread because we need to wait for the file to download
		if(!aProcess.stopped())
		{
		  if(aProcess.overWriteLocal)
		  {
			garden.s.runThread(function(){
								  if(garden.s.fileExists(aLocalPath))
									garden.s.runMain(function(){garden.s.openURL(window, aLocalPath, true);});
								  }, this.thread);
			this.cacheDirectoryItemAdd(aLocalPath, false, aParentInstance);
			this.log('sucess', 'opened file "'+aLocalPath+'" ', aProcess.id);
		  }
		}
		else if(!aInternalCall)
		{
		  aProcess.reQueue(aProcess.lastRunnuable);
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  downloadFile:function(aFile, aLocalPath, aProcess, aInternalCall, overWrite)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('download file "'+aFile+'" to "'+aLocalPath+'"  ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var instance = this;
	aProcess.queue(function(){instance._downloadFile(aFile, aLocalPath, aProcess, aInternalCall, overWrite);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  },
  _downloadFile:function(aFile, aLocalPath, aProcess, aInternalCall, overWrite)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to download file "'+aFile+'" to "'+aLocalPath+'" …', aProcess.id);
	  
	  if(connection)
	  {
		this.overWriteResolve(aProcess, null, null, aLocalPath, true, overWrite);
		
		if(aProcess.overWriteLocal)
		{
		  //creating file or needed directories
		  garden.s.fileCreate(aLocalPath+'.kup');
		  //saving file
		  this.object.saveFile(aFile, aLocalPath+'.kup');
		  garden.s.fileRename(aLocalPath+'.kup', aLocalPath);
		  this.log('sucess', 'downloaded file "'+aFile+'" to "'+aLocalPath+'" ', aProcess.id);
		}
		else
		{
		  this.log('canceled', 'download of file "'+aFile+'" to "'+aLocalPath+'" canceled by user', aProcess.id);
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  downloadDirectory:function(aDirectory, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall)
  {
	var aDestination = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aDirectory);
	if(!aProcess)
	{
	  aProcess = new garden.s.process('download directory "'+aDirectory+'" to "'+aDestination+'"  ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var instance = this;
	aProcess.queue(function(){instance._downloadDirectory(aDirectory, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  },
  _downloadDirectory:function(aDirectory, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var aDestination = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aDirectory);
	  var connection = this.connect();
	  this.log('progress', 'going to download directory "'+aDirectory+'" to "'+aDestination+'" …', aProcess.id);
	  
	  if(connection)
	  {
		//check if the file exist on local
		this.overWriteResolve(aProcess, null, true, aDestination, true, overWrite);
		
		if(aProcess.overWriteLocal)
		{
		  asynchRemote.s.folderCreate(aDestination);
		  
		  var entries = this.connect().list(('/'+aDirectory).replace(/^\/+/, '/'), 1).getChildren({});
		  for(var i=0;i<entries.length;i++)
		  {
			if(entries[i].isDirectory())
			  this._downloadDirectory(entries[i].getFilepath(), aRemotePlacesPath, aLocalPlacesPath, aProcess, aProcess.overWriteLocal, true);
			else
			  this._downloadFile(entries[i].getFilepath(), aRemotePlacesPath, aLocalPlacesPath, aProcess, aProcess.overWriteLocal, true);
		  }
		  if(!aProcess.stopped())
		  {
			this.log('sucess', 'downloaded directory "'+aDirectory+'" to "'+aDestination+'" ', aProcess.id);
		  }
		  else if(!aInternalCall)
		  {
			aProcess.reQueue(aProcess.lastRunnuable);
		  }
		}
		else
		{
		  this.log('canceled', 'download of directory "'+aDirectory+'" to "'+aDestination+'" canceled by user', aProcess.id);
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  
  
  compareWithLocal:function(aFile, aLocalPath, aTemporalLocalPath, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('compare file "'+aFile+'" with local version', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var instance = this;
	aProcess.queue(function(){instance._compareWithLocal(aFile, aLocalPath, aTemporalLocalPath, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  },
  _compareWithLocal:function(aFile, aLocalPath, aTemporalLocalPath, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  if(!asynchRemote.s.fileExists(aLocalFileToCompare))
	  {
		this.log('error', 'Can\'t compare the remote file "'+aFile+'" with the local version because the local version no exists.', aProcess.id);
	  }
	  else
	  {
		var connection = this.connect();
		this.log('progress', 'going to download the remote file "'+aFile+'" to a temporal folder to compare with the local version …', aProcess.id);
		if(connection)
		{
		  this._downloadFile(aFile, aRemotePlacesPath, aTemporalLocalPath, aProcess, true);
		  //run in a thread and then back to main thread because we need to wait for the file to download
		  if(!aProcess.stopped())
		  {
			var AsynchRemoteConnection = this;
			garden.s.runThread(function(){
								  if(asynchRemote.s.fileExists(aTemporalDestination))
									garden.s.runMain(function(){
									  if(
										 asynchRemote.s.fileRead(aLocalFileToCompare) ==
										 asynchRemote.s.fileRead(aTemporalDestination)
										)
										 AsynchRemoteConnection.log('sucess', 'The local and remote file "'+aFile+'" are identical', aProcess.id);
										 else
										  ko.fileutils.showDiffs(aLocalFileToCompare, aTemporalDestination);
									  });
								  }, this.thread);
		  
			this.log('sucess', 'checked differences of remote file "'+aFile+'" with the local version', aProcess.id);
		  }
		  else if(!aInternalCall)
		  {
			aProcess.reQueue(aProcess.lastRunnuable);
		  }
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  createFile:function(aFile, aProcess, aInternalCall)
  {
	if(!aProcess)
	{
	  aProcess = new garden.s.process('create file "'+aFile+'" ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var instance = this;
	aProcess.queue(function(){instance._createFile(aFile, aProcess, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  },
  _createFile:function(aFile, aProcess, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var connection = this.connect();
	  this.log('progress', 'going to create file "'+aFile+'" …', aProcess.id);
	  if(connection)
	  {
		//check if the file exists on local
		this.overWriteResolve(aProcess, null, null, aFile, true);

		if(aProcess.overWriteLocal)
		{
		  //creating file or needed directories
		  garden.s.fileCreate(aFile);
		  //writing local file
		  garden.s.fileWrite(aFile, '');
		  
		  //writing remote file
		  //this._uploadFile(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, aProcess.overWriteRemote, true);
		  if(!aProcess.stopped())
		  {
			//opening the file
			//run in a thread and then back to main thread because we need to wait for the file to download
			garden.s.runThread(function(){
								  if(garden.s.fileExists(aFile))
									garden.s.runMain(function(){garden.s.openURL(window, aFile, true);});
								  }, this.thread);
			this.cacheDirectoryItemAdd(aFile, false);
			this.log('sucess', 'created file "'+aFile+'" ', aProcess.id);
		  }
		  else if(!aInternalCall)
		  {
			aProcess.reQueue(aProcess.lastRunnuable);
		  }
		}
		else
		{
		  this.log('canceled', 'creation of file "'+aFile+'" canceled by user', aProcess.id);
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
 
  uploadFile:function(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall)
  {
	var aSource = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aFile);
	if(!aProcess)
	{
	  aProcess = new garden.s.process('upload file "'+aSource+'" to "'+aFile+'"  ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var instance = this;
	aProcess.queue(function(){instance._uploadFile(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  },
  _uploadFile:function(aFile, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var aSource = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aFile);
	  var connection = this.connect();
	  this.log('progress', 'going to upload file "'+aSource+'" to "'+aFile+'" …', aProcess.id);
	  
	  if(connection)
	  {
		//if local file no exists
		if(!asynchRemote.s.fileExists(aSource))
		{
		  this.log('error', 'The local file to upload "'+aSource+'" no exists.', aProcess.id);
		}
		else
		{
		  //skiping file if it was not changed
		  var checkModified = asynchRemote.s.file(aSource);
		  if(checkModified.fileSize == 0)
		  {
			this.log('sucess', 'skiping upload of file "'+aSource+'" to "'+aFile+'" because file size is 0', aProcess.id);
		  }
		  else if(asynchRemote.s.pref('dont.cache.last.modified') || !this.lastModified[aSource] || this.lastModified[aSource] != checkModified.lastModifiedTime+'_'+checkModified.fileSize)
		  {
			this.lastModified[aSource] = checkModified.lastModifiedTime+'_'+checkModified.fileSize;
			//check if the file exists on remote
			this.overWriteResolve(aProcess, aFile, false, null, false, overWrite);
			
			if(aProcess.overWriteRemote)
			{
			  var uploadAndRename = asynchRemote.s.pref('upload.and.rename');
			  if(uploadAndRename)
				var extension = '.kup';
			  else
				var extension = '';
			  
			  var aData = asynchRemote.s.fileReadBinaryReturnByteArray(aSource);
			  try//needs to clean the upload timestamp if this process failed
			  {
				  try{
					//writing file
					
					connection.writeFile(aFile+extension, aData, aData.length);
				  }catch(e){
					//directory may no exists
					this._tryCreatingDirectories('/', aFile, connection);
			  
					  try{
						connection.writeFile(aFile+extension, aData, aData.length);
					  }catch(e){
						//may the .kup file exists on remote becuase of a kill on an upload or something.
						if(extension == '.kup')
						{
						  try{connection.removeFile(aFile+extension);}catch(e){}
						  
						connection.writeFile(aFile+extension, aData, aData.length);
						}
					  }
				  }
				
				  if(uploadAndRename)
				  {
					try{
					  connection.rename(aFile+extension, aFile);
					}catch(e){//file exists
					  try{
						connection.removeFile(aFile);
						connection.rename(aFile+extension, aFile);
					  }catch(e){/*shh*/}
					}
				  }
			  }
			  catch(e)//needs to clean the upload timestamp if this process failed
			  {
				this.lastModified[aSource] ='';
				throw new Error(e);
			  }
			  
			  this.cacheDirectoryItemRemove(aFile, false);
			  this.cacheDirectoryItemAdd(aFile, false);
			  
			  this.log('sucess', 'uploaded file "'+aSource+'" to "'+aFile+'" ', aProcess.id);
			}
			else
			{
			  this.log('canceled', 'upload of file "'+aSource+'" to "'+aFile+'" canceled by user', aProcess.id);
			}
		  }
		  else
		  {
			this.log('sucess', 'skiping upload of file "'+aSource+'" to "'+aFile+'" ', aProcess.id);
		  }
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
  uploadDirectory:function(aDirectory, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall)
  {
	var aSource = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aDirectory);
	if(!aProcess)
	{
	  aProcess = new garden.s.process('upload directory "'+aSource+'" to "'+aDirectory+'"  ', ++this.numProcesses);
	  this.processes[this.processes.length] = aProcess;
	}
	var instance = this;
	aProcess.queue(function(){instance._uploadDirectory(aDirectory, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall);}, aInternalCall);
	garden.s.runThread(function(){
									instance.processController(aProcess);
								  }, this.thread);
	return aProcess;
  },
  _uploadDirectory:function(aDirectory, aRemotePlacesPath, aLocalPlacesPath, aProcess, overWrite, aInternalCall)
  {
	if(!aProcess.stopped())
	{
	  var aSource = asynchRemote.s.getLocalPathFromRemotePath(aRemotePlacesPath, aLocalPlacesPath, aDirectory);
	  var connection = this.connect();
	  this.log('progress', 'going to upload directory "'+aSource+'" to "'+aDirectory+'" …', aProcess.id);
	  
	  if(connection)
	  {
		//if local file no exists
		if(!asynchRemote.s.fileExists(aSource))
		{
		  this.log('error', 'The local path "'+aSource+'" to upload no exists.', aProcess.id);
		}
		else
		{
		  //check if the file exists on remote
		  this.overWriteResolve(aProcess, aDirectory, true, null, false, overWrite);
		  
		  if(aProcess.overWriteRemote)
		  {
			var aDirectoryListing = Components.classes["@mozilla.org/file/local;1"].  
								createInstance(Components.interfaces.nsILocalFile); 
				aDirectoryListing.initWithPath(aSource);
	
			var entries = aDirectoryListing.directoryEntries, entry;
			
			while(entries.hasMoreElements())
			{
			  entry = entries.getNext();
				entry.QueryInterface(Components.interfaces.nsIFile);
			  if(entry.isDirectory())
				this._uploadDirectory(asynchRemote.s.getRemotePathFromLocalPath(aRemotePlacesPath, aLocalPlacesPath, entry.path), aRemotePlacesPath, aLocalPlacesPath, aProcess, aProcess.overWriteRemote, true)
			  else
				this._uploadFile(asynchRemote.s.getRemotePathFromLocalPath(aRemotePlacesPath, aLocalPlacesPath, entry.path), aRemotePlacesPath, aLocalPlacesPath, aProcess, aProcess.overWriteRemote, true)
			}
			if(!aProcess.stopped())
			{
			  this.cacheDirectoryItemRemove(aDirectory, true);
			  this.cacheDirectoryItemAdd(aDirectory, true);
			  this.log('sucess', 'uploaded directory "'+aSource+'" to "'+aDirectory+'" ', aProcess.id);
			}
			else if(!aInternalCall)
			{
			  aProcess.reQueue(aProcess.lastRunnuable);
			}
		  }
		  else
		  {
			this.log('canceled', 'upload of directory "'+aSource+'" to "'+aDirectory+'" canceled by user', aProcess.id);
		  }
		}
	  }
	}
	else if(!aInternalCall)
	{
	  aProcess.reQueue(aProcess.lastRunnuable);
	}
  },
 
  
  
  
  //ask for overwrite or skip
  overWrite:function(aProcess, aMsg, aFile)
  {
	garden.s.runMainAndWait(function(){
	  asynchRemote.element('g-toolbar-panel').hidePopup();
	  var overWrite = asynchRemote.s.overWritePrompt(aMsg, window);
		  aProcess.overWrite = {};
		  aProcess.overWrite.Yes = overWrite.value == 'Yes';
		  aProcess.overWrite.YesToAll = overWrite.value == 'Yes to all';
		  aProcess.overWrite.No = overWrite.value == 'No';
		  aProcess.overWrite.NoToAll = overWrite.value == 'No to all';
		  aProcess.overWrite.Cancel = overWrite.value == 'Cancel';
		  aProcess.overWrite.DontAskAgain = overWrite.dontAskAgain === true;
	  });
  },
  //this resolves if asking is appropiated.
  overWriteResolve:function(aProcess, aRemote, aIsDirectory, aLocal, isLocal, aParentOverWrite)
  {
	if(isLocal)
	{
	  /*if(typeof(aParentOverWrite) != 'undefined')
	  {
		aProcess.overWriteLocal = aParentOverWrite;
	  }
	  else*/
	  if(asynchRemote.s.sharedObjectExists('overWrite.'+this.server+'.'+aLocal))
		aProcess.overWriteLocal = asynchRemote.s.sharedObjectGet('overWrite.'+this.server+'.'+aLocal);
	  else
	  {
		aProcess.overWriteLocal = false;
		if(!asynchRemote.s.pref('overwrite.no.ask') && (!aProcess.p.l.overWrite || !aProcess.p.l.overWrite.YesToAll) && asynchRemote.s.fileExists(aLocal))
		{
		  if(aIsDirectory)
			this.overWrite(aProcess.p.l, 'Directory "'+aLocal+'" exists.\n\nDo you want to overwrite the local directory?\n');
		  else
			this.overWrite(aProcess.p.l, 'File "'+aLocal+'" exists.\n\nDo you want to overwrite the local file?\n');
		  if(aProcess.p.l.overWrite.YesToAll || aProcess.p.l.overWrite.Yes)
		  {
			aProcess.overWriteLocal = true;
		  }
		  if(aProcess.p.l.overWrite.DontAskAgain && !aProcess.p.l.overWrite.Cancel)
		  {
			asynchRemote.s.sharedObjectSet('overWrite.'+this.server+'.'+aLocal, aProcess.overWriteLocal);
		  }
		}
		else
		{
		  aProcess.overWriteLocal = true;
		}
	  }
	}
	else
	{
	  /*if(typeof(aParentOverWrite) != 'undefined')
		aProcess.overWriteRemote = aParentOverWrite;
	  else */
	  if(asynchRemote.s.sharedObjectExists('overWrite.'+this.server+'.'+aRemote))
	  {
		aProcess.overWriteRemote = asynchRemote.s.sharedObjectGet('overWrite.'+this.server+'.'+aRemote);
	  }
	  else
	  {
		aProcess.overWriteRemote = false;
		if(!asynchRemote.s.pref('overwrite.no.ask') && (!aProcess.p.r.overWrite || !aProcess.p.r.overWrite.YesToAll))
		{
		  var aDirectory = aRemote.split('/');
			  aDirectory.pop();
			  aDirectory = aDirectory.join('/');
		  var fileExistsRemote = false;
		  try{
			var entries = this.connect().list(('/'+aDirectory).replace(/^\/+/, '/'), 1).getChildren({});
			for(var i=0;i<entries.length;i++)
			{
			  var getFilepath = entries[i].getFilepath();
			  if(getFilepath == aRemote)
			  {
				var isDirectory = entries[i].isDirectory();
				if((isDirectory && aIsDirectory) || (!isDirectory && !aIsDirectory))
				{
				  fileExistsRemote = true;
				  break;
				}
			  }
			}
		  }
		  catch(e) 
		  {
			//remote directory no existasynchRemote.s.dump(e);
		  }
		  if(fileExistsRemote)
		  {
			if(aIsDirectory)
			  this.overWrite(aProcess.p.r, 'Directory "'+aRemote+'" exists.\n\nDo you want to overwrite the remote directory?\n');
			else
			  this.overWrite(aProcess.p.r, 'File "'+aRemote+'" exists.\n\nDo you want to overwrite the remote file?\n');
			if(aProcess.p.r.overWrite.YesToAll || aProcess.p.r.overWrite.Yes)
			{
			  aProcess.overWriteRemote = true;
			}
			if(aProcess.p.r.overWrite.DontAskAgain && !aProcess.p.r.overWrite.Cancel)
			{
			  asynchRemote.s.sharedObjectSet('overWrite.'+this.server+'.'+aRemote, aProcess.overWriteRemote);
			}
		  }
		  else
		  {
			aProcess.overWriteRemote = true;
		  }
		}
		else
		{
		  aProcess.overWriteRemote = true;
		}
	  }
	}
  },
  freeSpace:function()
  {

  },
  cleanCacheOverWrite:function()
  {
	var AsynchRemoteConnection = this;
	garden.s.runThread(function(){
										asynchRemote.s.sharedObjectDestroyWithPrefix('overWrite.'+AsynchRemoteConnection.server+'.');
									  }, this.thread);
  	this.log('status', 'Cleaned overwrite settings', 0);
  },
  cleanCacheListings:function()
  {
	var instance = this;
	garden.s.runThreadAndWait(function(){
										  instance.listings = {};
										}, this.thread);
	this.log('status', 'Cleaned listings cache', 0);
  },
  cleanCacheModified:function()
  {
	var instance = this;
	garden.s.runThread(function(){
									instance.lastModified = [];
								  }, this.thread);
	this.log('status', 'Cleaned last modified cache', 0);
  },

  cacheDirectoryItemAdd:function(aPath, isDirectory, aInstance)
  {
	if(!aInstance)
	  aInstance = this;
	var aDirs = aPath.split(aInstance.__DS);
	var aOriginalPath = aPath;
	var aPath = '';
	var aParentPath;
	for(var i=0;i<aDirs.length;i++)
	{
	  aPath += aDirs[i];
	  aParentPath = aPath.split(aInstance.__DS);
	  aParentPath.pop();
	  aParentPath = aParentPath.join(aInstance.__DS);
	  
	  if(aParentPath == '')
		aParentPath = aInstance.__DS;
		
	  if(aPath == '' || aPath == aParentPath)
	  {
		if(aPath != aInstance.__DS)
		  aPath += aInstance.__DS;
		continue;
	  }
	  
	  if(aPath.indexOf(aParentPath) !== 0)
	  {
		aPath += aInstance.__DS;
		continue;
	  }
	  //this.dump('buscando en '+aParentPath+' si esta '+aPath);
	  
	  if(
		 !aInstance.tree.isContainerOpenFromPathID(garden.s.sha1(aParentPath+'-'+aParentPath))
		 && aInstance.tree.currentPath != aParentPath
	  )
	  {
		//this.dump('el container de '+aParentPath+' esta..'+aInstance.tree.isContainerOpenFromPathID(garden.s.sha1(aParentPath+'-'+aParentPath)));
		aPath += aInstance.__DS;
		continue;
	  }
	  
	  if(!aInstance.listings[aParentPath] || !aInstance.listings[aParentPath].data)
	  {
		aInstance.listings[aParentPath] = {}
		aInstance.listings[aParentPath].data = []
	  }

	  var found = false;
	  for(var id in aInstance.listings[aParentPath].data)
	  {
		if(aInstance.listings[aParentPath].data[id].path == aPath)
		{
		  //this.dump(aPath+' esta en el cache de '+aParentPath);
		  found = true;
		  break;
		}
	  }
	  if(!found)
	  {
		//this.dump(aPath+' NO esta en el cache de '+aParentPath);
		
		var newItem =	{
			'name': aPath.split(aInstance.__DS).pop(),
			'path': aPath,
			'pathMapped': aPath,
			'id': garden.s.sha1(aPath+'-'+aPath),
			'extension': ((aOriginalPath != aPath ? true : isDirectory) ? '' : (aPath.split('.').pop().toLowerCase()  || '')),
			'isFile': (aOriginalPath != aPath ? false : !isDirectory),
			'isDirectory': (aOriginalPath != aPath ? true : isDirectory),
			'isSymlink': false,
			'isHidden': false,
			'isWritable': true,
			'isReadable': true,
			'modifiedTime': (new Date()),
			'permissions': 0,
			'size': 0
		}

		var a=0, added = false;
		for(var id in aInstance.listings[aParentPath].data)
		{
		  if(
			 garden.s.sortLocale(aInstance.listings[aParentPath].data[id].name.toLowerCase(), newItem.name.toLowerCase())>0
		  )
		  {
			aInstance.listings[aParentPath].data.splice(a, 0, newItem);
			//this.dump('inserted on cache via splice');
			added = true;
			break;
		  }
		  a++;
		}
		if(!added)
		{
		  aInstance.listings[aParentPath].data.push(newItem);
		  //this.dump('inserted on cache via push');
		}
		//insert the item into the tree
		var tree = aInstance.tree;
		//this.dump('insertaddo newItem', newItem);
		//this.dump('en parent path', aParentPath);
		this.cacheDirectoryItemAddToTree(aInstance.tree, newItem, aParentPath);
		//garden.s.runMain(function(){tree.insertRow(newItem, aParentPath)});
	  }
	  
	  aPath += aInstance.__DS;
	}
  },
  cacheDirectoryItemAddToTree:function(tree, newItem, aParentPath)
  {
	garden.s.runMain(function(){tree.insertRow(newItem, aParentPath)});
  },
  cacheDirectoryItemRemove:function(aPath, isDirectory)
  {
	var aParentDir = aPath.split(this.__DS);
		aParentDir.pop();
		aParentDir = aParentDir.join(this.__DS);
		if(aParentDir == '')
		  aParentDir = this.__DS;
	
	var emptyContainers = [];
	
	if(this.listings[aParentDir])
	{
	  var a=0;
	  for(var id in this.listings[aParentDir].data)
	  {
		if(this.listings[aParentDir].data[id].path == aPath)
		{
		  //removing the item from the cache
		  this.listings[aParentDir].data.splice(a, 1);
		  //updating "isContainerEmpty" on parent if now is empty;
		  if(this.listings[aParentDir].data.length === 0)
		  {
			var aParentParentDir = aParentDir.split(this.__DS);
			aParentParentDir.pop();
			aParentParentDir = aParentParentDir.join(this.__DS);
			if(aParentParentDir == '')
			  aParentParentDir = this.__DS;
			if(this.listings[aParentParentDir])
			{
			  for(var id in this.listings[aParentParentDir].data)
			  {
				if(this.listings[aParentParentDir].data[id].path == aParentDir)
				{
				  emptyContainers[emptyContainers.length] = aParentDir;
				  //this.listings[aParentParentDir].data[id].isContainerEmpty = true;
				  break;
				}
			  }
			}
		  }
		  break;
		}
		a++;
	  }
	  for(var id in this.listings)
	  {
		if(id == aPath || id.indexOf(aPath+this.__DS) === 0)
		  delete this.listings[id];
	  }
	}
	//remove the item from the tree
	var tree = this.tree;
	garden.s.runMain(function(){tree.removeRowByPath(aPath, emptyContainers);});
  },
  //holds logs of actions
  log:function(aType, aMsg, aProcessID)
  {
	//this.dump(aType+' : '+aMsg+' : '+aProcessID);
	if(aType == 'error')
	  this.errorCount++;
	this.logs[this.logs.length] = {
									'aDate':(new Date().toLocaleTimeString()),
									'aType':aType,
									'aMsg':aMsg,
									'aProcessID':aProcessID
								  };
	//shorting the amount of log entries
	if(this.logs.length > 300)
	  this.logs.splice(0, this.logs.length-300);
	this.notifyProgress();
  },
  //close the connection
  close:function()
  {
	this.log('status', 'Connection will close as soon as posible without interrupting any current upload/download or process', 0);
	
	this.closing = true;
	//pause processes 
	for(var id in this.processes)
	   this.processes[id].paused(true);
	   
	//remove the keep alive
	this.keepAliveOrCloseConnectionUninit();
	
	//queue the disconnect operation
	var instance = this;
	garden.s.runThread(function(){
	  
	  if(instance.connected && instance.connection && instance.object.close)
		instance.object.close();
	  
	  instance.iterations = 0;
	  instance.connected = false;
	  
	  delete instance.connection;
	  
	  instance.log('status', 'Connection closed', 0);
	  
	  instance.notifyProgress();
	  
	  instance.closing = false;
	  
	}, this.thread);
  },
  //notifyProgress of connections and processes
  notifyProgress:function()
  {
	if(!this.notifyProgressShotTime)
	  this.notifyProgressShotTime = new Date()-1000;
	
	var treeID = this.treeID;
	//notify ASAP if "a lot" of time has been passed since last notification, but if many notifications comes quickly delay these
	if(new Date() - this.notifyProgressShotTime > 200)
	{
	  this.notifyProgressShotTime = new Date();
	  garden.s.runMain(function(){garden.notifyProgress(treeID);});
	}
	else
	{
	  this.notifyProgressShotTime = new Date();
	  if(this.notifyProgressTimer)
		this.notifyProgressTimer.cancel();
	  this.notifyProgressTimer = garden.s.timerAdd(200, function(){
		garden.s.runMain(function(){
		  garden.notifyProgress(treeID);
		});
	  });
	}
  },
  //dumps a message into the main thread
  dump: function(aName, aMsg)
  {
	garden.s.runMain(function(){ garden.s.dump(aName, aMsg)});
  },
  sessionSave:function()
  {
	garden.s.serializedSessionSet('server.'+this.serverID+'.listings', this.listings);
	garden.s.serializedSessionSet('server.'+this.serverID+'.lastModified', this.lastModified);
  },
  sessionRemove:function()
  {
	garden.s.serializedSessionRemove('server.'+this.serverID+'.listings');
	garden.s.serializedSessionRemove('server.'+this.serverID+'.lastModified');
  }
  
};


  INCLUDE('_lib/file.js');
  
  this.serializedSessionGet = function(aID, aDefault, aParser)
  {
	try
	{
	  var aFile = Components.classes["@mozilla.org/file/directory_service;1"]
					  .getService(Components.interfaces.nsIProperties)
					  .get("ProfD", Components.interfaces.nsIFile);
		  aFile.append(CHROME_NAME);
		  aFile.append(aID+'.json');
	  
		if(this.fileExists(aFile.path))
		{
		  if(!aParser)
			return JSON.parse(this.fileRead(aFile.path));
		  else
			return aParser(JSON.parse(this.fileRead(aFile.path)));
		}
		else
		  return aDefault;
		
	}catch(e){ return aDefault; }
	
  }
  this.serializedSessionExists = function(aID)
  {
	var aFile = Components.classes["@mozilla.org/file/directory_service;1"]
					.getService(Components.interfaces.nsIProperties)
					.get("ProfD", Components.interfaces.nsIFile);
		aFile.append(CHROME_NAME);
		aFile.append(aID+'.json');
	  
	return this.fileExists(aFile.path);
  }
  this.serializedSessionSet = function(aID, aData)
  {
	  var aFile = Components.classes["@mozilla.org/file/directory_service;1"]
					  .getService(Components.interfaces.nsIProperties)
					  .get("ProfD", Components.interfaces.nsIFile);
		  aFile.append(CHROME_NAME);
		  aFile.append(aID+'.json');
	  
	  	this.fileWrite(aFile.path, JSON.stringify(aData));

  }
  this.serializedSessionRemove = function(aID)
  {
	try{
	  var aFile = Components.classes["@mozilla.org/file/directory_service;1"]
					  .getService(Components.interfaces.nsIProperties)
					  .get("ProfD", Components.interfaces.nsIFile);
		  aFile.append(CHROME_NAME);
		  aFile.append(aID+'.json');
		  aFile.remove(true);
	}catch(e){ /*may no exists*/}
  }
	if(!this.sharedMemory)
	  this.sharedMemory = [];
	if(!this.sharedMemory[CHROME_NAME])
	  this.sharedMemory[CHROME_NAME] = [];
	//returns a shared object stored in a XPCOM (shared by all the windows of the same application (profile))
	this.sharedObjectGet = function(objectName, aDefault)
	{		
	  if(this.sharedObjectExists(objectName))
	  {
		//this.dump('sharedObjectGet:The shared var "'+objectName+'" is a property of the XPCOM');
	  }
	  else
	  {
		//this.dump('sharedObjectGet:The shared var "'+objectName+'" is NOT a property of the XPCOM');
		if(!aDefault && aDefault !== 0)
		{
		  //this.dump('sharedObjectGet:The shared var "'+objectName+'" doenst have a default value');
		  aDefault = {};
		}
		else
		{
		  //this.dump('sharedObjectGet:The shared var "'+objectName+'" has a default value');
		}
		
		//this.dump('sharedObjectGet:The shared var "'+objectName+'" was stored as a property of the XPCOM');
		this.sharedMemory[CHROME_NAME][objectName] = aDefault;
	  }
	  //this.dump('sharedObjectGet:The property "'+objectName+'" was retrieved from the XPCOM');
	  return this.sharedMemory[CHROME_NAME][objectName];
	}
	//returns true if a shared object created by a XPCOM exists (shared by all the windows of the same browser instance (profile))
	this.sharedObjectExists = function(objectName)
	{
	  return !(typeof(this.sharedMemory[CHROME_NAME][objectName]) == 'undefined');
	}
	
	//sets to null a shared object stored in a XPCOM (shared by all the windows of the same browser instance (profile))
	/* 
		THIS WILL DESTROY THE OBJECT INSIDE THE XPCOM COMPONENT 
		BUT THE REFERENCE (if any) TO THAT OBJECT ON YOUR EXTENSION WILL REMAIN INTACT
	*/
	this.sharedObjectDestroy = function(objectName)
	{
	  this.sharedMemory[CHROME_NAME][objectName] = null;
	  delete(this.sharedMemory[CHROME_NAME][objectName]);
	}
	this.sharedObjectDestroyWithPrefix = function(objectPrefix)
	{
	  for(var id in this.sharedMemory[CHROME_NAME])
	  {
		if(id.indexOf(objectPrefix) === 0)
		{
		  this.sharedMemory[CHROME_NAME][objectName] = null;
		  delete(this.sharedMemory[CHROME_NAME][objectName]);
		}
	  }
	}
	this.sharedObjectSet = function(objectName, aValue)
	{
	  this.sharedMemory[CHROME_NAME][objectName] = aValue;
	}
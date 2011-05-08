  
  const mIos = Components.classes["@mozilla.org/network/io-service;1"].  
					  getService(Components.interfaces.nsIIOService);
		  
  //returns true if a file exists
  this.fileExists = function(aFilePath)
  {
	try
	{
	  var aFile = Components.classes["@mozilla.org/file/local;1"]
					  .createInstance(Components.interfaces.nsILocalFile);
		  aFile.initWithPath(aFilePath);

	  if(aFile.exists())
	  {
		delete aFile;
		return true;
	  }
	  else
	  {
		delete aFile;
		return false;
	  }
	}
	catch(e)
	{
	  delete aFile;
	  return false;
	}
  }
  
 //returns a file path from a file URI
  this.filePathFromFileURI = function(aURI)
  {
	if(aURI.indexOf('file:') !== 0)
	  return aURI;
	return String(this.uri(aURI).QueryInterface(Components.interfaces.nsIFileURL).file.path);
  }
  
  //returns the content of a file
  this.fileRead = function(aFilePath)
  {
	  var aFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);	
		  aFile.initWithPath(aFilePath);

	  var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
		  converter.charset = "UTF-8"; /* The character encoding you want, using UTF-8 here */

	  var is = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance( Components.interfaces.nsIFileInputStream );
		  is.init(aFile, 0x01, 0444, 0); 
	  
	  var sis = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
		  sis.init(is);
		  
	  var aData = converter.ConvertToUnicode(sis.read(sis.available()));
	  
	  is.close();
	  sis.close();
	  
	  delete aFile, converter, is, sis;
	  
	  return aData;
  }
  
  //writes content to a file
  this.fileWrite = function(aFilePath, aData)
  {
	  try
	  {
		aData = String(aData);
	  //write the content to the file
		  var aFile = Components.classes["@mozilla.org/file/local;1"]
						  .createInstance(Components.interfaces.nsILocalFile);
			  aFile.initWithPath(aFilePath);
			  if( !aFile.exists() )   // if it doesn't exist, create
			  {
				  aFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0775);
			  }
		  var WriteStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
		  // use 0x02 | 0x10 to open file for appending.
		  //WriteStream.init(aFile, 0x02 | 0x08 | 0x20, 0644, 0); // write, create, truncatefile,  
		  WriteStream.init(aFile, 0x02 | 0x08 | 0x20, 0666, 0); // write, create, truncatefile,  
							  
		  var why_not_a_simple_fopen_fwrite = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
		  
		  why_not_a_simple_fopen_fwrite.init(WriteStream, "utf-8", 0, 0xFFFD); // U+FFFD = replacement character
		  why_not_a_simple_fopen_fwrite.writeString(aData);
		  
		  why_not_a_simple_fopen_fwrite.close();
		  WriteStream.close();
		  var path = aFile.path;
		  
		  delete aFile, WriteStream, why_not_a_simple_fopen_fwrite;
		  
		  return path;
	  }
	  catch(e)
	  {
		delete aFile, WriteStream, why_not_a_simple_fopen_fwrite;
		
		this.log('Can\'t write to the file "'+aFilePath+'"\nApplication says: '+e);
		return null;
	  }
  }
  
  //writes a binary file
  this.fileWriteBinary = function(aFilePath, aContent)
  {
	var aFile = Components.classes["@mozilla.org/file/local;1"].
				createInstance(Components.interfaces.nsILocalFile);
	
	aFile.initWithPath(aFilePath);
	if(!aFile.exists())   // if it doesn't exist, create
	{
	  aFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0755);
	}
				
	var stream = Components.classes["@mozilla.org/network/safe-file-output-stream;1"].
				 createInstance(Components.interfaces.nsIFileOutputStream);
	stream.init(aFile, 0x04 | 0x08 | 0x20, 0600, 0); // readwrite, create, truncate
				
	stream.write(aContent, aContent.length);
	if (stream instanceof Components.interfaces.nsISafeOutputStream) {
	  stream.finish();
	} else {
	  stream.close();
	}
  }
  
  //creates an empty file
  this.fileCreate = function(aFilePath)
  {
	var aFile = Components.classes["@mozilla.org/file/local;1"].
				createInstance(Components.interfaces.nsILocalFile);
	
	aFile.initWithPath(aFilePath);
	if(!aFile.exists())   // if it doesn't exist, create
	  aFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0755);
  }
  
  //creates a folder
  this.folderCreate = function(aFilePath)
  {
	var aFile = Components.classes["@mozilla.org/file/local;1"].
				createInstance(Components.interfaces.nsILocalFile);
	
	aFile.initWithPath(aFilePath);
	if(!aFile.exists())   // if it doesn't exist, create
	  aFile.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
  }
  
  //read remote binary
  this.koFileRemoteRead = function(aURI)
  {
	var reader = Components
				  .classes["@activestate.com/koFileEx;1"]
				  .createInstance(Components.interfaces.koIFileEx);
	reader.URI = aURI;
	reader.open("rb");
	var aContent = reader.readfile();
	reader.close();
	return aContent;
  }
  //write remote binary
  this.koFileRemoteWrite = function(aURI, aContent)
  {
	var writer = Components
				  .classes["@activestate.com/koFileEx;1"]
				  .createInstance(Components.interfaces.koIFileEx);
	writer.URI = aURI;
	writer.open("wb+");
	writer.puts(aContent);
	writer.close();
  }
  //read local binary
  this.koFileLocalRead = function(aPath)
  {
	var reader = Components
				  .classes["@activestate.com/koFileEx;1"]
				  .createInstance(Components.interfaces.koIFileEx);
	reader.path = aPath;
	reader.open("rb");
	var aContent = reader.readfile();
	reader.close();
	return aContent;
  }
  //write local binary
  this.koFileLocalWrite = function(aPath, aContent)
  {
	var writer = Components
				  .classes["@activestate.com/koFileEx;1"]
				  .createInstance(Components.interfaces.koIFileEx);
	writer.path = aPath;
	writer.open("wb+");
	writer.puts(aContent);
	writer.close();
  }
  
  //open an path with an external handler
  this.launch = function(aFilePath)
  {
	if(this.fileIsFolder(aFilePath))
	{
	  this.folderOpen(aFilePath);
	}
	else
	{
	  var aFile = Components.classes["@mozilla.org/file/local;1"].  
					  createInstance(Components.interfaces.nsILocalFile); 
	  aFile.initWithPath(aFilePath);
	  aFile.launch();
	}
  }
  //reveals a folder
  this.folderOpen = function(aFilePath)
  {
	var aFile = Components.classes["@mozilla.org/file/local;1"]
				  .createInstance(Components.interfaces.nsILocalFile);	
		aFile.initWithPath(aFilePath);
	try 
	{
		aFile.reveal();
	}
	catch (e)
	{
	}
  }
  //returns true if a path is a folder
  this.fileIsFolder = function(aFilePath)
  {
	try{
	  var aFile = Components.classes["@mozilla.org/file/local;1"]
					  .createInstance(Components.interfaces.nsILocalFile);
	  aFile.initWithPath(aFilePath);

	  if(aFile.exists() && aFile.isDirectory())
		  return true;
	  else
		  return false;
	}catch(e)
	{
	  return false;
	}
  }
  //return nsilocalfile object
  this.file = function(aFilePath)
  {
	var aFile = Components.classes["@mozilla.org/file/local;1"]
					.createInstance(Components.interfaces.nsILocalFile);
	aFile.initWithPath(aFilePath);
	return aFile;
  }
  this.uri = function(aURL)
  {
	return mIos.newURI(aURL, null, null);
  }
  //open an external URI
  this.openURI = function(aURI)
  {
	var protocolSvc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
								.getService(Components.interfaces.nsIExternalProtocolService);

	protocolSvc.loadUrl(this.uri(aURI));
  }
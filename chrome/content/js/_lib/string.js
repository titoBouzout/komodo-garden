  
  const RXencodePath = /%2F/gi;
  
  this.encodePath = function(aString)
  {
	return this.encodeURIComponent(aString).replace(RXencodePath, '/');
  }
  
  this.encodeURIComponent = function(aString)
  {
	try {
	  return encodeURIComponent(aString);
	} catch(e) {
	  try {
		return encodeURI(aString);
	  } catch(e) {
		try {
		  return escape(aString);
		} catch(e) {
		  return aString;
		}
	  }
	}
  }
  
  this.sortLocale = function(a, b)
  {
	return a.localeCompare(b);
  }
  //trims a string
  this.trim = function(aString)
  {
	if(!aString)
		return '';
	return aString.replace(/^\s+/, '').replace(/\s+$/, '');
  };

  //cast an object toString avoids null errors
  this.string = function(aString)
  {
	if(!aString)
	  return '';
	else
	  return aString.toString();
  };
  //Encodes HTML special chars
  this.htmlSpecialCharsEncode = function(aString)
  {
	if(!aString)
	  return '';
	
	return aString.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;').split("'").join('&apos;');
  }
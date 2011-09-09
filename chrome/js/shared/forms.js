  
  this.alert = function(aString){
	myAPI.form().alert(this.aName, aString);
  }
  this.confirm = function(aString){
	return myAPI.form().confirm(this.aName, aString);
  }
  this.confirmWithCheckbox = function(aString, aCheckboxPrompt){
	return myAPI.form().confirmWithCheckbox(this.aName, aString, aCheckboxPrompt);
  }
  this.prompt = function(aString, aDefault, multiline, aFunction, aParams, aCheckboxPrompt){
	return myAPI.form().prompt(this.aName, aString, aDefault, multiline, aFunction, aParams, aCheckboxPrompt);
  }
  
  this.overWritePrompt = function(aString, window)
  {
	var r = {};
		r.label = aString.trim();

	window.getAttention();
	
	var win = window.openDialog(
					   'chrome://asynchremote/content/js/shared/prompt/overWriteFiles.xul',
					   '',
					   'chrome,centerscreen,modal',
					   r).focus();
	if(!r || !r.value)
	  var value = {'value':'Cancel','dontAskAgain':false}
	else
	  var value = {'value':r.value,'dontAskAgain':r.dontAskAgain}
	
	win = null;
	r = null;

	return value;
  }
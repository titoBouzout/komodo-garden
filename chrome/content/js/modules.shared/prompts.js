  this.include('string.js');
  
  this.overWritePrompt = function(aString, window)
  {
	var r = {};
		r.label = this.string(aString).trim();

	window.getAttention();
	
	var win = window.openDialog(
					   'chrome://'+this.getExtensionChromeName()+'/content/js/modules.shared/prompts/overWriteFiles.xul',
					   '',
					   'chrome,centerscreen,modal',
					   r);
	if(!r || !r.value)
	  var value = {'value':'Cancel','dontAskAgain':false}
	else
	  var value = {'value':r.value,'dontAskAgain':r.dontAskAgain}
	
	win = null;
	r = null;
	
	delete win;
	delete r;

	return value;
  }
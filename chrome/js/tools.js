(function(){
  
  this.toolsSaveOptions = function()
  {
	this.s.pref('upload.and.rename', this.element('g-tools-upload-and-rename').getAttribute('checked') == 'true')
	this.s.pref('overwrite.no.ask', this.element('g-tools-overwrite-no-ask').getAttribute('checked') == 'true')
	this.s.pref('dont.cache.last.modified', this.element('g-tools-dont-cache-last-modified').getAttribute('checked') == 'true');
  }
  
  this.toolsContribute = function()
  {
	this.s.openURI('https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=H738SJGDU3NJ8');
  }
  
  this.toolsPopupShowing = function()
  {
	if(this.s.pref('overwrite.no.ask'))
	  this.element('g-tools-overwrite-no-ask').setAttribute('checked', 'true');
	else
	  this.element('g-tools-overwrite-no-ask').setAttribute('checked', 'false');

	if(this.s.pref('upload.and.rename'))
	  this.element('g-tools-upload-and-rename').setAttribute('checked', 'true');
	else
	  this.element('g-tools-upload-and-rename').setAttribute('checked', 'false');

	if(this.s.pref('dont.cache.last.modified'))
	  this.element('g-tools-dont-cache-last-modified').setAttribute('checked', 'true');
	else
	  this.element('g-tools-dont-cache-last-modified').setAttribute('checked', 'false');
  }
  
}).apply(garden);
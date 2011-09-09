(function(){
  
  this.toolsSaveOptions = function()
  {
	this.shared.pref('overwrite.no.ask', this.element('g-tools-overwrite-no-ask').getAttribute('checked') == 'true')
	this.shared.pref('dont.cache.last.modified', this.element('g-tools-dont-cache-last-modified').getAttribute('checked') == 'true');
	var oldHiddenItems = this.shared.pref('no.hidden.items');
	this.shared.pref('no.hidden.items', !(this.element('g-tools-show-hidden-items').getAttribute('checked') == 'true'));
	if(oldHiddenItems != this.shared.pref('no.hidden.items'))
	  gardenAPI.treesReloadAll();
  }
  
  this.toolsContribute = function()
  {
	myAPI.file().load('https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=H738SJGDU3NJ8');
  }
  
  this.toolsPopupShowing = function()
  {
	if(this.shared.pref('overwrite.no.ask'))
	  this.element('g-tools-overwrite-no-ask').setAttribute('checked', 'true');
	else
	  this.element('g-tools-overwrite-no-ask').setAttribute('checked', 'false');

	if(this.shared.pref('dont.cache.last.modified'))
	  this.element('g-tools-dont-cache-last-modified').setAttribute('checked', 'true');
	else
	  this.element('g-tools-dont-cache-last-modified').setAttribute('checked', 'false');
	  
	if(this.shared.pref('no.hidden.items'))
	  this.element('g-tools-show-hidden-items').setAttribute('checked', 'false');
	else
	  this.element('g-tools-show-hidden-items').setAttribute('checked', 'true');		
		
	if(this.shared.pref('sidebar.view.type.single'))
	  this.element('g-tools-sidebar-view-single').setAttribute('checked', 'true');
	else
	  this.element('g-tools-sidebar-view-single').setAttribute('checked', 'false');
	
	if(this.shared.pref('sidebar.view.type.multiple.horizontal'))	
	  this.element('g-tools-sidebar-view-multiple-horizontal').setAttribute('checked', 'true');
	else
	  this.element('g-tools-sidebar-view-multiple-horizontal').setAttribute('checked', 'false');
	
	if(this.shared.pref('sidebar.view.type.multiple.vertical'))	
	  this.element('g-tools-sidebar-view-multiple-vertical').setAttribute('checked', 'true');
	else
	  this.element('g-tools-sidebar-view-multiple-vertical').setAttribute('checked', 'false');
	  
	  
  }
  
}).apply(garden);
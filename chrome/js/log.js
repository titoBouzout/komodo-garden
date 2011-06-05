  
(function(){
  
  this.logOpen = function()
  {
	this.element('g-log-show-progress').checked = this.s.pref('log.show.progress');
	this.element('g-log-show-warning').checked = this.s.pref('log.show.warning');
	this.element('g-log-show-error').checked = this.s.pref('log.show.error');
	this.element('g-log-show-sucess').checked = this.s.pref('log.show.sucess');

	this.logUpdate();
	
	this.element('g-log-panel')
					.openPopup(
					  this.element('g-toolbar-log'),
					  'after_start'
					);
					
	this.focusedInstance.errorCount = 0;
	
   // this.s.dump('logOpen:toolbarUpdate');
	this.toolbarUpdate();
  }
  
  this.logSave = function()
  {
	var f = ko.filepicker.saveFile(null, 'log-'+this.focusedInstance.label+'.html','Save log in…', null); 
	if(f)
	{
	  var log = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd"><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><style>div{font-size:11px;font-family:arial, tahoma, sans-serif;} .sucess{ color:#45a44e; }  .status{color:#5d61af;}.error{ color:#d73d3d; } .warning{ color:#666666;}.canceled{ color:#876F71;}.progress{ color:#999999;}.process{ color:#45a44e;font-weight:bold;}</style></head><body>';
	  
	  var showErrors = this.s.pref('log.show.error');
	  var showWarnings = this.s.pref('log.show.warning');
	  var showProgress = this.s.pref('log.show.progress');
	  var showSucess = this.s.pref('log.show.sucess');
	  
	  var searchString = this.element('g-log-search').value;
	  for(var id in this.focusedInstance.logs)
	  {
		var aType = this.focusedInstance.logs[id].aType;
		if(
		   aType == 'error' && !showErrors ||
		   aType == 'warning' && !showWarnings ||
		   aType == 'sucess' && !showSucess ||
		   aType == 'progress' && !showProgress
		)
		{
		  continue;
		}
		
		if(searchString != '' && !this.s.searchEngineSearch(searchString, this.focusedInstance.logs[id].aMsg))
		  continue;
		
		log += '<div class="'+this.focusedInstance.logs[id].aType+'">';
		log += this.focusedInstance.logs[id].aDate;
		log += ' [';
		log += this.focusedInstance.logs[id].aProcessID;
		log += '] → ';			
		log += this.focusedInstance.logs[id].aType;
		log += ' : ';
		log += this.focusedInstance.logs[id].aMsg;
		log += '\n';
		log += '</div>'
	  }
	  log += '</body></html>';
	  
	  this.s.fileWrite(f, log);
	}
  }
  
  this.logUpdate = function()
  {
	var log = this.element('g-log');
	var childrens = [];
	
	var showErrors = this.s.pref('log.show.error');
	var showWarnings = this.s.pref('log.show.warning');
	var showProgress = this.s.pref('log.show.progress');
	var showSucess = this.s.pref('log.show.sucess');
	
	var searchString = this.element('g-log-search').value;
	var i = this.focusedInstance.logs.length-1;
	for(;i >=0;i--)
	{
	  var entry = this.focusedInstance.logs[i];
	  var aType = entry.aType;
	  if(
		 aType == 'error' && !showErrors ||
		 aType == 'warning' && !showWarnings ||
		 aType == 'sucess' && !showSucess ||
		 aType == 'progress' && !showProgress
	  )
	  {
		continue;
	  }
	  
	  if(searchString != '' && !this.s.searchEngineSearch(searchString, entry.aMsg ))
		continue;
	  
	  var description = document.createElement('description');
		  description.setAttribute('flex', '1');
		  description.setAttribute('wrap', 'true');
		  description.appendChild(document.createTextNode(
			entry.aDate
			+ ' ['
			+ entry.aProcessID
			+ '] → '
			+ entry.aType
			+ ' : '
			+ entry.aMsg
		  ));
	  var richlistitem = document.createElement('richlistitem');
		  richlistitem.setAttribute('class', 'g-log-row g-log-row-item-'+entry.aType);
		  richlistitem.appendChild(description);
		childrens[childrens.length] = richlistitem;
	}
	
	this.s.removeChilds(log);
	for(var id in childrens)
	  log.appendChild(childrens[id]);
  }
  
  this.logCopySelected = function()
  {
	var log = this.element('g-log');
	var selected = log.selectedItems;
	var text = '';
	for(var id in selected)
	{
	  text += selected[id].firstChild.firstChild.nodeValue;
	  text += this.s.__NL;
	}
	this.s.copyToClipboard(text);
  }
  
  this.logCopyAll = function()
  {
	var log = this.element('g-log');
	var count = log.getRowCount();
	var text = '';
	for(var i=0;i<count;i++)
	{
	  text += log.getItemAtIndex(i).firstChild.firstChild.nodeValue;
	  text += this.s.__NL;
	}
	this.s.copyToClipboard(text);
  }
  
  this.logUpdateIfOpened = function()
  {
	if(this.element('g-log-panel').state == 'open')
	  this.logUpdate();
  }
  
  this.logSaveOptions = function()
  {
	this.s.pref('log.show.progress', this.element('g-log-show-progress').checked);
	this.s.pref('log.show.warning', this.element('g-log-show-warning').checked);
	this.s.pref('log.show.error', this.element('g-log-show-error').checked);
	this.s.pref('log.show.sucess', this.element('g-log-show-sucess').checked);
	this.logUpdateIfOpened();
  }
  
  this.logClear = function()
  {
	this.focusedInstance.logs = [];
	this.logUpdateIfOpened();
  }
  
}).apply(garden);
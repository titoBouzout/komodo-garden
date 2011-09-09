(function(){
  
  this.processListPopupShowing = function()
  {
	var menupopup = this.element('g-process-list-popup');
	myAPI.DOM().removeChilds(menupopup);
	
	if(this.focusedInstance.connected && !this.focusedInstance.closing)
	  menupopup.firstChild.removeAttribute('disabled');
	else
	  menupopup.firstChild.setAttribute('disabled', true);

	if(this.focusedInstance.closing)
	{
	}
	else
	{
	  for(var id in this.focusedInstance.processes)
	  {
		var process = this.focusedInstance.processes[id];
  
		var menuitem = document.createElement('menuitem');
			menuitem.setAttribute('label', '['+process.id+'] '+process.name);
			menuitem.setAttribute('class', 'menuitem-iconic g-processes');
			menuitem.setAttribute('running', process.running());
			menuitem.setAttribute('completed', process.completed());
			menuitem.setAttribute('paused', process.paused());
			menuitem.setAttribute('aborted', process.aborted());
			menuitem.setAttribute('process', id);
			menuitem.setAttribute('oncommand', "garden.processListCommand(this)");
			if(process.running())
			  menuitem.setAttribute('tooltiptext', 'Process is currenlty running, click to pause');
			else if(process.completed())
			  menuitem.setAttribute('tooltiptext', 'Process completed, click to re-run');
			else if(process.paused())
			  menuitem.setAttribute('tooltiptext', 'Process paused, click to continue');
			else if(process.aborted())
			  menuitem.setAttribute('tooltiptext', 'Process aborted, click to continue');
		  try{
			menupopup.insertBefore(menuitem, menupopup.firstChild.nextSibling.nextSibling);
		  }catch(e){menupopup.appendChild(menuitem)}
	  }
	}
  }
  
  this.processListCommand = function(aElement)
  {
	var process = aElement.getAttribute('process');
	
	var aProcess = this.focusedInstance.processes[process];
	
	if(aElement.getAttribute('running') == 'true')
	{
	  aProcess.paused(true);
	  this.focusedInstance.log('status', 'Process '+aProcess.name+' will pause on next iteration', aProcess.id);
	}
	else if(aElement.getAttribute('completed') == 'true')
	{
	  this.focusedInstance.log('status', 'Process '+aProcess.name+' was restarted by user', aProcess.id);

	  aProcess.restart();
	  var focusedInstance = this.focusedInstance;
		  garden.s.runThread(function(){
											  focusedInstance.processController(aProcess);
											}, focusedInstance.thread);
	}
	else if(
			aElement.getAttribute('paused') == 'true' ||
			aElement.getAttribute('aborted') == 'true'
	)
	{
	  this.focusedInstance.log('status', 'Process '+aProcess.name+' will continue', aProcess.id);
	  aProcess.continue();
	  var focusedInstance = this.focusedInstance;
		  garden.s.runThread(function(){
											  focusedInstance.processController(aProcess);
											}, focusedInstance.thread);
	}
  }
  
}).apply(garden);
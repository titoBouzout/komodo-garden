(function(){
  
  this.toolbarGoUpPopupshowing = function(aElement)
  {
	myAPI.DOM().removeChilds(aElement);
	
	var paths = this.focusedTree.currentPath.split(this.focusedInstance.__DS);
	paths.pop();
	var path = '';
	for(var id in paths)
	{
	  path += paths[id];
	  if(path == this.focusedInstance.__DS)
		continue;
	  var menuitem = this.create('menuitem');
		  menuitem.setAttribute('label', path);
		  menuitem.setAttribute('path', path);
		  menuitem.setAttribute('class', 'menuitem-iconic g-browser-container');
		  
	  path += this.focusedInstance.__DS;
	  aElement.appendChild(menuitem);
	}
  }
  
}).apply(garden);
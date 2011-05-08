
const history = function()//instanceable
{
  this.back = [];
  this.forward = [];

  /*
   each time we move the "base" this value change,
   then if we started a process in view "X",
   by requesting this value,
   we can check if the output of that process is for current view
  */
  
  this.currentView = 0;
  
  this.change = function(to)
  {
	this.push(this.back, to);
  }
  
  this.goBack = function(from)
  {
	this.push(this.forward, from);
	return this.back.pop();
  }
  this.goForward = function(from)
  {
	this.push(this.back, from);
	return this.forward.pop();
  }
  
  this.canGoBack = function()
  {
	return this.back.length > 0;
  }
  this.canGoForward = function()
  {
	return this.forward.length > 0;
  }
  this.push = function(aObj, aHistoryObj)
  {
	this.currentView++;
	if(aObj[aObj.length-1] != aHistoryObj)
	  aObj[aObj.length] =aHistoryObj;
  }
  this.reset = function()
  {
	this.back = [];
	this.forward = [];
  
	this.currentView = 0;
  }
}

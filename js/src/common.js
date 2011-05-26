/*
  AutoTextboxList
  A Javascript/Prototype widget which creates a textbox list (a container which lets the user add multiple
  distinct values; for instance, could be used for a list of tags or message recipients) with an accompanying
  autocompleter driven by JSON (optionally via AJAX).
  
  Requirements: Prototype <http://www.prototypejs.org> v1.7RC3 or later
  
  Available at <http://github.com/dvandersluis/autotextboxlist>
  
  Originally forked from Proto!MultiSelect <http://github.com/nathanstitt/protomultiselect>
  Copyright: InteRiders <http://interiders.com/> - Distributed under MIT - Keep this message!
*/

// Added key contstant for COMMA watching happiness
Object.extend(Event, { KEY_COMMA: 188, CHAR_COMMA: 44 });

// Add some helper methods to Prototype's Element class
Element.addMethods({
  getCaretPosition: function()
  {
    if (this.createTextRange)
    {
      var r = document.selection.createRange().duplicate();
      r.moveEnd('character', this.value.length);
      if (r.text === '') return this.value.length;
      return this.value.lastIndexOf(r.text);
    }
    else return this.selectionStart;
  },
  
  onBoxDispose: function(item, obj)
  {
    // Set to not to "add back" values in the drop-down upon delete if they were new value
    item = item.retrieve('text').evalJSON(true);
    if (!item.newValue) obj.auto.feed(item);
  },
  
  onInputBlur: function(el, obj)
  {
    obj.lastinput = el;
  }
});

Object.extend(String.prototype, {
  entitizeHTML: function()
  {
    return this.replace(/</g,'&lt;').replace(/>/g,'&gt;');
  },

  unentitizeHTML: function()
  {
    return this.replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  }
});

function $pick()
{
  for (var i = 0; i < arguments.length; i++)
  {
    if (!Object.isUndefined(arguments[i]))
    {
      return arguments[i];
    }
  }
  return null;
}
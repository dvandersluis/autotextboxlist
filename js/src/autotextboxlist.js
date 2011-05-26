/* AutoTextboxList class
 * Extends TextboxList by adding an autocomplete component (fed by JSON provided locally or through AJAX)
 */
var AutoTextboxList = Class.create(TextboxList, {
  initialize: function($super, element, autoholder, options, func)
  {
    // Set up default options for AutoTextboxList
    // See also the options for TextboxList, as they are inherited
    options = $H({
      newValues: false,
      feedURL: undefined,               // URL for the JSON feed, if getting by AJAX
      feedMethod: 'get',                // HTTP method for AJAX request
      results: 10,                      // Maximum number of results to show in the autocomplete
      visibleResults: 0,                // How many results are visible at a time in the autocomplete
      onEmptyInput: function(input){},  // Callback function for when the input is empty
      caseSensitive: false,             // Is the autocomplete match case sensitive? 
      regexSearch: true,                // Should matches be made through regex or string methods 
      wordMatch: false,                 // Do matches need to be full words? (only applies if using regexSearch)
      loadFromInput: true,              // Should any values already in the input on creation be added?
      defaultMessage: "",               // Used to provide the default autocomplete message if built by the control
      sortResults: false,               // Should the autocomplete results be sorted?
      autoDelay: 250,                   // Delay in ms before the autocomplete is shown
      autoResize: false                 // Should the autocomplete div be kept the same width as the input?
    }).update(options);

    $super(element, options);

    this.id_base = $(element).identify() + "_" + this.options.get("className");

    this.auto = new Autocompleter(this.maininput.retrieve('input'), autoholder, this.options);
    this.autoholder = this.auto.holder;
    this.element.insert({ after: this.autoholder });
    
    // Autocomplete sets up some event handlers that we don't need here
    //this.maininput.retrieve('input').retrieve('focus-event').stop();
    this.maininput.retrieve('input').retrieve('blur-event').stop();
    
    this.overrideAutocompleteMethods();
    
    // Keep the autocomplete element the same size as the input
    // Allows for width on the holder to be specified as a percentage
    if (this.options.get('autoResize'))
    {
      this.resizeAutocomplete();
      Event.observe(window, 'resize', function() { this.resizeAutocomplete(); }.bind(this));
    }
    
    // We need to load from input as part of the AJAX request when using feedURL
    // or else the data won't have completed being fetched before the data in the 
    // input is loaded
		if (this.options.get('loadFromInput')) this.loadFromInput()
  },

  overrideAutocompleteMethods: function()
  {
    var that = this;
    
    Object.extend(this.auto, 
    {
      select: function()
      {
        var input_value = that.current.retrieve('input').getValue();
        
        // If the text input is blank and the user hits Enter call the onEmptyInput callback.
        if (input_value.blank()) 
        {
          that.options.get("onEmptyInput")();
          this.current = false; // if the input is blank, we shouldn't be adding an autocomplete result
        }
        
        // Ensure that the value matches this.current before adding.
        // This stops the wrong value from being added if the user types fast and hits enter before a new autocurrent is found
        if (this.current)
        {
          var result = this.current.retrieve('result');
          result = (result.caption || result.value);
        
          if (result && new RegExp(input_value, 'i').test(result.unentitizeHTML()))
          {
            this.add(this.current);
            return;
          }
        }
        
        this.hide();
      },
      
      add: function(el)
      {
        if (!el || !el.retrieve('result')) return null;
        
        that.current_input = "";
        that.add(el.retrieve('result'));
        delete this.data[this.data.indexOf(Object.toJSON(el.retrieve('result')))];
        var input = that.lastinput || that.current.retrieve('input');
        
        this.hide();
        input.retrieve('resizable').clear().focus();
        return this;
      },
      
      onSearch: function()
      {
        // If the user doesn't add comma after, the value is discarded upon submit
        that.current_input = this.options.get('encodeEntities') ? this.element.value.strip().entitizeHTML() : this.element.value.strip().escapeHTML();
        that.update();        
      }
    });
  },

  resizeAutocomplete: function()
  {
    this.autoholder.setStyle({width: this.holder.getWidth() + "px"});
  },

  createInput: function($super,options)
  {
    var box = $super(options);
    var input = box.retrieve('input');

    input.observe(Prototype.Browser.IE ? 'keydown' : 'keypress', function(e)
    {
      if ((e.keyCode == Event.KEY_RETURN) && this.auto.enter) e.stop();
      this.auto.enter = false;
    }.bind(this));
    
    return box;
  },
  
  createBox: function($super,text, options)
  {
    var box = $super(text, options);
    
    box.observe('mouseover', function() { this.addClassName('bit-hover'); })
       .observe('mouseout',function() { this.removeClassName('bit-hover'); });
    
    return box;
  },

  loadFromInput: function()
  {
    var input_values = this.element.value.split(this.options.get('separator')).invoke('strip');

    if (this.auto.data.length)
    {
      this.auto.data.select(function(el) { return input_values.include(el.evalJSON(true).value) }).each(function(el)
      {
        el = el.evalJSON(true);
        this.auto.add({ value: el.value, caption: el.caption});
        delete this.auto.data[this.data.indexOf(Object.toJSON(el))];
        input_values = input_values.without(el.value);
      }, this);
    }
    
    input_values.each(function(el)
    {
      if (!el.empty())
      {
        this.auto.add({ value: el, caption: el });
      }
    }, this);
  }
});
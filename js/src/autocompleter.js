/* Autocompleter class
 * Creates an autocomplete component tied to an input (fed by JSON provided locally or through AJAX)
 */
var Autocompleter = Class.create({
  initialize: function(element, holder, options)
  {
    // Set up default options for AutoTextboxList
    // See also the options for TextboxList, as they are inherited
    this.options = $H({
      feedURL: undefined,               // URL for the JSON feed, if getting by AJAX
      feedMethod: 'get',                // HTTP method for AJAX request
      results: 10,                      // Maximum number of results to show in the autocomplete
      visibleResults: 0,                // How many results are visible at a time in the autocomplete
      caseSensitive: false,             // Is the autocomplete match case sensitive? 
      regexSearch: true,                // Should matches be made through regex or string methods 
      wordMatch: false,                 // Do matches need to be full words? (only applies if using regexSearch)
      defaultMessage: "",               // Used to provide the default autocomplete message if built by the control
      sortResults: false,               // Should the autocomplete results be sorted?
      delay: 250                        // Delay in ms before the autocomplete is shown
    }).update(options);
    
    // Default options 
    this.loptions = $H({
      autocomplete: {
        opacity: 1,
        maxresults: 10,
        minchars: 1
      }
    });
    
    // Defines the div that contains autocomplete values
    this.element = $(element);
    
    this.holder = $(holder) || this.create(holder);
    this.holder.setOpacity(this.loptions.get('autocomplete').opacity)
      .observe('mouseover', function() { this.curOn = true; }.bind(this))
      .observe('mouseout', function() { this.curOn = false; }.bind(this));
    this.initializeElement();
    
    this.data = [];
    this.data_searchable = [];
    
    this.results = this.holder.select('ul').first(); // Defines the autocomplete list
    
    // If a list is already present, load it as autocomplete options
    var children = this.results.select('li');
    children.each(function(el)
    {
      this.add({ value: el.readAttribute('value'), caption: el.innerHTML });
    }, this);
    
    // Loading the options list only once at initialize.
    // This would need to be further extended if the list was exceptionally long
    if (!Object.isUndefined(this.options.get('feedURL')))
    {
      new Ajax.Request(this.options.get('feedURL'), {
        method: this.options.get('feedMethod'),
        onSuccess: function(transport)
        {
          transport.responseText.evalJSON(true).each(function(t) { this.feed(t); }.bind(this));
        }.bind(this)
      });
    }
    else if (!Object.isUndefined(this.options.get('feed')))
    {
      this.options.get('feed').each(function(t) { this.feed(t) }.bind(this));
    }
    
    document.observe('click', function() { this.hide() }.bindAsEventListener(this));
  },
  
  initializeElement: function(element)
  {
    if (element) this.element = $(element);
    
    this.element.store('click-event', this.element.on('click', function(e) { e.stop(); this.focus(this.element); }.bind(this)));
    this.element.store('focus-event', this.element.on('focus', function(e) { this.show(this.element.value) }.bind(this)));
    this.element.store('blur-event', this.element.on('blur'), function()
    {
      if (!this.curOn) 
      {
        this.hide.bind(this).delay(0.1)
      }
    }.bind(this));
    
    this.element.observe('keydown', function(e)
    {
      this.dosearch = false;
      this.newvalue = false;

      switch (e.keyCode)
      {
        case Event.KEY_UP: e.stop(); return this.move('up');
        case Event.KEY_DOWN: e.stop(); return this.move('down');
        
        case Event.KEY_RETURN:
        case Event.KEY_TAB:
          e.stop();
          this.select();
          break;
        
        case Event.KEY_ESC:
          // If ESC is pressed, hide the autocomplete, but let the user still enter the text they typed
          // This lets the user type part of an autocomplete result but add just what they typed instead
          // of the full result.
          this.current = false;
          this.hide();
          break;
        
        default:
          this.dosearch = true;
      }
      return null;
    }.bind(this));
    
    this.element.observe('keyup', function(e)
    {
      switch (e.keyCode)
      {
        case Event.KEY_COMMA:
        case Event.KEY_RETURN:
        case Event.KEY_TAB:
        case Event.KEY_UP:
        case Event.KEY_DOWN:
        case Event.KEY_ESC:
          break;
        
        default:
          if (this.onSearch) this.onSearch();
          
          // Removed Ajax.Request from here and moved to initialize,
          // now doesn't create server queries every search but only
          // refreshes the list on initialize (page load)
          if (this.searchTimeout) clearTimeout(this.searchTimeout);
          
          this.searchTimeout = setTimeout(function()
          {
            var sanitizer = new RegExp("[({[^$*+?\\\]})]","g");
            if (this.dosearch)
            {
              this.current = false;
              this.show(this.element.value.replace(sanitizer,"\\$1"));
            }
          }.bind(this), this.options.get('delay'));
      }
    }.bind(this));
  },
  
  select: function()
  {
    this.add(this.current);
    this.current = false;
    this.enter = true;  
  },
  
  create: function(id)
  {
    var div = new Element('div', { id: id, 'class': 'autocomplete' });      
    var ul = new Element('ul', { 'class': 'feed' });

    if (this.options.get('defaultMessage').length)
    {
      var default_div = new Element('div', { 'class': 'default' }).update(this.options.get('defaultMessage'));
      div.insert(default_div);
    }

    div.insert(ul);
    
    this.element.insert({ after: div });
    return div;
  },
  
  feed: function(text)
  {
    var with_case = this.options.get('caseSensitive');
    if (this.data.indexOf(Object.toJSON(text)) == -1)
    {
      this.data.push(Object.toJSON(text));
      
      var data_searchable = Object.toJSON(text).evalJSON(true);
      data_searchable = (data_searchable.caption || data_searchable.value).unentitizeHTML();
      this.data_searchable.push(with_case ? data_searchable : data_searchable.toLowerCase());
    }
    return this;
  },
  
  show: function(search)
  {
    this.holder.setStyle({'display': 'block'});
    this.holder.descendants().each(function(e) { e.hide(); });

    if (!search || !search.strip() || (!search.length || search.length < this.loptions.get('autocomplete').minchars))
    {
      if (this.holder.select('.default').first())
      {
        this.holder.select('.default').first().setStyle({'display': 'block'});
      }
      this.resultsshown = false;
    }
    else
    {
      this.resultsshown = true;
      this.results.setStyle({'display': 'block'}).update('');
      
      if (!this.options.get('regexSearch'))
      {
        var matches = new Array();
        if (search)
        {
          if (!this.options.get('caseSensitive'))
          {
            search = search.toLowerCase();
          }
          
          for (var matches_found = 0, i = 0, len = this.data_searchable.length; i < len; i++)
          {
            if (this.data_searchable[i].indexOf(search) >= 0)
            {
              var v = this.data[i];
              if (v !== undefined)
              {
                matches[matches_found++] = v;
              }
            }
          }
        }
      }
      else
      {
        if (this.options.get('wordMatch'))
        {
          var regexp = new RegExp("(^|\\s)"+search,(!this.options.get('caseSensitive') ? 'i' : ''));
        }
        else
        {
          var regexp = new RegExp(search,(!this.options.get('caseSensitive') ? 'i' : ''));
        }
        
        var matches = this.data.filter(
          function(str)
          {
            var json = str.evalJSON(true), caption = json.caption || json.value;
            return str ? regexp.test(caption) : false;
          }
        );
      }
      
      if (this.options.get('sortResults'))
      {
        matches = matches.sortBy(function(el)
        {
          var json = el.evalJSON(true), caption = json.caption || json.value;
          return caption;
        });
      }

      var count = 0;
      matches.each(
        function(result, ti)
        {
          count++;
          if (ti >= (this.options.get('results') ? this.options.get('results') : this.loptions.get('autocomplete').maxresults)) return;
          
          var el = new Element('li');
          var json = result.evalJSON(true), caption = json.caption || json.value;
          var that = this;
          
          el.observe('click', function(e)
            {
              e.stop();
              //that.current_input = "";
              that.add(this);
            })
            .observe('mouseover', function() { that.focus(this); } )
            .update(this.highlight(caption, search));
						
				  if (json.description)
					{
						el.insert({ bottom: "<br />" });
						var desc = new Element('span', { className: 'description' }).update(json.description)
						el.insert({ bottom: desc });
					}
          
          this.results.insert(el);
          el.store('result', result.evalJSON(true));
          if (ti == 0) this.focus(el);
        }, this
      );
    }

    if (count == 0)
    {
      // if there are no results, hide everything so that KEY_RETURN has no effect
      this.current = false;
      this.hide();
    }
    else
    {
      if (this.results.firstDescendant())
      {
        var autoresult_height = this.results.firstDescendant().offsetHeight;
				this.results.scrollTop = 0;

				if (count > this.options.get('visibleResults'))
        {
          this.results.setStyle({'height': (this.options.get('visibleResults') * autoresult_height) + 'px'});
        }
        else
        {
          this.results.setStyle({'height': (count ? (count * autoresult_height) : 0) + 'px'});
        }
      }
    }
    
    return this;
  },
  
  focus: function(el)
  {
    if (!el) return null;
    if (this.current) this.current.removeClassName('auto-focus');
    this.current = el.addClassName('auto-focus');
    return this;
  },
  
  hide: function()
  {
    this.resultsshown = false;
    this.holder.hide();
    return this;
  },
  
  highlight: function(html, highlight)
  {
    // Because the autocomplete will be filled with HTML, we need to escape any HTML in the string
    return html.entitizeHTML().unescapeHTML().gsub(new RegExp(highlight,'i'), function(match)
      {
        return '<em>' + match[0] + '</em>';
      }
    ).gsub(/<(?!\/?em>)/, "&lt;"); // ... except for the <em> tags that we add here.
  },
  
  add: function(el)
  {
    if (!el || !el.retrieve('result')) return null;
      
    this.hide();
    this.element.value = el.retrieve('result').value;
    this.element.focus();
    return this;
  },
  
  move: function(direction)
  {
    if (!this.resultsshown) return null;
    this.focus(this.current[(direction == 'up' ? 'previous' : 'next')]());
    this.results.scrollTop = this.current.positionedOffset()[1] - this.current.getHeight();
    return this;
  }
});
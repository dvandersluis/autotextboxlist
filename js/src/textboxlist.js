/* TextboxList class
 * Creates a container that holds a list of textbox values that can be navigated through
 */
var TextboxList = Class.create({
  initialize: function(element, options)
  {
    // Default options for TextboxList
    this.options = $H({
      resizable: {},
      className: 'bit',           // Class name given to items
      separator: ',',             // The character that will separate items in the underlying input
      extraInputs: true,          // Specifies whether additional inputs are created 
      startInput: true,           
      onAdd: function(text){},    // Callback function when an item is added
      onRemove: function(text){}, // Callback function when an item is removed
      newValues: true,            // Can new values be created?
      spaceReplace: '',           // What to replace spaces with in the underlying input
      encodeEntities: false       // Should HTML entities be converted into UTF8 characters?
    });

    this.current_input = "";
    this.options.update(options);
    this.element = $(element).hide();
    this.bits = new Hash();
    this.events = new Hash();
    this.count = 0;
    this.current = false;
    this.maininput = this.createInput({ 'class': 'maininput' });
    this.holder = new Element('div', { 'class': 'holder' }).insert(this.maininput);
    this.element.insert({ before: this.holder });
    
    this.holder.observe('click', function(event)
    {
      event.stop();
      this.focus(this.maininput);
    }.bind(this));

    this.makeResizable(this.maininput);
    this.setEvents();
  },

  setEvents: function()
  {
    this.holder.observe('keyup',
      function(e)
      {
        e.stop();
        if (!this.current) return null;
        switch (e.keyCode)
        {
          case Event.KEY_LEFT: return this.move('left');
          case Event.KEY_RIGHT: return this.move('right');

          case Event.KEY_DELETE:
          case Event.KEY_BACKSPACE:
            return this.moveDispose();
        }
        
        return null;
      }.bind(this)
    ).observe(Prototype.Browser.IE || Prototype.Browser.WebKit ? 'keydown' : 'keypress',
      function(e)
      {
        if (!this.current) return null;
        if (this.current.retrieve('type') == 'box' && e.keyCode == Event.KEY_BACKSPACE) e.stop();
        if (this.current.retrieve('input') && !this.checkInput()) return null;

        if ([Event.KEY_HOME, Event.KEY_END].include(e.keyCode)) e.stop();

        // The handlers for Home and End need to be done on keypress; by the time
        // keyup fires, the default behaviour (scroll the page) will have happened
        switch (e.keyCode)
        {
          case Event.KEY_HOME: return this.move('home');
          case Event.KEY_END: return this.move('end');
        }
        
        return null;
      }.bind(this)
    )
    
    document.observe('click', function() { this.blur() }.bindAsEventListener(this));
  },

  update: function()
  {
    var values = this.bits.values();
    if (this.options.get('encodeEntities'))
    {
      // entitizeHTML / unentitizeHTML needs to be called around the unescapeHTML() call in order to preserve any braces
      values = values.map(function(e) { return e.toString().entitizeHTML().unescapeHTML().unentitizeHTML(); });
    }
    this.element.value = values.join(this.options.get('separator'));
    if (!this.current_input.blank())
    {
      this.element.value += (this.element.value.blank() ? "" : this.options.get('separator')) + this.current_input;
    }
    return this;
  },

  add: function(text, html)
  {
    var id = this.id_base + '-' + this.count++;
    var el = this.createBox(
      $pick(html, text),
      {
        'id': id,
        'class': this.options.get('className'),
        'newValue' : text.newValue ? 'true' : 'false',
        'href': '#'
      }
    );
    
    (this.current || this.maininput).insert({ 'before': el });

    el.observe('click',
      function(e)
      {
        e.stop();
        this.focus(el);
      }.bind(this)
    );
    
    this.bits.set(id, text.value);
    this.update(); 
    
    if (this.options.get('extraInputs') && (this.options.get('startInput') || el.previous()))
    {
      this.addSmallInput(el, 'before');
    }

    this.options.get("onAdd")( text );
    return el;
  },

  addSmallInput: function(el, where)
  {
    var input = this.createInput({ 'class': 'smallinput' });
    el.insert({}[where] = input);
    input.store('small', true);
    this.makeResizable(input);
    input.hide();
    return input;
  },

  insertCurrent: function()
  {
    if (this.options.get('newValues'))
    {
      var new_value_el = this.current.retrieve('input');

      new_value_el.value = new_value_el.value.strip();
      
      if (new_value_el.value.indexOf(",") < (new_value_el.value.length - 1))
      {
        var comma_pos = new_value_el.value.indexOf(",");
        if (comma_pos > 0)
        {
          new_value_el.value = new_value_el.value.substr(0, comma_pos).strip();
        }
      }
      else
      {
        new_value_el.value = new_value_el.value.strip();
      }
      
      if (!this.options.get("spaceReplace").blank())
      {
        new_value_el.value.gsub(" ", this.options.get("spaceReplace"));
      }
      
      if (!new_value_el.value.blank())
      {
        this.newvalue = true;
        var value = new_value_el.value.gsub(",", "");
        value = this.options.get('encodeEntities') ? value.entitizeHTML() : value.escapeHTML();
        new_value_el.retrieve('resizable').clear().focus();

        this.current_input = ""; // stops the value from being added to the element twice
        this.add({ caption: value, value: value, newValue: true });

        return true;
      }
    }
    return false;
  },

  dispose: function(el)
  {
    this.bits.unset(el.id);
    // Dynamic updating... why not?
    var value = el.innerHTML.stripScripts();
    value = this.options.get('encodeEntities') ? value.entitizeHTML() : value.escapeHTML();
    this.options.get("onRemove")( value.replace(/[\n\r\s]+/g, ' ') );
    this.update();
    
    if (el.previous() && el.previous().retrieve('small'))
    {
      el.previous().remove();
    }
    
    if (this.current == el)
    {
      this.focus(el.next());
    }
    
    if (el.retrieve('type') == 'box')
    {
      el.onBoxDispose(this);
    }
    
    el.remove();
    return this;
  },

  focus: function(el, nofocus)
  {
    if (!this.current)
    {
      el.fire('focus');
    }
    else if (this.current == el)
    {
      return this;
    }
    
    this.blur();
    el.addClassName(this.options.get('className') + '-' + el.retrieve('type') + '-focus');
    
    if (el.retrieve('small'))
    {
      el.setStyle({ display: 'block' });
    }
    
    if (el.retrieve('type') == 'input') 
    {
      if (!nofocus) this.callEvent(el.retrieve('input'), 'focus');
    }
    else
    {
      el.fire('onBoxFocus');
      this.callEvent(el, 'focus');
    }

    this.current = el;
    return this;
  },

  blur: function(noblur)
  {
    if (!this.current) return this;

    if (this.current.retrieve('type') == 'input')
    {
      var input = this.current.retrieve('input');
      if (!noblur) this.callEvent(input, 'blur');
      input.onInputBlur(this);
    }
    else this.current.fire('onBoxBlur');
    
    if (this.current.retrieve('small') && !input.get('value'))
    {
      this.current.hide();
    }
    
    this.current.removeClassName(this.options.get('className') + '-' + this.current.retrieve('type') + '-focus');
    this.current = false;
    return this;
  },

  createBox: function(text, options)
  {
    caption = (text.caption || text.value);
    var box = new Element('a', options).addClassName(this.options.get('className') + '-box').update(caption.entitizeHTML()).store('type', 'box');
    var a = new Element('a', {
      href: '#',
      'class': 'closebutton'
    });
    
    a.observe('click',function(e)
    {
      e.stop();
      if (!this.current) this.focus(this.maininput);
      this.dispose(box);
    }.bind(this));
    
    box.insert(a).store('text', Object.toJSON(text));
    return box;
  },

  createInput: function(options)
  {
    var a = new Element('a', { 'class': this.options.get('className') + '-input' });
    var el = new Element('input', Object.extend(options,{ type: 'text', autocomplete: 'off' }));
    
    el.observe('focus', function(e) { if (!this.isSelfEvent('focus')) this.focus(a, true); }.bind(this))
      .observe('blur', function() { if (!this.isSelfEvent('blur')) this.blur(true); }.bind(this))
      .observe('keydown', function(e) { this.store('lastvalue', this.value).store('lastcaret', this.getCaretPosition()); })
      .observe('keypress', function(e)
        {
          var charCode = e.charCode || e.keyCode;
          if (e.keyCode == Event.KEY_RETURN || charCode == Event.CHAR_COMMA)
          {
            this.insertCurrentValue = true;
          }
        }.bind(this))
      .observe('keyup', function(e)
        {
          if (e.keyCode == Event.KEY_RETURN && !this.insertCurrentValue) this.insertCurrentValue = true;

          // We need to do the insert on keyup so that a value of just a comma won't be accepted
          if (this.insertCurrentValue)
          {
            if (this.insertCurrent())
            {
              e.stop();
            }
            this.insertCurrentValue = false;
          }
        }.bind(this));

    var tmp = a.store('type', 'input').store('input', el).insert(el);
    return tmp;
  },

  callEvent: function(el, type)
  {
    this.events.set(type, el);
    el[type]();
  },

  isSelfEvent: function(type)
  {
    return (this.events.get(type)) ? !!this.events.unset(type) : false;
  },

  makeResizable: function(box)
  {
    var el = box.retrieve('input');
    el.store('resizable',
      new ResizableTextbox(
        el,
        Object.extend(
          this.options.get('resizable'), {
            min: el.offsetWidth,
            max: this.element.getWidth() ? this.element.getWidth() : 0
          }
        )
      )
    );
    return this;
  },

  checkInput: function()
  {
    var input = this.current.retrieve('input');
    return (!input.retrieve('lastvalue') || (input.getCaretPosition() === 0 && input.retrieve('lastcaret') === 0));
  },

  move: function(direction)
  {
    switch (direction)
    {
      case 'home':
        var el = this.current.parentNode.firstDescendant();
        break;
      
      case 'end':
        var el = this.current.parentNode.childElements().last();
        break;

      default:
        var el = this.current[(direction == 'left' ? 'previous' : 'next')]();
    }
    if (el && (!this.current.retrieve('input') || this.checkInput() || direction == 'right')) this.focus(el);
    return this;
  },

  moveDispose: function()
  {
    if (this.current.retrieve('type') == 'box') return this.dispose(this.current);
    if (this.checkInput() && this.bits.keys().length && this.current.previous()) return this.focus(this.current.previous());
    return null;
  }
});
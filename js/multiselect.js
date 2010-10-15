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
	
	cacheData: function(element, key, value)
	{
		if (Object.isUndefined(this[$(element).identify()]) || !Object.isHash(this[$(element).identify()]))
		{
			this[$(element).identify()] = $H();
		}
		
		this[$(element).identify()].set(key,value);
		return element;
	},

	retrieveData: function(element, key)
	{
		return this[$(element).identify()].get(key);
	},

	onBoxDispose: function(item, obj)
	{
		// Set to not to "add back" values in the drop-down upon delete if they were new value
		item = item.retrieveData('text').evalJSON(true);
		if (!item.newValue)	obj.autoFeed(item);
	},
	
	onInputFocus: function(el, obj)
	{
		if (obj.autoShow) obj.autoShow();
	},
	
	onInputBlur: function(el, obj)
	{
		obj.lastinput = el;
		if (!obj.curOn && obj.autoHide)
		{
			obj.blurhide = obj.autoHide.bind(obj).delay(0.1);
		}
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


/* ResizeableTextbox class
 * Creates a text input that grows wider to fit its content
 */
var ResizableTextbox = Class.create({
	initialize: function(element, options)
	{
		var that = this;
		
		this.options = $H({
			minimum: 5,		// Minimum width in pixels
			maximum: 500	// Maximum width in pixels
		}).update(options);
		
		this.el = $(element);
		this.measurediv = this.getMeasurementDiv();
		this.setElementWidth();

		this.el.observe('keypress', this.setElementWidth.bind(this))
					 .observe('keyup', this.setElementWidth.bind(this));
	},

	calculateWidth: function()
	{
		this.measurediv.update($F(this.el).escapeHTML() + 'MM') // M is generally the widest character
																							 // increase the width by 2 M's so that there is no scrolling when inputting wide chars
		
		newsize = this.measurediv.getWidth();
		if (newsize < this.options.get('minimum')) newsize = this.options.get('minimum');
		if (newsize > this.options.get('maximum')) newsize = this.options.get('maximum');
		return newsize;
	},

	clear: function()
	{
		this.el.clear();
		this.setElementWidth();
		return this;
	},

	focus: function()
	{
		this.el.focus();
		return this;
	},
	
	getMeasurementDiv: function()
	{
		// A hidden div created in order to measure the width of the text
		if (!$('__resizeable_textbox_measure_div'))
		{
			var div = new Element('div', { id: '__resizeable_textbox_measure_div' })
			div.setStyle({ display: 'none' });
			$(document.body).insert(div);
		}
		else
		{
			var div = $('__resizeable_textbox_measure_div');
		}

		return div.setStyle({
			fontSize: this.el.getStyle('font-size'),
			fontFamily: this.el.getStyle('font-family')
		});
	},

	setElementWidth: function()
	{
		var newsize = this.calculateWidth();
		if (newsize >= this.options.get('minimum') && newsize <= this.options.get('maximum'))
		{
			this.el.setStyle({ width: newsize + "px"});
		}
	}
});


/* TextboxList class
 * Creates a container that holds a list of textbox values that can be navigated through
 */
var TextboxList = Class.create({
	initialize: function(element, options)
	{
		// Default options for TextboxList
		this.options = $H({
			resizable: {},
			className: 'bit',						// Class name given to items
			separator: ',',							// The character that will separate items in the underlying input
			extraInputs: true,					// Specifies whether additional inputs are created 
			startInput: true,						
			onAdd: function(text){},		// Callback function when an item is added
			onRemove: function(text){},	// Callback function when an item is removed
			newValues: true,						// Can new values be created?
			spaceReplace: '',						// What to replace spaces with in the underlying input
			encodeEntities: false 			// Should HTML entities be converted into UTF8 characters?
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
				if (this.current.retrieveData('type') == 'box' && e.keyCode == Event.KEY_BACKSPACE) e.stop();
				if (this.current.retrieveData('input') && !this.checkInput()) return null;

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
		input.cacheData('small', true);
		this.makeResizable(input);
		input.hide();
		return input;
	},

	insertCurrent: function()
	{
		if (this.options.get('newValues'))
		{
			var new_value_el = this.current.retrieveData('input');

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
				new_value_el.retrieveData('resizable').clear().focus();

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
		
		if (el.previous() && el.previous().retrieveData('small'))
		{
			el.previous().remove();
		}
		
		if (this.current == el)
		{
			this.focus(el.next());
		}
		
		if (el.retrieveData('type') == 'box')
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
		el.addClassName(this.options.get('className') + '-' + el.retrieveData('type') + '-focus');
		
		if (el.retrieveData('small'))
		{
			el.setStyle({ display: 'block' });
		}
		
		if (el.retrieveData('type') == 'input') 
		{
			el.onInputFocus(this);
			if (!nofocus) this.callEvent(el.retrieveData('input'), 'focus');
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

		if (this.current.retrieveData('type') == 'input')
		{
			var input = this.current.retrieveData('input');
			if (!noblur) this.callEvent(input, 'blur');
			input.onInputBlur(this);
		}
		else this.current.fire('onBoxBlur');
		
		if (this.current.retrieveData('small') && !input.get('value'))
		{
			this.current.hide();
		}
		
		this.current.removeClassName(this.options.get('className') + '-' + this.current.retrieveData('type') + '-focus');
		this.current = false;
		return this;
	},

	createBox: function(text, options)
	{
		var box = new Element('a', options).addClassName(this.options.get('className') + '-box').update(text.caption.entitizeHTML()).cacheData('type', 'box');
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
		
		box.insert(a).cacheData('text', Object.toJSON(text));
		return box;
	},

	createInput: function(options)
	{
		var a = new Element('a', { 'class': this.options.get('className') + '-input' });
		var el = new Element('input', Object.extend(options,{ type: 'text', autocomplete: 'off' }));
		
		el.observe('focus', function(e) { if (!this.isSelfEvent('focus')) this.focus(a, true); }.bind(this))
			.observe('blur', function() { if (!this.isSelfEvent('blur')) this.blur(true); }.bind(this))
			.observe('keydown', function(e) { this.cacheData('lastvalue', this.value).cacheData('lastcaret', this.getCaretPosition()); })
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

		var tmp = a.cacheData('type', 'input').cacheData('input', el).insert(el);
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
		var el = box.retrieveData('input');
		el.cacheData('resizable',
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
		var input = this.current.retrieveData('input');
		return (!input.retrieveData('lastvalue') || (input.getCaretPosition() === 0 && input.retrieveData('lastcaret') === 0));
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
		if (el && (!this.current.retrieveData('input') || this.checkInput() || direction == 'right')) this.focus(el);
		return this;
	},

	moveDispose: function()
	{
		if (this.current.retrieveData('type') == 'box') return this.dispose(this.current);
		if (this.checkInput() && this.bits.keys().length && this.current.previous()) return this.focus(this.current.previous());
		return null;
	},

	retrieveData: function(element, key)
	{
		return this[$(element).identify()].get(key);
	}
});


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
			feedURL: undefined,								// URL for the JSON feed, if getting by AJAX
			feedMethod: 'get',								// HTTP method for AJAX request
			results: 10,											// Maximum number of results to show in the autocomplete
			visibleResults: 0,								// How many results are visible at a time in the autocomplete
			onEmptyInput: function(input){},	// Callback function for when the input is empty
			caseSensitive: false,							// Is the autocomplete match case sensitive? 
			regexSearch: true,								// Should matches be made through regex or string methods 
			wordMatch: false,									// Do matches need to be full words? (only applies if using regexSearch)
			loadFromInput: true,							// Should any values already in the input on creation be added?
			defaultMessage: "",								// Used to provide the default autocomplete message if built by the control
			sortResults: false,								// Should the autocomplete results be sorted?
			autoDelay: 250,										// Delay in ms before the autocomplete is shown
			autoResize: false									// Should the autocomplete div be kept the same width as the input?
		}).update(options);

		$super(element, options);

		// Default options 
		this.loptions = $H({
			autocomplete: {
				opacity: 1,
				maxresults: 10,
				minchars: 1
			}
		});

		this.id_base = $(element).identify() + "_" + this.options.get("className");

		this.data = [];
		this.data_searchable = [];
		
		// Defines the div that contains autocomplete values
		this.autoholder = $(autoholder) || this.createAutoholder(autoholder)
		this.autoholder.setOpacity(this.loptions.get('autocomplete').opacity)
			.observe('mouseover', function() { this.curOn = true; }.bind(this))
			.observe('mouseout', function() { this.curOn = false; }.bind(this));

		// Keep the autocomplete element the same size as the input
		// Allows for width on the holder to be specified as a percentage
		if (this.options.get('autoResize'))
		{
			this.autoResize();
			Event.observe(window, 'resize', function() { this.autoResize(); }.bind(this));
		}

		// Defines the autocomplete list
		this.autoresults = this.autoholder.select('ul').first();
		
		var children = this.autoresults.select('li');
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
					transport.responseText.evalJSON(true).each(function(t) { this.autoFeed(t); }.bind(this));
					if (this.options.get('loadFromInput')) this.loadFromInput()
				}.bind(this)
			});
		}
		else if (!Object.isUndefined(this.options.get('feed')))
		{
			this.options.get('feed').each(function(t) { this.autoFeed(t) }.bind(this));
		}

		// We need to load from input as part of the AJAX request when using feedURL
		// or else the data won't have completed being fetched before the data in the 
		// input is loaded
		if (Object.isUndefined(this.options.get('feedURL')) && this.options.get('loadFromInput'))
		{
			this.loadFromInput()
		}

		document.observe('click', function() { this.autoHide() }.bindAsEventListener(this));
	},

	autoShow: function(search)
	{
		this.autoholder.setStyle({'display': 'block'});
		this.autoholder.descendants().each(function(e) { e.hide(); });
		
		if (!search || !search.strip() || (!search.length || search.length < this.loptions.get('autocomplete').minchars))
		{
			if (this.autoholder.select('.default').first())
			{
				this.autoholder.select('.default').first().setStyle({'display': 'block'});
			}
			this.resultsshown = false;
		}
		else
		{
			this.resultsshown = true;
			this.autoresults.setStyle({'display': 'block'}).update('');
			
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
						return str ? regexp.test(str.evalJSON(true).caption) : false;
					}
				);
			}
			
			if (this.options.get('sortResults'))
			{
				matches = matches.sortBy(function(el) { return el.evalJSON(true).caption })
			}

			var count = 0;
			matches.each(
				function(result, ti)
				{
					count++;
					if (ti >= (this.options.get('visibleResults') ? this.options.get('visibleResults') : this.loptions.get('autocomplete').maxresults)) return;
					
					var that = this;
					var el = new Element('li');
					var caption = result.evalJSON(true).caption;
					
					el.observe('click', function(e)
						{
							e.stop();
							that.current_input = "";
							that.autoAdd(this);
						})
						.observe('mouseover', function() { that.autoFocus(this); } )
						.update(this.autoHighlight(caption, search));
					
					this.autoresults.insert(el);
					el.cacheData('result', result.evalJSON(true));
					if (ti == 0) this.autoFocus(el);
				}, this
			);
		}
	
		if (count == 0)
		{
			// if there are no results, hide everything so that KEY_RETURN has no effect
			this.autocurrent = false;
			this.autoHide();
		}
		else
		{
			if (this.autoresults.firstDescendant())
			{
				var autoresult_height = this.autoresults.firstDescendant().offsetHeight;

				if (count > this.options.get('results'))
				{
					this.autoresults.setStyle({'height': (this.options.get('results') * autoresult_height) + 'px'});
				}
				else
				{
					this.autoresults.setStyle({'height': (count ? (count * autoresult_height) : 0) + 'px'});
				}
			}
		}
		
		return this;
	},
	
	autoHighlight: function(html, highlight)
	{
		// Because the autocomplete will be filled with HTML, we need to escape any HTML in the string
		return html.entitizeHTML().unescapeHTML().gsub(new RegExp(highlight,'i'), function(match)
			{
				return '<em>' + match[0] + '</em>';
			}
		).gsub(/<(?!\/?em>)/, "&lt;"); // ... except for the <em> tags that we add here.
	},

	autoHide: function()
	{
		this.resultsshown = false;
		this.autoholder.hide();
		return this;
	},

	autoFocus: function(el)
	{
		if (!el) return null;
		if (this.autocurrent) this.autocurrent.removeClassName('auto-focus');
		this.autocurrent = el.addClassName('auto-focus');
		return this;
	},

	autoMove: function(direction)
	{
		if (!this.resultsshown) return null;
		this.autoFocus(this.autocurrent[(direction == 'up' ? 'previous' : 'next')]());
		this.autoresults.scrollTop = this.autocurrent.positionedOffset()[1]-this.autocurrent.getHeight();
		return this;
	},

	autoFeed: function(text)
	{
		var with_case = this.options.get('caseSensitive');
		if (this.data.indexOf(Object.toJSON(text)) == -1)
		{
			this.data.push(Object.toJSON(text));
			var data_searchable = Object.toJSON(text).evalJSON(true).caption.unentitizeHTML();
			this.data_searchable.push(with_case ? data_searchable : data_searchable.toLowerCase());
		}
		return this;
	},

	autoAdd: function(el)
	{
		if (!el || !el.retrieveData('result')) return null;
			
		this.current_input = "";
		this.add(el.retrieveData('result'));
		delete this.data[this.data.indexOf(Object.toJSON(el.retrieveData('result')))];
		var input = this.lastinput || this.current.retrieveData('input');
		
		this.autoHide();
		input.retrieveData('resizable').clear().focus();
		return this;
	},

	autoResize: function()
	{
		this.autoholder.setStyle({width: this.holder.getWidth() + "px"});
	},

	createInput: function($super,options)
	{
		var box = $super(options);
		var input = box.retrieveData('input');

		input.observe('keydown', function(e)
		{
			this.dosearch = false;
			this.newvalue = false;

			switch (e.keyCode)
			{
				case Event.KEY_UP: e.stop(); return this.autoMove('up');
				case Event.KEY_DOWN: e.stop(); return this.autoMove('down');
				case Event.KEY_RETURN:
				case Event.KEY_TAB:
					var input_value = this.current.retrieveData('input').getValue();
					
					// If the text input is blank and the user hits Enter call the onEmptyInput callback.
					if (input_value.blank())
					{
						this.options.get("onEmptyInput")();
						this.autocurrent = false; // if the input is blank, we shouldn't be adding an autocomplete result
					}
					
					e.stop();

					// Ensure that the value matches this.autocurrent before autoAdd'ing.
					// This stops the wrong value from being added if the user types fast and hits enter before a new autocurrent is found
					if (this.autocurrent && new RegExp(input_value, 'i').test(this.autocurrent.retrieveData('result').caption.unentitizeHTML()))
					{
						this.autoAdd(this.autocurrent);
					}
					else
					{
						this.autoHide();
					}
					
					this.current_input = "";
					this.autocurrent = false;
					this.autoenter = true;
					break;
				
				case Event.KEY_ESC:
					// If ESC is pressed, hide the autocomplete, but let the user still enter the text they typed
					// This lets the user type part of an autocomplete result but add just what they typed instead
					// of the full result.
					this.autocurrent = false;
					this.autoHide();
					break;
				
				default:
					this.dosearch = true;
			}
			return null;
		}.bind(this));
		
		input.observe('keyup', function(e)
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
					// If the user doesn't add comma after, the value is discarded upon submit
					this.current_input = this.options.get('encodeEntities') ? input.value.strip().entitizeHTML() : input.value.strip().escapeHTML();
					this.update();
					
					// Removed Ajax.Request from here and moved to initialize,
					// now doesn't create server queries every search but only
					// refreshes the list on initialize (page load)
					if (this.searchTimeout) clearTimeout(this.searchTimeout);
					
					this.searchTimeout = setTimeout(function()
					{
						var sanitizer = new RegExp("[({[^$*+?\\\]})]","g");
						if (this.dosearch)
						{
							this.autocurrent = false;
							this.autoShow(input.value.replace(sanitizer,"\\$1"));
						}
					}.bind(this), this.options.get('autoDelay'));
			}
		}.bind(this));
		
		input.observe(Prototype.Browser.IE ? 'keydown' : 'keypress', function(e)
		{
			if ((e.keyCode == Event.KEY_RETURN) && this.autoenter) e.stop();
			this.autoenter = false;
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

	createAutoholder: function(id)
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
		return div
	},
	
	loadFromInput: function()
  {
		var input_values = this.element.value.split(this.options.get('separator')).invoke('strip');

    if (this.data.length)
    {
      this.data.select(function(el) { return input_values.include(el.evalJSON(true).value) }).each(function(el)
      {
        el = el.evalJSON(true);
        this.add({ value: el.value, caption: el.caption});
        delete this.data[this.data.indexOf(Object.toJSON(el))];
        input_values = input_values.without(el.value);
      }, this);
    }
    
    input_values.each(function(el)
    {
      if (!el.empty())
      {
        this.add({ value: el, caption: el });
      }
    }, this);
  }
});


/* Copyright: InteRiders <http://interiders.com/> - Distributed under MIT - Keep this message! */
// vi: noexpandtab

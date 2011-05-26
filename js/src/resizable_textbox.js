/* ResizeableTextbox class
 * Creates a text input that grows wider to fit its content
 */
var ResizableTextbox = Class.create({
  initialize: function(element, options)
  {
    var that = this;
    
    this.options = $H({
      minimum: 5,   // Minimum width in pixels
      maximum: 500  // Maximum width in pixels
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
# AutoTextboxList

Prototype version required: 1.6.0 (1.6.1 for IE8)

Copyright: InteRiders <http://interiders.com/> - Distributed under MIT - Keep this message!
  
## Credits

 - Idea: Facebook + Apple Mail
 - Caret position method: Diego Perini <http://javascript.nwbox.com/cursor_position/cursor.js>
 - Guillermo Rauch: Original MooTools script
 - Ran Grushkowsky/InteRiders Inc. <http://interiders.com/> 
 - Loren Johnson, <http://www.hellovenado.com/>
 - Zuriel Barron, <http://severelimitation.com/>
 - Sean Cribbs <http://seancribbs.com/>
 - [skaue]
 - Nickolas Daskalou <http://www.footysx.com.au/>
 - Chris Anderton <http://thewebfellas.com/>
 - Dejan Strbac
 - Daniel Vandersluis <http://www.codexed.com/>

## Parameters (and defaults)

 - separator: ','
 - extrainputs: true
 - startinput: true
 - newValues: false 
   - allow new values to be created
 - newValueDelimiters: ['[',']']
   - define what values split into new entries
 - spaceReplace: ''
   - allow handling of new tag values when the tagging scheme doesn't allow spaces, this is set as blank by default and will have no impact
 - fetchFile: undefined,
   - location of JSON file
 - fetchMethod: 'get'
   - set HTTP method
 - feed: undefined
	 - initial JSON feed to use (ignored if fetfile is specified)
 - results: 10,
   - maximum number of results to retrieve for display in the list (see also maxResults)
 - maxResults: 0
   - number of results to show in the list before scrolling  - when set to 0 then it uses the default of 10 (i.e. there is no 'zero' option)
 - wordMatch: false
   - when set to true will match only the beginning of word (only when using regex search), otherwise will match anywhere
 - onEmptyInput: function(input){}
   - callback that is called when user hits enter when the input is blank
 - caseSensitive: false
   - case sensitive/insensitive matching
 - regexSearch: true
   - specifies whether to search using a regular expression or simple text search (faster)
 - onAdd: function( input ){}
   - callback that is called when a new element is added to input.  Argument is an object containing caption  and value members.  If it's a newvalue, caption will be nil.
 - onRemove: function( value ){}
   - callback that is called when a element is removed from the input.  Argument is the value of the element. 
 - loadFromInput: true
	 - specifies whether to add any values given in the initial text input to the control. Values will be loaded against any data provide
 - defaultMessage: ""
	 - if the control is building the autocomplete div itself, specifies the default message to use.
 - sortResults: false
   - specifies whether autocomplete results should be sorted alphabetically by caption.
 - autoDelay: 250
   - specifies the delay before the autocomplete results appear.
 - encodeEntities: false
   - specifies whether HTML entities should be encoded when inserted. Braces are always converted into HTML entities regardless of this setting.

## Changelog

### 0.1
  - translation of MooTools script

### 0.2
  - renamed from Proto!TextboxList to Proto!MultiSelect, added new features/bug fixes
  - added feature: support to fetch list on-the-fly using AJAX    Credit: Cheeseroll
  - added feature: support for value/caption
  - added feature: maximum results to display, when greater displays a scrollbar   Credit: Marcel
  - added feature: filter by the beginning of word only or everywhere in the word   Credit: Kiliman
  - added feature: shows hand cursor when going over options
  - bug fix: the click event stopped working
  - bug fix: the cursor does not 'travel' when going up/down the list   Credit: Marcel

### 0.3
  - bug fix: moved class variables into initialize so they happen per instance. This allows multiple controls per page
  - bug fix: added id_base attribute so that multiple controls on the same page have unique list item ids (won't work otherwise)
  - feature: Added newValues option and logic to allow new values to be created when ended with a comma (tag selector use case)           
  - mod: removed ajax fetch file happening on every search and moved it to initialization to laod all results immediately and not keep polling
  - mod: added "fetchMethod" option so I could better accomodate my RESTful ways and set a "get" for retrieving
  - mod: added this.update to the add and dispose methods to keep the target input box values always up to date
  - mod: moved ResizableTextBox, TextBoxList and FaceBookList all into same file
  - mod: added extra line breaks and fixed-up some indentation for readability
  - mod: spaceReplace option added to allow handling of new tag values when the tagging scheme doesn't allow spaces, this is set as blank by default and will have no impact

### 0.4 
  - bug fix: fixed bug where it was not loading initial list values
  - bug fix: new values are not added into the autocomplete list upon removal
  - bug fix: improved browser compatibility (Safari, IE)
  
### 0.5
  - Add search timeout to increase responsiveness to typing.
  - Add non-standard autocomplete attribute to main input to prevent browser-supplied autocompletion in Gecko and some other browsers.
  - bug when gsub'ing space wth "spaceReplace". Input-field does not have a function gsub, though its value has.
  
### 0.6
  - Update with changes by Nickolas Daskalou
  - Option to specify whether to perform a case sensitive search or not (option: "caseSensitive", default: false).
  - Option to specify whether you want the search to be performed by regular expression or by simple text search (option: "regexSearch", default: true). Non-regular expression searching is MUCH faster than by regular expression (this is the way the real Facebook autocomplete search works).
  - Option to specify a callback upon the user hitting Enter/Return when the input is blank (option: "onEmptyInput", default: function(){}). I needed this because I did not want the user to have to move their hand off the keyboard to the mouse and then click on the submit/action button.
  - Option to specify the maximum number of results to show (NOT the same as the "result" option, see comments below) (option: "maxResults", default: 10).
  - NOTE ON THE NON-REGULAR EXPRESSION SEARCH: If using non-regular expression search mode, the option "matchWord" WILL HAVE NO EFFECT on the results (ie., it will behave as if matchWord were set to false). This can be fixed but at 5am my pillow is looking too good to spend more time on this, so if anyone needs this feel free to email me a request and I'll get it done (nick at footysx.com.au).
  - NOTE ON THE MAXRESULTS OPTION: The difference between the options "results" and "maxResults" is that "results" specifies the maximum number of visible rows allowed to be shown to the user before a scrollbar activates, whereas "maxResults" specifies the maximum number of results allowed to be in the scrollable list.

### 0.7
  - fixed non regex search
  - stable
  
### 0.8
  - a number of updates provided by Dejan Strbac
  - sanitizes characters so special characters don't break it
  - escapes html

### 0.8.1
  - small changes by Nathan Stitt
  - Added callbacks onAdd and onRemove for integration into existing projects
  - Renamed main class from FacebookList to MultiSelect. I don't like calling it Facebook becouse of trademark issues.  Plus it's confusingly called that in the docs.
  - Went through file with Emacs JS2 mode and fixed errors identified, mostly missing commas and semicolons.
  - Ignore Emacs backup and OSX .DS_Store files
  - added new method insertCurrent, which will add whatever is currently in the input box as an element.   Set enter to add elements along with comma.

### 0.9
  - Changes by Daniel Vandersluis
  - Added createAutohandler method to automatically create the needed div/ul elements so that they don't need to be created in the HTML.
  - Added loadFromInput option (default: true) to load values given in the initial text input into the control.
  - Added defaultMessage option (default: "") which is used for a default message div if the control creates the autohandler. The default message is no longer mandatory.
  - Added sortResults option (default: false) which will sort autocomplete results by caption.

### 0.10
  - Decoupled TextboxList from ProtoMultiSelect so that TextboxList is fully functional on its own.
  - Fixed ResizableTextbox so that it actually resizes the textbox and is much more intelligent about calculating the size.
  - Changed TextboxList to use div and a instead of ul and li so that events can be contained within the control instead of being registered on the document object.
  - Stopped the selected autocomplete result from being added if the input value does not match the result when enter is pressed.
  - Fixed Home and End key events so that they don't scroll the page when pressed within the control.
  - Added autoDelay option (default: 250) to specify the delay before the autocomplete results appear.
  
### 0.11
  - Fixed control not playing well with HTML and entities.
  - Added encodeEntities option (default: false) that will automatically encode HTML entities to their unicode characters if set.
  - Fixed < causing a new value to be inserted.
  - Pressing tab with the autocomplete open will now cause the selected value to be inserted (like enter). 

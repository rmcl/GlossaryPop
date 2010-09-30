/**
 * @fileoverview Highlights terms on a page and display a popup with a definition
 * on user click.
 * @author russ@russmcl.com (Russell McLoughlin)
 */

/**
 * Define the rm namespace
 */
var rm = {};

/**
 * Display a popup/tooltip thing for words in the page.
 * 
 * Usage example:
 *   <<Include script>>
 *   var g = new rm.PopupGlossary();
 *   g.addTerm("dog", "man's best friend");
 *   g.search();
 * 
 * 
 */
rm.PopupGlossary = function() {
    /**
     * Only highlight and display a definition for the first
     * occurrence of a term in the page.
     * @type {boolean}
     * @private
     */
    this.firstOccurOnly_ = true;

    /**
     * Match terms irrespective of case.
     * @type {boolean}
     * @private
     */
    this.caseInsensitive_ = true;

    /**
     * Only search for terms in a subset of HTML tags rather than
     * the entire document.
     * @type {boolean}
     * @private
     */
    this.limitSearchToTags_ = true;

    /**
     * A list of tags to search for terms in if "limitSearchToTags_"
     * is set to true.
     */
    this.searchTags_ = ['P'];

    /* Probably don't want to modify the following variables */

    /**
     * The trie storing all of the glossary terms.
     * @type {rm.TrieNode}
     * @private
     */
    this.terms_ = new rm.TrieNode();

    /**
     * A dictionary of terms that have been selected in the page
     * @type {Object}
     * @private
     */
    this.linkedTerms_ = {};
};

/**
 * Add a term to the glossary
 * @param {string} term The term.
 * @param {string} definition The definition of the term.
 */
rm.PopupGlossary.prototype.addTerm = function(term, definition) {
    if (this.caseInsensitive_) {
	term = term.toLowerCase();
    }
    this.terms_.add(term, definition);
};

/**
 * Add several terms at a time from a dictionary.
 * Dictionary key is the term and value is it's definition.
 * @param {Object} dict The dictionary of term->definition.
 */
rm.PopupGlossary.prototype.addTermsFromDict = function(dict) {
    for (k in terms) {
	var v = terms[k];
	if (v) {
	    g.addTerm(k, v);
	}
    }
};

/**
 * Search the current document for terms.
 */
rm.PopupGlossary.prototype.search = function() {
    this.searchDomChildren(document.getElementsByTagName('body')[0]);
};

/**
 * Search for terms that are in children of a given dom element.
 * @param {Element} node The parent dom element.
 */
rm.PopupGlossary.prototype.searchDomChildren = function(node) {
    if (node.hasChildNodes()) {
        for (var i = 0; i < node.childNodes.length; i++) {
            this.searchDomChildren(node.childNodes[i]);
        }
    }
    if (node.nodeType == 3) {
        var p = node.parentNode;
        if (p.nodeName != 'TEXTAREA' &&
	    p.nodeName != 'SCRIPT') {

	    if (this.limitSearchToTags_) {
		var goodTag = false;
		for (var i = 0; i < this.searchTags_.length; i++) {
		    if (p.nodeName == this.searchTags_[i]) {
			goodTag = true;
			break;
		    }
		}
		if (!goodTag) {
		    return;
		}
	    }

	    var pos = 0;
	    while (true) {
		var match = this.findNextTermInNode_(node, pos);
		if (match == null) {
		    break;
		}

		if (this.firstOccurOnly_ && this.linkedTerms_[match.word]) {
		    // A link has already been added for this term.
		    // don't add another.
		    pos = match.startPos + match.word.length;
		    continue;
		}
		this.linkedTerms_[match.word] = 1;

                var v = node.nodeValue;
                var lt = document.createTextNode(v.substr(0, match.startPos));
		var matchedText = v.substr(match.startPos, match.word.length);
                var rt = document.createTextNode(v.substr(match.startPos + match.word.length));
                var span = document.createElement('span');
                span.className = 'gloss_item';
                span.appendChild(document.createTextNode(matchedText));
                p.insertBefore(lt, node);
                p.insertBefore(span, node);
                p.replaceChild(rt, node);

		var tmp = this;
		span.onclick = function() {
		    var word = match.word;
		    var def = match.def;
		    return function(e) { tmp.termClicked_(e, word, def); };
		}();

		node = rt;
	    }
        }
    }
};

/**
 * Find the next term in a given text node.
 * @param {Element} node The element to search in.
 * @param {number} startPos The offset into the text to begin searching at.
 * @private
 */
rm.PopupGlossary.prototype.findNextTermInNode_ = function(node, startPos) {
    var v = node.nodeValue;
    var matches = [];
    var candidates = [];
    for (var pos = startPos; pos < v.length; pos++) {
	candidates.push({t: this.terms_, start: pos, m: ''});
	var newCandidates = [];
	for (var k = 0; k < candidates.length; k++) {
	    var candid = candidates[k];
	    var curChar = v.charAt(pos);
	    if (this.caseInsensitive_) {
		curChar = curChar.toLowerCase();
	    }
	    var c = this.terms_.get(candid.t, curChar);
	    if (c) {
		candid.t = c;
		candid.m += curChar;
	        newCandidates.push(candid);
	    } else {
		var o = candid.t.getObj();
		if (o) {
		    candidates[k].def = o;
		    matches.push(candidates[k]);
		}
	    }
	}
	if (newCandidates.length == 0 && matches.length > 0) {
	    return {word: matches[0].m, startPos: matches[0].start, def: matches[0].def};
	}
	candidates = newCandidates;
    }
    return null;
};

/**
 * Handle a user click on a term in the page by displaying tooltip.
 * @param {Object} e The event object.
 * @param {string} word The word that was clicked.
 * @param {string} definition The definition of the word that was clicked.
 * @private
 */
rm.PopupGlossary.prototype.termClicked_ = function(e, word, definition) {
    e = e || window.event;

    if (!this.popupElem_) {
	this.popupElem_ = this.createPopup_();
	document.getElementsByTagName('body')[0].appendChild(this.popupElem_);
    }

    this.popupElem_.style.display = 'block';
    this.popupElem_.style.visibility = 'visible';
    this.popupElem_.style.left = e.clientX + 'px';
    this.popupElem_.style.position = 'fixed';
    this.popupElem_.style.top = e.clientY + 'px';

    this.setPopup_(word, definition);
};

/**
 * Set the contents of the tooltip/popup.
 * @param {string} word The word to set.
 * @param {string} definition The definition of the term.
 */
rm.PopupGlossary.prototype.setPopup_ = function(word, definition) {
    var def = this.popupElem_.getElementsByTagName('div')[1];

    // Remove children
    var child;
    while ((child = def.firstChild)) {
	def.removeChild(child);
    }

    //Recreate
    var term = document.createElement('span');
    term.className = 'term';
    term.appendChild(document.createTextNode(word));

    def.appendChild(term);
    def.appendChild(document.createTextNode(definition));
};

/**
 * Create the dom elements to display the popup/tooltip.
 * @return {Element} The popup DOM element.
 */
rm.PopupGlossary.prototype.createPopup_ = function() {
    var elem = document.createElement('div');
    elem.className = 'gloss_def';

    var close = document.createElement('div');
    close.className = 'defclose';
    var closeimg = document.createElement('img');
    closeimg.setAttribute('src', 'images/icon_close_glossary.gif');
    close.appendChild(document.createTextNode('CLOSE'));
    close.appendChild(closeimg);

    elem.onclick = function() {
	var e = elem;
	return function() {
	    e.style.visibility = 'hidden';
	};
    }();

    var def = document.createElement('div');
    def.className = 'definition';

    elem.appendChild(close);
    elem.appendChild(def);

    return elem;
};

/**
 * A simple trie data structure.
 */
rm.TrieNode = function() {
  this.obj_ = null;
  this.children_ = [];
};

/**
 * Add an object to the trie.
 * @param {string} key The string to insert into the trie.
 * @param {Object} obj The object that will be returned for a
 * given key.
 */
rm.TrieNode.prototype.add = function(suffix, obj) {
  if (suffix) {
    var k = suffix.charAt(0);
    (this.children_[k] || (this.children_[k] = new rm.TrieNode()))
	  .add(suffix.substring(1), obj);
  } else {
    this.obj_ = obj;
  }
};

/**
 * Get the child trie from the root for a given
 * key.
 * @param {rm.TrieNode} root The current element in the trie.
 * @param {string} c The suffix of the child.
 * @return {rm.TrieNode} The child trie.
 */
rm.TrieNode.prototype.get = function(root, c) {
  if (c) {
    return root.children_[c.charAt(0)];
  }
  return null;
};

/**
 * Get the object at a node of the trie.
 * @return {Object} The object.
 */
rm.TrieNode.prototype.getObj = function(root) {
  return this.obj_;
};
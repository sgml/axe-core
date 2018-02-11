const escapeSelector = axe.utils.escapeSelector;
let isXHTML;

axe.utils.getSelectorData = function (domTree) {
  //jshint maxstatements:25
  // jshint loopfunc:true
  var data = {
    classes: {},
    tags: {},
    attributes: {},
    elements: 0,
    threshold: 100,
    matchThreshold: 1
  };
  domTree = Array.isArray(domTree) ? domTree : [domTree];
  var currentLevel = domTree.slice();
  var stack = [];
  while (currentLevel.length) {
    var current = currentLevel.pop();
    var node = current.actualNode;

    if (!!node.querySelectorAll) {
      data.elements++;
      var tag = node.nodeName;
      if (data.tags[tag]) {
        data.tags[tag]++;
      } else {
        data.tags[tag] = 1;
      }
      if (node.classList) {
        Array.from(node.classList).forEach(function (cl) {
          var ind = escapeSelector(cl);
          if (data.classes[ind]) {
            data.classes[ind]++;
          } else {
            data.classes[ind] = 1;
          }
        });
      }
      if (node.attributes) {
        Array.from(node.attributes).filter(function (at) {
          return !['class', 'style', 'id'].includes(at.name) && at.name.indexOf(':') === -1;
        }).forEach(function (at) {
          var name = at.name;
          var value, atnv;
          // This code increases the querySelectorAll time by 25%
          //
          // if (name.indexOf('href') !== -1 || name.indexOf('src') !== -1) {
          //   value = encodeURI(axe.utils.getFriendlyUriEnd(node.getAttribute(name)));
          //   if (value) {
          //     atnv = escapeSelector(at.name) + '$="' + value + '"';  
          //   } else {
          //     return;
          //   }
          // } else {
            value = escapeSelector(at.value);
            atnv = escapeSelector(name) + '="' + value + '"';
          // }
          if (data.attributes[atnv]) {
            data.attributes[atnv]++;
          } else {
            data.attributes[atnv] = 1;
          }
        });
      }
    }
    if (current.children.length) {
      // "recurse"
      stack.push(currentLevel);
      currentLevel = current.children.slice();
    }
    while (!currentLevel.length && stack.length) {
      currentLevel = stack.pop();
    }
  }
  // data.threshold = Math.max(data.elements / 100, 20);
  // data.matchThreshold = data.threshold / 10;
  return data;
};

function uncommonClasses(node, classData) {
  // jshint loopfunc:true
  var retVal = [];

  if (node.classList) {
    Array.from(node.classList).forEach(function (cl) {
      var ind = escapeSelector(cl);
      if (classData[ind] < axe._selectorData.tags[node.nodeName]) {
        retVal.push({
          cName: ind,
          count: classData[ind]
        });
      }
    });
  }
  return retVal;
}

function getDistinctClassList (elm) {
  return uncommonClasses(elm, axe._selectorData.classes).map(function (item) {
    return item.cName;
  });
}

function getNthChildString (elm, selector) {
  const siblings = elm.parentNode && Array.from(elm.parentNode.children || '') || [];
  const hasMatchingSiblings = siblings.find(sibling => (
    sibling !== elm &&
    axe.utils.matchesSelector(sibling, selector)
  ));
  if (hasMatchingSiblings) {
    const nthChild = 1 + siblings.indexOf(elm);
    return ':nth-child(' + nthChild + ')';
  } else {
    return '';
  }
}

const createSelector = {
  // Get ID properties
  getElmId (elm) {
    if (!elm.getAttribute('id')) {
      return;
    }
    let doc = (elm.getRootNode && elm.getRootNode()) || document;
    const id = '#' + escapeSelector(elm.getAttribute('id') || '');
    if (
      // Don't include youtube's uid values, they change  on reload
      !id.match(/player_uid_/) &&
      // Don't include IDs that occur more then once on the page
      doc.querySelectorAll(id).length === 1
    ) {
      return id;
    }
  },
  // Get custom element name
  getCustomElm (elm, { isCustomElm, nodeName }) {
    if (isCustomElm) {
      return nodeName;
    }
  },

  // Get ARIA role
  getElmRoleProp (elm) {
    if (elm.hasAttribute('role')) {
      return '[role="' + escapeSelector(elm.getAttribute('role')) +'"]';
    }
  },
  // Has a name property, but no ID (Think input fields)
  getElmNameProp (elm) {
    if (!elm.hasAttribute('id') && elm.name) {
      return '[name="' + escapeSelector(elm.name) + '"]';
    }
  },
  // Get any distinct classes (as long as there aren't more then 3 of them)
  getDistinctClass (elm, { distinctClassList }) {
    if (distinctClassList.length > 0 && distinctClassList.length < 3) {
      return '.' + distinctClassList.map(escapeSelector).join('.');
    }
  },
  // Get a selector that uses src/href props
  getFileRefProp (elm) {
    let attr;
    if (elm.hasAttribute('href')) {
      attr = 'href';
    } else if (elm.hasAttribute('src')) {
      attr = 'src';
    } else {
      return;
    }
    const friendlyUriEnd = axe.utils.getFriendlyUriEnd(elm.getAttribute(attr));
    if (friendlyUriEnd) {
      return '[' + attr + '$="' + encodeURI(friendlyUriEnd) + '"]';
    }
  },
  // Get common node names
  getCommonName (elm, { nodeName }) {
    return nodeName;
  }
};

function getClassOrTag(elm) {
  if (typeof isXHTML === 'undefined') {
    isXHTML = axe.utils.isXHTML(document);
  }
  const nodeName = escapeSelector(isXHTML?
     elm.localName
    :elm.nodeName.toLowerCase());
  const props = {
    nodeName,
    distinctClassList: getDistinctClassList(elm)
  };
  var sel = createSelector.getDistinctClass(elm, props);
  if (!sel) {
    sel = createSelector.getCommonName(elm, props);
  }
  return sel;
}

function uncommonAttributes(node, attData) {
  var retVal = [];
  
  if (node.attributes) {
    Array.from(node.attributes).filter(function (at) {
      return !['class'].includes(at.name);
    }).forEach(function (at) {
        var name = at.name;
        var value, atnv;
        // This code increases the querySelectorAll time by 25%
        //
        // if (name.indexOf('href') !== -1 || name.indexOf('src') !== -1) {
        //     value = encodeURI(axe.utils.getFriendlyUriEnd(node.getAttribute(name)));
        //     if (value) {
        //       atnv = escapeSelector(at.name) + '$="' + value + '"';  
        //     } else {
        //       return;
        //     }
        // } else {
          value = escapeSelector(at.value);
          atnv = escapeSelector(name) + '="' + value + '"';
        // }
      if (attData[atnv] < axe._selectorData.tags[node.nodeName]) {
        retVal.push({
          aName: atnv,
          count: attData[atnv]
        });
      }
    });
  }
  return retVal;
}

/**
 * Get an array of features (as CSS selectors) that describe an element
 *
 * By going down the list of most to least prominent element features,
 * we attempt to find those features that a dev is most likely to
 * recognize the element by (IDs, aria roles, custom element names, etc.)
 */
function getElmFeatures (elm) {
  return uncommonAttributes(elm, axe._selectorData.attributes).map(function (item) {
    return '[' + item.aName + ']';
  });
}

function generateSelector (elm, options, doc) {
  //jshint maxstatements: 20
  let selector, addParent;
  let { isUnique = false } = options;
  const idSelector = createSelector.getElmId(elm);
  const {
    minDepth = 0,
    toRoot = false,
    childSelectors = []
  } = options;

  if (idSelector) {
    selector = idSelector;
    isUnique = true;

  } else {
    selector = getClassOrTag(elm);
    selector += getElmFeatures(elm).join('');
    selector += getNthChildString(elm, selector);
    isUnique = options.isUnique || doc.querySelectorAll(selector).length === 1;

    // For the odd case that document doesn't have a unique selector
    if (!isUnique && elm === document.documentElement) {
      // todo: figure out what to do for shadow DOM
      selector += ':root';
    }
    addParent = (minDepth !== 0 || !isUnique);
  }

  const selectorParts = [selector, ...childSelectors];

  if (elm.parentElement && elm.parentElement.nodeType !== 11 &&
    (toRoot || addParent)) {
    return generateSelector(elm.parentNode, {
      toRoot, isUnique,
      childSelectors: selectorParts,
      featureCount: 1,
      minDepth: Math.max(0, minDepth -1)
    }, doc);
  } else {
    return selectorParts.join(' > ');
  }
}

/**
 * Gets a unique CSS selector
 * @param  {HTMLElement} node The element to get the selector for
 * @param {Object} optional options
 * @return {String | Array[String]}      Unique CSS selector for the node
 */
axe.utils.getSelector = function createUniqueSelector (elm, options = {}) {
  if (!elm) {
    return '';
  }
  if (!axe._selectorData) {
    axe._selectorData = axe.utils.getSelectorData(axe._tree);
  }  let doc = (elm.getRootNode && elm.getRootNode()) || document;
  if (doc.nodeType === 11) { // DOCUMENT_FRAGMENT
    let stack = [];
    while (doc.nodeType === 11) {
      stack.push({elm: elm, doc: doc});
      elm = doc.host;
      doc = elm.getRootNode();
    }
    stack.push({elm: elm, doc: doc});
    return stack.reverse().map((comp) => {
      return generateSelector(comp.elm, options, comp.doc);
    });
  } else {
    return generateSelector(elm, options, doc);
  }
};

/*Reusable map code*/

define(["jquery", "raphael", "uspaths", "mapcolors", "mapevents", "legend"], function ($, Raphael, paths, MapColors, mapEvents, legend) {
    "use strict";
    
    //create the main map object
    var map = function (ops) {
        
        
        var m = this; //store a short reference to main object for easy use
        
        //get width and height of the parent div (given in ops)
        m.width = $("#" + ops.mapDivID).width();
        m.height = m.width * (370 / 525);
        
        //assign data to object
        m.data = ops.data;
        
        m.mapDivID = ops.mapDivID;
        
        /*the assumption is that there will be a primary dataset for display colors, but other datasets
        might be referenced by the pop-up dialog. The map wants each data point to be an array; this tells
        it which index to use for coloring and display*/
        m.dataIndex = ops.dataIndex;
		
		if (typeof(ops.highlightIndex) !== "undefined") {
			m.highlightBorder = true;
			m.highlightIndex = ops.highlightIndex;	
		} else {
			m.highlightBorder = false;	
		}
        
        /*the paths are based on a coordinate system 940 pixels wide - this gets used in various places, so
        define it as a constant here*/
        m.viewX = 940;
        m.viewY = 627;
        
        /*the popup is defined in the options*/
        m.popupTemplate = ops.popupTemplate;
        
        /*default popup style*/
        m.popupStyle = {
            padding: 10,
            fontSize: 28,
            bgColor: "#eee"
        };
        
        m.fontFamily = $("#" + ops.mapDivID).css("font-family");
        
        /*load custom styles*/
        (function () {
            var option;
            if (ops.popupStyle) {
                for (option in ops.popupStyle) {
                    if (ops.popupStyle.hasOwnProperty(option)) {
                        m.popupStyle[option] = ops.popupStyle[option];
                    }
                }
            }
        }());
        
        if (ops.stateClick) {
            m.stateClick = ops.stateClick;
        } else {
            m.stateClick = function () {
                return false;
            };
        }
		
		if (ops.labelsToHide) {
			m.labelsToHide = ops.labelsToHide;	
		}
		
		if (ops.disablePopupsOn) {
			m.disablePopupsOn = ops.disablePopupsOn;	
		}
		
		if (ops.labelColors) {
			m.labelColors = ops.labelColors;	
		}
        
        if (ops.hideUS) {
            delete paths.states.US;
            delete paths.text.US;
        }
        
        m.colorConfig = ops.colorConfig;
        
        /*create the main Raphael canvas*/
        m.paper = new Raphael(ops.mapDivID, m.width, m.height);
       
        /*scale the canvas to accomodate the path coordinate system*/
        m.paper.setViewBox(0, 0, m.viewX, m.viewY);
        m.scaleFactor = m.width / m.viewX;
       
        /*The above scaling feature doesn't work quite right in IE8 (which uses VML) - below is a nasty hack fix*/
        (function () {
            /*create an element to test getBBox on*/
            var test_ie_text = m.paper.text(500, 0, "Test");
            
            /*this should be 1 in most browers, but IE8 doesn't work right - so if it's not 1, it'll be the 
            factor we need to correct the getBBox coordinates by and is used wherever getBBox is*/
            m.ie8_correction = Math.round(test_ie_text.getBBox().x) / 491;
            
            /*get rid of the testing element*/
            test_ie_text.remove();
        }());
        
        /*Group together a handful of utility functions used frequently*/
        this.utilities = {
            
            /*get the center of a path*/
            pathCenter: function (p) {
                var box, x, y, c = m.ie8_correction;
                box = p.getBBox();
                x = Math.floor(box.x / c + box.width / c / 2.0);
                y = Math.floor(box.y / c + box.height / c / 2.0);
                return [x, y];
            },
            
            /*get the correct coordinates of a text path, based on configuration options
            in the paths file*/
            getTextCoords: function (state) {
				var coords = m.utilities.pathCenter(m.stateObjs[state]),
                    text_configs = paths.text;
				if (text_configs.offset[state]) {
					coords[0] += text_configs.offset[state][0];
					coords[1] += text_configs.offset[state][1];
				}
				if (text_configs.absOffset[state]) {
					coords[0] = text_configs.absOffset[state][0];
					coords[1] = text_configs.absOffset[state][1];
				}
				return coords;
			},
            
            /*add commas to a number*/
            /*from http://stackoverflow.com/questions/3883342/add-commas-to-a-number-in-jquery*/
            commaSeparateNumber: function (val) {
                while (/(\d+)(\d{3})/.test(val.toString())) {
                    val = val.toString().replace(/(\d+)(\d{3})/, '$1' + ',' + '$2');
                }
                return val;
            }
            
        };
        
        /*Draw the basic map. This has to be run by the user module before using the color functions, 
        because those depend on the paths already existing*/
        this.drawPaths = function () {
            
            //graph the paths from the paths module
            var us_paths = paths.states, state;
            
            //draw one state
            function makeState(state) {
                
                //get the path
                var pathString = us_paths[state].path;
                
                /*if the stateObjs object doesn't exist yet (if this is the first state we've 
                drawn), make it*/
                if (typeof (m.stateObjs) === "undefined") {m.stateObjs = {}; }
                
                //create the Raphael object for the state and give it its starting attributes
				m.stateObjs[state] = m.paper.path(pathString);
				
				m.stateObjs[state].attr({
					cursor: "pointer",
					fill: "#999",
					"stroke-width": m.scaleFactor
				});
				
				//store raphael IDs of each state
                if (typeof (m.stateIDs) === "undefined") {m.stateIDs = {}; }
				m.stateIDs[state] = m.stateObjs[state].node.raphaelid;
                
				//and for reverse lookup
                if (typeof (m.stateCodes) === "undefined") {m.stateCodes = {}; }
				m.stateCodes[m.stateObjs[state].node.raphaelid] = state;
            }
            
            //draw a state label
            function makeText(state) {
                
                //get the coordinates based on configuration on paths file
				var coords = m.utilities.getTextCoords(state);
                
                //make the Raphael object for the text object
                if (typeof (m.stateLabelObjs) === "undefined") {m.stateLabelObjs = {}; }
				m.stateLabelObjs[state] = m.paper.text(coords[0], coords[1], state);
				m.stateLabelObjs[state].attr({
					"font-size": 28,
					"font-family": m.fontFamily
				});
				
				if (typeof(m.labelsToHide) !== "undefined") {
					if (typeof(m.labelsToHide[state]) !== "undefined") {
						if (m.labelsToHide[state] === 1) {
							m.stateLabelObjs[state].attr("opacity",0);
						}
					}
				}
				
				//store raphael IDs of each label
                if (typeof (m.stateTextIDs === "undefined")) {m.stateTextIDs = {}; }
				m.stateTextIDs[state] = m.stateLabelObjs[state].node.raphaelid;
                
                //and for reverse lookup
                if (typeof (m.stateByRaphaelTextID === "undefined")) {m.stateByRaphaelTextID = {}; }
				m.stateByRaphaelTextID[m.stateLabelObjs[state].node.raphaelid] = state;
			}
            
            //loop through all the states and draw them and their label
            for (state in us_paths) {
                if (us_paths.hasOwnProperty(state)) {
				    if (!(ops.hideDC === true && state === "DC")) {
						makeState(state);
                        if (!paths.text.hide[state]) {
                            makeText(state);
                        }
                    }
                }
			}
			//m.negSpace = m.paper.path(paths.neg_us);
			//m.negSpace.attr({fill:"#fff","stroke-width":0});
			//console.log(paths.neg_us);
			//console.log(m.negSpace.getBBox().y);
			if (ops.hideUSBox === true) {
				if (typeof(m.stateObjs.US) !== "undefined") {
					m.stateObjs.US.attr({"opacity":0,"stroke-width":0.1});	
				}
			}
            
            //draw the lines pointing from the labels to the smaller states
            function makeLines(map_lines) {
                var i, ii, state;
                function makeLine(lineNumber, state) {
                    var line = map_lines[state][lineNumber];
					if (typeof(m.maplines[state]) === "undefined") {
						m.maplines[state] = [];	
					}
                    m.maplines[state][lineNumber] = m.paper.path(["M", line[0], line[1], "L", line[2], line[3]]);
                    m.maplines[state][lineNumber].attr({"stroke-width": 0.5, "fill": "#888888"});
                }
                m.maplines = {};
				for (state in map_lines) {
					if (map_lines.hasOwnProperty(state)) {
						for (i = 0, ii=map_lines[state].length; i < ii; i += 1) {
							makeLine(i, state);
							if (typeof(m.labelsToHide) !== "undefined") {
								if (m.labelsToHide[state] === 1) {
									m.maplines[state][i].attr("opacity",0);
								}
							}
						}
					}
				}
				
				
            }
            makeLines(paths.lines);
            
            //assign event handlers to the map and its objects - this is done in the events module
            mapEvents(m);
        };
        
        this.drawPaths();
        this.colors = new MapColors(m.colorConfig, this, ops.customMax, ops.customMin);
        this.colors.calcStateColors();
        this.colors.applyStateColors();
		
		this.setNewColors = function(cObj) {
			for (var p in cObj) {
				if (cObj.hasOwnProperty(p)) {
					this.colors.colorConfig[p] = cObj[p];	
				}
			}
		};
		
		
		
		this.setCustomMin = function(theMin) {
			this.min = theMin;
			this.colors.customMin = theMin;
		};
		
		this.setCustomMax = function(theMax) {
			this.max = theMax;
			this.colors.customMax = theMax;
		};
		
		/*if (ops.hideLegend) {
			this.makeLegend = function(){};
		} else {*/
        
			this.makeLegend = function() {
				
				this.legendMaker = legend;
				this.legendMaker.setBounds(m.min, m.max);
				this.legendMaker.defineColors(m.colors.colorConfig.lowColor, m.colors.colorConfig.highColor, m.colors.colorConfig.zeroColor);
				if (ops.legendFormatter) {
					this.legendMaker.setFormatter(ops.legendFormatter);
				}
				if (ops.hideLegend !== true) {
					this.legendMaker.draw(this);
				}
				
			};
			
			this.makeLegend();
		
		//}
		
		/*initialize list of hidden states - all visible at first*/
		this.hiddenStates = (function(m){
			var returnObj = {}, state;
			for (state in m.stateObjs) {
				if (m.stateObjs.hasOwnProperty(state)) {
					returnObj[state] = false;
				}
			}
			return returnObj;
		})(this);
		
		this.fadeInAnimations = {};
		this.fadeOutAnimations = {};
		this.lineAnimations = {};
		this.labelFadeInAnimations = {};
		this.labelFadeOutAnimations = {};
		
		this.showStates = function(stateList, duration) {
			var state, m = this, cb = function() {
				var state = m.stateCodes[this.id];
				m.hiddenStates[state] = false;
			};
			for (var i = 0,ii=stateList.length;i<ii;i++) {
				state = stateList[i];
				if (this.hiddenStates[state] === true) {
					this.stateObjs[state].show();
					this.stateLabelObjs[state].show();
					this.fadeInAnimations[state] = this.stateObjs[state].animate({opacity:1},duration,"linear",cb);
					this.labelFadeInAnimations[state] = this.stateLabelObjs[state].animate({opacity:1},duration,"linear");
					if (typeof(this.maplines[state]) !== "undefined") {
						if (typeof(this.lineAnimations[state]) === "undefined") {
							this.lineAnimations[state] = [];
						}
						for (var j = 0,jj=this.maplines[state].length;j<jj;j++) {
							this.lineAnimations[state][j] = this.maplines[state][j].animate({opacity:1},duration,"linear");	
						}
					}
				}
				
			}
		};
		
		this.hideStates = function(stateList, duration) {
			var state, m = this, cb = function() {
				var state = m.stateCodes[this.id];
				m.hiddenStates[state] = true;
				m.stateObjs[state].hide();
				m.stateLabelObjs[state].hide();
			};
			for (var i = 0, ii=stateList.length;i<ii;i++) {
				state = stateList[i];
				if (this.hiddenStates[state] === false) {
					this.fadeOutAnimations[state] = this.stateObjs[state].animate({opacity:0.01},duration,"linear",cb);
					this.labelFadeOutAnimations[state] = this.stateLabelObjs[state].animate({opacity:0},duration,"linear");
					if (typeof(this.maplines[state]) !== "undefined") {
						if (typeof(this.lineAnimations[state]) === "undefined") {
							this.lineAnimations[state] = [];
						}
						for (var j = 0,jj=this.maplines[state].length;j<jj;j++) {
							this.lineAnimations[state][j] = this.maplines[state][j].animate({opacity:0},duration,"linear");	
						}
					}
				}
				
			}
		};
    };
    return map;
});
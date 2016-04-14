define(["jquery"], function ($) {
    "use strict";
    
    /*Module for color related functionality. Map object is passed in
    as m*/
    var colorUtils = function (colorConfig, m, customMax, customMin) {
        
        //abbreviated reference to module object
        var c = this;
        
        //get the color configuration supplied by the user
        c.colorConfig = colorConfig;
        
        //function of (data set, data index, max or min?) to return max/min
        c.calculateBound = function (d, dI, b) {
            var state, bound;
            for (state in d) {
                if (d.hasOwnProperty(state)) {
                    if (!isNaN(d[state][dI])) {
                        if (typeof (bound) === "undefined") {
                            bound = d[state][dI];
                        } else {
                            if (b === "min") {
                                bound = Math.min(bound, d[state][dI]);

                            } else if (b === "max") {
                                bound = Math.max(bound, d[state][dI]);
                            } else {
                                return false;
                            }
                        }
                    }
                }
            }
            return bound;
        };
        
        //store these as properties of the module object
        c.customMax = customMax;
        c.customMin = customMin;
        
        //Use the custom max min if defined, otherwise, calculated based on data
        c.calculateMinMax = function () {
            if (typeof (c.customMax) !== "undefined") {
                m.max = c.customMax;
            } else {
                m.max = c.calculateBound(m.data, m.dataIndex, "max");
            }

            if (typeof (c.customMin) !== "undefined") {
                m.min = c.customMin;
            } else {
                m.min = c.calculateBound(m.data, m.dataIndex, "min");
            }
        };
        c.calculateMinMax();

        //Converts HTML hex color to RGB array
        c.hexToRGB = function (hexString) {
            var r = parseInt(hexString.substr(1, 2), 16),
                g = parseInt(hexString.substr(3, 2), 16),
                b = parseInt(hexString.substr(5, 2), 16);
            return [r, g, b];
        };

        //And back the other way
        c.RGBToHex = function (rgbArray) {
            function pad(num, size) {
                var s = "0" + num;
                return s.substr(s.length - size);
            }
            return "#" + pad(rgbArray[0].toString(16), 2) + pad(rgbArray[1].toString(16), 2) + pad(rgbArray[2].toString(16), 2);
        };
        
        //Storage for the hex codes for each state
        c.stateColors = {};

        //Calculate colors based on map data
        c.calcStateColors = function () {
            var scale, cScale, calcCScale, state, calcColor, stateColor, highRGB, lowRGB, zeroRGB, spansZero, colorBins;

			calcCScale = function(spansZero, dataPoint, dMin, dMax) {
				//"scale" here becomes "cScale" in the above calcColor function
				if (spansZero) {
					//Data has positive and negative values - use a zero color
					//Subtract 1 from the scale value - see note above (desired range is -1 to -2)
					if (dataPoint < 0) { 
						scale = -(dataPoint - dMin) / -dMin - 1;
						scale = Math.max(-2,Math.min(-1,scale)); 
					} else { scale = dataPoint / dMax; }
					
				} else {
					//Data is entirely positive or negative - don't use special zero color
					scale = (dataPoint - dMin) / (dMax - dMin);
				}
				if (dataPoint === null) {scale = null;}
				return scale;
			};


            /*Get boundary colors*/
            highRGB = c.hexToRGB(c.colorConfig.highColor);
            zeroRGB = c.hexToRGB(c.colorConfig.zeroColor);
            lowRGB = c.hexToRGB(c.colorConfig.lowColor);

			

            /*cScale is calculated based on the data. For data that doesn't go through zero,
            0 = min and 1 = max. For data that does go through zero, dataMin to zero is mapped to
            -1 to -2, and zero to dataMax is mapped to 0 to 1, for reasons explained below*/
            calcColor = function (cScale) {
                var rgb = [], rgbVal, i;
                if (isNaN(cScale) || cScale === null) {
                    return c.colorConfig.noDataColor;
                }
				/*Fit to bounds*/
				cScale = Math.max(-2, Math.min(1, cScale));
                for (i = 0; i < 3; i += 1) {
                    if (spansZero) {
                        /*if the actual value was negative, cScale goes from -1 to -2, just as a signal
                        to use negative part of the gradient (originally was 0 to -1 but data min was 
                        assigned to zero and was ambiguous as to which gradient it should use)*/
                        if (cScale <= -1 && cScale >= -2) {
                            /*convert it back to a normal 0 to 1 range and calc color*/
                            rgbVal = -(cScale + 1) * (zeroRGB[i] - lowRGB[i]) + lowRGB[i];
                        } else {
                            rgbVal = Math.max(0,Math.min(1,cScale)) * (highRGB[i] - zeroRGB[i]) + zeroRGB[i];
                        }
                    } else {
                        rgbVal = Math.max(0,Math.min(cScale)) * (highRGB[i] - lowRGB[i]) + lowRGB[i];
                    }
                    rgb[i] = Math.round(rgbVal);
                }
                return c.RGBToHex(rgb);
            };
            
            spansZero = (m.min < 0 && m.max > 0);
			
			//process color bins if they exist
			colorBins = (function(b) {
				var cB = [], i = 0, ii, midPoint, cScale;
				if (typeof(b) !== "undefined") {
					ii = b.length;
					for (i;i<ii;i++) {	
						cB[i] = {};
						if (typeof(b[i].color) === "undefined") {
							midPoint = (b[i].max + b[i].min)/2;
							cScale = calcCScale(spansZero, midPoint, m.min, m.max);
							cB[i].color = calcColor(cScale);
						} else {
							cB[i].color = b[i].color;	
						}
						cB[i].min = 2;
						cB[i].max = 2;
						cB[i].type = "range";
						if (typeof(b[i].min)!=="undefined") {
							cB[i].min = calcCScale(spansZero, b[i].min, m.min, m.max);
						}
						if (typeof(b[i].max)!=="undefined") {
							cB[i].max = calcCScale(spansZero, b[i].max, m.min, m.max);
						}
						if (typeof(b[i].type)!=="undefined") {
							cB[i].type = b[i].type;
						}
					}
				}
				return cB;
			}(m.colorBins));
			
			/*wrapper for calcColor function that accounts for bins*/
			stateColor = function(cScale, bins) {
				var NAindex = -1;
				for (var i = 0, ii = bins.length; i<ii; i++) {
					if (bins[i].type === "NA") {NAindex = i;}
					if (cScale >= bins[i].min && cScale < bins[i].max) {
						return bins[i].color;	
					}
				}
				if (NAindex !== -1) {
					return bins[NAindex].color;	
				}
				return calcColor(cScale);
			};

            for (state in m.data) {
                if (m.data.hasOwnProperty(state)) {
                    cScale = calcCScale(spansZero, m.data[state][m.dataIndex], m.min, m.max);
                    c.stateColors[state] = stateColor(cScale, colorBins);
                }
            }
        };
        
        //Fades a state to a new color over a defined duration, and returns a reference
        //to the animation in case it needs to be stopped
        c.animateStateColor = function (state, newColor, duration) {
            var startColor, tracker, r, theAnimation;
           
            //The start color is whatever color the state currently is
            if (m.stateObjs[state]) {
                startColor = c.hexToRGB(m.stateObjs[state].attr("fill"));
            }
         
            //If the end color is the same as the current color, don't need to do anything
            if (newColor === c.RGBToHex(startColor)) {
                return false;
            }
            
            //Stores how far along we are in the animation
            tracker = 0;
            
            //Public animation interface for later use
            theAnimation = {
                
                //The actual animation interval
                r: setInterval(function () {
                    if (tracker > duration) {
                        clearInterval(r);
                        return false;
                    }
                    
                    var scale = tracker / duration, //Stores what percent done the animation is
                        rgbColor,
                        frameColor = [0, 0, 0],
                        i;
                    
                    //Sanity check
                    if (state === "") {
                        return false;
                    }
                    
                    //Convert destination color to RGB
                    rgbColor = c.hexToRGB(newColor);
                    
                    //Calculate interim color
                    for (i = 0; i < 3; i += 1) {
                        frameColor[i] = Math.round((rgbColor[i] - startColor[i]) * scale + startColor[i]);
                    }
                    
                    //Set the state to the interim color
                    m.stateObjs[state].attr("fill", c.RGBToHex(frameColor));
                    
                    //Go again in 10 ms
                    tracker += 10;
                }, 10),
                
                startColor: startColor,
                theState: state,
                newColors: newColor,
                stopAnimation: function () {
                    clearInterval(this.r);
                },
                
                /*For use in conjunction with stopAnimation, if it needs to be reset
                to its normal data-based color*/
                resetColorImmediately: function () {
                    m.stateObjs[state].attr("fill", startColor);
                }
            };
            return theAnimation;
        };

        /*Set all states to their data-based colors - duration can be zero
        in case it's an immediate change color situation (as in the initial draw)*/
        c.applyStateColors = function (duration) {
            var toAnimate, state, centerPoint, bbox, tString;
            
            /*Create the animation reference object if it doesn't exist*/
            if (typeof (m.animationRefs) === "undefined") {
                m.animationRefs = {};
            }
            
            if (typeof (duration) === "undefined") {
                duration = 0;
            }
            
            if (duration > 0) {
                toAnimate = {};
            }
			
			var externalLabelStates = function(arr) {
				var o = {};
				for (var i = 0,ii=arr.length;i<ii;i++) {
					o[arr[i]] = true;	
				}
				return o;
			}(["NH","VT","MA","RI","CT","NJ","DE","MD","DC","HI"]);
            
            /*Particularly dark states need to have a white label - calculate
            brightness of color*/
            function brightness(hexcolor) {
                var color = c.hexToRGB(hexcolor);
                return color[0] + color[1] + color[2];
            }
           
            for (state in c.stateColors) {
                if (c.stateColors.hasOwnProperty(state)) {
                    if (m.stateObjs[state]) {
                        if (duration === 0) {
                            //If duration is zero, no need for animation - just
                            //set the fill
                            m.stateObjs[state].attr("fill", c.stateColors[state]);
                        } else {
                            //Or, remember that we need to animate this
                            toAnimate[state] = c.stateColors[state];
                        }
						
						//handle highlighted borders
						if (m.highlightBorder === true && m.data[state][m.highlightIndex] === 1) {
							if (typeof(m.stateShadows)==="undefined") {
								m.stateShadows = {};
								m.stateGlows = {};	
							}
							if (typeof(m.stateShadows[state]) !== "undefined") {
								m.stateShadows[state].remove();
								m.stateGlows[state].remove();
							}
							m.stateObjs[state].attr("stroke",c.colorConfig.highlightColor);
							m.stateObjs[state].attr("stroke-width",3);
						} else {
							m.stateObjs[state].attr("stroke","#000000");
							m.stateObjs[state].attr("stroke-width",1);
						}
						
                        if (m.stateLabelObjs[state]) {
                            //If the color is dark, make the label white
                            if (brightness(c.stateColors[state]) >= m.brightnessThreshold || externalLabelStates[state]) {
                                m.stateLabelObjs[state].attr("fill", "#000000");
                            } else {
                                m.stateLabelObjs[state].attr("fill", "#ffffff");
                            }
							if (typeof(m.labelColors) !== "undefined") {
								if (m.labelColors[state] !== "undefined") {
									m.stateLabelObjs[state].attr("fill",m.labelColors[state]);	
								}
							}
                        }
                    }
                }
            }
			 for (state in c.stateColors) {
                if (c.stateColors.hasOwnProperty(state)) {
                    if (m.stateObjs[state]) {
					//bring non-highlighted states in front of glows
						if (m.highlightBorder === true && m.data[state][m.highlightIndex] === 1) {
							m.stateObjs[state].toFront();
						}
						m.stateLabelObjs[state].toFront();
					}
				}
			 }
            //Execute the animations
            if (duration > 0) {
                for (state in toAnimate) {
                    if (toAnimate.hasOwnProperty(state)) {
                        m.animationRefs[state] = c.animateStateColor(state, toAnimate[state], duration);
                    }
                }
            }
        };
    };
	
	return colorUtils;
	
});

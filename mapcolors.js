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
            var scale, state, dataPoint, dMax, dMin, calcColor, highRGB, lowRGB, zeroRGB, dataIndex, spansZero;

            /*Get boundary colors*/
            highRGB = c.hexToRGB(c.colorConfig.highColor);
            zeroRGB = c.hexToRGB(c.colorConfig.zeroColor);
            lowRGB = c.hexToRGB(c.colorConfig.lowColor);

            /*cScale is calculated based on the data. For data that doesn't go through zero,
            0 = min and 1 = max. For data that does go through zero, dataMin to zero is mapped to
            -1 to -2, and zero to dataMax is mapped to 0 to 1, for reasons explained below*/
            calcColor = function (cScale) {
                var rgb = [], rgbVal, i;
                if (isNaN(cScale)) {
                    return c.colorConfig.noDataColor;
                }
                for (i = 0; i < 3; i += 1) {
                    if (spansZero) {
                        /*if the actual value was negative, cScale goes from -1 to -2, just as a signal
                        to use negative part of the gradient (originally was 0 to -1 but data min was 
                        assigned to zero and was ambiguous as to which gradient it should use)*/
                        if (cScale <= -1) {
                            /*convert it back to a normal 0 to 1 range and calc color*/
                            rgbVal = -(cScale + 1) * (zeroRGB[i] - lowRGB[i]) + lowRGB[i];
                        } else {
                            rgbVal = cScale * (highRGB[i] - zeroRGB[i]) + zeroRGB[i];
                        }
                    } else {
                        rgbVal = cScale * (highRGB[i] - lowRGB[i]) + lowRGB[i];
                    }
                    rgb[i] = Math.round(rgbVal);
                }
                return c.RGBToHex(rgb);
            };

            /*For some reason these are local variables*/
            dMax = m.max;
            dMin = m.min;
            
            spansZero = (dMin < 0 && dMax > 0);

            for (state in m.data) {
                if (m.data.hasOwnProperty(state)) {
                    dataPoint = m.data[state][m.dataIndex];
                    
                    //"scale" here becomes "cScale" in the above calcColor function
                    if (spansZero) {
                        //Data has positive and negative values - use a zero color
                        //Subtract 1 from the scale value - see note above (desired range is -1 to -2)
                        if (dataPoint < 0) { scale = -(dataPoint - dMin) / -dMin - 1; } else { scale = dataPoint / dMax; }
                    } else {
                        //Data is entirely positive or negative - don't use special zero color
                        scale = (dataPoint - dMin) / (dMax - dMin);
                    }
                    c.stateColors[state] = calcColor(scale);
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
							/*bbox = m.stateObjs[state].getBBox();
							centerPoint = {};
							centerPoint.x = Math.round(bbox.x + bbox.width/2);
							centerPoint.y = Math.round(bbox.y + bbox.height/2);
							tString = "s0.95, 0.95, " + centerPoint.x + ", " + centerPoint.y;
							m.stateShadows[state] = m.stateObjs[state].clone().transform(tString).hide();
							m.stateGlows[state] = m.stateShadows[state].glow({width: 6, color: c.colorConfig.highlightColor});*/
							m.stateObjs[state].attr("stroke",c.colorConfig.highlightColor);
							m.stateObjs[state].attr("stroke-width",3);
							/*m.stateObjs[state].toFront();
							//m.stateGlows[state].toFront();
							m.stateLabelObjs[state].toFront();*/

						} else {
							/*if (typeof(m.stateShadows) !== "undefined") {
								if (typeof(m.stateShadows[state]) !== "undefined") {
									m.stateShadows[state].remove();
									m.stateGlows[state].remove();
								}
							}*/
							m.stateObjs[state].attr("stroke","#000000");
							m.stateObjs[state].attr("stroke-width",1);
						}
						
                        if (m.stateLabelObjs[state]) {
                            //If the color is dark, make the label white
                            if (brightness(c.stateColors[state]) < 200) {
                                m.stateLabelObjs[state].attr("fill", "#ffffff");
                            } else {
                                m.stateLabelObjs[state].attr("fill", "#000000");
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
							m.stateLabelObjs[state].toFront();
						}
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

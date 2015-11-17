define(["jquery"], function ($) {
    "use strict";
    
    return function (m) {
        
        /*This module expects a map object to be passsed to it (m) so it can tack on
        the new event-related functions.*/
        
        /*Runs any time the mouse moves to keep track of its location*/
        m.applyMousePos = function (e) {
            
            //Create the tracking object if it doesn't exist
            if (typeof (m.mousePos) === "undefined") {
                m.mousePos = {};
            }
           
            if (typeof (e.pageX === "undefined")) {
                //IE8 fallback
                m.mousePos.x = e.clientX;
                m.mousePos.y = e.clientY + $("body").scrollTop();
            } else {
                //Real browsers
                m.mousePos.x = e.pageX;
                m.mousePos.y = e.pageY;
            }
        };
        
        /*Wrapper around the above function specifically for mousemove event
        - this extra layer isn't stricly necessary but I wanted to separate 
        out the mousemove code and the touchscreen code if I ever need it to 
        be different*/
        m.mouseTracker = function (e) {
            m.applyMousePos(e);
        };
        
        //Runs on mouse entry into state (or touch event on mobile)
        m.hoverIn = function (e) {
            var state = m.stateCodes[this.id];
            
            /*Stop the all popup fadeout event - it's only supposed to run
            when the mouse exits the map entirely. Later, the focusOn function
            has its own fadeout command to prevent fading out the popup
            that is fading in*/
            clearTimeout(m.popupFadeoutTimer);
            
            /*For touchscreens, the mousemove event never runs, so keep track of the
            touch location*/
            m.applyMousePos(e);
            
            /*Set the focus to happen in 0.1 seconds - delayed so that the box doesn't
            appear right on the edge of the state*/
            setTimeout(function () {
                m.focusOn(state);
            }, 100);
        };
        
        //Runs on mouse entry into state label (or touch event on mobile).
        //Basically the same as above except we get the state code differently
        m.labelHoverIn = function (e) {
            var state = this.attrs.text;
            clearTimeout(m.popupFadeoutTimer);
            m.applyMousePos(e);
            setTimeout(function () {
                m.focusOn(state);
            }, 100);
        };
        
        //Runs when the user leaves a state and triggers the removeFocus method
        m.hoverOut = function (e) {
            var state = m.stateCodes[this.id];
            m.removeFocus(state);
        };
        
        //Or a label
        m.labelHoverOut = function (e) {
            var state = this.attrs.text;
            m.removeFocus(state);
        };
        
        m.removeFocus = function (s) {
            m.popupFadeoutTimer = setTimeout(function () {
                
                if (!m.cursorInsideHover) {
                    $(".popup_container").fadeOut(200, function () {
                        $(this).remove();
                        m.focusedState = "none";
                        m.revertFocusColor(s, 300);
                    });
                }
            }, 300);
        };
        
        //The user can pass in a click callback which gets run here.
        m.mouseClick = function (e) {
            var state = m.stateCodes[this.id];
            m.stateClick(state);
        };
        
        //Here too.
        m.labelMouseClick = function (e) {
            var state = this.attrs.text;
            m.stateClick(state);
        };
        
        //Method to return the state to its original color after it's been unfocused
        m.revertFocusColor = function (s, duration) {
           
            /*This is an object to keep track of any animations that are running
            and I can't think of any particular reason why it wouldn't already exist
            at this point in the code, but may as well check*/
            if (typeof (m.animationRefs) === "undefined") {
                m.animationRefs = {};
            }
            
            /*If the state is currently animating, stop*/
            if (m.animationRefs[s]) {
                m.animationRefs[s].stopAnimation();
            }
            
            /*Start a new animation back to the original color*/
            m.animationRefs[s] = m.colors.animateStateColor(s,  m.colors.stateColors[s], duration);
        };
        
        /*Fadeout events won't run as long as the cursor's inside the popup*/
        m.cursorInsideHover = false;
        $("#" + m.mapDivID).on("mouseenter touchstart", ".popup", function (e) {
            m.cursorInsideHover = true;
        });
        
        /*But as soon as the cursor leaves the popup, get rid of it*/
        $("#" + m.mapDivID).on("mouseleave touchend", ".popup", function (e) {
            m.cursorInsideHover = false;
            var state = $(this).parents("div.popup_container").data("state");
            m.removeFocus(state);
        });
        
        /*Focus on the state*/
        m.focusOn = function (s) {
			
			if (typeof(m.disablePopupsOn) !== "undefined") {
				if (typeof(m.disablePopupsOn[s]) !== "undefined") {
					if (m.disablePopupsOn[s] === 1) {
						return false;	
					}
				}
			}

            var //coords,
                //prop,
                box_anchor,
                verticalAlign = "top",
                horizontalAlign = "left",
                popup,
                popup_container,
               // popup_subcontainer,
               // stateAnimation,
               // oldStateAnimation,
                animatingState;
            
            //Check if there's a previously focused state
            if (m.focusedState) {
                
                //If the state's already focused, do nothing
                if (m.focusedState === s) {
                    return false;
                }
                
                //Unfocus the previously focused state
                if (m.focusedState !== "none") {
                    m.revertFocusColor(m.focusedState, 200);
                }
            }
            
            //Define the new state as the focused state
            m.focusedState = s;
            
            //The popup box base coordinate comes from the mouse tracker
            box_anchor = [m.mousePos.x, m.mousePos.y];
            
            /*Break the canvas up into quandrants and draw the box on the correct
            side of the cursor based on its quadrant*/
            if (box_anchor[0] > m.width / 2) {
                horizontalAlign = "right";
            }
            if (box_anchor[1] > m.height / 2) {
                verticalAlign = "bottom";
            }
            
            //Fade out the visible popup
            $(".popup_container").fadeOut(200, function () {
                $(this).remove();
            });
            
            /*Create the animation tracker if it doesn't exist*/
            if (typeof (m.animationRefs) === "undefined") {
                m.animationRefs = {};
            }
            
            /*Loop through any states that are currently animating (i.e. changing color)*/
            for (animatingState in m.animationRefs) {
                if (m.animationRefs.hasOwnProperty(animatingState)) {
                    if (m.animationRefs[animatingState]) {
                        
                        //Stop the animation
                        m.animationRefs[animatingState].stopAnimation();
                        
                        //Start a new animation back to the original color
                        m.animationRefs[animatingState] = m.colors.animateStateColor(animatingState, m.colors.stateColors[animatingState], 200);
                    }
                }
            }
            
            //Create a new popup
            popup_container = $("<div class='popup_container' id='popup_" + s + "'>");
            popup_container.css({
                "width" : "0px",
                "height" : "0px",
                "position": "absolute",
                "display": "none",
                "left": box_anchor[0],
                "top": box_anchor[1]
            });
            popup_container.data("state", s);
            popup = $("<div class='popup'>");
            popup.css({
                "width": 400 * m.scaleFactor + "px",
                "font-size" : m.popupStyle.fontSize * m.scaleFactor + "px",
                "position": "absolute",
                "padding": m.popupStyle.padding + "px",
                "background-color": m.popupStyle.bgColor
            });
            popup.css(horizontalAlign, "2px");
            popup.css(verticalAlign, "2px");
            popup.html(m.popupTemplate(m.data[s], s));
            popup_container.append(popup);
            
            //append it to the map div
            $("#" + m.mapDivID).append(popup_container);
            
            //fade it in
            popup_container.fadeIn(100);
            
            /*This should have been covered in the previous loop, but whatever - if the
            focused state is animating, stop it*/
            if (m.animationRefs[s]) {
                m.animationRefs[s].stopAnimation();
            }
            
            /*Animate the state to the focus color.*/
            m.animationRefs[s] = m.colors.animateStateColor(s, m.colors.colorConfig.hoverColor, 200);
        };
        
        /*Assign all these events to the actual Raphael objects*/
        m.applyHoverEvents = function () {
            var state;
            for (state in m.stateObjs) {
                if (m.stateObjs.hasOwnProperty(state)) {
                    m.stateObjs[state].hover(m.hoverIn, m.hoverOut);
                    m.stateObjs[state].mousemove(m.mouseTracker);
                    m.stateObjs[state].click(m.mouseClick);
                }
            }
            for (state in m.stateLabelObjs) {
                if (m.stateLabelObjs.hasOwnProperty(state)) {
                    m.stateLabelObjs[state].hover(m.labelHoverIn, m.labelHoverOut);
                    m.stateLabelObjs[state].click(m.labelMouseClick);
                }
            }
        };
        m.applyHoverEvents();
    };
});
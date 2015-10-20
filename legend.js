define([], function () {
    "use strict";
    var theLegend = (function () {
        
        /*If the legend goes through zero, get the percentage horizontal position of zero*/
        function getZeroLocation(l) {
            var spansZero = (l.lowValue < 0 && l.highValue > 0), zeroPercent;
            if (spansZero) {
                zeroPercent = Math.round((-l.lowValue) / (l.highValue - l.lowValue) * 100);
                return zeroPercent;
            } else {
                return "noZero";
            }
        }

        /*Make the SVG gradient string*/
        function makeGradientString(l) {
            var spansZero = (l.lowValue > 0 && l.highValue < 0),
                gradientString,
                zeroPercent;
            gradientString = "0-" + l.lowColor + "-";
            zeroPercent = getZeroLocation(l);
            if (zeroPercent !== "noZero") {
                gradientString += l.middleColor + ":" + zeroPercent + "-";
                l.middleTextPos = zeroPercent;
            }
            gradientString += l.highColor;
            return gradientString;
        }
        
        return {
            /*Set the legend data bounds*/
            setBounds: function (low, high) {
                this.lowValue = low;
                this.highValue = high;
            },
            
            /*Set the legend coors*/
            defineColors: function (low, high, middle) {
                this.lowColor = low;
                this.highColor = high;
                if (typeof (middle) !== "undefined") {
                    this.middleColor = middle;
                }
            },
            
            /*Default legend label number formatter (do nothing)*/
            formatter: function (t) {
                return t;
            },
            
            /*Set a custom legend label formatter*/
            setFormatter: function (formatter) {
                this.formatter = formatter;
            },
            
            /*Draw the legend*/
            draw: function (m) {
                var left = m.viewX * 0.15, //goes from 15% to 85%
                    width = m.viewX * 0.7,
                    legendAttrs,
                    zeroPercent;
                
                //Delete existing legend
                if (m.legendBox) {
                    m.legendBox.remove();
                }
                
                //Draw new legend
                m.legendBox = m.paper.rect(left, 600, width, 20);
                
                //Fill with gradient string
                m.legendBox.attr("fill", makeGradientString(this));
                legendAttrs = {
                    "font-size": 28,
                    "font-family" : m.fontFamily,
                    "text-anchor" : "start"
                };
                
                //Delete left legend label
                if (m.leftLegendText) {
                    m.leftLegendText.remove();
                }
                
                //Make new left legend label
                m.leftLegendText = m.paper.text(left, 635, this.formatter(this.lowValue));
                m.leftLegendText.attr(legendAttrs);
                if (m.rightLegendText) {
                    m.rightLegendText.remove();
                }
                
                //The rest of this is pretty much the same for the other labels
                m.rightLegendText = m.paper.text(left + width, 635, this.formatter(this.highValue));
                legendAttrs["text-anchor"] = "end";
                m.rightLegendText.attr(legendAttrs);
                
                if (m.middleLegendText) {
                    m.middleLegendText.remove();
                }
                zeroPercent = getZeroLocation(this);
                if (zeroPercent !== "noZero") {
                    m.middleLegendText = m.paper.text(left + width * zeroPercent / 100, 635, this.formatter(0));
                    legendAttrs["text-anchor"] = "middle";
                    m.middleLegendText.attr(legendAttrs);
                }
            }
        };
    }());
    return theLegend;
});
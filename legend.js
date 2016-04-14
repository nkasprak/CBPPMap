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
        
		function drawGradient(m, left, width, l, legendAttrs) {
			var zeroPercent;
			
			//Draw new legend
			m.legendBox = m.paper.rect(left, 600, width, 20);
			
			//Fill with gradient string
			m.legendBox.attr("fill", makeGradientString(l));
			
			//Make new left legend label
			m.leftLegendText = m.paper.text(left, 635, l.formatter(l.lowValue));
			m.leftLegendText.attr(legendAttrs);
			
			//The rest of l is pretty much the same for the other labels
			m.rightLegendText = m.paper.text(left + width, 635, l.formatter(l.highValue));
			legendAttrs["text-anchor"] = "end";
			m.rightLegendText.attr(legendAttrs);
			
			zeroPercent = getZeroLocation(l);
			if (zeroPercent !== "noZero") {
				m.middleLegendText = m.paper.text(left + width * zeroPercent / 100, 635, l.formatter(0));
				legendAttrs["text-anchor"] = "middle";
				m.middleLegendText.attr(legendAttrs);
			}
		}
			
			
		function drawBins(m, left, width, legendAttrs) {
			m.legendBins = [];
			legendAttrs["font-size"] = 26;
			for (var i = 0, ii = m.colorBins.length; i<ii;i++) {
				m.legendBins[i] = {};
				m.legendBins[i].box = m.paper.rect(left + (i/ii)*width, 610, 20, 20);
				m.legendBins[i].box.attr("fill", m.colorBins[i].color);	
				m.legendBins[i].label = m.paper.text(left + (i/ii)*width + 23, 622, m.colorBins[i].customLabel);
				m.legendBins[i].label.attr(legendAttrs);
			}
		}
		
		function deleteLegendBins(m) {
			if (typeof(m.legendBins) !== "undefined") {
				for (var i = 0, ii = m.legendBins.length; i<ii; i++) {
					if (m.legendBins[i].box) {
						m.legendBins[i].box.remove();
					}
					if (m.legendBins[i].label) {
						m.legendBins[i].label.remove();	
					}
				}
				delete m.legendBins;
			}
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
					width = m.viewX * 0.7;
                
                //Delete existing legend
                if (m.legendBox) {
                    m.legendBox.remove();
                }
				
				//Delete left legend label
				if (m.leftLegendText) {
					m.leftLegendText.remove();
				}
				
				//Delete right legend label
				if (m.rightLegendText) {
					m.rightLegendText.remove();
				}
				
				//Delete middle legend label
				if (m.middleLegendText) {
					m.middleLegendText.remove();
				}
				
				//Delete bins
				deleteLegendBins(m);
				
				var legendAttrs = {
					"font-size": 28,
					"font-family" : m.fontFamily,
					"text-anchor" : "start"
				};
				
				if (typeof(m.colorBins)!=="undefined") {
					drawBins(m, left, width, legendAttrs);
				} else {
					drawGradient(m, left, width, this, legendAttrs);
				}
            }
        };
    }());
    return theLegend;
});